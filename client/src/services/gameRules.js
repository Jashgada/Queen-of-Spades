/**
 * Game Rules for Queen of Spades
 * 
 * Basic rules:
 * - Players take turns playing cards
 * - First player can play any card
 * - Subsequent players must follow suit if possible
 * - If a player cannot follow suit, they can play any card
 * - The highest card of the led suit wins the trick
 * - Point system:
 *   - Five (5) is worth 5 points
 *   - Ten (10) is worth 10 points
 *   - Ace (A) is worth 15 points
 *   - Queen of Spades (Q♠) is worth 30 points
 * - The goal is to reach a target score (minimum 75 points)
 */

// Check if a card play is valid
export const isValidPlay = (card, hand, playedCards, isFirstPlay) => {
  // First play of the game or round - any card is valid
  if (isFirstPlay || playedCards.length === 0) {
    return true;
  }

  // Get the suit of the first card played in this trick
  const leadSuit = playedCards[0].card.suit;

  // If player has cards of the lead suit, they must play one
  const hasSuit = hand.some(c => c.suit.toLowerCase() === leadSuit.toLowerCase());
  
  if (hasSuit) {
    // Must follow suit
    return card.suit.toLowerCase() === leadSuit.toLowerCase();
  }
  
  // Player doesn't have the lead suit, can play any card
  return true;
};

// Calculate points for a trick
export const calculateTrickPoints = (trick) => {
  let points = 0;
  
  trick.forEach(play => {
    const { suit, value } = play.card;
    
    // Only count points for specific cards
    if (value === '5') {
      // Five is worth 5 points
      points += 5;
    } else if (value === '10') {
      // Ten is worth 10 points
      points += 10;
    } else if (value === 'A') {
      // Ace is worth 15 points
      points += 15;
    } else if (suit.toLowerCase() === 'spades' && value === 'Q') {
      // Queen of Spades is worth 30 points
      points += 30;
    }
    // All other cards are worth 0 points
  });
  
  return points;
};

// Determine the winner of a trick
export const determineTrickWinner = (trick) => {
  if (!trick || trick.length === 0) return null;
  
  const leadSuit = trick[0].card.suit.toLowerCase();
  let highestCard = trick[0];
  const cardValues = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  
  trick.forEach(play => {
    // Only cards of the lead suit can win
    if (play.card.suit.toLowerCase() === leadSuit) {
      const currentValue = cardValues.indexOf(play.card.value);
      const highestValue = cardValues.indexOf(highestCard.card.value);
      
      if (currentValue > highestValue) {
        highestCard = play;
      }
    }
  });
  
  return highestCard.playerId;
};

// Check if the game is over (someone reached the target score)
export const isGameOver = (scores, targetScore = 75) => {
  return Object.values(scores).some(score => score >= targetScore);
};

// Get the winner of the game
export const getGameWinner = (scores, targetScore = 75) => {
  // The winner is the first player to reach or exceed the target score
  let winner = null;
  
  Object.entries(scores).forEach(([playerId, score]) => {
    if (score >= targetScore) {
      winner = playerId;
    }
  });
  
  return winner;
}; 