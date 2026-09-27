import PropTypes from 'prop-types';
export const ScoreBoard = ({ players, scores, currentPlayerId, activePlayerId, targetScore }) => {
  return (
    <section className="rounded-2xl border border-white/10 bg-green-900/70 p-4 shadow-lg sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Scoreboard</h2>
        <span className="text-xs text-white/60">Target {targetScore}</span>
      </div>

      <ol className="space-y-3">
        {players.map(player => {
          const score = scores[player.id] || 0;
          const progress = Math.min((score / targetScore) * 100, 100);
          const isCurrentTurn = player.id === activePlayerId;
          const isYou = player.id === currentPlayerId;

          return (
            <li
              key={player.id}
              className={`rounded-xl border p-3 ${isCurrentTurn ? 'border-yellow-300/70 bg-green-700/50' : 'border-white/10 bg-black/10'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {player.name}{isYou ? ' (You)' : ''}
                  </p>
                  {isCurrentTurn && <p className="mt-0.5 text-xs text-yellow-200">Playing now</p>}
                </div>
                <span className="shrink-0 text-xl font-bold tabular-nums text-yellow-300">{score}</span>
              </div>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/30"
                role="progressbar"
                aria-label={`${player.name}'s score`}
                aria-valuemin={0}
                aria-valuemax={targetScore}
                aria-valuenow={Math.min(score, targetScore)}
              >
                <div className="h-full rounded-full bg-yellow-300 transition-[width] duration-500" style={{ width: `${progress}%` }} />
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

ScoreBoard.propTypes = {
  players: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ).isRequired,
  scores: PropTypes.object.isRequired,
  currentPlayerId: PropTypes.string,
  activePlayerId: PropTypes.string,
  targetScore: PropTypes.number,
};

ScoreBoard.defaultProps = {
  targetScore: 75,
};
