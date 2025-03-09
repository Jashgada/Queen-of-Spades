import React, { useState, useEffect } from 'react';
import { GameBoard } from './GameBoard';
import { useGame } from '../../hooks/useGame';

export const Game = () => {
  const { gameState, errorMessage, createGame, joinGame, startGame, playCard, rematch, isCurrentPlayer } = useGame();
  const [playerName, setPlayerName] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [view, setView] = useState('home'); // home, create, join

  // When gameState.gameCode is set, transition to the lobby
  useEffect(() => {
    if (gameState.gameCode && (view === 'create' || view === 'join')) {
      setView('lobby');
    }
  }, [gameState.gameCode, view]);

  const handleCreateGame = (e) => {
    e.preventDefault();
    if (playerName.trim()) {
      createGame(playerName.trim());
      setPlayerName('');
    }
  };

  const handleJoinGame = (e) => {
    e.preventDefault();
    if (playerName.trim() && gameCode.trim()) {
      joinGame(gameCode.trim(), playerName.trim());
      setPlayerName('');
      setGameCode('');
    }
  };

  const handlePlayCard = (card) => {
    if (isCurrentPlayer) {
      playCard(gameState.currentPlayerId, card);
    }
  };

  const handleRematch = () => {
    rematch();
  };

  if (gameState.gameStatus === 'waiting') {
    if (view === 'home') {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-green-900 text-white">
          <h1 className="text-4xl mb-8">Queen of Spades</h1>
          <div className="space-y-4">
            <button
              onClick={() => setView('create')}
              className="w-48 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Create Game
            </button>
            <button
              onClick={() => setView('join')}
              className="w-48 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              Join Game
            </button>
          </div>
        </div>
      );
    }

    if (view === 'create') {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-green-900 text-white">
          <h1 className="text-4xl mb-8">Create Game</h1>
          <form onSubmit={handleCreateGame} className="space-y-4">
            <div>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                className="px-4 py-2 text-black rounded focus:outline-none w-64"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Create Game
            </button>
          </form>
          <button
            onClick={() => setView('home')}
            className="mt-4 text-gray-300 hover:text-white"
          >
            Back
          </button>
        </div>
      );
    }

    if (view === 'join') {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-green-900 text-white">
          <h1 className="text-4xl mb-8">Join Game</h1>
          <form onSubmit={handleJoinGame} className="space-y-4">
            <div>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                className="w-64 px-4 py-2 text-black rounded focus:outline-none mb-2"
              />
            </div>
            <div>
              <input
                type="text"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                placeholder="Enter game code"
                className="w-64 px-4 py-2 text-black rounded focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              Join Game
            </button>
          </form>
          <button
            onClick={() => setView('home')}
            className="mt-4 text-gray-300 hover:text-white"
          >
            Back
          </button>
        </div>
      );
    }

    // Lobby view (after creating/joining a game)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-green-900 text-white">
        <h1 className="text-4xl mb-8">Game Lobby</h1>
        {gameState.gameCode && (
          <div className="mb-8 p-4 bg-green-800 rounded-lg text-center">
            <div className="text-sm mb-1">Share this code with other players:</div>
            <div className="text-3xl font-mono font-bold tracking-wider">{gameState.gameCode}</div>
          </div>
        )}
        <div className="mb-4">
          Players joined: {gameState.players.length}
        </div>
        <div className="mb-8">
          <h2 className="text-xl mb-2">Players:</h2>
          <ul className="bg-green-800 rounded-lg p-4">
            {gameState.players.map(player => (
              <li key={player.id} className="text-lg mb-2">
                {player.name} {player.id === gameState.currentPlayerId ? '(You)' : ''}
              </li>
            ))}
          </ul>
        </div>
        {gameState.players.length >= 2 && gameState.currentPlayerId === gameState.players[0]?.id && (
          <button
            onClick={startGame}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            Start Game
          </button>
        )}
      </div>
    );
  }

  return (
    <GameBoard
      gameState={gameState}
      onPlayCard={handlePlayCard}
      onRematch={handleRematch}
      errorMessage={errorMessage}
    />
  );
}; 