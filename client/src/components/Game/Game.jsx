import { useState, useEffect, useRef } from 'react';
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
  const loadingTimeoutRef = useRef(null);
  const gameStatus = gameState.gameStatus;

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

  // When gameState changes, update the view accordingly
  useEffect(() => {
    if (gameStatus === 'playing') {
      setView('playing');
    } else if (gameStatus === 'finished') {
      setView('gameOver');
    }
  }, [gameStatus]);

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

  // Render home view
  if (view === 'home') {
    return (
      <div className="flex min-h-screen flex-col items-center bg-felt bg-felt-texture p-4 sm:p-8">
        {/* Header */}
        <div className="mb-7 mt-6 text-center sm:mb-10 sm:mt-10">
          <div className="mb-2 flex items-center justify-center">
            <img src="/assets/images/crown.svg" alt="" className="mr-2 h-8 w-8" />
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Queen of Spades</h1>
          </div>
          <p className="text-sm text-white/70 sm:text-base">A classic card table, wherever your friends are.</p>
        </div>

        {/* Main Container */}
        <div className="w-full max-w-lg rounded-3xl border border-gold/40 bg-felt-dark/85 p-5 shadow-table backdrop-blur-sm sm:p-8">
          <p className="mb-6 text-center text-sm leading-relaxed text-white/70">
            Create a table for your group or join one with a room code.
          </p>
          <div className="space-y-3">
            <button 
              onClick={() => setView('create')}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 font-bold text-felt-dark shadow-lg transition-colors hover:bg-gold-light"
            >
              <img src="/assets/images/plus.svg" alt="" className="h-4 w-4" />
              Create New Room
            </button>
            <button 
              onClick={() => setView('join')}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-3 font-semibold text-white transition-colors hover:bg-white/10"
            >
              <img src="/assets/images/gamepad.svg" alt="" className="h-4 w-4" />
              Join Room
            </button>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 border-t border-white/10 pt-5 text-center text-xs text-white/60 sm:text-sm">
            <span className="font-semibold text-gold-light">2–6 players</span>
            <span aria-hidden="true">·</span>
            <span>4–6 recommended</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-10 text-xs text-white/40">
          © {new Date().getFullYear()} Queen of Spades
        </div>
      </div>
    );
  }

  // Create game view
  if (view === 'create') {
    return (
      <div className="flex min-h-screen flex-col items-center bg-felt bg-felt-texture p-4 sm:justify-center sm:p-8">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mb-1 flex items-center justify-center">
            <img src="/assets/images/crown.svg" alt="" className="mr-2 h-7 w-7" />
            <h1 className="text-2xl font-bold text-white">Queen of Spades</h1>
          </div>
          <p className="text-sm text-white/60">Create a table for your friends</p>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-md rounded-2xl border border-gold/30 bg-felt-dark/85 p-5 shadow-table sm:p-7">
          <form onSubmit={handleCreateGame} className="space-y-4">
            <div>
              <label htmlFor="playerName" className="mb-1 block text-sm font-medium text-white/80">
                Your Name
              </label>
              <input
                type="text"
                id="playerName"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={24}
                className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2.5 text-white placeholder:text-white/35"
                placeholder="Enter your name"
                required
                autoFocus
              />
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setView('home')}
                className="flex-1 rounded-lg border border-white/15 px-3 py-2.5 font-medium text-white/80 transition-colors hover:bg-white/10"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading || !connected}
                className="flex-1 rounded-lg bg-gold px-3 py-2.5 font-bold text-felt-dark transition-colors hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Room'}
              </button>
            </div>
          </form>
          
          {!connected && (
            <div className="mt-4 text-center text-sm text-gold-light" role="status">
              Connecting to server...
            </div>
          )}
          
          {errorMessage && (
            <div className="mt-4 rounded-lg border border-red-300/30 bg-red-900/40 p-3 text-center text-sm text-red-100" role="alert">
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
      <div className="flex min-h-screen flex-col items-center bg-felt bg-felt-texture p-4 sm:justify-center sm:p-8">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mb-1 flex items-center justify-center">
            <img src="/assets/images/crown.svg" alt="" className="mr-2 h-7 w-7" />
            <h1 className="text-2xl font-bold text-white">Queen of Spades</h1>
          </div>
          <p className="text-sm text-white/60">Join your friends at the table</p>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-md rounded-2xl border border-gold/30 bg-felt-dark/85 p-5 shadow-table sm:p-7">
          <form onSubmit={handleJoinGame} className="space-y-4">
            <div>
              <label htmlFor="playerName" className="mb-1 block text-sm font-medium text-white/80">
                Your Name
              </label>
              <input
                type="text"
                id="playerName"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={24}
                className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2.5 text-white placeholder:text-white/35"
                placeholder="Enter your name"
                required
              />
            </div>
            
            <div>
              <label htmlFor="gameCode" className="mb-1 block text-sm font-medium text-white/80">
                Room Code
              </label>
              <input
                type="text"
                id="gameCode"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase().slice(0, 6))}
                maxLength={6}
                autoCapitalize="characters"
                className="w-full rounded-lg border border-white/15 bg-black/20 px-3 py-2.5 font-mono uppercase tracking-[0.2em] text-white placeholder:font-sans placeholder:tracking-normal placeholder:text-white/35"
                placeholder="Enter room code"
                required
                autoFocus
              />
            </div>
            
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setView('home')}
                className="flex-1 rounded-lg border border-white/15 px-3 py-2.5 font-medium text-white/80 transition-colors hover:bg-white/10"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading || !connected}
                className="flex-1 rounded-lg bg-gold px-3 py-2.5 font-bold text-felt-dark transition-colors hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? 'Joining...' : 'Join Room'}
              </button>
            </div>
          </form>
          
          {!connected && (
            <div className="mt-4 text-center text-sm text-gold-light" role="status">
              Connecting to server...
            </div>
          )}
          
          {errorMessage && (
            <div className="mt-4 rounded-lg border border-red-300/30 bg-red-900/40 p-3 text-center text-sm text-red-100" role="alert">
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
      <div className="flex min-h-screen flex-col items-center bg-felt bg-felt-texture p-4 sm:justify-center sm:p-8">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mb-1 flex items-center justify-center">
            <img src="/assets/images/crown.svg" alt="" className="mr-2 h-7 w-7" />
            <h1 className="text-2xl font-bold text-white">Queen of Spades</h1>
          </div>
          <p className="text-sm text-white/60">Waiting for your table to fill</p>
        </div>

        {/* Lobby Container */}
        <div className="w-full max-w-lg rounded-2xl border border-gold/30 bg-felt-dark/85 p-5 shadow-table sm:p-7">
          {/* Room Code */}
          <div className="mb-6 text-center">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/55">Share this room code</div>
            <div className="inline-block rounded-xl border border-gold/30 bg-black/20 px-5 py-2 font-mono text-2xl font-bold tracking-[0.25em] text-gold-light">
              {gameState.gameCode}
            </div>
          </div>
          
          {/* Players */}
          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Players</h2>
              <span className="text-sm font-medium text-white/60">{gameState.players.length}/6</span>
            </div>
            <div className="space-y-2 rounded-xl border border-white/10 bg-black/15 p-3">
              {gameState.players.map((player, index) => (
                <div 
                  key={player.id} 
                  className="flex items-center rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2.5"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-felt-light/40 text-sm font-bold text-gold-light">
                    {index + 1}
                  </div>
                  <div className="ml-3 min-w-0 truncate font-medium text-white">
                    {player.name}
                    {player.id === gameState.currentPlayerId && ' (You)'}
                  </div>
                  {player.id === gameState.hostId && (
                    <div className="ml-auto flex items-center gap-1 text-xs font-semibold text-gold-light">
                      <span>Host</span>
                      <span aria-hidden="true">♛</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button
              onClick={() => setView('home')}
              className="flex-1 rounded-lg border border-white/15 px-3 py-2.5 font-medium text-white/80 transition-colors hover:bg-white/10"
            >
              Leave
            </button>
            {gameState.hostId === gameState.currentPlayerId && (
              <button
                onClick={handleStartGame}
                disabled={gameState.players?.length < 2 || gameState.players?.length > 6}
                className="flex-1 rounded-lg bg-gold px-3 py-2.5 font-bold text-felt-dark transition-colors hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50"
              >
                Start Game · {gameState.players?.length || 0} players
              </button>
            )}
            {gameState.hostId !== gameState.currentPlayerId && (
              <div className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-center text-white/60">
                Waiting for host...
              </div>
            )}
          </div>
          
          {/* Error message */}
          {errorMessage && (
            <div className="mt-4 rounded-lg border border-red-300/30 bg-red-900/40 p-3 text-center text-sm text-red-100" role="alert">
              {errorMessage}
            </div>
          )}
        </div>
        
        {/* Instructions */}
        <div className="mt-4 max-w-lg text-center text-sm text-white/60">
          <p>Share the room code with friends. Games support 2–6 players; 4–6 is recommended.</p>
          {gameState.players.length < 2 && <p className="mt-1 text-gold-light">At least 2 players are needed to start.</p>}
        </div>
      </div>
    );
  }

  if (view === 'playing' || view === 'gameOver') {
    return (
      <GameBoard
        gameState={gameState}
        onPlayCard={handlePlayCard}
        onRematch={handleRematch}
        errorMessage={errorMessage}
        isConnected={connected}
      />
    );
  }

  return null;
};
