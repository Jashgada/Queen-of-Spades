# Queen of Spades - Backend Implementation Specification

## Overview

This document provides a comprehensive specification for the backend implementation of the Queen of Spades card game. The backend will handle game state management, player interactions, and real-time communication with the frontend.

## Technology Stack

- **Server**: Node.js with Express
- **Real-time Communication**: Socket.IO
- **Database** (optional): MongoDB for game history and user profiles

## Socket.IO Event API Specification

The frontend and backend will communicate primarily through Socket.IO events. Below is a detailed specification of all required events, their parameters, and expected responses.

### Connection Events

#### `connection`
- **Direction**: Client → Server
- **Description**: Automatically emitted when a client connects to the Socket.IO server
- **Handler**: Server should initialize a new client session

#### `disconnect`
- **Direction**: Client → Server
- **Description**: Automatically emitted when a client disconnects
- **Handler**: Server should handle player removal from games and notify other players

### Game Management Events

#### `game:create`
- **Direction**: Client → Server
- **Description**: Create a new game room
- **Parameters**:
  - `playerName` (string): Name of the player creating the game
- **Response**:
  - `success` (boolean): Whether the operation was successful
  - `gameCode` (string): Unique 6-character code for the game room
  - `player` (object): Player information
    - `id` (string): Unique player ID
    - `name` (string): Player name
    - `handSize` (number): Number of cards in hand (0 initially)
  - `message` (string): Success/error message

#### `game:join`
- **Direction**: Client → Server
- **Description**: Join an existing game room
- **Parameters**:
  - `gameCode` (string): The game code to join
  - `playerName` (string): Name of the player joining
- **Response**:
  - `success` (boolean): Whether the operation was successful
  - `gameCode` (string): The game code
  - `player` (object): Player information
    - `id` (string): Unique player ID
    - `name` (string): Player name
    - `handSize` (number): Number of cards in hand (0 initially)
  - `players` (array): List of all players in the game (each with id, name, handSize)
  - `message` (string): Success/error message

#### `game:playerJoined`
- **Direction**: Server → Client
- **Description**: Broadcast to all clients when a new player joins
- **Data**:
  - `gameCode` (string): The game code
  - `player` (object): The player who joined
    - `id` (string): Unique player ID
    - `name` (string): Player name
    - `handSize` (number): Number of cards in hand (0 initially)
  - `players` (array): Updated list of all players
  - `message` (string): Notification message

#### `game:start`
- **Direction**: Client → Server
- **Description**: Start the game (only game creator can do this)
- **Parameters**:
  - No parameters needed, server identifies the game from the socket's session
- **Response**:
  - `success` (boolean): Whether the operation was successful
  - `gameState` (object): Initial game state
    - `gameCode` (string): The game code
    - `hands` (object): Map of player IDs to their hands
    - `currentPlayer` (string): ID of the player who goes first
    - `currentPlayerId` (string): ID of the current client's player
    - `playedCards` (array): Empty initially
    - `scores` (object): Map of player IDs to their scores (all 0 initially)
    - `trickNumber` (number): 0 initially
    - `gameOver` (boolean): false initially
    - `winner` (string): null initially
    - `targetScore` (number): 75 by default
    - `lastTrick` (object): null initially
  - `message` (string): Success/error message

#### `game:started`
- **Direction**: Server → Client
- **Description**: Broadcast to all clients when the game starts
- **Data**: Same as the response from `game:start`

### Gameplay Events

#### `game:playCard`
- **Direction**: Client → Server
- **Description**: Play a card from the player's hand
- **Parameters**:
  - `playerId` (string): ID of the player making the move
  - `card` (object): The card being played
    - `suit` (string): 'hearts', 'diamonds', 'clubs', or 'spades'
    - `value` (string): '2' through '10', 'J', 'Q', 'K', or 'A'
- **Response**:
  - `success` (boolean): Whether the play was valid
  - `play` (object): The play that was made
    - `playerId` (string): ID of the player who played
    - `card` (object): The card that was played
  - `nextPlayer` (string): ID of the next player
  - `trickComplete` (boolean): Whether this play completed a trick
  - `trickWinner` (string): ID of the player who won the trick (if completed)
  - `trickPoints` (number): Points earned in this trick (if completed)
  - `scores` (object): Updated scores for all players
  - `gameOver` (boolean): Whether the game is now over
  - `winner` (string): ID of the game winner (if game is over)
  - `message` (string): Success/error message

#### `game:cardPlayed`
- **Direction**: Server → Client
- **Description**: Broadcast to all clients when a card is played
- **Data**: Same as the response from `game:playCard`

#### `game:trickComplete`
- **Direction**: Server → Client
- **Description**: Broadcast to all clients when a trick is completed
- **Data**:
  - `winner` (string): ID of the player who won the trick
  - `points` (number): Points earned in this trick
  - `scores` (object): Updated scores for all players
  - `lastTrick` (object): Information about the completed trick
    - `winner` (string): ID of the player who won the trick
    - `points` (number): Points earned in this trick

#### `game:over`
- **Direction**: Server → Client
- **Description**: Broadcast to all clients when the game is over
- **Data**:
  - `winner` (string): ID of the player who won the game
  - `scores` (object): Final scores for all players
  - `gameOver` (boolean): true
  - `gameStatus` (string): 'finished'

#### `game:rematch`
- **Direction**: Client → Server
- **Description**: Request to start a new game with the same players
- **Parameters**:
  - No parameters needed, server identifies the game from the socket's session
- **Response**:
  - `success` (boolean): Whether the operation was successful
  - `gameState` (object): New game state (same structure as in `game:start`)
  - `message` (string): Success/error message

#### `game:restarted`
- **Direction**: Server → Client
- **Description**: Broadcast to all clients when a game is restarted
- **Data**: Same as the response from `game:rematch`

#### `game:error`
- **Direction**: Server → Client
- **Description**: Sent to a client when an error occurs
- **Data**:
  - `success` (boolean): Always false
  - `message` (string): Error message

## Game State Management

The server must maintain the following state for each game:

### Game Room
```javascript
{
  code: string,              // Unique game code
  players: Array<Player>,    // List of players in the game
  status: string,            // 'waiting', 'playing', or 'finished'
  hands: {                   // Map of player IDs to their hands
    [playerId: string]: Array<Card>
  },
  currentTrick: Array<Play>, // Cards played in the current trick
  tricks: Array<Trick>,      // Completed tricks
  trickNumber: number,       // Current trick number
  scores: {                  // Map of player IDs to their scores
    [playerId: string]: number
  },
  targetScore: number,       // Target score to win (default: 75)
  gameOver: boolean,         // Whether the game is over
  winner: string | null,     // ID of the winner, if game is over
  lastTrick: {               // Information about the last completed trick
    winner: string,          // ID of the player who won the trick
    points: number           // Points earned in this trick
  } | null
}
```

### Player
```javascript
{
  id: string,                // Unique player ID
  name: string,              // Player name
  socketId: string,          // Socket.IO connection ID
  handSize: number           // Number of cards in hand (for other players' UI)
}
```

### Card
```javascript
{
  suit: string,              // 'hearts', 'diamonds', 'clubs', or 'spades'
  value: string              // '2' through '10', 'J', 'Q', 'K', or 'A'
}
```

### Play
```javascript
{
  playerId: string,          // ID of the player who made the play
  card: Card                 // The card that was played
}
```

### Trick
```javascript
{
  cards: Array<Play>,        // Cards played in this trick
  winner: string,            // ID of the player who won the trick
  points: number             // Points earned in this trick
}
```

## Game Rules Implementation

The backend must implement the following game rules:

1. **Card Dealing**:
   - Cards should be dealt evenly among all players
   - Use a standard 52-card deck

2. **Turn Management**:
   - First player can play any card
   - Subsequent players must follow suit if possible
   - If a player cannot follow suit, they can play any card

3. **Trick Resolution**:
   - The highest card of the led suit wins the trick
   - The winner of a trick leads the next one

4. **Scoring**:
   - Five (5) is worth 5 points
   - Ten (10) is worth 10 points
   - Ace (A) is worth 15 points
   - Queen of Spades (Q♠) is worth 30 points
   - All other cards are worth 0 points

5. **Game End Conditions**:
   - The game ends when a player reaches the target score (minimum 75 points)
   - The game also ends when all cards have been played

## Frontend Context

The frontend is implemented as a React application with the following key components:

1. **Game Component**: Main component that manages the game flow
2. **GameBoard Component**: Displays the game board, players, and cards
3. **Hand Component**: Displays the player's hand
4. **Card Component**: Displays individual cards
5. **ScoreBoard Component**: Shows player scores
6. **PlayedCards Component**: Shows history of played cards
7. **GameOver Component**: Displayed when the game ends

The frontend uses the following hooks:
1. **useGame**: Manages game state and interactions
2. **useSocket**: Handles socket connections

The frontend expects real-time updates for:
- Player joins/leaves
- Game start
- Card plays
- Trick completions
- Score updates
- Game over

### Important Frontend State Properties

The frontend expects the following properties in the game state:
- `players`: Array of player objects with id, name, and handSize
- `currentPlayer`: ID of the player whose turn it is
- `currentPlayerId`: ID of the current client's player
- `gameCode`: The game code for the current game
- `hand`: Array of cards in the current player's hand
- `playedCards`: Array of cards played in the current trick
- `scores`: Object mapping player IDs to their scores
- `trickNumber`: Current trick number
- `gameOver`: Whether the game is over
- `winner`: ID of the game winner (if game is over)
- `lastTrick`: Information about the last completed trick
- `targetScore`: Target score to win (default: 75)

## Implementation Notes

1. **Socket Session Management**:
   - Associate each socket connection with a player
   - Handle reconnections gracefully
   - Clean up disconnected players

2. **Validation**:
   - Validate all incoming events
   - Ensure players can only play cards from their hand
   - Enforce following suit when possible
   - Prevent players from playing out of turn

3. **Error Handling**:
   - Send clear error messages to clients
   - Handle edge cases (e.g., disconnections during play)
   - Log errors for debugging

4. **Performance Considerations**:
   - Minimize data sent over the network
   - Consider using Redis for game state in a production environment
   - Implement room cleanup for completed games

## Testing Strategy

1. **Unit Tests**:
   - Test game rules implementation
   - Test card dealing and shuffling
   - Test trick resolution and scoring

2. **Integration Tests**:
   - Test socket event handling
   - Test game flow from start to finish

3. **Load Tests**:
   - Test with multiple concurrent games
   - Test with maximum number of players 