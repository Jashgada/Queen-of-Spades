import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { Hand } from './Hand';
import { Card } from './Card';
import { ScoreBoard } from './ScoreBoard';
import { PlayedCards } from './PlayedCards';
import { GameToast } from './GameToast';
import { GameOver } from './GameOver';

export const GameBoard = ({ gameState, onPlayCard, onRematch, errorMessage }) => {
  const { players, currentPlayer, playedCards, hand } = gameState;
  const [toast, setToast] = useState(null);
  const [toastId, setToastId] = useState(0); // Add a unique ID for toasts

  const showToast = (message) => {
    setToast(message);
    setToastId(prev => prev + 1); // Increment toast ID to ensure uniqueness
  };

  const handlePlayCard = (card) => {
    onPlayCard(card);
    showToast(`You played ${card.value} of ${card.suit}`);
  };

  return (
    <div className="min-h-screen bg-green-900 p-4">
      <div className="grid grid-cols-12 gap-4 h-full">
        {/* Left sidebar - Scoreboard */}
        <div className="col-span-3">
          <ScoreBoard
            players={players}
            scores={gameState.scores}
            currentPlayerId={gameState.currentPlayerId}
          />
          
          {/* Target score display */}
          <div className="bg-green-800 rounded-lg p-4 shadow-lg mt-4">
            <h2 className="text-white text-xl font-bold mb-2 text-center">Target Score</h2>
            <div className="text-2xl font-bold text-yellow-300 text-center">
              {gameState.targetScore || 75} points
            </div>
          </div>
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
                  <div className={`mb-2 text-xl font-bold ${player.id === currentPlayer ? 'text-yellow-300' : ''}`}>
                    {player.name}
                    {player.id === currentPlayer && ' (Current Turn)'}
                  </div>
                  <div className="bg-green-800 p-4 rounded-lg">
                    <div className="text-sm">Cards: {player.handSize || 0}</div>
                  </div>
                </motion.div>
              ))}
          </div>

          {/* Center area with current played card */}
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-green-800 p-8 rounded-lg min-w-[300px] min-h-[200px] flex items-center justify-center">
              <AnimatePresence mode="popLayout">
                {playedCards.length > 0 ? (
                  <Card
                    key={`played-${playedCards[playedCards.length - 1].playerId}-${playedCards[playedCards.length - 1].card.suit}-${playedCards[playedCards.length - 1].card.value}`}
                    suit={playedCards[playedCards.length - 1].card.suit}
                    value={playedCards[playedCards.length - 1].card.value}
                    disabled
                    animate="played"
                  />
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
                className={`text-xl font-bold ${gameState.currentPlayer === gameState.currentPlayerId ? 'text-yellow-300' : 'text-white'}`}
                initial={{ scale: 1 }}
                animate={{ scale: gameState.currentPlayer === gameState.currentPlayerId ? 1.1 : 1 }}
                transition={{ 
                  duration: 0.5, 
                  repeat: gameState.currentPlayer === gameState.currentPlayerId ? Infinity : 0, 
                  repeatType: "reverse"
                }}
              >
                {gameState.currentPlayer === gameState.currentPlayerId ? 'Your Turn!' : 'Waiting for other player...'}
              </motion.div>
            </div>
            <Hand
              cards={hand}
              onPlayCard={handlePlayCard}
              isActive={gameState.currentPlayer === gameState.currentPlayerId}
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