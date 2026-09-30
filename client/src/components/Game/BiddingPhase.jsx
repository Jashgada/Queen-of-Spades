import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Hand } from './Hand';
import { CopyRoomCodeButton } from './CopyRoomCodeButton';

const SUITS = [
  { value: 'hearts', label: 'Hearts ♥' },
  { value: 'diamonds', label: 'Diamonds ♦' },
  { value: 'clubs', label: 'Clubs ♣' },
  { value: 'spades', label: 'Spades ♠' }
];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const createDeckOptions = () => SUITS.flatMap(suit => VALUES.map(value => ({
  key: `${suit.value}-${value}`,
  suit: suit.value,
  value,
  label: `${value} of ${suit.value}`
})));

const getRequiredPartners = (playerCount) => {
  if (playerCount <= 2) return 0;
  return playerCount <= 4 ? 1 : 2;
};

export const BiddingPhase = ({ gameState, currentPlayerId, isConnected, onBid, onPass, onSetContract, errorMessage }) => {
  const [partnerCallKeys, setPartnerCallKeys] = useState([]);
  const [cutSuit, setCutSuit] = useState('');
  const players = gameState.players || [];
  const requiredPartners = getRequiredPartners(players.length);
  const isMyTurn = gameState.currentPlayer === currentPlayerId;
  const hasHand = (gameState.hand || []).length > 0;
  const bidderName = players.find(player => player.id === gameState.currentBidder)?.name || 'Unknown player';
  const isContractSetup = gameState.gameStatus === 'contract';
  const isSettingContract = isContractSetup && gameState.currentBidder === currentPlayerId;
  const handKeys = useMemo(() => new Set((gameState.hand || []).map(card => `${card.suit}-${card.value}`)), [gameState.hand]);
  const deckOptions = useMemo(() => createDeckOptions(), []);
  const nextBid = Math.max(80, (gameState.currentBid || 75) + 5);
  const bids = Array.from({ length: Math.max(0, Math.floor((150 - nextBid) / 5) + 1) }, (_, index) => nextBid + index * 5);

  const updatePartnerCall = (index, cardKey) => {
    setPartnerCallKeys(previous => {
      const next = [...previous];
      next[index] = cardKey;
      return next;
    });
  };

  const submitContract = (event) => {
    event.preventDefault();
    const partnerCalls = partnerCallKeys
      .filter(Boolean)
      .map(key => {
        const [suit, value] = key.split('-');
        return { suit, value };
      });
    onSetContract(partnerCalls, cutSuit).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-felt-dark bg-felt-texture px-3 py-5 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gold/30 bg-felt-dark/80 p-4 shadow-lg sm:px-6">
          <div className="flex items-center gap-3">
            <img src="/assets/images/crown.svg" alt="" className="h-8 w-8" />
            <div>
              <h1 className="text-xl font-bold">Bidding Phase</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/60">
                <span>Room <span className="font-mono font-semibold tracking-wider text-white/85">{gameState.gameCode}</span></span>
                <CopyRoomCodeButton code={gameState.gameCode} />
                <span>· Deal {gameState.dealNumber} · {players.length} players</span>
              </div>
            </div>
          </div>
          <div className={`rounded-xl border px-3 py-2 text-xs font-semibold ${isConnected ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : 'border-red-300/30 bg-red-900/30 text-red-100'}`} role="status">
            <span aria-hidden="true" className="mr-1.5">●</span>{isConnected ? 'Connected' : 'Reconnecting'}
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <main className="rounded-3xl border border-gold/35 bg-felt/90 p-4 shadow-table sm:p-7">
            <section className="mb-6" aria-label="Your dealt hand">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-white/80">Your hand</h2>
                <span className="text-xs text-white/50">{hasHand ? `${gameState.hand.length} cards · sorted by suit and rank` : 'Dealing cards…'}</span>
              </div>
              {hasHand ? (
                <Hand cards={gameState.hand} onPlayCard={() => {}} readOnly />
              ) : (
                <p className="rounded-xl border border-white/10 bg-felt-dark/40 p-4 text-sm text-white/55" role="status">
                  Your hand is loading. Bidding actions will be available when it arrives.
                </p>
              )}
            </section>

            {isContractSetup ? (
              <section>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-light">Contract won</p>
                <h2 className="text-2xl font-bold">{bidderName} bid {gameState.currentBid}</h2>
                {isSettingContract && hasHand ? (
                  <form onSubmit={submitContract} className="mt-6 space-y-5">
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-white/85">Call partners</h3>
                      {requiredPartners === 0 ? (
                        <p className="rounded-xl bg-felt-dark/50 p-3 text-sm text-white/65">No partner calls at a 2-player table.</p>
                      ) : (
                        <div className="space-y-3">
                          {Array.from({ length: requiredPartners }, (_, index) => (
                            <label key={index} className="block text-sm text-white/75">
                              Partner card {index + 1}
                              <select
                                value={partnerCallKeys[index] || ''}
                                onChange={event => updatePartnerCall(index, event.target.value)}
                                required
                                className="mt-1.5 w-full rounded-lg border border-white/15 bg-felt-dark px-3 py-2.5 text-white"
                              >
                                <option value="">Choose a card</option>
                                {deckOptions
                                  .filter(card => !handKeys.has(card.key))
                                  .filter(card => partnerCallKeys[index] === card.key || !partnerCallKeys.includes(card.key))
                                  .map(card => <option key={card.key} value={card.key}>{card.label}</option>)}
                              </select>
                            </label>
                          ))}
                        </div>
                      )}
                      <p className="mt-2 text-xs text-white/50">The called card’s owner stays hidden until they play it.</p>
                    </div>

                    <label className="block text-sm text-white/75">
                      Cut suit (trump)
                      <select
                        value={cutSuit}
                        onChange={event => setCutSuit(event.target.value)}
                        required
                        className="mt-1.5 w-full rounded-lg border border-white/15 bg-felt-dark px-3 py-2.5 text-white"
                      >
                        <option value="">Choose the trump suit</option>
                        {SUITS.map(suit => <option key={suit.value} value={suit.value}>{suit.label}</option>)}
                      </select>
                      <span className="mt-1 block text-xs text-white/50">A cut card can win only when its player cannot follow the led suit.</span>
                    </label>

                    <button
                      type="submit"
                      disabled={!isConnected || !cutSuit || partnerCallKeys.filter(Boolean).length !== requiredPartners}
                      className="w-full rounded-xl bg-gold px-4 py-3 font-bold text-felt-dark transition-colors hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Confirm contract and deal
                    </button>
                  </form>
                ) : (
                  <p className="mt-5 rounded-xl border border-white/10 bg-felt-dark/40 p-4 text-white/70" role="status">
                    {isSettingContract ? 'Preparing your hand…' : `${bidderName} is choosing partner cards and the cut suit.`}
                  </p>
                )}
              </section>
            ) : (
              <section>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-light">Current bid</p>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-4xl font-bold tabular-nums text-white">{gameState.currentBid}</p>
                    <p className="mt-1 text-sm text-white/60">Bid by {bidderName}</p>
                  </div>
                  <p className="text-xs text-white/55">Raises are in increments of 5 · Maximum 150</p>
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-felt-dark/35 p-4 sm:p-5">
                  {isMyTurn && hasHand ? (
                    <>
                      <h2 className="mb-3 text-lg font-semibold">Your bid</h2>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {bids.map(bid => (
                          <button
                            key={bid}
                            type="button"
                            disabled={!isConnected}
                            onClick={() => onBid(bid).catch(() => {})}
                            className="rounded-lg border border-gold/35 bg-gold/10 px-3 py-2.5 font-bold text-gold-light transition-colors hover:bg-gold/20 disabled:opacity-50"
                          >
                            {bid}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        disabled={!isConnected}
                        onClick={() => onPass().catch(() => {})}
                        className="mt-3 w-full rounded-lg border border-white/15 px-4 py-2.5 font-semibold text-white/80 transition-colors hover:bg-white/10 disabled:opacity-50"
                      >
                        Pass
                      </button>
                    </>
                  ) : (
                    <div role="status">
                      <h2 className="text-lg font-semibold">{isMyTurn ? 'Preparing your hand…' : `Waiting for ${players.find(player => player.id === gameState.currentPlayer)?.name || 'the next player'}`}</h2>
                      {!isMyTurn && <p className="mt-1 text-sm text-white/60">You can raise the bid or pass when it is your turn.</p>}
                    </div>
                  )}
                </div>
              </section>
            )}

            {errorMessage && <p className="mt-4 rounded-lg border border-red-300/30 bg-red-900/40 p-3 text-sm text-red-100" role="alert">{errorMessage}</p>}
          </main>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-white/10 bg-green-900/70 p-4 sm:p-5">
              <h2 className="mb-3 text-lg font-bold">Players</h2>
              <ul className="space-y-2">
                {players.map(player => {
                  const passed = gameState.passedPlayers.includes(player.id);
                  const isHighBidder = player.id === gameState.currentBidder;
                  const isActing = player.id === gameState.currentPlayer;
                  return (
                    <li key={player.id} className="flex items-center justify-between gap-2 rounded-lg bg-black/15 px-3 py-2 text-sm">
                      <span className="truncate font-medium">{player.name}{player.id === currentPlayerId ? ' (You)' : ''}</span>
                      <span className={`shrink-0 text-right text-xs ${passed ? 'text-white/40' : isActing ? 'text-gold-light' : 'text-white/55'}`}>
                        <span className="block">{player.connected === false ? 'Reconnecting' : passed ? 'Passed' : isHighBidder ? `High · ${gameState.currentBid}` : isActing ? 'Acting' : 'In'}</span>
                        <span className="block text-[10px] text-gold-light">Match {gameState.matchScores?.[player.id] || 0}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="rounded-2xl border border-white/10 bg-felt-dark/70 p-4 sm:p-5">
              <h2 className="mb-3 text-lg font-bold">Bidding history</h2>
              <ol className="space-y-2">
                {(gameState.bidHistory || []).map((action, index) => (
                  <li key={`${action.playerId}-${index}`} className="flex justify-between gap-2 text-sm text-white/70">
                    <span className="truncate">{players.find(player => player.id === action.playerId)?.name || 'Player'}</span>
                    <span className="font-semibold text-white">{action.type === 'pass' ? 'Passed' : action.amount}</span>
                  </li>
                ))}
              </ol>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};

BiddingPhase.propTypes = {
  gameState: PropTypes.object.isRequired,
  currentPlayerId: PropTypes.string,
  isConnected: PropTypes.bool,
  onBid: PropTypes.func.isRequired,
  onPass: PropTypes.func.isRequired,
  onSetContract: PropTypes.func.isRequired,
  errorMessage: PropTypes.string
};
