import React from 'react';

const Lobby = ({ gameCode, players, isCreator }) => {
  const handleStartGame = () => {
    console.log('Starting the game!');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Game Lobby</h2>
        <div className="mb-6">
          <p className="text-gray-700">Game Code: <span className="font-bold">{gameCode}</span></p>
        </div>
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Players:</h3>
          <ul className="space-y-2">
            {players.map((player, index) => (
              <li key={index} className="text-gray-700">{player}</li>
            ))}
          </ul>
        </div>
        {isCreator && (
          <button
            onClick={handleStartGame}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Start Game
          </button>
        )}
      </div>
    </div>
  );
};

export default Lobby; 