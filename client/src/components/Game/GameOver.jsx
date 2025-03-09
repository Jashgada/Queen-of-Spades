import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

export const GameOver = ({ winner, scores, players, currentPlayerId, onRematch, targetScore }) => {
  const getPlayerName = (playerId) => {
    const player = players.find(p => p.id === playerId);
    return player ? player.name : 'Unknown';
  };

  const isWinner = winner === currentPlayerId;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50"
    >
      <motion.div
        initial={{ y: 50 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 15 }}
        className="bg-green-800 rounded-lg p-8 max-w-md w-full shadow-2xl"
      >
        <h2 className="text-3xl font-bold text-center text-white mb-6">
          Game Over!
        </h2>
        
        <div className="mb-6">
          <div className="text-xl text-center text-white mb-2">
            {isWinner ? (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-yellow-300 font-bold"
              >
                You Won! 🏆
              </motion.div>
            ) : (
              <div>
                <span className="text-yellow-300 font-bold">{getPlayerName(winner)}</span> won the game
              </div>
            )}
          </div>
          <div className="text-center text-white">
            Target score: {targetScore} points
          </div>
        </div>
        
        <div className="bg-green-900 rounded-lg p-4 mb-6">
          <h3 className="text-white text-lg font-bold mb-2 text-center">Final Scores</h3>
          <div className="space-y-2">
            {players.map(player => (
              <div
                key={player.id}
                className={`flex justify-between items-center p-2 rounded ${
                  player.id === winner ? 'bg-yellow-800' : 'bg-green-700'
                }`}
              >
                <div className="text-white">
                  {player.name}
                  {player.id === currentPlayerId && ' (You)'}
                </div>
                <div className="text-xl font-bold text-white">
                  {scores[player.id] || 0}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRematch}
            className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg"
          >
            Play Again
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

GameOver.propTypes = {
  winner: PropTypes.string.isRequired,
  scores: PropTypes.object.isRequired,
  players: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ).isRequired,
  currentPlayerId: PropTypes.string.isRequired,
  onRematch: PropTypes.func.isRequired,
  targetScore: PropTypes.number
};

GameOver.defaultProps = {
  targetScore: 75
}; 