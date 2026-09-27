import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { Card } from './Card';

const SUIT_ORDER = ['spades', 'hearts', 'clubs', 'diamonds'];
const RANK_ORDER = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];

export const Hand = ({ cards, onPlayCard, isActive, leadSuit, readOnly }) => {
  const sortedCards = [...cards].sort((cardA, cardB) => {
    const suitDifference = SUIT_ORDER.indexOf(cardA.suit) - SUIT_ORDER.indexOf(cardB.suit);
    if (suitDifference !== 0) return suitDifference;
    return RANK_ORDER.indexOf(cardA.value) - RANK_ORDER.indexOf(cardB.value);
  });
  const hasLeadSuit = Boolean(leadSuit && cards.some(card => card.suit === leadSuit));
  const mustFollowSuit = isActive && Boolean(leadSuit) && hasLeadSuit;

  const container = {
    dealt: {
      transition: {
        staggerChildren: 0.025
      }
    }
  };

  return (
    <div className="space-y-2">
      {isActive && leadSuit && cards.length > 0 && (
        <p className="px-1 text-xs font-medium text-white/70" role="status">
          {mustFollowSuit
            ? `Follow suit: play a ${leadSuit} card.`
            : `You have no ${leadSuit} cards; any card is playable.`}
        </p>
      )}
      <motion.div
        variants={container}
        initial="undealt"
        animate="dealt"
        role="group"
        aria-label="Your hand, sorted by suit and rank"
        className="flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-felt-dark/50 p-3 sm:gap-2 sm:p-4"
      >
        {sortedCards.map((card, index) => {
          const isUnplayable = mustFollowSuit && card.suit !== leadSuit;
          const isPlayable = mustFollowSuit && card.suit === leadSuit;

          return (
            <Card
              key={`${card.suit}-${card.value}`}
              suit={card.suit}
              value={card.value}
              onClick={() => onPlayCard(card)}
              disabled={!readOnly && (!isActive || isUnplayable)}
              playable={isPlayable}
              unplayable={isUnplayable}
              readOnly={readOnly}
              index={index}
              size="hand"
            />
          );
        })}
      </motion.div>
    </div>
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
  isActive: PropTypes.bool,
  leadSuit: PropTypes.oneOf(['hearts', 'diamonds', 'clubs', 'spades']),
  readOnly: PropTypes.bool,
};

Hand.defaultProps = {
  isActive: false,
  readOnly: false
};
