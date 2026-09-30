import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import { Hand } from './Hand';
import { Card } from './Card';
import { ScoreBoard } from './ScoreBoard';
import { GameToast } from './GameToast';
import { GameOver } from './GameOver';
import { CopyRoomCodeButton } from './CopyRoomCodeButton';

export const GameBoard = ({ gameState, onPlayCard, onRematch, errorMessage, isConnected }) => {
  const { players, currentPlayer, currentRound, hand, roundNumber } = gameState;
  const handlePlayCard = (card) => onPlayCard(card);
  const activePlayer = players.find(player => player.id === currentPlayer);
  const contract = gameState.contract;

  return (
    <div className="min-h-screen bg-felt-dark bg-felt-texture px-3 py-4 text-white sm:px-6 sm:py-6">
      <div className="mx-auto max-w-7xl">
      {/* Game Status Bar */}
      <header className="mb-4 flex flex-col gap-3 rounded-2xl border border-gold/30 bg-felt-dark/70 p-4 shadow-lg backdrop-blur-sm sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <img src="/assets/images/crown.svg" alt="" className="h-8 w-8" />
          <div>
            <h1 className="text-lg font-bold text-white sm:text-xl">Queen of Spades</h1>
            <p className="text-xs text-white/60">A friendly table · {players.length} players</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {gameState.gameCode && (
            <div className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/65">
              <span>Room <span className="ml-1 font-mono font-bold tracking-wider text-white">{gameState.gameCode}</span></span>
              <CopyRoomCodeButton code={gameState.gameCode} />
            </div>
          )}
          <div className="rounded-xl bg-white/5 px-3 py-2 text-sm">
            <span className="font-semibold text-gold-light">Deal {gameState.dealNumber} · Round {roundNumber}</span>
            <span className="mx-2 text-white/30">·</span>
            <span className="text-white/70">{currentRound.length}/{players.length} played</span>
          </div>
          <div className="rounded-xl bg-white/5 px-3 py-2 text-sm text-white/70">
            Bid <span className="font-bold text-gold-light">{contract?.bid}</span>
          </div>
          <div className={`rounded-xl border px-3 py-2 text-xs font-semibold ${isConnected ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : 'border-red-300/30 bg-red-900/30 text-red-100'}`} role="status">
            <span aria-hidden="true" className="mr-1.5">●</span>{isConnected ? 'Connected' : 'Reconnecting'}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px] xl:gap-6">

        {/* Main game area */}
        <main className="min-w-0 overflow-hidden rounded-[1.75rem] border border-gold/40 bg-felt bg-felt-texture p-3 shadow-table sm:p-5 lg:p-6">
          {/* Player seats */}
          <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-6 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6">
            {players.map(player => {
              const isTurn = player.id === currentPlayer;
              const isYou = player.id === gameState.currentPlayerId;
              const isRevealedPartner = contract?.revealedPartnerIds.includes(player.id);
              const isBidder = contract?.bidderId === player.id;
              return (
                <motion.div
                  key={player.id}
                  className={`min-w-0 rounded-xl border px-2 py-2.5 text-center transition-colors sm:px-3 ${isTurn ? 'border-gold-light bg-felt-dark/60 shadow-[0_0_18px_rgba(222,178,92,0.18)]' : 'border-white/10 bg-felt-dark/30'}`}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isTurn ? 'bg-gold text-felt-dark' : 'bg-white/10 text-white'}`}>
                      {player.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 text-left">
                      <p className={`truncate text-sm font-semibold ${isTurn ? 'text-gold-light' : 'text-white'}`}>
                        {player.name}{isYou ? ' (You)' : ''}
                      </p>
                      <p className="text-xs text-white/60">
                        {player.handSize || 0} cards{isBidder ? ' · Bidder' : isRevealedPartner ? ' · Partner' : ''}{player.connected === false ? ' · Reconnecting' : ''}
                      </p>
                    </div>
                  </div>
                  {isTurn && <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wider text-gold-light">Turn</span>}
                </motion.div>
              );
            })}
          </div>

          {/* Center area with current played card */}
          <section className="flex min-h-52 flex-col justify-center rounded-2xl border border-white/10 bg-felt-dark/30 px-3 py-5 sm:min-h-64 sm:px-5" aria-label="Cards played this round">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/80">Current round</h2>
              <span className="text-xs text-white/50">{currentRound.length} of {players.length} cards</span>
            </div>
            <AnimatePresence mode="popLayout">
              {currentRound.length > 0 ? (
                <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5">
                  {currentRound.map((play, index) => (
                    <motion.div
                      key={`${play.playerId}-${play.card.suit}-${play.card.value}`}
                      initial={{ scale: 0.75, opacity: 0, y: 16 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.75, opacity: 0, y: -12 }}
                      transition={{ duration: 0.2, delay: index * 0.035 }}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <span className="max-w-24 truncate text-xs font-medium text-white/80">
                        {players.find(player => player.id === play.playerId)?.name || 'Player'}
                      </span>
                      <Card suit={play.card.suit} value={play.card.value} disabled size="table" />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.p key="no-cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 text-center text-sm text-white/50 sm:text-base">
                  {activePlayer ? `${activePlayer.name} leads the round` : 'Waiting for the first card'}
                </motion.p>
              )}
            </AnimatePresence>
          </section>

          {/* Current player's hand */}
          <section className="mt-4 sm:mt-6" aria-label="Your cards">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-white/80">Your hand</h2>
              <p className={`text-sm font-semibold ${currentPlayer === gameState.currentPlayerId ? 'text-gold-light' : 'text-white/60'}`} role="status">
                {currentPlayer === gameState.currentPlayerId ? 'Your turn — choose a card' : `Waiting for ${activePlayer?.name || 'the next player'}`}
              </p>
            </div>
            <Hand
              cards={hand}
              onPlayCard={handlePlayCard}
              isActive={gameState.currentPlayer === gameState.currentPlayerId}
              leadSuit={currentRound[0]?.card.suit}
            />
          </section>
        </main>

        <aside className="flex min-w-0 flex-col gap-4">
          <ScoreBoard
            players={players}
            scores={gameState.scores}
            matchScores={gameState.matchScores}
            currentPlayerId={gameState.currentPlayerId}
            activePlayerId={currentPlayer}
            bid={contract?.bid || gameState.currentBid || 75}
            dealNumber={gameState.dealNumber}
          />
          <p className="rounded-2xl border border-gold/30 bg-felt-dark/60 p-4 text-sm leading-relaxed text-white/70">
            <span className="mb-1 block font-semibold text-gold-light">Contract</span>
            <span className="block">{players.find(player => player.id === contract?.bidderId)?.name || 'Bidder'} · {contract?.bid} bid · {contract?.cutSuit} is trump</span>
            {contract?.partnerCalls.length > 0 && (
              <span className="mt-2 block text-xs text-white/55">
                Called cards: {contract.partnerCalls.map(card => `${card.value} of ${card.suit}`).join(', ')}
              </span>
            )}
          </p>
        </aside>
      </div>

      {/* Toast notifications */}
      <AnimatePresence>
        {errorMessage && (
          <GameToast
            key={`error-${errorMessage}`}
            message={errorMessage}
            onClose={() => {}}
            duration={3000}
          />
        )}
        {gameState.lastRound && (
          <GameToast
            key={`round-${gameState.roundNumber}-${gameState.lastRound.winner}`}
            message={`${players.find(p => p.id === gameState.lastRound.winner)?.name || 'Player'} won the round (+${gameState.lastRound.points} points)`}
            onClose={() => {}}
            duration={2000}
          />
        )}
      </AnimatePresence>

      {/* Game over modal */}
      <AnimatePresence>
        {gameState.gameOver && (
          <GameOver
            winner={gameState.winner}
            winningTeamPlayerIds={gameState.winningTeamPlayerIds}
            contractResult={gameState.contractResult}
            scores={gameState.scores}
            matchScores={gameState.matchScores}
            players={players}
            currentPlayerId={gameState.currentPlayerId}
            isHost={gameState.hostId === gameState.currentPlayerId}
            dealNumber={gameState.dealNumber}
            onRematch={onRematch}
          />
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};

GameBoard.propTypes = {
  gameState: PropTypes.shape({
    players: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        handSize: PropTypes.number,
      })
    ).isRequired,
    currentPlayer: PropTypes.string,
    currentPlayerId: PropTypes.string,
    currentRound: PropTypes.arrayOf(
      PropTypes.shape({
        playerId: PropTypes.string.isRequired,
        card: PropTypes.shape({
          suit: PropTypes.string.isRequired,
          value: PropTypes.string.isRequired,
        }).isRequired,
      })
    ).isRequired,
    hand: PropTypes.arrayOf(
      PropTypes.shape({
        suit: PropTypes.string.isRequired,
        value: PropTypes.string.isRequired,
      })
    ).isRequired,
    scores: PropTypes.object.isRequired,
    matchScores: PropTypes.object,
    rounds: PropTypes.array,
    roundNumber: PropTypes.number,
    dealNumber: PropTypes.number,
    gameCode: PropTypes.string,
    hostId: PropTypes.string,
    gameOver: PropTypes.bool,
    winner: PropTypes.string,
    winningTeamPlayerIds: PropTypes.arrayOf(PropTypes.string),
    contractResult: PropTypes.object,
    contract: PropTypes.object,
    currentBid: PropTypes.number,
    lastRound: PropTypes.shape({
      winner: PropTypes.string,
      points: PropTypes.number
    }),
  }).isRequired,
  onPlayCard: PropTypes.func.isRequired,
  onRematch: PropTypes.func.isRequired,
  errorMessage: PropTypes.string,
  isConnected: PropTypes.bool
};

GameBoard.defaultProps = {
  isConnected: true,
};
