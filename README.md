# Queen-of-Spades
A online multiplayer card game.
This game is called queen of spades and will be a web app card game. Players will be able to create/join a table/game using a 6 character long alphanumeric code. The minimum number of players required are 4 and maximum is 6 in each room.

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
The objective of the game is fairly simple. Make the most points. How do you make points? Only 4 cards have points assigned to them - 5s for five points, 10s for 10 points, Aces have 15 points and the Queen of spades has 30 points. If you sum them up, we get a total of 150 points in a deck.
Once the cards are distributed, players start a bid starting from 75 points with increments in multiple of 5s.
The highest one can bid is 150 (duh).
Whoever wins the bid has the goal of making that many points. They can also make 1 or 2 partners (depending on the number of players) based on the cards they need to win the game. For example, a winner of the bid can declare ace of hearts their partner and the player with the card is a partner (unrevealed till they play the card in the game). The partner shares the same objective.
The winner of the bid will also declare a card shape a “cut” card which we will go into later.

Now, the winner of the bid starts the game. During each round, the objective will be to win a hand by playing the highest possible card of the same shape. Whoever wins the round, gets the hand and stacks it in a separate personal stack. All the points in this hand now belong to them.
All players will play a card in each round, thus the total number of rounds will be the number of cards that are distributed.

### Tech Stack
After some quick research, I have decided on making this app on vanilla js/react for the frontend, use express.js for the backend and socket.io for networking.
Socket.IO is an open source real time networking sdk that allows for event driven communication between client and server (basically a websocket wrapper)
While there are golang wrappers for socket.io, support for it seems limited and might be a little harder to rely on AI to write/copilot.
