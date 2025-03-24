import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

export const Card = ({ suit, value, onClick, disabled, index, animate, isHovered }) => {
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
        delay: index * 0.1
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
      whileHover={disabled ? {} : { 
        scale: 1.05,
        y: -10,
        transition: { duration: 0.2 }
      }}
      className={`
        w-24 h-36 m-2 rounded-lg shadow-lg
        ${disabled ? 'bg-gray-200' : 'bg-white'}
        border-2 ${isHovered ? 'border-yellow-300' : 'border-gray-300'}
        flex flex-col items-center justify-center
        ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
        relative
        transition-all duration-200
        ${isHovered ? 'shadow-xl shadow-yellow-300/30' : ''}
      `}
      style={{ color: isRed ? '#FF0000' : 'black' }}
    >
      {/* Top-left corner */}
      <div className="absolute top-2 left-2 text-sm">
        <div className={`font-bold ${textColorClass}`}>{value}</div>
      </div>

      {/* Center symbol */}
      <div className={`text-6xl ${textColorClass} opacity-30`}>
        {getSuitSymbol()}
      </div>

      {/* Hover effect overlay */}
      {isHovered && !disabled && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-yellow-300/10 rounded-lg"
        />
      )}
    </motion.button>
  );
};

Card.propTypes = {
  suit: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  index: PropTypes.number,
  animate: PropTypes.string,
  isHovered: PropTypes.bool
};

Card.defaultProps = {
  onClick: () => {},
  disabled: false,
  index: 0,
  isHovered: false
}; 