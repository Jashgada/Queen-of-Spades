import { useState } from 'react';

function GameRoom() {
  // Temporary mock data - will come from context later
  const [players, setPlayers] = useState([
    { id: '1', name: 'Player 1 (You)', isHost: true },
    { id: '2', name: 'Player 2', isHost: false },
    { id: '3', name: 'Player 3', isHost: false },
  ]);
  const roomCode = 'ABC123';

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Room Code Section */}
        <div className="bg-white w-full p-6 rounded-lg shadow-md">
          <div className="space-y-4 text-center">
            <h2 className="text-2xl font-bold">Room Code: {roomCode}</h2>
            <button 
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              onClick={() => navigator.clipboard.writeText(roomCode)}
            >
              Copy Room Code
            </button>
          </div>
        </div>

        {/* Players List Section */}
        <div className="bg-white w-full p-6 rounded-lg shadow-md">
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Players ({players.length}/5)</h2>
            <div className="space-y-2">
              {players.map(player => (
                <div 
                  key={player.id} 
                  className="flex justify-between bg-gray-50 p-3 rounded-md"
                >
                  <span>{player.name} {player.isHost && '(Host)'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Start Game Section */}
        <div className="bg-white w-full p-6 rounded-lg shadow-md">
          <div className="space-y-4">
            <button 
              className={`w-full py-2 px-4 rounded-md text-white transition-colors
                ${players.length < 4 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700'}`}
              disabled={players.length < 4}
            >
              Start Game
            </button>
            <p className="text-sm text-gray-500 text-center">
              Need at least 4 players to start
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameRoom; 