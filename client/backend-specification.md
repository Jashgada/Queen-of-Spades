# Backend Game Protocol

The backend is authoritative for bidding, contracts, card legality, rounds, points, and deal results. Game state is held in memory and broadcast to players in the room. Each player receives only their own hand.

## Game phases

`waiting` → `bidding` → `contract` → `playing` → `finished`

- Starting a game deals the cards and begins the Bidding Phase. The first player opens at 75.
- If 52 cards do not divide evenly, low-value zero-point non-spades are set aside at random so hands are equal; all spades and scoring cards remain in play.
- Bids increase in multiples of 5 up to 150. Passing is permanent; the last active bidder wins.
- The winning bidder selects the required exact partner card calls (0 at 2 players, 1 at 3–4, 2 at 5–6) and a cut suit.
- The bidder leads play. A round consists of one card per player. Players must follow suit when possible; the cut suit is trump and may be played only when void in the led suit.
- The deal ends after all cards are played. If the bidder’s team captures at least the bid, each member earns the bid amount. Otherwise each loses that amount and the defending team wins.
- Match scores accumulate per player across deals. Only the host may start another deal; there is no automatic match-end condition.

## Client-to-server events

| Event | Payload | Purpose |
| --- | --- | --- |
| `game:create` | `{ playerName }` | Create a room |
| `game:join` | `{ gameCode, playerName }` | Join a waiting room |
| `game:start` | none | Deal cards and begin bidding |
| `game:bid` | `{ amount }` | Raise the current bid |
| `game:pass` | none | Pass from the auction |
| `game:setContract` | `{ partnerCalls, cutSuit }` | Set called cards and trump suit |
| `game:playCard` | `{ card }` | Play the caller’s card; player identity comes from the socket |
| `game:rematch` | none | Start another deal with the same room |

All action events acknowledge with `{ success, message?, gameState? }`. Invalid or out-of-turn actions are rejected by the server.

## Server-to-client events

- `game:started`, `game:biddingUpdated`, and `game:contractSet` send the public game state.
- `game:playerState` sends a player their private hand and player ID.
- `game:cardPlayed` broadcasts the played card, next player, current scores, and public contract state.
- `game:roundComplete` broadcasts the round winner, points, and updated scores.
- `game:over` broadcasts the signed contract result, winning team IDs, and final card-point totals.
- `game:restarted` sends the new deal’s public state; private hands follow in `game:playerState`.
- `game:playerJoined`, `game:playerLeft`, and `game:error` cover room updates and errors.

## Public game state

The public state includes the room code, players (without socket IDs or resume tokens), phase, current player, deal and round numbers, current round, completed rounds, per-deal card-point totals, cumulative per-player match scores, bid history, high bidder, passed players, partner card calls, cut suit, revealed partner IDs, and contract result when complete. It never includes other players’ hands or unrevealed partner identities.
