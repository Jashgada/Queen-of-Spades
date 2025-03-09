// Mock deck of cards
import { isValidPlay, calculateTrickPoints, determineTrickWinner, isGameOver, getGameWinner } from './gameRules';

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Store active games in localStorage
const getActiveGames = () => {
  try {
    return new Map(JSON.parse(localStorage.getItem('activeGames') || '[]'));
  } catch (e) {
    console.error('Error reading active games:', e);
    return new Map();
  }
};

const setActiveGames = (games) => {
  try {
    localStorage.setItem('activeGames', JSON.stringify(Array.from(games.entries())));
  } catch (e) {
    console.error('Error saving active games:', e);
  }
};

// Generate a random 6-character game code
const generateGameCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
};

export const createDeck = () => {
  const deck = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      deck.push({ suit, value });
    }
  }
  return deck;
};

// Shuffle array using Fisher-Yates algorithm
export const shuffle = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Mock event responses
export const mockEventResponses = {
  'game:create': (playerName) => {
    const gameCode = generateGameCode();
    const player = {
      id: Date.now().toString(),
      name: playerName,
    };
    
    const activeGames = getActiveGames();
    activeGames.set(gameCode, {
      code: gameCode,
      players: [player],
      status: 'waiting',
      currentTrick: [],
      tricks: [],
      trickNumber: 0,
      scores: {},
      targetScore: 75, // Minimum target score
      gameOver: false,
      winner: null
    });
    setActiveGames(activeGames);

    return {
      success: true,
      gameCode,
      player,
      message: `Game created with code: ${gameCode}`,
    };
  },

  'game:join': (gameCode, playerName) => {
    const activeGames = getActiveGames();
    const game = activeGames.get(gameCode);
    
    if (!game) {
      console.log('Available games:', Array.from(activeGames.keys())); // Debug log
      return {
        success: false,
        message: 'Game not found',
      };
    }

    // Limit to maximum 6 players
    if (game.players.length >= 6) {
      return {
        success: false,
        message: 'Game is full (maximum 6 players)',
      };
    }

    const player = {
      id: Date.now().toString(),
      name: playerName,
    };

    game.players.push(player);
    activeGames.set(gameCode, game);
    setActiveGames(activeGames);

    return {
      success: true,
      gameCode,
      player,
      players: game.players,
      message: `${playerName} joined the game`,
    };
  },

  'game:start': (gameCode) => {
    const activeGames = getActiveGames();
    const game = activeGames.get(gameCode);
    if (!game) {
      return {
        success: false,
        message: 'Game not found',
      };
    }

    // Ensure minimum 2 players for testing (real game would require 4)
    if (game.players.length < 2) {
      return {
        success: false,
        message: 'Need at least 2 players to start',
      };
    }

    const deck = shuffle(createDeck());
    const hands = {};
    const cardsPerPlayer = Math.floor(deck.length / game.players.length);
    
    game.players.forEach((player, index) => {
      hands[player.id] = deck.slice(index * cardsPerPlayer, (index + 1) * cardsPerPlayer);
    });

    game.status = 'playing';
    game.hands = hands;
    game.currentTrick = [];
    game.tricks = [];
    game.trickNumber = 0;
    game.scores = game.players.reduce((acc, player) => ({ ...acc, [player.id]: 0 }), {});
    game.gameOver = false;
    game.winner = null;
    
    activeGames.set(gameCode, game);
    setActiveGames(activeGames);

    return {
      success: true,
      gameState: {
        hands,
        currentPlayer: game.players[0].id,
        playedCards: [],
        scores: game.scores,
        trickNumber: game.trickNumber,
        gameOver: game.gameOver,
        winner: game.winner,
        targetScore: game.targetScore
      },
      message: 'Game started',
    };
  },

  'game:playCard': (gameCode, playerId, card) => {
    const activeGames = getActiveGames();
    const game = activeGames.get(gameCode);
    
    if (!game) {
      return {
        success: false,
        message: 'Game not found',
      };
    }

    // Find the player's hand
    const playerHand = game.hands?.[playerId] || [];
    
    // Check if it's a valid play
    const isFirstPlay = game.currentTrick.length === 0 && game.tricks.length === 0;
    const valid = isValidPlay(card, playerHand, game.currentTrick, isFirstPlay);
    
    if (!valid) {
      return {
        success: false,
        message: 'Invalid move: you must follow suit if possible',
      };
    }

    // Add the card to the current trick
    game.currentTrick.push({ playerId, card });
    
    // Remove the card from the player's hand
    game.hands[playerId] = playerHand.filter(c => 
      !(c.suit === card.suit && c.value === card.value)
    );

    // Determine the next player
    let nextPlayerId;
    const currentPlayerIndex = game.players.findIndex(p => p.id === playerId);
    const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
    nextPlayerId = game.players[nextPlayerIndex].id;

    // Check if the trick is complete (all players have played)
    if (game.currentTrick.length === game.players.length) {
      // Determine the winner of the trick
      const winnerId = determineTrickWinner(game.currentTrick);
      
      // Calculate points for the trick
      const points = calculateTrickPoints(game.currentTrick);
      
      // Update scores
      game.scores[winnerId] = (game.scores[winnerId] || 0) + points;
      
      // Save the completed trick
      game.tricks.push({
        cards: [...game.currentTrick],
        winner: winnerId,
        points
      });
      
      // Start a new trick
      game.currentTrick = [];
      game.trickNumber++;
      
      // The winner of the trick leads the next one
      nextPlayerId = winnerId;
      
      // Check if the game is over (all cards played or target score reached)
      const allHandsEmpty = Object.values(game.hands).every(hand => hand.length === 0);
      const targetReached = isGameOver(game.scores, game.targetScore);
      
      if (allHandsEmpty || targetReached) {
        game.gameOver = true;
        
        // Determine the winner (player who reached target score)
        game.winner = getGameWinner(game.scores, game.targetScore);
      }
    }

    // Update the game state
    activeGames.set(gameCode, game);
    setActiveGames(activeGames);

    return {
      success: true,
      play: { playerId, card },
      nextPlayer: nextPlayerId,
      trickComplete: game.currentTrick.length === 0,
      trickWinner: game.tricks.length > 0 ? game.tricks[game.tricks.length - 1].winner : null,
      trickPoints: game.tricks.length > 0 ? game.tricks[game.tricks.length - 1].points : 0,
      scores: game.scores,
      gameOver: game.gameOver,
      winner: game.winner,
      message: `${playerId} played ${card.value} of ${card.suit}`,
    };
  },

  'game:rematch': (gameCode) => {
    const activeGames = getActiveGames();
    const game = activeGames.get(gameCode);
    
    if (!game) {
      return {
        success: false,
        message: 'Game not found',
      };
    }

    // Reset the game state but keep the players
    const deck = shuffle(createDeck());
    const hands = {};
    const cardsPerPlayer = Math.floor(deck.length / game.players.length);
    
    game.players.forEach((player, index) => {
      hands[player.id] = deck.slice(index * cardsPerPlayer, (index + 1) * cardsPerPlayer);
    });

    game.status = 'playing';
    game.hands = hands;
    game.currentTrick = [];
    game.tricks = [];
    game.trickNumber = 0;
    game.scores = game.players.reduce((acc, player) => ({ ...acc, [player.id]: 0 }), {});
    game.gameOver = false;
    game.winner = null;
    
    activeGames.set(gameCode, game);
    setActiveGames(activeGames);

    return {
      success: true,
      gameState: {
        hands,
        currentPlayer: game.players[0].id,
        playedCards: [],
        scores: game.scores,
        trickNumber: game.trickNumber,
        gameOver: game.gameOver,
        winner: game.winner,
        targetScore: game.targetScore
      },
      message: 'Game restarted',
    };
  }
}; 