import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

// Helper function to get player avatar URL (same as in GameBoard)
const getPlayerAvatar = (playerId) => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${playerId}&size=50`;
};

export const ScoreBoard = ({ players, scores, currentPlayerId }) => {
  return (
    <div className="bg-green-800 rounded-lg p-4 shadow-lg">
      <h2 className="text-white text-xl font-bold mb-4 text-center">Scores</h2>
      <div className="overflow-hidden rounded-lg">
        <table className="w-full">
          <thead>
            <tr>
              {players.map(player => (
                <th 
                  key={player.id} 
                  className={`px-4 py-2 text-center ${
                    player.id === currentPlayerId ? 'bg-green-700/50' : 'bg-green-900/50'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-transparent mx-auto">
                      <img
                        src={getPlayerAvatar(player.id)}
                        alt={player.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-white text-sm font-medium">
                      {player.name}
                      {player.id === currentPlayerId && ' (You)'}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {players.map(player => (
                <td 
                  key={player.id} 
                  className="px-4 py-4 text-center"
                >
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-2xl font-bold text-yellow-300"
                  >
                    {scores[player.id] || 0}
                  </motion.div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
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