import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

export const Card = ({ suit, value, onClick, disabled, index, animate, isHovered, size, playable, unplayable, readOnly }) => {
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
  const sizeClass = size === 'hand'
    ? 'h-24 w-[4.25rem] sm:h-28 sm:w-20 lg:h-36 lg:w-24'
    : size === 'table'
      ? 'h-20 w-14 sm:h-24 sm:w-16'
      : 'h-36 w-24';

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
        delay: Math.min(index * 0.025, 0.3)
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
      type="button"
      onClick={onClick}
      disabled={disabled || readOnly}
      aria-label={`${value} of ${suit}`}
      title={`${value} of ${suit}`}
      variants={cardVariants}
      initial={size === 'table' ? { opacity: 0, scale: 0.8 } : 'undealt'}
      animate={animate || "dealt"}
      whileHover={disabled || readOnly ? {} : {
        scale: 1.05,
        y: -10,
        transition: { duration: 0.2 }
      }}
      className={`
        ${sizeClass} relative flex shrink-0 select-none flex-col items-center justify-center
        rounded-xl border-2 shadow-lg transition-all duration-200
        ${readOnly ? 'cursor-default bg-white' : disabled ? (size === 'table' ? 'cursor-default bg-white' : 'cursor-not-allowed bg-gray-100') : 'cursor-pointer bg-white hover:-translate-y-1 hover:shadow-xl'}
        ${unplayable ? 'opacity-40 grayscale' : ''}
        ${playable ? 'border-gold-light shadow-[0_0_14px_rgba(222,178,92,0.35)]' : isHovered ? 'border-yellow-300 shadow-yellow-300/30' : 'border-gray-300'}
        focus-visible:z-10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-yellow-300/70
      `}
      style={{ color: isRed ? '#FF0000' : 'black' }}
    >
      {/* Top-left corner */}
      <div className={`absolute left-1.5 top-1.5 flex flex-col items-center text-xs leading-none sm:left-2 sm:top-2 sm:text-sm ${textColorClass}`}>
        <span className="font-bold">{value}</span>
        <span aria-hidden="true">{getSuitSymbol()}</span>
      </div>

      {/* Center symbol */}
      <div aria-hidden="true" className={`${size === 'table' ? 'text-4xl sm:text-5xl' : 'text-5xl sm:text-6xl'} ${textColorClass} opacity-30`}>
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
  isHovered: PropTypes.bool,
  size: PropTypes.oneOf(['default', 'hand', 'table']),
  playable: PropTypes.bool,
  unplayable: PropTypes.bool,
  readOnly: PropTypes.bool,
};

Card.defaultProps = {
  onClick: () => {},
  disabled: false,
  index: 0,
  isHovered: false,
  size: 'default',
  playable: false,
  unplayable: false,
  readOnly: false,
};
