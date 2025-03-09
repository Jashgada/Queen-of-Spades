import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { Card } from './Card';

export const Hand = ({ cards, onPlayCard, isActive }) => {
  const container = {
    dealt: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <motion.div
      variants={container}
      initial="undealt"
      animate="dealt"
      className="flex flex-wrap justify-center items-center p-4 bg-green-800 rounded-lg"
    >
      {cards.map((card, index) => (
        <Card
          key={`${card.suit}-${card.value}`}
          suit={card.suit}
          value={card.value}
          onClick={() => onPlayCard(card)}
          disabled={!isActive}
          index={index}
        />
      ))}
    </motion.div>
  );
};

Hand.propTypes = {
  cards: PropTypes.arrayOf(
    PropTypes.shape({
      suit: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    })
  ).isRequired,
  onPlayCard: PropTypes.func.isRequired,
  isActive: PropTypes.bool
};

Hand.defaultProps = {
  isActive: false
}; 