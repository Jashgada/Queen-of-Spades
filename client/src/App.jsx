import { useState } from 'react';
import Home from './components/Home/Home';
import GameRoom from './components/Game/GameRoom';

function App() {
  const [isInRoom, setIsInRoom] = useState(false);

  const handleCreateRoom = () => {
    console.log('Room created!'); // Add your room creation logic here
  };

  const handleJoinRoom = () => {
    console.log('Room joined!'); // Add your room joining logic here
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {isInRoom ? <GameRoom /> : <Home onJoinRoom={handleJoinRoom} onCreateRoom={handleCreateRoom} />}
    </div>
  );
}

export default App; 