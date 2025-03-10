import React from 'react';
import { motion } from 'framer-motion';

const StatBox = ({ label, value }) => (
  <div className="bg-felt-dark/50 rounded-xl p-4">
    <div className="text-white/60 text-sm mb-1">{label}</div>
    <div className="text-white text-xl font-semibold">{value}</div>
  </div>
);

const WinnerItem = ({ name, amount, avatar }) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center gap-3">
      <img src={avatar} alt={name} className="w-8 h-8 rounded-full" />
      <span className="text-white">{name}</span>
    </div>
    <span className="text-emerald-400">${amount}</span>
  </div>
);

export const Home = () => {
  return (
    <div className="min-h-screen bg-felt bg-felt-texture p-6 flex flex-col items-center">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-2 mb-1">
          <img src="/assets/images/crown.svg" alt="Crown" className="w-6 h-6" />
          <h1 className="text-white text-2xl font-bold">Queen of Spades</h1>
        </div>
        <div className="text-white/60 text-sm">Multiplayer Card Game</div>
      </div>

      {/* Main Container */}
      <motion.div 
        className="w-full max-w-md bg-felt-dark/30 backdrop-blur-sm rounded-2xl p-6 shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Action Buttons */}
        <div className="space-y-3 mb-8">
          <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors">
            <span className="text-2xl">+</span>
            Create New Room
          </button>
          <button className="w-full bg-felt-light/30 hover:bg-felt-light/40 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors">
            <span className="text-xl">🎮</span>
            Join Room
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <StatBox label="Active Players" value="1,234" />
          <StatBox label="Active Rooms" value="89" />
        </div>

        {/* Recent Winners */}
        <div>
          <h2 className="text-white text-lg mb-4">Recent Winners</h2>
          <div className="space-y-2">
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
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <div className="mt-auto pt-6 text-white/40 text-sm">
        © 2025 Queen of Spades
      </div>
    </div>
  );
}; 