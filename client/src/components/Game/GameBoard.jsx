import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { Hand } from './Hand';
import { Card } from './Card';
import { ScoreBoard } from './ScoreBoard';
import { PlayedCards } from './PlayedCards';
import { GameToast } from './GameToast';
import { GameOver } from './GameOver';

// Helper function to get player avatar URL
const getPlayerAvatar = (playerId) => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${playerId}&size=50`;
};

export const GameBoard = ({ gameState, onPlayCard, onRematch, errorMessage }) => {
  const { players, currentPlayer, playedCards, hand, trickNumber } = gameState;
  const [toast, setToast] = useState(null);
  const [toastId, setToastId] = useState(0);
  const [hoveredCard, setHoveredCard] = useState(null);

  const showToast = (message) => {
    setToast(message);
    setToastId(prev => prev + 1);
  };

  const handlePlayCard = (card) => {
    onPlayCard(card);
    showToast(`You played ${card.value} of ${card.suit}`);
  };

  return (
    <div className="min-h-screen bg-green-900 p-4">
      {/* Game Status Bar */}
      <div className="bg-green-800 rounded-lg p-2 mb-4 flex justify-between items-center">
        <div className="text-white">
          <span className="font-bold">Trick {trickNumber + 1}</span>
          <span className="mx-2">•</span>
          <span>{playedCards.length}/4 cards played</span>
        </div>
        <div className="text-yellow-300 font-bold">
          Target: {gameState.targetScore || 75} points
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 h-full">
        {/* Left sidebar - Scoreboard */}
        <div className="col-span-3">
          <ScoreBoard
            players={players}
            scores={gameState.scores}
            currentPlayerId={gameState.currentPlayerId}
          />
        </div>

        {/* Main game area */}
        <div className="col-span-6 flex flex-col">
          {/* Other players */}
          <div className="w-full flex justify-around mb-8">
            {players
              .filter(player => player.id !== gameState.currentPlayerId)
              .map(player => (
                <motion.div
                  key={player.id}
                  className="text-white text-center"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="text-white text-center">
                    <div className="relative mb-2 flex flex-col items-center">
                      <motion.div
                        className="w-8 h-8 rounded-full overflow-hidden border-2 border-transparent"
                        animate={{
                          scale: player.id === currentPlayer ? 1.1 : 1,
                          rotate: player.id === currentPlayer ? 5 : 0
                        }}
                        transition={{ duration: 0.3 }}
                      >
                        <img
                          src={getPlayerAvatar(player.id)}
                          alt={player.name}
                          className="w-full h-full object-cover"
                        />
                      </motion.div>
                      <div className={`mt-1 text-base font-bold ${player.id === currentPlayer ? 'text-yellow-300' : ''}`}>
                        {player.name}
                      </div>
                    </div>
                    <div className="bg-green-800 p-2 rounded-lg">
                      <div className="text-xs">Cards: {player.handSize || 0}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
          </div>

          {/* Center area with current played card */}
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-green-800 p-8 rounded-lg min-w-[300px] min-h-[200px] flex items-center justify-center relative">
              <AnimatePresence mode="popLayout">
                {playedCards.length > 0 ? (
                  <motion.div
                    key={`played-${playedCards[playedCards.length - 1].playerId}-${playedCards[playedCards.length - 1].card.suit}-${playedCards[playedCards.length - 1].card.value}`}
                    initial={{ scale: 0.5, opacity: 0, y: 50 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.5, opacity: 0, y: -50 }}
                    transition={{ duration: 0.3 }}
                    className="relative"
                  >
                    <Card
                      suit={playedCards[playedCards.length - 1].card.suit}
                      value={playedCards[playedCards.length - 1].card.value}
                      disabled
                      animate="played"
                    />
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-white text-sm">
                      {players.find(p => p.id === playedCards[playedCards.length - 1].playerId)?.name}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="no-cards"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-white text-lg"
                  >
                    No cards played yet
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Current player's hand */}
          <div className="w-full mt-8">
            <div className="text-center mb-4">
              <motion.div
                className={`text-xl font-bold px-4 py-2 ${gameState.currentPlayer === gameState.currentPlayerId ? 'text-yellow-300' : 'text-white'}`}
                initial={{ scale: 1 }}
                animate={{ 
                  scale: gameState.currentPlayer === gameState.currentPlayerId ? 1.1 : 1,
                  y: gameState.currentPlayer === gameState.currentPlayerId ? -5 : 0
                }}
                transition={{ 
                  duration: 1.5, 
                  repeat: gameState.currentPlayer === gameState.currentPlayerId ? Infinity : 0, 
                  repeatType: "reverse",
                  repeatDelay: 1
                }}
              >
                {gameState.currentPlayer === gameState.currentPlayerId ? 'Your Turn!' : 'Waiting for other player...'}
              </motion.div>
            </div>
            <Hand
              cards={hand}
              onPlayCard={handlePlayCard}
              isActive={gameState.currentPlayer === gameState.currentPlayerId}
              hoveredCard={hoveredCard}
              onCardHover={setHoveredCard}
            />
          </div>
        </div>

        {/* Right sidebar - Played cards history */}
        <div className="col-span-3">
          <PlayedCards cards={playedCards} players={players} />
        </div>
      </div>

      {/* Toast notifications */}
      <AnimatePresence>
        {toast && (
          <GameToast
            key={`toast-${toastId}`}
            message={toast}
            onClose={() => setToast(null)}
          />
        )}
        {errorMessage && (
          <GameToast
            key={`error-${errorMessage}`}
            message={errorMessage}
            onClose={() => {}}
            duration={3000}
          />
        )}
        {gameState.lastTrick && (
          <GameToast
            key={`trick-${gameState.trickNumber}-${gameState.lastTrick.winner}`}
            message={`${players.find(p => p.id === gameState.lastTrick.winner)?.name || 'Player'} won the trick (+${gameState.lastTrick.points} points)`}
            onClose={() => {}}
            duration={2000}
          />
        )}
      </AnimatePresence>

      {/* Game over modal */}
      <AnimatePresence>
        {gameState.gameOver && (
          <GameOver
            winner={gameState.winner}
            scores={gameState.scores}
            players={players}
            currentPlayerId={gameState.currentPlayerId}
            onRematch={onRematch}
            targetScore={gameState.targetScore}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

GameBoard.propTypes = {
  gameState: PropTypes.shape({
    players: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        handSize: PropTypes.number,
      })
    ).isRequired,
    currentPlayer: PropTypes.string,
    currentPlayerId: PropTypes.string,
    playedCards: PropTypes.arrayOf(
      PropTypes.shape({
        playerId: PropTypes.string.isRequired,
        card: PropTypes.shape({
          suit: PropTypes.string.isRequired,
          value: PropTypes.string.isRequired,
        }).isRequired,
      })
    ).isRequired,
    hand: PropTypes.arrayOf(
      PropTypes.shape({
        suit: PropTypes.string.isRequired,
        value: PropTypes.string.isRequired,
      })
    ).isRequired,
    scores: PropTypes.object.isRequired,
    gameOver: PropTypes.bool,
    winner: PropTypes.string,
    lastTrick: PropTypes.shape({
      winner: PropTypes.string,
      points: PropTypes.number
    }),
    targetScore: PropTypes.number,
    trickNumber: PropTypes.number
  }).isRequired,
  onPlayCard: PropTypes.func.isRequired,
  onRematch: PropTypes.func.isRequired,
  errorMessage: PropTypes.string
}; 