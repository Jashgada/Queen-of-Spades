# Backend Game Protocol

The backend is authoritative for bidding, contracts, card legality, rounds, points, and deal results. Each room is owned by one SQLite-backed Cloudflare Durable Object. Each player receives only their own hand.

The standard WebSocket JSON envelope, command names, request/response semantics, event catalog, and errors are defined in [../backend/websocket_protocol.md](../backend/websocket_protocol.md).

## Game phases

`waiting` → `bidding` → `contract` → `playing` → `finished`

- Starting a game deals the cards and begins the Bidding Phase. The first player opens at 75.
- If 52 cards do not divide evenly, low-value zero-point non-spades are set aside at random so hands are equal; all spades and scoring cards remain in play.
- Bids increase in multiples of 5 up to 150. Passing is permanent; the last active bidder wins.
- The winning bidder selects the required exact partner card calls (0 at 2 players, 1 at 3–4, 2 at 5–6) and a cut suit.
- The bidder leads play. A round consists of one card per player. Players must follow suit when possible; the cut suit is trump and may be played only when void in the led suit.
- The deal ends after all cards are played. If the bidder’s team captures at least the bid, each member earns the bid amount. Otherwise each loses that amount and the defending team wins.
- Match scores accumulate per player across deals. Only the host may start another deal; there is no automatic match-end condition.

## Client-to-server commands

| Type | Payload | Purpose |
| --- | --- | --- |
| `game.create` | `{ playerName }` | Create a room after `POST /api/rooms` allocates its code |
| `game.join` | `{ playerName }` | Join the addressed waiting room |
| `game.resume` | `{ playerId, resumeToken }` | Restore the same player during the 60-second grace window |
| `game.start` | `{}` | Deal cards and begin bidding; host only |
| `game.bid` | `{ amount }` | Raise the current bid |
| `game.pass` | `{}` | Pass from the auction |
| `game.setContract` | `{ partnerCalls, cutSuit }` | Set called cards and trump suit |
| `game.playCard` | `{ card }` | Play a card for the authenticated connection |
| `game.nextDeal` | `{}` | Start another deal; host only |
| `game.leave` | `{}` | Leave the room |

Each command includes a request ID and receives a correlated JSON response. Invalid or out-of-turn actions are rejected by the Durable Object.

## Server-to-client events

- `game.started`, `game.biddingUpdated`, and `game.contractSet` send public game state.
- `game.playerState` sends one player's private hand and player ID.
- `game.cardPlayed`, `game.roundComplete`, and `game.over` broadcast play, scoring, and deal results.
- `game.restarted` announces the next deal; private hands are sent separately to each player.
- `game.playerJoined`, `game.playerDisconnected`, `game.playerReconnected`, and `game.playerLeft` cover room membership.
- `protocol.error` reports malformed or unsupported messages.

## Public game state

The public state includes the room code, players (without connection IDs or resume tokens), phase, current player, deal and round numbers, current round, completed rounds, per-deal card-point totals, cumulative per-player match scores, bid history, high bidder, passed players, partner card calls, cut suit, revealed partner IDs, and contract result when complete. It never includes other players’ hands or unrevealed partner identities.
