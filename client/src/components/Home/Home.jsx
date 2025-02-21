import CreateRoom from './CreateRoom';
import JoinRoom from './JoinRoom';

function Home({ onJoinRoom, onCreateRoom }) {
  return (
    <div className="container mx-auto max-w-2xl py-10 px-4">
      <div className="space-y-8">
        <h1 className="text-4xl font-bold text-center">Queen of Spades</h1>
        <div className="w-full bg-white p-8 rounded-lg shadow-md">
          <div className="space-y-8">
            <CreateRoom onCreateRoom={onCreateRoom} />
            <JoinRoom onJoinRoom={onJoinRoom} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home; 