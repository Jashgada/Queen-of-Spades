export const applyCardPlayedEvent = (previous, data) => {
  if (!data?.play || typeof data.nextPlayer !== 'string') return previous;

  const hand = data.play.playerId === previous.currentPlayerId
    ? previous.hand.filter(card => !(card.suit === data.play.card.suit && card.value === data.play.card.value))
    : previous.hand;
  const currentRound = [...previous.currentRound, data.play].filter((play, index, plays) =>
    plays.findIndex(candidate => candidate.playerId === play.playerId && candidate.card.suit === play.card.suit && candidate.card.value === play.card.value) === index
  );

  return {
    ...previous,
    hand,
    currentRound,
    currentPlayer: data.nextPlayer,
    scores: data.scores || previous.scores,
    matchScores: data.matchScores || previous.matchScores,
    dealNumber: data.dealNumber ?? previous.dealNumber,
    contract: data.contract || previous.contract,
    gameOver: data.gameOver ?? previous.gameOver,
    winner: data.winner ?? previous.winner,
    winningTeamPlayerIds: data.winningTeamPlayerIds || previous.winningTeamPlayerIds,
    contractResult: data.contractResult || previous.contractResult,
    roundNumber: data.roundNumber ?? previous.roundNumber
  };
};
