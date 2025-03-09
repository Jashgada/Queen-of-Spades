import React from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './Card';

export const PlayedCards = ({ cards, players }) => {
  const getPlayerName = (playerId) => {
    const player = players.find(p => p.id === playerId);
    return player ? player.name : 'Unknown';
  };

  return (
    <div className="bg-green-800 rounded-lg p-4 shadow-lg">
      <h2 className="text-white text-xl font-bold mb-4 text-center">Last Played Cards</h2>
      <div className="relative h-[400px] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {cards.slice().reverse().map((play, index) => (
            <motion.div
              key={`${play.playerId}-${play.card.suit}-${play.card.value}`}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.3 }}
              className="mb-4 last:mb-0"
            >
              <div className="text-white text-sm mb-1">
                {getPlayerName(play.playerId)} played:
              </div>
              <div className="transform scale-75 origin-left">
                <Card
                  suit={play.card.suit}
                  value={play.card.value}
                  disabled
                />
              </div>
            </motion.div>
          ))}
          {cards.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-white text-center py-4"
            >
              No cards played yet
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

PlayedCards.propTypes = {
  cards: PropTypes.arrayOf(
    PropTypes.shape({
      playerId: PropTypes.string.isRequired,
      card: PropTypes.shape({
        suit: PropTypes.string.isRequired,
        value: PropTypes.string.isRequired,
      }).isRequired,
    })
  ).isRequired,
  players: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ).isRequired,
}; 