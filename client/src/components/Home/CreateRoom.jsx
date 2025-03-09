import { useState } from 'react'

function CreateRoom({ onCreateRoom }) {
  const [playerName, setPlayerName] = useState('')

  const handleCreateRoom = () => {
    onCreateRoom(playerName);
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="playerName" className="block text-sm font-medium text-gray-700">
            Your Name
          </label>
          <input
            id="playerName"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleCreateRoom}
          disabled={!playerName.trim()}
        >
          Create Room
        </button>
      </div>
    </div>
  )
}

export default CreateRoom 