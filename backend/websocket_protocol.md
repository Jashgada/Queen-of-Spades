# Versioned WebSocket JSON Protocol

This is the transport-neutral protocol for browser and future native clients. The target transport is a standard WebSocket, hosted by a Cloudflare Worker and coordinated by one Durable Object per room. Socket.IO event names and callback acknowledgements are legacy transport details; they are not part of this protocol.

## Connection

- Connect using `wss://<host>/ws/<gameCode>` for an existing room. The Worker routes the room code to its Durable Object.
- Create a room code with `POST /api/rooms` (response `{ "success": true, "gameCode": "ABC123" }`), then connect to `/ws/ABC123` and send `game.create`.
- Negotiate the WebSocket subprotocol `qos.v1`. Every JSON message also carries `v: 1` so stored messages, logs, and test fixtures remain self-describing.
- Messages are UTF-8 JSON text frames. A malformed frame or unsupported protocol version receives a protocol error when possible, then the connection is closed if it cannot safely continue.

## Message envelopes

Client commands use a request ID so clients can match responses without Socket.IO acknowledgements:

```json
{
  "v": 1,
  "type": "game.bid",
  "requestId": "client-generated-id",
  "payload": { "amount": 85 }
}
```

Successful response:

```json
{
  "v": 1,
  "type": "response",
  "requestId": "client-generated-id",
  "ok": true,
  "payload": { "gameState": {} }
}
```

Rejected response:

```json
{
  "v": 1,
  "type": "response",
  "requestId": "client-generated-id",
  "ok": false,
  "error": { "code": "NOT_YOUR_TURN", "message": "It is not your turn" }
}
```

Unsolicited server events have no request ID:

```json
{
  "v": 1,
  "type": "event",
  "event": "game.cardPlayed",
  "payload": { "play": {}, "nextPlayer": "player-id" }
}
```

`requestId` is opaque to the server and unique among a client's outstanding requests. The server responds once to each valid request. Broadcast events are separate from command responses and may arrive before or after a response; clients must use authoritative event state rather than assume ordering between those message classes.

## Client commands

| Type | Payload | Result |
| --- | --- | --- |
| `game.create` | `{ playerName }` | Creates the room for the allocated code and returns player credentials and public state. |
| `game.join` | `{ playerName }` | Adds the caller to this room and returns player credentials and public state. |
| `game.resume` | `{ playerId, resumeToken }` | Restores the same player during the 60-second reconnect window; response includes that player's hand and public state. |
| `game.leave` | `{}` | Voluntarily removes the caller from the room. |
| `game.start` | `{}` | Starts the first deal; the host only. |
| `game.bid` | `{ amount }` | Places a bid. |
| `game.pass` | `{}` | Permanently passes in the current auction. |
| `game.setContract` | `{ partnerCalls, cutSuit }` | Sets called partner cards and trump suit. |
| `game.playCard` | `{ card }` | Plays a card for the authenticated player. |
| `game.nextDeal` | `{}` | Starts the next deal; the server enforces host-only access. |

Player identity for game actions is derived from the authenticated WebSocket connection, not trusted from a `playerId` supplied in an action payload. `game.resume` is the exception: it presents the player ID and server-issued resume token, which must be validated together. Resume tokens and private hands must never be broadcast to the room.

## Server events

| Event | Payload | Audience |
| --- | --- | --- |
| `game.playerJoined` | `{ player, players }` | Other room members. |
| `game.playerState` | `{ hand, currentPlayerId }` | The addressed player's connection only. |
| `game.started` | `{ gameState }` | Room. |
| `game.biddingUpdated` | `{ gameState }` | Room. |
| `game.contractSet` | `{ gameState }` | Room. |
| `game.cardPlayed` | `{ play, nextPlayer, scores, matchScores, matchScoreHistory, dealNumber, ... }` | Room. |
| `game.roundComplete` | `{ winner, points, scores, matchScores, matchScoreHistory, lastRound, roundNumber, ... }` | Room. |
| `game.over` | `{ winner, winningTeamPlayerIds, contractResult, scores, matchScores, matchScoreHistory, dealNumber }` | Room. |
| `game.restarted` | `{ gameState }` | Room; private `game.playerState` messages are sent to each player. |
| `game.resumed` | `{ gameState }` | Resuming connection. |
| `game.playerDisconnected` | `{ playerId, gracePeriodMs, gameState }` | Room. |
| `game.playerReconnected` | `{ playerId, gameState }` | Other room members. |
| `game.playerLeft` | `{ playerId, gameState, players }` | Room. |
| `protocol.error` | `{ code, message }` | Connection that sent an invalid or unsupported message. |

Public game state excludes hands, socket/connection identifiers, and resume tokens. It includes `scores` for the current deal, cumulative `matchScores`, and `matchScoreHistory`, an ordered array of completed deals. Each history item has `{ "dealNumber": number, "changes": { "player-id": number } }`; each player is present with their signed bid award for the deal or `0` when defending. The sum of a player's changes across the current match equals their `matchScores` total. History is stored in the room's authoritative Durable Object snapshot, included in public state and reconnect responses, retained when the host starts the next deal, and initialized empty for a new match. Each player receives only their own hand, including after a reconnect or when a new deal starts.

## Error codes

Errors are stable machine-readable codes; clients should display `message` and use `code` only for behavior.

- `INVALID_MESSAGE`
- `UNSUPPORTED_VERSION`
- `UNKNOWN_MESSAGE_TYPE`
- `NOT_IN_GAME`
- `ROOM_NOT_FOUND`
- `ROOM_FULL`
- `INVALID_RESUME_CREDENTIALS`
- `NOT_YOUR_TURN`
- `NOT_HOST`
- `INVALID_ACTION`
- `GAME_PHASE_MISMATCH`

## Cloudflare room ownership

The Worker resolves a room code to exactly one Durable Object. That object owns the room's authoritative game state, connected sockets, room broadcasts, and private hand delivery. The JSON protocol deliberately contains no Socket.IO room or connection API concepts, allowing the same client contract to work from React and native Swift.

Durable Object persistence and abandoned-room expiry are separate concerns from WebSocket delivery. Room-state expiry duration remains undecided; any eventual expiry alarm must preserve the 60-second reconnect grace period.

The Cloudflare Workers Free plan supports SQLite-backed Durable Objects and WebSocket hibernation. Its current daily quotas include 100,000 Durable Object requests, 13,000 GB-s of compute, 5 million SQL row reads, 100,000 SQL row writes, and 5 GB total SQLite storage per account. Exceeding a free quota causes that operation type to fail until the daily reset. Keep WebSocket sessions hibernatable so idle connected rooms do not hold active compute.
