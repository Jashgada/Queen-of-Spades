import { nanoid } from 'nanoid';
import {
  BidAction,
  Card,
  CardValue,
  Contract,
  ContractResult,
  GameState,
  Player,
  Play,
  PublicGameState,
  Round,
  Suit
} from '../types';

interface PlayCardResult {
  valid: boolean;
  message?: string;
  nextPlayer?: string;
  roundComplete?: boolean;
  roundWinner?: string;
  roundPoints?: number;
  gameOver?: boolean;
  contractResult?: ContractResult | null;
}

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const VALUES: CardValue[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const CARD_RANK: Record<CardValue, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  J: 11, Q: 12, K: 13, A: 14
};

export class Game {
  private state: GameState;
  private partnerPlayerIds: string[] = [];

  constructor(code: string) {
    this.state = this.createInitialState(code, []);
  }

  getState(): GameState {
    return this.state;
  }

  getPublicState(): PublicGameState {
    const { hands: _hands, players, ...publicState } = this.state;
    return {
      ...publicState,
      players: players.map(({ socketId: _socketId, resumeToken: _resumeToken, ...player }) => player)
    };
  }

  getPlayerView(playerId: string): PublicGameState & { hand: Card[]; currentPlayerId: string } {
    return {
      ...this.getPublicState(),
      hand: this.state.hands[playerId] || [],
      currentPlayerId: playerId
    };
  }

  addPlayer(name: string, socketId: string): Player {
    const player: Player = {
      id: nanoid(8),
      name,
      socketId,
      resumeToken: nanoid(32),
      connected: true,
      handSize: 0
    };

    this.state.players.push(player);
    this.state.hands[player.id] = [];
    this.state.scores[player.id] = 0;
    return player;
  }

  updatePlayerConnection(playerId: string, socketId: string, connected: boolean): Player | undefined {
    const player = this.state.players.find(candidate => candidate.id === playerId);
    if (!player) return undefined;
    player.socketId = socketId;
    player.connected = connected;
    return player;
  }

  removePlayer(playerId: string): void {
    const previousPlayers = [...this.state.players];
    this.state.players = this.state.players.filter(player => player.id !== playerId);
    delete this.state.hands[playerId];
    delete this.state.scores[playerId];
    this.partnerPlayerIds = this.partnerPlayerIds.filter(id => id !== playerId);

    if (this.state.players.length === 0) {
      this.state.status = 'waiting';
      this.state.currentPlayer = null;
      return;
    }

    if (this.state.status === 'bidding' && this.state.currentPlayer === playerId) {
      this.state.passedPlayers.push(playerId);
      this.advanceAuction(playerId);
    } else if (
      (this.state.status === 'bidding' || this.state.status === 'contract') &&
      this.state.currentBidder === playerId
    ) {
      this.resetAuction();
    } else if (this.state.status === 'playing' && this.state.currentPlayer === playerId) {
      this.state.currentPlayer = this.getNextPlayer(playerId, previousPlayers);
    }
  }

  start(): void {
    if (this.state.status !== 'waiting') {
      throw new Error('Game has already started');
    }
    if (this.state.players.length < 2) {
      throw new Error('Not enough players to start the game');
    }

    this.resetDealState();
    this.dealCards();
    this.state.status = 'bidding';
    this.state.currentBid = 75;
    this.state.currentBidder = this.state.players[0].id;
    this.state.bidHistory = [{ playerId: this.state.players[0].id, type: 'bid', amount: 75 }];
    this.state.currentPlayer = this.getNextPlayer(this.state.players[0].id);
  }

  submitBid(playerId: string, amount: number | null): { success: boolean; message?: string } {
    if (this.state.status !== 'bidding') {
      return { success: false, message: 'The bidding phase is not active' };
    }

    if (this.state.currentPlayer !== playerId) {
      return { success: false, message: 'It is not your turn to bid' };
    }

    let action: BidAction;
    if (amount === null) {
      action = { playerId, type: 'pass' };
      this.state.passedPlayers.push(playerId);
    } else {
      if (!Number.isInteger(amount) || amount < 75 || amount > 150 || amount % 5 !== 0) {
        return { success: false, message: 'Bids must be multiples of 5 between 75 and 150' };
      }
      if (amount <= (this.state.currentBid || 0)) {
        return { success: false, message: 'Your bid must be higher than the current bid' };
      }

      action = { playerId, type: 'bid', amount };
      this.state.currentBid = amount;
      this.state.currentBidder = playerId;
    }

    this.state.bidHistory.push(action);
    this.advanceAuction(playerId);
    return { success: true };
  }

  submitContract(playerId: string, partnerCalls: Card[], cutSuit: Suit): { success: boolean; message?: string } {
    if (this.state.status !== 'contract' || this.state.currentPlayer !== playerId) {
      return { success: false, message: 'Only the winning bidder can set the contract' };
    }

    if (!SUITS.includes(cutSuit)) {
      return { success: false, message: 'Choose a valid cut suit' };
    }

    const requiredPartners = this.getRequiredPartners();
    if (!Array.isArray(partnerCalls)) {
      return { success: false, message: 'Partner calls must be a list of cards' };
    }
    if (partnerCalls.length !== requiredPartners) {
      return { success: false, message: `You must call ${requiredPartners} partner card${requiredPartners === 1 ? '' : 's'}` };
    }

    if (partnerCalls.some(card => !card || !SUITS.includes(card.suit) || !VALUES.includes(card.value))) {
      return { success: false, message: 'Choose valid partner cards' };
    }

    const callKeys = partnerCalls.map(card => `${card.suit}-${card.value}`);
    if (new Set(callKeys).size !== callKeys.length) {
      return { success: false, message: 'Partner calls must be different cards' };
    }

    for (const card of partnerCalls) {
      if (this.state.hands[playerId].some(held => held.suit === card.suit && held.value === card.value)) {
        return { success: false, message: 'You cannot call a card in your own hand' };
      }
    }

    const partnerIds = partnerCalls.map(call => {
      const owner = this.state.players.find(player =>
        this.state.hands[player.id].some(card => card.suit === call.suit && card.value === call.value)
      );
      return owner?.id;
    });

    if (partnerIds.some(id => !id || id === playerId)) {
      return { success: false, message: 'Each partner call must belong to another player' };
    }
    if (new Set(partnerIds).size !== partnerIds.length) {
      return { success: false, message: 'Each partner call must identify a different player' };
    }

    const bidderId = this.state.currentBidder;
    const bid = this.state.currentBid;
    if (!bidderId || bid === null) {
      return { success: false, message: 'No winning bid was found' };
    }

    this.partnerPlayerIds = partnerIds as string[];
    const contract: Contract = {
      bidderId,
      bid,
      partnerCalls: partnerCalls.map(card => ({ ...card })),
      cutSuit,
      revealedPartnerIds: []
    };

    this.state.contract = contract;
    this.state.status = 'playing';
    this.state.currentPlayer = bidderId;
    this.state.roundNumber = 1;
    return { success: true };
  }

  playCard(playerId: string, card: Card): PlayCardResult {
    if (this.state.status !== 'playing') {
      return { valid: false, message: 'The deal is not in the playing phase' };
    }
    if (this.state.currentPlayer !== playerId) {
      return { valid: false, message: 'Not your turn' };
    }

    const playerHand = this.state.hands[playerId];
    if (!playerHand) {
      return { valid: false, message: 'Player is not in this deal' };
    }

    const cardIndex = playerHand.findIndex(held => held.suit === card.suit && held.value === card.value);
    if (cardIndex === -1) {
      return { valid: false, message: 'Card not in hand' };
    }

    if (this.state.currentRound.length > 0) {
      const leadSuit = this.state.currentRound[0].card.suit;
      const hasLeadSuit = playerHand.some(held => held.suit === leadSuit);
      if (hasLeadSuit && card.suit !== leadSuit) {
        return { valid: false, message: 'Must follow suit' };
      }
    }

    playerHand.splice(cardIndex, 1);
    const player = this.state.players.find(candidate => candidate.id === playerId);
    if (player) player.handSize = playerHand.length;
    this.state.currentRound.push({ playerId, card });

    if (this.state.contract?.partnerCalls.some(call => call.suit === card.suit && call.value === card.value)) {
      if (!this.state.contract.revealedPartnerIds.includes(playerId)) {
        this.state.contract.revealedPartnerIds.push(playerId);
      }
    }

    const roundComplete = this.state.currentRound.length === this.state.players.length;
    let roundWinner: string | undefined;
    let roundPoints: number | undefined;
    let nextPlayer = this.getNextPlayer(playerId);

    if (roundComplete) {
      const result = this.resolveRound();
      roundWinner = result.winner;
      roundPoints = result.points;
      nextPlayer = roundWinner;
      this.checkDealOver();
    }

    this.state.currentPlayer = nextPlayer;
    return {
      valid: true,
      nextPlayer,
      roundComplete,
      roundWinner,
      roundPoints,
      gameOver: this.state.gameOver,
      contractResult: this.state.contractResult
    };
  }

  restart(): void {
    const players = this.state.players;
    const code = this.state.code;
    this.state = this.createInitialState(code, players);
    this.start();
  }

  private createInitialState(code: string, players: Player[]): GameState {
    const hands: Record<string, Card[]> = {};
    const scores: Record<string, number> = {};
    players.forEach(player => {
      hands[player.id] = [];
      scores[player.id] = 0;
    });

    return {
      code,
      players,
      status: 'waiting',
      hands,
      currentRound: [],
      rounds: [],
      roundNumber: 0,
      currentPlayer: null,
      scores,
      gameOver: false,
      winner: null,
      winningTeamPlayerIds: [],
      lastRound: null,
      currentBid: null,
      currentBidder: null,
      passedPlayers: [],
      bidHistory: [],
      contract: null,
      contractResult: null
    };
  }

  private resetDealState(): void {
    this.state.hands = {};
    this.state.scores = {};
    this.state.players.forEach(player => {
      this.state.hands[player.id] = [];
      this.state.scores[player.id] = 0;
      player.handSize = 0;
    });
    this.state.currentRound = [];
    this.state.rounds = [];
    this.state.roundNumber = 0;
    this.state.currentPlayer = null;
    this.state.gameOver = false;
    this.state.winner = null;
    this.state.winningTeamPlayerIds = [];
    this.state.lastRound = null;
    this.state.currentBid = null;
    this.state.currentBidder = null;
    this.state.passedPlayers = [];
    this.state.bidHistory = [];
    this.state.contract = null;
    this.state.contractResult = null;
    this.partnerPlayerIds = [];
  }

  private resetAuction(): void {
    this.state.status = 'waiting';
    this.state.currentPlayer = null;
    this.state.currentBid = null;
    this.state.currentBidder = null;
    this.state.passedPlayers = [];
    this.state.bidHistory = [];
    this.state.contract = null;
    this.partnerPlayerIds = [];
  }

  private advanceAuction(lastActorId: string): void {
    const eligiblePlayers = this.state.players.filter(player =>
      player.id !== this.state.currentBidder && !this.state.passedPlayers.includes(player.id)
    );

    if (eligiblePlayers.length === 0) {
      this.state.status = 'contract';
      this.state.currentPlayer = this.state.currentBidder;
      return;
    }

    this.state.currentPlayer = this.getNextPlayer(lastActorId, this.state.players, player =>
      player.id !== this.state.currentBidder && !this.state.passedPlayers.includes(player.id)
    );
  }

  private getRequiredPartners(): number {
    if (this.state.players.length <= 2) return 0;
    return this.state.players.length <= 4 ? 1 : 2;
  }

  private dealCards(): void {
    const deck = this.createDeck();
    this.setAsideRemainderCards(deck);
    this.shuffleDeck(deck);

    const cardsPerPlayer = deck.length / this.state.players.length;
    this.state.players.forEach((player, index) => {
      const startIndex = index * cardsPerPlayer;
      const endIndex = startIndex + cardsPerPlayer;
      this.state.hands[player.id] = deck.slice(startIndex, endIndex);
      player.handSize = this.state.hands[player.id].length;
    });
  }

  private setAsideRemainderCards(deck: Card[]): void {
    const remainder = deck.length % this.state.players.length;
    for (let count = 0; count < remainder; count += 1) {
      const candidates = deck
        .map((card, index) => ({ card, index }))
        .filter(({ card }) => card.suit !== 'spades' && this.cardPoints(card) === 0);
      if (candidates.length === 0) {
        throw new Error('Unable to set aside enough non-scoring cards for an even deal');
      }

      const lowestRank = Math.min(...candidates.map(({ card }) => CARD_RANK[card.value]));
      const lowestCards = candidates.filter(({ card }) => CARD_RANK[card.value] === lowestRank);
      const selected = lowestCards[Math.floor(Math.random() * lowestCards.length)];
      deck.splice(selected.index, 1);
    }
  }

  private createDeck(): Card[] {
    return SUITS.flatMap(suit => VALUES.map(value => ({ suit, value })));
  }

  private shuffleDeck(deck: Card[]): void {
    for (let index = deck.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
    }
  }

  private resolveRound(): Round {
    const leadSuit = this.state.currentRound[0].card.suit;
    const cutSuit = this.state.contract!.cutSuit;
    const cutCards = this.state.currentRound.filter(play => play.card.suit === cutSuit);
    const winningSuit = cutCards.length > 0 ? cutSuit : leadSuit;
    const winningPlays = this.state.currentRound.filter(play => play.card.suit === winningSuit);
    const winningPlay = winningPlays.reduce((highest, play) =>
      CARD_RANK[play.card.value] > CARD_RANK[highest.card.value] ? play : highest
    );
    const points = this.calculateRoundPoints();
    const round: Round = {
      cards: [...this.state.currentRound],
      winner: winningPlay.playerId,
      points
    };

    this.state.scores[round.winner] += points;
    this.state.rounds.push(round);
    this.state.lastRound = { winner: round.winner, points };
    this.state.currentRound = [];
    this.state.roundNumber += 1;
    return round;
  }

  private calculateRoundPoints(): number {
    return this.state.currentRound.reduce((points, play) => points + this.cardPoints(play.card), 0);
  }

  private cardPoints(card: Card): number {
    if (card.value === '5') return 5;
    if (card.value === '10') return 10;
    if (card.value === 'A') return 15;
    if (card.value === 'Q' && card.suit === 'spades') return 30;
    return 0;
  }

  private checkDealOver(): void {
    const allCardsPlayed = Object.values(this.state.hands).every(hand => hand.length === 0);
    if (!allCardsPlayed || !this.state.contract) return;

    const contractTeamIds = [this.state.contract.bidderId, ...this.partnerPlayerIds];
    const defendingTeamIds = this.state.players
      .map(player => player.id)
      .filter(playerId => !contractTeamIds.includes(playerId));
    const bidderTeamPoints = contractTeamIds.reduce((total, playerId) => total + (this.state.scores[playerId] || 0), 0);
    const successful = bidderTeamPoints >= this.state.contract.bid;
    const winningTeamPlayerIds = successful ? contractTeamIds : defendingTeamIds;
    const winner = successful
      ? this.state.contract.bidderId
      : defendingTeamIds.reduce((highest, playerId) =>
        (this.state.scores[playerId] || 0) > (this.state.scores[highest] || 0) ? playerId : highest
      );

    const contractResult: ContractResult = {
      bidderId: this.state.contract.bidderId,
      bid: this.state.contract.bid,
      bidderTeamPoints,
      successful,
      signedPoints: successful ? this.state.contract.bid : -this.state.contract.bid,
      winningTeamPlayerIds
    };

    this.state.gameOver = true;
    this.state.status = 'finished';
    this.state.winner = winner;
    this.state.winningTeamPlayerIds = winningTeamPlayerIds;
    this.state.contractResult = contractResult;
  }

  private getNextPlayer(
    currentPlayerId: string,
    players: Player[] = this.state.players,
    isEligible: (player: Player) => boolean = () => true
  ): string {
    const currentIndex = players.findIndex(player => player.id === currentPlayerId);
    for (let offset = 1; offset <= players.length; offset += 1) {
      const candidate = players[(currentIndex + offset + players.length) % players.length];
      if (candidate && isEligible(candidate)) return candidate.id;
    }
    return currentPlayerId;
  }
}
