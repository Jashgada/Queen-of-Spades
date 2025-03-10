import React, { useState, useEffect, useRef } from 'react';
import { GameBoard } from './GameBoard';
import { useGame } from '../../hooks/useGame';
import { useSocket } from '../../hooks/useSocket';

export const Game = () => {
  const { gameState, errorMessage, createGame, joinGame, startGame, playCard, rematch, isCurrentPlayer } = useGame();
  const { connected } = useSocket();
  const [playerName, setPlayerName] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [view, setView] = useState('home'); // home, create, join, lobby, playing
  const [isLoading, setIsLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const loadingTimeoutRef = useRef(null);

  // When gameState.gameCode is set, transition to the lobby
  useEffect(() => {
    if (gameState.gameCode && (view === 'create' || view === 'join')) {
      console.log('[Game] Game code received, transitioning to lobby:', gameState.gameCode);
      setView('lobby');
      setIsLoading(false);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    }
  }, [gameState.gameCode, view]);

  // Reset loading state when there's an error
  useEffect(() => {
    if (errorMessage) {
      console.log('[Game] Error received, resetting loading state:', errorMessage);
      setIsLoading(false);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    }
  }, [errorMessage]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, []);

  // Enable debug mode with keyboard shortcut (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setShowDebug(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // When gameState changes, update the view accordingly
  useEffect(() => {
    console.log('[Game] Game state updated:', gameState);
    if (gameState.gameStatus === 'playing') {
      console.log('[Game] Transitioning to playing view');
      setView('playing');
    } else if (gameState.gameStatus === 'finished') {
      console.log('[Game] Transitioning to game over view');
      setView('gameOver');
    }
  }, [gameState.gameStatus]);

  // Create a new game
  const handleCreateGame = async (e) => {
    e.preventDefault();
    if (playerName.trim() && connected) {
      setIsLoading(true);
      console.log('[Game] Creating game with player name:', playerName.trim());
      
      try {
        // Clear any existing timeout
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }

        // Call createGame with a timeout in case the server doesn't respond
        const createPromise = createGame(playerName.trim());
        const timeoutPromise = new Promise((_, reject) => {
          loadingTimeoutRef.current = setTimeout(() => {
            reject(new Error('No response from server'));
          }, 10000);
        });

        // Race the createGame promise against the timeout
        await Promise.race([createPromise, timeoutPromise]);
        
        // If we get here, the game was created successfully
        // The view will be updated by the useEffect that watches gameState.gameCode
      } catch (error) {
        console.error('[Game] Error creating game:', error);
        setIsLoading(false);
        alert(error.message || 'Failed to create game');
      }
    } else if (!connected) {
      alert('Not connected to server. Please try again.');
    }
  };

  // Join an existing game
  const handleJoinGame = async (e) => {
    e.preventDefault();
    if (playerName.trim() && gameCode.trim() && connected) {
      setIsLoading(true);
      console.log('[Game] Joining game with code:', gameCode.trim(), 'and name:', playerName.trim());
      
      try {
        // Clear any existing timeout
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }

        // Call joinGame with a timeout in case the server doesn't respond
        const joinPromise = joinGame(gameCode.trim(), playerName.trim());
        const timeoutPromise = new Promise((_, reject) => {
          loadingTimeoutRef.current = setTimeout(() => {
            reject(new Error('No response from server'));
          }, 10000);
        });

        // Race the joinGame promise against the timeout
        await Promise.race([joinPromise, timeoutPromise]);
        
        // If we get here, the game was joined successfully
        // The view will be updated by the useEffect that watches gameState.gameCode
      } catch (error) {
        console.error('[Game] Error joining game:', error);
        setIsLoading(false);
        alert(error.message || 'Failed to join game');
      }
    } else if (!connected) {
      alert('Not connected to server. Please try again.');
    }
  };

  // Start the game
  const handleStartGame = async () => {
    console.log('[Game] Starting game');
    try {
      const response = await startGame();
      console.log('[Game] Start game response:', response);
      // View will be updated by the gameState.gameStatus effect
    } catch (error) {
      console.error('[Game] Error starting game:', error);
      alert(error.message || 'Failed to start game');
    }
  };

  // Play a card
  const handlePlayCard = async (card) => {
    if (isCurrentPlayer()) {
      console.log('[Game] Playing card:', card);
      try {
        await playCard(gameState.currentPlayerId, card);
      } catch (error) {
        console.error('[Game] Error playing card:', error);
        alert(error.message || 'Failed to play card');
      }
    }
  };

  // Request a rematch
  const handleRematch = async () => {
    console.log('[Game] Requesting rematch');
    try {
      await rematch();
      // The view will be updated by state changes from the game:restarted event
    } catch (error) {
      console.error('[Game] Error requesting rematch:', error);
      alert(error.message || 'Failed to request rematch');
    }
  };

  // Cancel loading state
  const handleCancelLoading = () => {
    setIsLoading(false);
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  };

  // DEBUG FUNCTION
  const showState = () => {
    console.log('[Game] Current state:', {
      view,
      isLoading,
      playerName,
      gameCode,
      gameState,
      errorMessage,
      connected
    });
    alert('Debug info logged to console');
  };

  // Render appropriate view based on current state
  if (view === 'home') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-green-900 text-white">
        <h1 className="text-4xl mb-8">Queen of Spades</h1>
        <div className="space-y-4">
          <button
            onClick={() => setView('create')}
            className="w-48 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            disabled={!connected}
          >
            Create Game
          </button>
          <button
            onClick={() => setView('join')}
            className="w-48 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            disabled={!connected}
          >
            Join Game
          </button>
        </div>
        {!connected && (
          <div className="mt-4 text-yellow-300">
            Connecting to server...
          </div>
        )}
        {showDebug && (
          <div className="mt-4">
            <button onClick={showState} className="text-xs underline">Debug</button>
          </div>
        )}
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
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            className={`w-full font-bold py-2 px-4 rounded ${
              isLoading 
                ? 'bg-gray-500 cursor-not-allowed' 
                : 'bg-blue-500 hover:bg-blue-700 text-white'
            }`}
            disabled={isLoading || !connected}
          >
            {isLoading ? 'Creating...' : 'Create Game'}
          </button>
        </form>
        <div className="mt-4 flex space-x-4">
          <button
            onClick={() => setView('home')}
            className="text-gray-300 hover:text-white"
            disabled={isLoading}
          >
            Back
          </button>
          {isLoading && (
            <button
              onClick={handleCancelLoading}
              className="text-red-300 hover:text-red-100"
            >
              Cancel
            </button>
          )}
        </div>
        {errorMessage && (
          <div className="mt-4 text-red-500 bg-red-900 p-2 rounded">
            {errorMessage}
          </div>
        )}
        {isLoading && (
          <div className="mt-4 text-yellow-300">
            Waiting for server response...
          </div>
        )}
        {showDebug && (
          <div className="mt-4">
            <button onClick={showState} className="text-xs underline">Debug</button>
          </div>
        )}
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
              disabled={isLoading}
            />
          </div>
          <div>
            <input
              type="text"
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value.toUpperCase())}
              placeholder="Enter game code"
              className="w-64 px-4 py-2 text-black rounded focus:outline-none"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            className={`w-full font-bold py-2 px-4 rounded ${
              isLoading 
                ? 'bg-gray-500 cursor-not-allowed' 
                : 'bg-green-500 hover:bg-green-700 text-white'
            }`}
            disabled={isLoading || !connected}
          >
            {isLoading ? 'Joining...' : 'Join Game'}
          </button>
        </form>
        <div className="mt-4 flex space-x-4">
          <button
            onClick={() => setView('home')}
            className="text-gray-300 hover:text-white"
            disabled={isLoading}
          >
            Back
          </button>
          {isLoading && (
            <button
              onClick={handleCancelLoading}
              className="text-red-300 hover:text-red-100"
            >
              Cancel
            </button>
          )}
        </div>
        {errorMessage && (
          <div className="mt-4 text-red-500 bg-red-900 p-2 rounded">
            {errorMessage}
          </div>
        )}
        {isLoading && (
          <div className="mt-4 text-yellow-300">
            Waiting for server response...
          </div>
        )}
        {showDebug && (
          <div className="mt-4">
            <button onClick={showState} className="text-xs underline">Debug</button>
          </div>
        )}
      </div>
    );
  }

  if (view === 'lobby') {
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
            onClick={handleStartGame}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            Start Game
          </button>
        )}
        {errorMessage && (
          <div className="mt-4 text-red-500 bg-red-900 p-2 rounded">
            {errorMessage}
          </div>
        )}
        {showDebug && (
          <div className="mt-4">
            <button onClick={showState} className="text-xs underline">Debug</button>
          </div>
        )}
      </div>
    );
  }

  if (view === 'playing') {
    return (
      <GameBoard
        gameState={gameState}
        onPlayCard={handlePlayCard}
        onRematch={handleRematch}
        errorMessage={errorMessage}
      />
    );
  }

  // Playing mode - return a simple placeholder
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-green-900 text-white">
      <h1 className="text-4xl mb-8">Game View</h1>
      <p>Game is now in progress! This is a placeholder for the actual game board.</p>
      
      <div className="mt-8">
        <h2 className="text-2xl mb-2">Game Information:</h2>
        <p>Current Player: {gameState.currentPlayer === gameState.currentPlayerId ? 'Your turn' : 'Waiting for other player'}</p>
        <p>Players: {gameState.players.map(p => p.name).join(', ')}</p>
        <p>Hand Size: {gameState.hand.length} cards</p>
      </div>
      
      {gameState.gameOver && (
        <div className="mt-8">
          <h2 className="text-2xl mb-2">Game Over!</h2>
          <p>Winner: {gameState.players.find(p => p.id === gameState.winner)?.name || 'Unknown'}</p>
          <button
            onClick={handleRematch}
            className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Rematch
          </button>
        </div>
      )}
      
      {errorMessage && (
        <div className="mt-4 text-red-500 bg-red-900 p-2 rounded">
          {errorMessage}
        </div>
      )}
      
      {showDebug && (
        <div className="mt-4">
          <button onClick={showState} className="text-xs underline">Debug</button>
        </div>
      )}
    </div>
  );
}; 