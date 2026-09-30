import PropTypes from 'prop-types';
import { MatchScorecard } from './MatchScorecard';

export const ScoreBoard = ({ players, scores, matchScoreHistory, currentPlayerId, activePlayerId, bid, dealNumber }) => {
  return (
    <section className="rounded-2xl border border-white/10 bg-green-900/70 p-4 shadow-lg sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Deal points</h2>
        <span className="text-right text-xs text-white/60">Deal {dealNumber}<br />Bid {bid}</span>
      </div>

      <ol className="space-y-3">
        {players.map(player => {
          const score = scores[player.id] || 0;
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
                  <p className="mt-1 text-xs text-white/50">Card points this deal</p>
                </div>
                <span className="shrink-0 text-xl font-bold tabular-nums text-yellow-300" aria-label={`${score} deal points`}>{score}</span>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-4"><MatchScorecard players={players} matchScoreHistory={matchScoreHistory} /></div>
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
  matchScoreHistory: PropTypes.array,
  currentPlayerId: PropTypes.string,
  activePlayerId: PropTypes.string,
  bid: PropTypes.number,
  dealNumber: PropTypes.number,
};

ScoreBoard.defaultProps = {
  matchScoreHistory: [],
  bid: 75,
  dealNumber: 1,
};
