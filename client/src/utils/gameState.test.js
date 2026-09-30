import assert from 'node:assert/strict';
import test from 'node:test';
import { applyCardPlayedEvent } from './gameState.js';

test('applies a successful game.cardPlayed event without a success flag', () => {
  const card = { suit: 'diamonds', value: 'A' };
  const previous = {
    currentPlayerId: 'jash',
    currentPlayer: 'jash',
    hand: [card, { suit: 'spades', value: 'K' }],
    currentRound: [],
    scores: { jash: 0, guest: 0 },
    matchScores: { jash: 85, guest: 0 },
    dealNumber: 1,
    roundNumber: 1,
    gameOver: false,
    winningTeamPlayerIds: []
  };
  const event = {
    play: { playerId: 'jash', card },
    nextPlayer: 'guest',
    scores: { jash: 0, guest: 0 },
    matchScores: { jash: 85, guest: 0 },
    dealNumber: 1,
    roundNumber: 1
  };

  const updated = applyCardPlayedEvent(previous, event);

  assert.equal(updated.currentPlayer, 'guest');
  assert.deepEqual(updated.currentRound, [event.play]);
  assert.deepEqual(updated.hand, [{ suit: 'spades', value: 'K' }]);
});
