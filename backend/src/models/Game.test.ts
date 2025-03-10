import { Game } from './Game';
import { Card } from '../types';

describe('Game', () => {
  let game: Game;

  beforeEach(() => {
    game = new Game('test123');
  });

  test('should create a game with initial state', () => {
    const state = game.getState();
    expect(state.code).toBe('test123');
    expect(state.players).toEqual([]);
    expect(state.status).toBe('waiting');
    expect(state.currentTrick).toEqual([]);
    expect(state.tricks).toEqual([]);
    expect(state.trickNumber).toBe(0);
    expect(state.currentPlayer).toBeNull();
    expect(state.scores).toEqual({});
    expect(state.targetScore).toBe(75);
    expect(state.gameOver).toBe(false);
    expect(state.winner).toBeNull();
    expect(state.lastTrick).toBeNull();
  });

  test('should add a player to the game', () => {
    const player = game.addPlayer('Player 1', 'socket123');
    const state = game.getState();

    expect(player.name).toBe('Player 1');
    expect(player.socketId).toBe('socket123');
    expect(player.handSize).toBe(0);
    expect(state.players).toHaveLength(1);
    expect(state.players[0]).toEqual(player);
    expect(state.hands[player.id]).toEqual([]);
    expect(state.scores[player.id]).toBe(0);
  });

  test('should remove a player from the game', () => {
    const player = game.addPlayer('Player 1', 'socket123');
    game.removePlayer(player.id);
    const state = game.getState();

    expect(state.players).toHaveLength(0);
    expect(state.hands[player.id]).toBeUndefined();
    expect(state.scores[player.id]).toBeUndefined();
  });

  test('should start the game with at least 2 players', () => {
    game.addPlayer('Player 1', 'socket1');
    game.addPlayer('Player 2', 'socket2');
    game.start();
    const state = game.getState();

    expect(state.status).toBe('playing');
    expect(state.currentPlayer).toBe(state.players[0].id);
    expect(state.trickNumber).toBe(1);
    
    // Check that cards were dealt
    state.players.forEach(player => {
      expect(state.hands[player.id].length).toBeGreaterThan(0);
      expect(player.handSize).toBeGreaterThan(0);
    });
  });

  test('should not start the game with less than 2 players', () => {
    game.addPlayer('Player 1', 'socket1');
    
    expect(() => {
      game.start();
    }).toThrow('Not enough players to start the game');
  });

  test('should play a card and validate the move', () => {
    // Setup a game with 2 players
    const player1 = game.addPlayer('Player 1', 'socket1');
    const player2 = game.addPlayer('Player 2', 'socket2');
    
    // Manually set up hands for testing
    const state = game.getState();
    state.hands[player1.id] = [
      { suit: 'hearts', value: '5' },
      { suit: 'diamonds', value: '10' }
    ];
    state.hands[player2.id] = [
      { suit: 'hearts', value: 'A' },
      { suit: 'spades', value: 'Q' }
    ];
    state.players[0].handSize = 2;
    state.players[1].handSize = 2;
    
    // Start the game and set current player
    state.status = 'playing';
    state.currentPlayer = player1.id;
    state.trickNumber = 1;
    
    // Play a card
    const result = game.playCard(player1.id, { suit: 'hearts', value: '5' });
    
    // The result should be valid
    expect(result.valid).toBe(true);
    expect(result.nextPlayer).toBe(player2.id);
    
    // Check game state
    expect(state.currentTrick).toHaveLength(1);
    expect(state.currentTrick[0].playerId).toBe(player1.id);
    expect(state.currentTrick[0].card).toEqual({ suit: 'hearts', value: '5' });
    expect(state.hands[player1.id]).toHaveLength(1);
    expect(state.players[0].handSize).toBe(1);
    expect(state.currentPlayer).toBe(player2.id);
  });

  test('should validate following suit', () => {
    // Setup a game with 2 players
    const player1 = game.addPlayer('Player 1', 'socket1');
    const player2 = game.addPlayer('Player 2', 'socket2');
    
    // Manually set up hands for testing
    const state = game.getState();
    state.hands[player1.id] = [
      { suit: 'hearts', value: '5' }
    ];
    state.hands[player2.id] = [
      { suit: 'hearts', value: 'A' },
      { suit: 'spades', value: 'Q' }
    ];
    state.players[0].handSize = 1;
    state.players[1].handSize = 2;
    
    // Start the game and set current player
    state.status = 'playing';
    state.currentPlayer = player1.id;
    state.trickNumber = 1;
    
    // Player 1 plays a heart
    game.playCard(player1.id, { suit: 'hearts', value: '5' });
    
    // Player 2 tries to play a spade (should fail because they have a heart)
    const invalidResult = game.playCard(player2.id, { suit: 'spades', value: 'Q' });
    
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.message).toBe('Must follow suit');
    
    // Player 2 plays a heart (should succeed)
    const validResult = game.playCard(player2.id, { suit: 'hearts', value: 'A' });
    
    expect(validResult.valid).toBe(true);
    expect(validResult.trickComplete).toBe(true);
    expect(validResult.trickWinner).toBe(player2.id);
    expect(validResult.trickPoints).toBe(20); // 5 + 15 points
  });

  test('should complete a trick and award points', () => {
    // Setup a game with 2 players
    const player1 = game.addPlayer('Player 1', 'socket1');
    const player2 = game.addPlayer('Player 2', 'socket2');
    
    // Manually set up hands for testing
    const state = game.getState();
    state.hands[player1.id] = [
      { suit: 'hearts', value: '5' }
    ];
    state.hands[player2.id] = [
      { suit: 'hearts', value: 'A' }
    ];
    state.players[0].handSize = 1;
    state.players[1].handSize = 1;
    
    // Start the game and set current player
    state.status = 'playing';
    state.currentPlayer = player1.id;
    state.trickNumber = 1;
    
    // Player 1 plays a 5 of hearts (5 points)
    game.playCard(player1.id, { suit: 'hearts', value: '5' });
    
    // Player 2 plays an Ace of hearts (15 points)
    const result = game.playCard(player2.id, { suit: 'hearts', value: 'A' });
    
    expect(result.valid).toBe(true);
    expect(result.trickComplete).toBe(true);
    expect(result.trickWinner).toBe(player2.id);
    expect(result.trickPoints).toBe(20); // 5 + 15 points
    
    // Check that the scores were updated
    expect(state.scores[player2.id]).toBe(20);
    expect(state.tricks).toHaveLength(1);
    expect(state.lastTrick).toEqual({ winner: player2.id, points: 20 });
    expect(state.currentTrick).toHaveLength(0);
    expect(state.trickNumber).toBe(2);
    expect(state.currentPlayer).toBe(player2.id);
  });

  test('should end the game when a player reaches the target score', () => {
    // Setup a game with 2 players and a low target score
    game = new Game('test123', 20);
    const player1 = game.addPlayer('Player 1', 'socket1');
    const player2 = game.addPlayer('Player 2', 'socket2');
    
    // Manually set up hands for testing
    const state = game.getState();
    state.hands[player1.id] = [
      { suit: 'hearts', value: '5' }
    ];
    state.hands[player2.id] = [
      { suit: 'spades', value: 'Q' }
    ];
    state.players[0].handSize = 1;
    state.players[1].handSize = 1;
    
    // Start the game and set current player
    state.status = 'playing';
    state.currentPlayer = player1.id;
    state.trickNumber = 1;
    
    // Player 1 plays a 5 of hearts (5 points)
    game.playCard(player1.id, { suit: 'hearts', value: '5' });
    
    // Player 2 plays a Queen of spades (30 points)
    const result = game.playCard(player2.id, { suit: 'spades', value: 'Q' });
    
    expect(result.valid).toBe(true);
    expect(result.trickComplete).toBe(true);
    expect(result.trickWinner).toBe(player1.id);
    expect(result.trickPoints).toBe(35); // 5 + 30 points
    
    // Check that the game is over
    expect(state.scores[player1.id]).toBe(35);
    expect(state.gameOver).toBe(true);
    expect(state.winner).toBe(player1.id);
    expect(state.status).toBe('finished');
  });

  test('should restart the game with the same players', () => {
    // Setup a game with 2 players
    const player1 = game.addPlayer('Player 1', 'socket1');
    const player2 = game.addPlayer('Player 2', 'socket2');
    
    // Start the game
    game.start();
    
    // Play some cards and end the game
    const state = game.getState();
    state.gameOver = true;
    state.winner = player1.id;
    state.status = 'finished';
    state.scores[player1.id] = 100;
    
    // Restart the game
    game.restart();
    const newState = game.getState();
    
    expect(newState.status).toBe('playing');
    expect(newState.players).toEqual(state.players);
    expect(newState.gameOver).toBe(false);
    expect(newState.winner).toBeNull();
    expect(newState.scores[player1.id]).toBe(0);
    expect(newState.scores[player2.id]).toBe(0);
    expect(newState.trickNumber).toBe(1);
    expect(newState.currentPlayer).toBe(player1.id);
    
    // Check that cards were dealt
    newState.players.forEach(player => {
      expect(newState.hands[player.id].length).toBeGreaterThan(0);
      expect(player.handSize).toBeGreaterThan(0);
    });
  });
}); 