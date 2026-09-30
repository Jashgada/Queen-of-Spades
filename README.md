# Queen-of-Spades
A online multiplayer card game.
This game is called Queen of Spades and is a web-based multiplayer card game. Players can create or join a table using a 6-character alphanumeric code. Tables support 2–6 players, with 4–6 recommended.

### Local development

Run these from separate terminals:

```sh
cd backend
npm install
npm run dev
```

```sh
cd client
npm install
npm run dev
```

The Worker runs at `http://localhost:8787` with local Durable Object SQLite storage; Vite runs at `http://localhost:5173`. The client defaults to the local Worker URL. To use another Worker, set `VITE_API_URL` in the client environment.

Run backend checks with `cd backend && npm test` and `npm run typecheck`. Run the frontend production build with `cd client && npm run build`.

### Cloudflare deployment

The backend deploys as a Worker with a SQLite-backed Durable Object class:

```sh
cd backend
npx wrangler login
npm run deploy
```

Set `ALLOWED_ORIGIN` in the Worker environment to the deployed frontend origin. Deploy the `client` directory as a Cloudflare Pages project with build command `npm run build`, output directory `dist`, and `VITE_API_URL` set to the Worker URL. The Durable Object's storage persists room state through hibernation and Worker restarts. Room-data expiry after all players leave has not been selected yet.

### How the game works
Tables support 2–6 players, with 4–6 recommended. A deal begins with a Bidding Phase: the first player opens at 75, players bid clockwise in increments of 5 up to 150, or pass. The last player still bidding wins the contract.

When 52 cards do not divide evenly among the players, enough low-value, zero-point non-spade cards are set aside at random to make equal hands. Spades and all scoring cards stay in play.

The winning bidder calls 0, 1, or 2 exact partner cards (depending on table size: 0 at 2 players, 1 at 3–4, and 2 at 5–6). A called partner stays hidden until they play the called card. The bidder also declares a cut suit, which is trump: a player may cut only when they cannot follow the suit led.

After the contract is set, the bidder leads. A **round** is one card played by each player. Players must follow the suit led when possible; otherwise they may play any card. The highest cut-suit card wins if one was played; otherwise the highest card of the led suit wins. The round winner leads the next round.

The five, ten, ace, and queen of spades are worth 5, 10, 15, and 30 points respectively, for 150 points total in the deck. At the end of the deal, the bidder’s team succeeds by collecting at least the bid. Every member of that team individually gains the bid amount on success or loses it on failure; the defending team wins a failed contract. Match scores carry over between deals, and the host starts each next deal. Matches have no automatic end condition yet.

### Tech Stack
The frontend is React. The backend is Cloudflare Workers with one SQLite-backed Durable Object per room and standard WebSockets using a versioned JSON protocol. See [the WebSocket protocol](backend/websocket_protocol.md) for the client/server contract.

Cloudflare Workers Free currently includes Durable Objects. Its daily quotas include 100,000 Durable Object requests, 13,000 GB-s of compute, 5 million SQL row reads, 100,000 SQL row writes, and 5 GB total SQLite storage per account. Free-plan operations fail after a quota is exceeded until the daily reset. See [Cloudflare's current Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) for details.
