import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

export const ScoreBoard = ({ players, scores, currentPlayerId }) => {
  return (
    <div className="bg-green-800 rounded-lg p-4 shadow-lg">
      <h2 className="text-white text-xl font-bold mb-4 text-center">Scores</h2>
      <div className="space-y-2">
        {players.map(player => (
          <motion.div
            key={player.id}
            className={`flex justify-between items-center p-2 rounded ${
              player.id === currentPlayerId ? 'bg-green-700' : 'bg-green-900'
            }`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-white">
              {player.name}
              {player.id === currentPlayerId && ' (You)'}
            </div>
            <div className="text-2xl font-bold text-yellow-300">
              {scores[player.id] || 0}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
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
  currentPlayerId: PropTypes.string.isRequired,
}; 