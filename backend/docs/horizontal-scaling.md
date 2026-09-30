# Cloudflare room architecture

The target deployment uses a Cloudflare Worker to route each room code to exactly one SQLite-backed Durable Object. Each room object owns its authoritative `Game`, connected WebSockets, private hand delivery, room broadcasts, and reconnect deadlines. This provides horizontal scaling across rooms without sharing mutable room state between Worker isolates.

## Worker responsibilities

- Allocate unique six-character room codes through `POST /api/rooms`.
- Route `GET /ws/<roomCode>` upgrades to the named room Durable Object.
- Restrict browser origins using the `ALLOWED_ORIGIN` Worker variable.
- Serve health checks and reject unknown routes before forwarding requests.

## Room Durable Object responsibilities

- Store each room's serialized game snapshot in its private SQLite database.
- Use the WebSocket Hibernation API so idle connected rooms do not keep compute active.
- Store connection identity as a WebSocket attachment and keep player identity server-side.
- Use a Durable Object Alarm for the 60-second reconnect grace window.
- Broadcast public state to attached room members and send hands only to their owner.

## Persistence and cleanup

Durable Object hibernation or eviction does not delete SQLite-backed room state. The current implementation leaves room-data retention after all players leave undecided; a later cleanup policy can delete the game snapshot and reservation using a Durable Object Alarm. Any retention timer must respect the reconnect grace period.

See [the WebSocket protocol](../websocket_protocol.md) for the versioned JSON contract and the [Cloudflare deployment instructions](../../README.md#cloudflare-deployment) for local and production setup.
