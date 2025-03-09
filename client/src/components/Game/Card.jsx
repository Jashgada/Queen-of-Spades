import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

export const Card = ({ suit, value, onClick, disabled, index, animate }) => {
  const getSuitSymbol = () => {
    switch (suit.toLowerCase()) {
      case 'spades': return '♠';
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      default: return suit;
    }
  };

  const isRed = suit.toLowerCase() === 'hearts' || suit.toLowerCase() === 'diamonds';
  const textColorClass = isRed ? 'text-[#FF0000]' : 'text-black';

  // Animation variants
  const cardVariants = {
    dealt: {
      opacity: 1,
      scale: 1,
      x: 0,
      y: 0,
      rotateY: 0,
      transition: { 
        type: "spring",
        duration: 0.5,
        delay: index * 0.1 // Stagger the dealing animation
      }
    },
    undealt: {
      opacity: 0,
      scale: 0.5,
      x: -300,
      y: -300,
      rotateY: 180,
    },
    played: {
      scale: 1.1,
      y: -100,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20
      }
    }
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      variants={cardVariants}
      initial="undealt"
      animate={animate || "dealt"}
      whileHover={disabled ? {} : { scale: 1.05 }}
      className={`
        w-24 h-36 m-2 rounded-lg shadow-lg
        ${disabled ? 'bg-gray-200' : 'bg-white'}
        border-2 border-gray-300
        flex flex-col items-center justify-center
        ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
      `}
      style={{ color: isRed ? '#FF0000' : 'black' }}
    >
      <div className={`text-2xl font-bold ${textColorClass}`} style={{ color: isRed ? '#FF0000' : 'black' }}>
        {value}
      </div>
      <div className={`text-5xl ${textColorClass}`} style={{ color: isRed ? '#FF0000' : 'black' }}>
        {getSuitSymbol()}
      </div>
    </motion.button>
  );
};

Card.propTypes = {
  suit: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  index: PropTypes.number,
  animate: PropTypes.string
};

Card.defaultProps = {
  onClick: () => {},
  disabled: false,
  index: 0
}; 