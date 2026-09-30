export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type CardValue = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type GamePhase = 'waiting' | 'bidding' | 'contract' | 'playing' | 'finished';

// Card type
export interface Card {
  suit: Suit;
  value: CardValue;
}

// Player type
export interface Player {
  id: string;
  name: string;
  socketId: string;
  resumeToken: string;
  connected: boolean;
  handSize: number;
}

// Play type (a card played by a player)
export interface Play {
  playerId: string;
  card: Card;
}

// Round type (one card played by each player)
export interface Round {
  cards: Play[];
  winner: string;
  points: number;
}

export interface BidAction {
  playerId: string;
  type: 'bid' | 'pass';
  amount?: number;
}

export interface Contract {
  bidderId: string;
  bid: number;
  partnerCalls: Card[];
  cutSuit: Suit;
  revealedPartnerIds: string[];
}

export interface ContractResult {
  bidderId: string;
  bid: number;
  bidderTeamPoints: number;
  successful: boolean;
  signedPoints: number;
  winningTeamPlayerIds: string[];
}

// Game state type
export interface GameState {
  code: string;
  players: Player[];
  status: GamePhase;
  hands: {
    [playerId: string]: Card[];
  };
  currentRound: Play[];
  rounds: Round[];
  roundNumber: number;
  dealNumber: number;
  currentPlayer: string | null;
  scores: {
    [playerId: string]: number;
  };
  matchScores: {
    [playerId: string]: number;
  };
  gameOver: boolean;
  matchEnded: boolean;
  winner: string | null;
  lastRound: {
    winner: string;
    points: number;
  } | null;
  currentBid: number | null;
  currentBidder: string | null;
  passedPlayers: string[];
  bidHistory: BidAction[];
  contract: Contract | null;
  contractResult: ContractResult | null;
  winningTeamPlayerIds: string[];
}

export type PublicGameState = Omit<GameState, 'hands' | 'players'> & {
  players: Omit<Player, 'socketId' | 'resumeToken'>[];
};

export interface ResumeGameParams {
  gameCode: string;
  playerId: string;
  resumeToken: string;
}

export interface BidParams {
  amount: number;
}

export interface ContractParams {
  partnerCalls: Card[];
  cutSuit: Suit;
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
    resumeToken?: string;
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
  roundComplete?: boolean;
  roundWinner?: string;
  roundPoints?: number;
  scores?: {
    [playerId: string]: number;
  };
  gameOver?: boolean;
  winner?: string;
  message: string;
}
