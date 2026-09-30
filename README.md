# Queen-of-Spades
A online multiplayer card game.
This game is called Queen of Spades and is a web-based multiplayer card game. Players can create or join a table using a 6-character alphanumeric code. Tables support 2–6 players, with 4–6 recommended.

### Installation Steps for Local Development

#### Frontend

1. **Clone the repository:**
    ```sh
    git clone https://github.com/yourusername/Queen-of-Spades.git
    cd Queen-of-Spades
    ```

2. **Install dependencies:**
    ```sh
    npm install
    ```

3. **Set up environment variables:**
    Create a `.env` file in the root directory and add necessary environment variables. For example:
    ```sh
    PORT=3000
    ```

4. **Run the development server:**
    ```sh
    npm start
    ```

5. **Open your browser:**
    Navigate to `http://localhost:3000` to see the application running.

#### Backend

1. **Navigate to the backend directory:**
    ```sh
    cd backend
    ```

2. **Install dependencies:**
    ```sh
    npm install
    ```

3. **Set up environment variables:**
    Create a `.env` file in the backend directory and add necessary environment variables. For example:
    ```sh
    PORT=5000
    ```

4. **Run the backend server:**
    ```sh
    npm start
    ```

5. **Run tests (optional):**
    ```sh
    npm test
    ```

Now you should have both the frontend and backend servers running locally for development.

### How the game works
Tables support 2–6 players, with 4–6 recommended. A deal begins with a Bidding Phase: the first player opens at 75, players bid clockwise in increments of 5 up to 150, or pass. The last player still bidding wins the contract.

When 52 cards do not divide evenly among the players, enough low-value, zero-point non-spade cards are set aside at random to make equal hands. Spades and all scoring cards stay in play.

The winning bidder calls 0, 1, or 2 exact partner cards (depending on table size: 0 at 2 players, 1 at 3–4, and 2 at 5–6). A called partner stays hidden until they play the called card. The bidder also declares a cut suit, which is trump: a player may cut only when they cannot follow the suit led.

After the contract is set, the bidder leads. A **round** is one card played by each player. Players must follow the suit led when possible; otherwise they may play any card. The highest cut-suit card wins if one was played; otherwise the highest card of the led suit wins. The round winner leads the next round.

The five, ten, ace, and queen of spades are worth 5, 10, 15, and 30 points respectively, for 150 points total in the deck. At the end of the deal, the bidder’s team succeeds by collecting at least the bid. Every member of that team individually gains the bid amount on success or loses it on failure; the defending team wins a failed contract. Match scores carry over between deals, and the host starts each next deal. Matches have no automatic end condition yet.

### Tech Stack
After some quick research, I have decided on making this app on vanilla js/react for the frontend, use express.js for the backend and socket.io for networking.
Socket.IO is an open source real time networking sdk that allows for event driven communication between client and server (basically a websocket wrapper)
While there are golang wrappers for socket.io, support for it seems limited and might be a little harder to rely on AI to write/copilot.
