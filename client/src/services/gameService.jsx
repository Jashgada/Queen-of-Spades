// src/services/gameService.js

const API_URL = 'http://localhost:3000';

export const createGame = async (playerName) => {
  const response = await fetch(`${API_URL}/create-game`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ playerName }),
  });

  if (!response.ok) {
    throw new Error('Failed to create game');
  }

  return await response.json();
};

export const joinGame = async (gameCode, playerName) => {
  const response = await fetch(`${API_URL}/join-game`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ gameCode, playerName }),
  });

  if (!response.ok) {
    throw new Error('Failed to join game');
  }

  return await response.json();
};