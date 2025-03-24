import React, { useState, useEffect, useRef } from 'react';
import { GameBoard } from './GameBoard';
import { useGame } from '../../hooks/useGame';
import { useSocket } from '../../hooks/useSocket';
import { motion, AnimatePresence } from 'framer-motion';

// Updated StatBox component
const StatBox = ({ label, value }) => (
  <div className="mb-2">
    <div className="text-black/70 text-sm">{label}</div>
    <div className="text-black font-semibold">{value}</div>
  </div>
);

// Updated WinnerItem component
const WinnerItem = ({ name, amount, avatar }) => (
  <tr className="border-b border-black/10 last:border-0">
    <td className="py-2 pr-2">
      <img src={avatar} alt={name} className="w-6 h-6 rounded-full" />
    </td>
    <td className="py-2 text-black">{name}</td>
    <td className="py-2 text-right text-black font-semibold">${amount}</td>
  </tr>
);

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

  // Render home view
  if (view === 'home') {
    return (
      <div className="min-h-screen bg-felt bg-felt-texture p-6 flex flex-col items-center">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-1">
            <img src="/assets/images/crown.svg" alt="Crown" className="w-6 h-6 mr-2" />
            <h1 className="text-black text-2xl font-bold">Queen of Spades</h1>
          </div>
          <div className="text-black/70 text-sm">Multiplayer Card Game</div>
        </div>

        {/* Main Container */}
        <div className="w-full max-w-md bg-white rounded-md p-4 shadow-md">
          {/* Action Buttons */}
          <div className="mb-4">
            <button 
              onClick={() => setView('create')}
              className="w-full bg-gray-200 hover:bg-gray-300 text-black py-1 px-2 rounded mb-2 flex items-center justify-center"
            >
              <img src="/assets/images/plus.svg" alt="Create" className="w-4 h-4 mr-2" />
              Create New Room
            </button>
            <button 
              onClick={() => setView('join')}
              className="w-full bg-gray-200 hover:bg-gray-300 text-black py-1 px-2 rounded flex items-center justify-center"
            >
              <img src="/assets/images/gamepad.svg" alt="Join" className="w-4 h-4 mr-2" />
              Join Room
            </button>
          </div>

          {/* Stats */}
          <div className="mb-4">
            <StatBox label="Active Players" value="1,234" />
            <StatBox label="Active Rooms" value="89" />
          </div>

          {/* Recent Winners */}
          <div>
            <h2 className="text-black text-lg font-bold mb-2">Recent Winners</h2>
            <table className="w-full">
              <tbody>
                <WinnerItem 
                  name="Alex M."
                  amount="1,200"
                  avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"
                />
                <WinnerItem 
                  name="Sarah K."
                  amount="950"
                  avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah"
                />
                <WinnerItem 
                  name="Mike R."
                  amount="780"
                  avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=Mike"
                />
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-6 text-black/40 text-sm">
          © 2025 Queen of Spades
        </div>
      </div>
    );
  }

  // Create game view
  if (view === 'create') {
    return (
      <div className="min-h-screen bg-felt bg-felt-texture p-6 flex flex-col items-center">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-1">
            <img src="/assets/images/crown.svg" alt="Crown" className="w-6 h-6 mr-2" />
            <h1 className="text-black text-2xl font-bold">Queen of Spades</h1>
          </div>
          <div className="text-black/70 text-sm">Create New Room</div>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-md bg-white rounded-md p-4 shadow-md">
          <form onSubmit={handleCreateGame} className="space-y-4">
            <div>
              <label htmlFor="playerName" className="block text-black text-sm font-medium mb-1">
                Your Name
              </label>
              <input
                type="text"
                id="playerName"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-2 py-1 bg-gray-100 border border-gray-300 rounded text-black"
                placeholder="Enter your name"
                required
                autoFocus
              />
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setView('home')}
                className="flex-1 px-2 py-1 bg-gray-200 hover:bg-gray-300 text-black rounded"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading || !connected}
                className="flex-1 px-2 py-1 bg-gray-200 hover:bg-gray-300 text-black rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating...' : 'Create Room'}
              </button>
            </div>
          </form>
          
          {!connected && (
            <div className="mt-4 text-yellow-600 text-center">
              Connecting to server...
            </div>
          )}
          
          {errorMessage && (
            <div className="mt-4 text-red-600 bg-red-100 p-2 rounded text-center">
              {errorMessage}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Join game view
  if (view === 'join') {
    return (
      <div className="min-h-screen bg-felt bg-felt-texture p-6 flex flex-col items-center">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-1">
            <img src="/assets/images/crown.svg" alt="Crown" className="w-6 h-6 mr-2" />
            <h1 className="text-black text-2xl font-bold">Queen of Spades</h1>
          </div>
          <div className="text-black/70 text-sm">Join Room</div>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-md bg-white rounded-md p-4 shadow-md">
          <form onSubmit={handleJoinGame} className="space-y-4">
            <div>
              <label htmlFor="playerName" className="block text-black text-sm font-medium mb-1">
                Your Name
              </label>
              <input
                type="text"
                id="playerName"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-2 py-1 bg-gray-100 border border-gray-300 rounded text-black"
                placeholder="Enter your name"
                required
              />
            </div>
            
            <div>
              <label htmlFor="gameCode" className="block text-black text-sm font-medium mb-1">
                Room Code
              </label>
              <input
                type="text"
                id="gameCode"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value)}
                className="w-full px-2 py-1 bg-gray-100 border border-gray-300 rounded text-black"
                placeholder="Enter room code"
                required
                autoFocus
              />
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setView('home')}
                className="flex-1 px-2 py-1 bg-gray-200 hover:bg-gray-300 text-black rounded"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading || !connected}
                className="flex-1 px-2 py-1 bg-gray-200 hover:bg-gray-300 text-black rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Joining...' : 'Join Room'}
              </button>
            </div>
          </form>
          
          {!connected && (
            <div className="mt-4 text-yellow-600 text-center">
              Connecting to server...
            </div>
          )}
          
          {errorMessage && (
            <div className="mt-4 text-red-600 bg-red-100 p-2 rounded text-center">
              {errorMessage}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Lobby view
  if (view === 'lobby') {
    return (
      <div className="min-h-screen bg-felt bg-felt-texture p-6 flex flex-col items-center">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-1">
            <img src="/assets/images/crown.svg" alt="Crown" className="w-6 h-6 mr-2" />
            <h1 className="text-black text-2xl font-bold">Queen of Spades</h1>
          </div>
          <div className="text-black/70 text-sm">Game Lobby</div>
        </div>

        {/* Lobby Container */}
        <div className="w-full max-w-md bg-white rounded-md p-4 shadow-md">
          {/* Room Code */}
          <div className="mb-4 text-center">
            <div className="text-black/70 text-sm mb-1">Room Code</div>
            <div className="text-black text-xl font-bold tracking-wider bg-gray-100 py-1 px-4 rounded inline-block">
              {gameState.gameCode}
            </div>
          </div>
          
          {/* Players */}
          <div className="mb-4">
            <h2 className="text-black text-lg font-bold mb-2">Players</h2>
            <div className="bg-gray-100 rounded p-2">
              {gameState.players.map((player, index) => (
                <div 
                  key={player.id} 
                  className="flex items-center py-1 border-b border-gray-200 last:border-0"
                >
                  <div className="w-6 h-6 rounded-full bg-gray-300 text-gray-700 flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="ml-2 text-black">
                    {player.name}
                    {player.id === gameState.currentPlayerId && ' (You)'}
                  </div>
                  {player.id === gameState.hostId && (
                    <div className="ml-auto text-black/70 text-sm flex items-center">
                      <span className="mr-1">Host</span>
                      <span className="text-xs">👑</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setView('home')}
              className="flex-1 px-2 py-1 bg-gray-200 hover:bg-gray-300 text-black rounded"
            >
              Leave
            </button>
            {gameState.hostId === gameState.currentPlayerId && (
              <button
                onClick={handleStartGame}
                disabled={gameState.players?.length < 2}
                className="flex-1 px-2 py-1 bg-gray-200 hover:bg-gray-300 text-black rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {console.log('Players:', gameState.players)}
                {console.log('Can start:', gameState.players?.length >= 2)}
                Start Game ({gameState.players?.length || 0} players)
              </button>
            )}
            {gameState.hostId !== gameState.currentPlayerId && (
              <div className="flex-1 px-2 py-1 bg-gray-100 text-black/60 rounded text-center">
                Waiting for host...
              </div>
            )}
          </div>
          
          {/* Error message */}
          {errorMessage && (
            <div className="mt-4 text-red-600 bg-red-100 p-2 rounded text-center">
              {errorMessage}
            </div>
          )}
        </div>
        
        {/* Instructions */}
        <div className="mt-4 text-black/70 text-center max-w-md">
          <p>Share the room code with other players to join the game.</p>
          <p className="mt-1">You need at least 2 players to start.</p>
        </div>
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