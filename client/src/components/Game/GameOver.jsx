import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { MatchScorecard } from './MatchScorecard';

export const GameOver = ({ winner, winningTeamPlayerIds, contractResult, scores, matchScoreHistory, players, currentPlayerId, onRematch, isHost, dealNumber }) => {
  const winnerNames = winningTeamPlayerIds.map(playerId => players.find(player => player.id === playerId)?.name || 'Player');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm"
    >
      <motion.section
        initial={{ y: 24, scale: 0.96 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 18 }}
        className="my-auto w-full max-w-lg rounded-3xl border border-gold/40 bg-felt-dark p-5 shadow-2xl sm:p-8"
        aria-labelledby="game-over-title"
      >
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-gold-light">Deal {dealNumber} complete</p>
        <h2 id="game-over-title" className="mt-2 text-center text-3xl font-bold text-white">Contract settled</h2>
        <p className="mt-2 text-center text-sm text-white/65">
          {contractResult?.successful ? 'Contract team' : 'Defending team'} won this deal: {winnerNames.join(', ') || players.find(player => player.id === winner)?.name || 'Unknown'}
        </p>

        {contractResult && (
          <div className={`mt-6 rounded-2xl border p-4 text-center ${contractResult.successful ? 'border-emerald-300/30 bg-emerald-900/30' : 'border-red-300/30 bg-red-900/30'}`}>
            <p className="text-sm text-white/70">{contractResult.successful ? 'Contract made' : 'Contract failed'}</p>
            <p className="mt-1 text-3xl font-bold text-gold-light">
              {contractResult.signedPoints > 0 ? '+' : ''}{contractResult.signedPoints}
            </p>
            <p className="mt-1 text-xs text-white/65">
              Bid {contractResult.bid} · bidder team collected {contractResult.bidderTeamPoints} card points
            </p>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/55">
            <h3>Player</h3>
            <span>Deal points</span>
          </div>
          <ul className="space-y-2">
            {players.map(player => {
              const isOnWinningTeam = winningTeamPlayerIds.includes(player.id);
              return (
                <li key={player.id} className={`flex items-center justify-between rounded-lg px-3 py-2 ${isOnWinningTeam ? 'bg-gold/15' : 'bg-black/15'}`}>
                  <span className="text-sm text-white">
                    {player.name}{player.id === currentPlayerId ? ' (You)' : ''}
                    {isOnWinningTeam && <span className="ml-2 text-xs text-gold-light">Winner</span>}
                  </span>
                  <span className="min-w-8 text-right font-bold tabular-nums text-white">{scores[player.id] || 0}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-4 flex justify-center"><MatchScorecard players={players} matchScoreHistory={matchScoreHistory} /></div>

        <div className="mt-6 flex justify-center">
          {isHost ? (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onRematch}
              className="rounded-xl bg-gold px-6 py-3 font-bold text-felt-dark shadow-lg transition-colors hover:bg-gold-light"
            >
              Deal Again
            </motion.button>
          ) : (
            <p className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-white/65" role="status">
              Waiting for the host to start the next deal
            </p>
          )}
        </div>
      </motion.section>
    </motion.div>
  );
};

GameOver.propTypes = {
  winner: PropTypes.string,
  winningTeamPlayerIds: PropTypes.arrayOf(PropTypes.string),
  contractResult: PropTypes.shape({
    bid: PropTypes.number,
    bidderTeamPoints: PropTypes.number,
    successful: PropTypes.bool,
    signedPoints: PropTypes.number
  }),
  scores: PropTypes.object.isRequired,
  matchScoreHistory: PropTypes.array,
  players: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired
  })).isRequired,
  currentPlayerId: PropTypes.string,
  onRematch: PropTypes.func.isRequired,
  isHost: PropTypes.bool,
  dealNumber: PropTypes.number
};

GameOver.defaultProps = {
  winningTeamPlayerIds: [],
  contractResult: null,
  matchScoreHistory: [],
  isHost: false,
  dealNumber: 1
};
