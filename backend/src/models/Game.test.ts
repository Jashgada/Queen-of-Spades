import { Card, Player } from '../types';
import { Game } from './Game';

const makeGame = (playerCount = 2) => {
  const game = new Game('game1');
  const players: Player[] = [];
  for (let index = 0; index < playerCount; index += 1) {
    players.push(game.addPlayer(`Player ${index + 1}`, `socket-${index + 1}`));
  }
  game.start();
  return { game, players };
};

describe('Game bidding and contract phases', () => {
  test('deals cards and opens bidding at 75 with the next player to act', () => {
    const { game, players } = makeGame();
    const state = game.getState();

    expect(state.status).toBe('bidding');
    expect(state.currentBid).toBe(75);
    expect(state.currentBidder).toBe(players[0].id);
    expect(state.currentPlayer).toBe(players[1].id);
    expect(state.bidHistory).toEqual([{ playerId: players[0].id, type: 'bid', amount: 75 }]);
    expect(Object.values(state.hands).flat()).toHaveLength(52);
  });

  test.each([3, 5, 6])('deals %i-player hands evenly without removing spades or scoring cards', playerCount => {
    const { game } = makeGame(playerCount);
    const dealtCards = Object.values(game.getState().hands).flat();
    const missingCards = [
      ...['hearts', 'diamonds', 'clubs', 'spades'].flatMap(suit =>
        ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'].map(value => ({ suit, value }))
      )
    ].filter(card => !dealtCards.some(dealt => dealt.suit === card.suit && dealt.value === card.value));

    expect(new Set(Object.values(game.getState().hands).map(hand => hand.length)).size).toBe(1);
    expect(missingCards).toHaveLength(52 % playerCount);
    expect(missingCards.every(card => card.suit !== 'spades')).toBe(true);
    expect(missingCards.every(card => !['5', '10', 'A'].includes(card.value) && !(card.suit === 'spades' && card.value === 'Q'))).toBe(true);
  });

  test('validates raises, advances clockwise, and closes after all other bidders pass', () => {
    const { game, players } = makeGame(3);

    expect(game.submitBid(players[2].id, 80)).toEqual({ success: false, message: 'It is not your turn to bid' });
    expect(game.submitBid(players[1].id, 76).success).toBe(false);
    expect(game.submitBid(players[1].id, 155).success).toBe(false);
    expect(game.submitBid(players[1].id, 80).success).toBe(true);
    expect(game.getState().currentBidder).toBe(players[1].id);
    expect(game.getState().currentPlayer).toBe(players[2].id);

    expect(game.submitBid(players[2].id, null).success).toBe(true);
    expect(game.getState().currentPlayer).toBe(players[0].id);
    expect(game.submitBid(players[0].id, null).success).toBe(true);
    expect(game.getState().status).toBe('contract');
    expect(game.getState().currentPlayer).toBe(players[1].id);
    expect(game.getState().currentBid).toBe(80);
  });

  test('allows two-player contracts without partner calls', () => {
    const { game, players } = makeGame();
    expect(game.submitBid(players[1].id, null).success).toBe(true);
    expect(game.getState().status).toBe('contract');

    expect(game.submitContract(players[0].id, [], 'spades').success).toBe(true);
    expect(game.getState().status).toBe('playing');
    expect(game.getState().currentPlayer).toBe(players[0].id);
    expect(game.getState().contract?.partnerCalls).toEqual([]);
  });

  test('requires the configured number of partner calls and distinct partner owners', () => {
    const { game, players } = makeGame(4);
    for (const player of players.slice(1)) game.submitBid(player.id, null);

    const bidder = players[0];
    const calledCard: Card = { suit: 'hearts', value: 'A' };
    game.getState().hands[bidder.id] = [{ suit: 'clubs', value: '2' }];
    game.getState().hands[players[1].id] = [calledCard, { suit: 'diamonds', value: '2' }];
    game.getState().hands[players[2].id] = [{ suit: 'spades', value: '2' }];
    game.getState().hands[players[3].id] = [{ suit: 'clubs', value: '3' }];

    expect(game.submitContract(bidder.id, [], 'spades').success).toBe(false);
    expect(game.submitContract(bidder.id, [calledCard], 'spades').success).toBe(true);
    expect(game.getPublicState().contract?.revealedPartnerIds).toEqual([]);
    expect(game.getPublicState().players[0]).not.toHaveProperty('socketId');

    game.getState().currentPlayer = players[1].id;
    const result = game.playCard(players[1].id, calledCard);
    expect(result.valid).toBe(true);
    expect(game.getState().contract?.revealedPartnerIds).toContain(players[1].id);
  });

  test('requires players to follow suit and lets the declared cut suit trump', () => {
    const { game, players } = makeGame();
    game.submitBid(players[1].id, null);
    game.submitContract(players[0].id, [], 'spades');
    const state = game.getState();
    state.hands[players[0].id] = [{ suit: 'hearts', value: '5' }];
    state.hands[players[1].id] = [{ suit: 'hearts', value: '2' }, { suit: 'spades', value: 'A' }];
    state.players.forEach(player => { player.handSize = state.hands[player.id].length; });

    expect(game.playCard(players[0].id, { suit: 'hearts', value: '5' }).valid).toBe(true);
    expect(game.playCard(players[1].id, { suit: 'spades', value: 'A' })).toMatchObject({
      valid: false,
      message: 'Must follow suit'
    });

    // This hand has no hearts, so the spade cut is legal and wins the round.
    state.hands[players[1].id] = [{ suit: 'spades', value: 'A' }];
    state.players[1].handSize = 1;
    const result = game.playCard(players[1].id, { suit: 'spades', value: 'A' });
    expect(result).toMatchObject({ valid: true, roundComplete: true, roundWinner: players[1].id });
  });

  test('evaluates the bid at deal end and records positive or negative contract points', () => {
    const successful = makeGame();
    successful.game.submitBid(successful.players[1].id, null);
    successful.game.submitContract(successful.players[0].id, [], 'spades');
    const successState = successful.game.getState();
    successState.contract!.bid = 5;
    successState.hands[successful.players[0].id] = [{ suit: 'hearts', value: '5' }];
    successState.hands[successful.players[1].id] = [{ suit: 'hearts', value: '2' }];
    successState.players.forEach(player => { player.handSize = 1; });

    successful.game.playCard(successful.players[0].id, { suit: 'hearts', value: '5' });
    const successResult = successful.game.playCard(successful.players[1].id, { suit: 'hearts', value: '2' });
    expect(successResult.contractResult).toMatchObject({ successful: true, signedPoints: 5 });
    expect(successState.winningTeamPlayerIds).toEqual([successful.players[0].id]);
    expect(successState.matchScores[successful.players[0].id]).toBe(5);

    successful.game.restart();
    expect(successful.game.getState().dealNumber).toBe(successState.dealNumber + 1);
    expect(successful.game.getState().scores[successful.players[0].id]).toBe(0);
    expect(successful.game.getState().matchScores[successful.players[0].id]).toBe(5);

    const failed = makeGame();
    failed.game.submitBid(failed.players[1].id, null);
    failed.game.submitContract(failed.players[0].id, [], 'spades');
    const failedState = failed.game.getState();
    failedState.hands[failed.players[0].id] = [{ suit: 'hearts', value: '5' }];
    failedState.hands[failed.players[1].id] = [{ suit: 'hearts', value: '2' }];
    failedState.players.forEach(player => { player.handSize = 1; });

    failed.game.playCard(failed.players[0].id, { suit: 'hearts', value: '5' });
    const failedResult = failed.game.playCard(failed.players[1].id, { suit: 'hearts', value: '2' });
    expect(failedResult.contractResult).toMatchObject({ successful: false, signedPoints: -75 });
    expect(failedState.winningTeamPlayerIds).toEqual([failed.players[1].id]);
    expect(failedState.matchScores[failed.players[0].id]).toBe(-75);
  });

  test('counts called partners in the bidder team’s contract points', () => {
    const { game, players } = makeGame(3);
    game.submitBid(players[1].id, null);
    game.submitBid(players[2].id, null);

    const calledPartnerCard: Card = { suit: 'hearts', value: 'A' };
    const state = game.getState();
    state.hands[players[0].id] = [{ suit: 'hearts', value: '5' }];
    state.hands[players[1].id] = [calledPartnerCard];
    state.hands[players[2].id] = [{ suit: 'hearts', value: '2' }];
    state.players.forEach(player => { player.handSize = 1; });

    expect(game.submitContract(players[0].id, [calledPartnerCard], 'spades').success).toBe(true);
    state.contract!.bid = 20;

    game.playCard(players[0].id, { suit: 'hearts', value: '5' });
    game.playCard(players[1].id, calledPartnerCard);
    const result = game.playCard(players[2].id, { suit: 'hearts', value: '2' });

    expect(result.contractResult).toMatchObject({ bidderTeamPoints: 20, successful: true, signedPoints: 20 });
    expect(state.winningTeamPlayerIds).toEqual([players[0].id, players[1].id]);
    expect(state.matchScores[players[0].id]).toBe(20);
    expect(state.matchScores[players[1].id]).toBe(20);
  });

  test.each([
    [2, 0], [3, 1], [4, 1], [5, 2], [6, 2]
  ])('requires %i-player contracts to call %i partner cards', (playerCount, requiredCalls) => {
    const { game, players } = makeGame(playerCount as number);
    for (const player of players.slice(1)) game.submitBid(player.id, null);
    expect(game.submitContract(players[0].id, [], 'diamonds').success).toBe(requiredCalls === 0);
  });
});
