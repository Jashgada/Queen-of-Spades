export const buildMatchScorecardRows = (history = [], players = []) => {
  const totals = Object.fromEntries(players.map(player => [player.id, 0]));
  const dealRows = history.map(deal => {
    const changes = Object.fromEntries(players.map(player => {
      const change = deal.changes?.[player.id] || 0;
      totals[player.id] += change;
      return [player.id, change];
    }));
    return { dealNumber: deal.dealNumber, changes };
  });

  return [...dealRows, { dealNumber: 'Total', changes: totals, isTotal: true }];
};
