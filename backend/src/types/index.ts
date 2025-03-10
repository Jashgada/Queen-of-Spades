// Card type
export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  value: '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
}

// Player type
export interface Player {
  id: string;
  name: string;
  socketId: string;
  handSize: number;
}

// Play type (a card played by a player)
export interface Play {
  playerId: string;
  card: Card;
}

// Trick type (a complete round of plays)
export interface Trick {
  cards: Play[];
  winner: string;
  points: number;
}

// Game state type
export interface GameState {
  code: string;
  players: Player[];
  status: 'waiting' | 'playing' | 'finished';
  hands: {
    [playerId: string]: Card[];
  };
  currentTrick: Play[];
  tricks: Trick[];
  trickNumber: number;
  currentPlayer: string | null;
  scores: {
    [playerId: string]: number;
  };
  targetScore: number;
  gameOver: boolean;
  winner: string | null;
  lastTrick: {
    winner: string;
    points: number;
  } | null;
}

// Socket event types
export interface CreateGameParams {
  playerName: string;
}

export interface JoinGameParams {
  gameCode: string;
  playerName: string;
}

export interface PlayCardParams {
  playerId: string;
  card: Card;
}

// Socket response types
export interface GameResponse {
  success: boolean;
  message: string;
  gameCode?: string;
  player?: {
    id: string;
    name: string;
    handSize: number;
  };
  players?: Player[];
  gameState?: GameState;
}

export interface PlayResponse {
  success: boolean;
  play?: {
    playerId: string;
    card: Card;
  };
  nextPlayer?: string;
  trickComplete?: boolean;
  trickWinner?: string;
  trickPoints?: number;
  scores?: {
    [playerId: string]: number;
  };
  gameOver?: boolean;
  winner?: string;
  message: string;
}
