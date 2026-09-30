import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { buildMatchScorecardRows } from '../../utils/matchScorecard';

const signed = value => (value > 0 ? `+${value}` : `${value}`);

export const MatchScorecard = ({ players, matchScoreHistory }) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const closeRef = useRef(null);
  const rows = buildMatchScorecardRows(matchScoreHistory, players);

  useEffect(() => {
    if (!isOpen) return undefined;
    const trigger = triggerRef.current;
    closeRef.current?.focus();
    const handleKeyDown = event => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      trigger?.focus();
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        className="rounded-lg border border-gold/40 px-3 py-2 text-sm font-semibold text-gold-light transition-colors hover:bg-gold/10"
      >
        Match scorecard
      </button>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="match-scorecard-title"
            onKeyDown={event => {
              if (event.key === 'Tab') {
                event.preventDefault();
                closeRef.current?.focus();
              }
            }}
            className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-gold/40 bg-felt-dark shadow-2xl"
          >
            <header className="flex items-center justify-between gap-4 border-b border-white/10 p-4 sm:px-6">
              <div>
                <h2 id="match-scorecard-title" className="text-xl font-bold text-white">Match scorecard</h2>
                <p className="mt-1 text-xs text-white/55">Signed bid awards by completed deal</p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
              >
                Close
              </button>
            </header>
            <div className="max-h-[70vh] overflow-auto p-4 sm:p-6">
              <table className="w-full min-w-max border-collapse text-left text-sm">
                <caption className="sr-only">Match score changes for each completed deal and cumulative totals</caption>
                <thead>
                  <tr className="border-b border-white/15 text-xs uppercase tracking-wider text-white/55">
                    <th scope="col" className="px-3 py-3">Deal</th>
                    {players.map(player => <th scope="col" key={player.id} className="px-3 py-3 text-right">{player.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, -1).map(row => (
                    <tr key={row.dealNumber} className="border-b border-white/5 text-white/85">
                      <th scope="row" className="px-3 py-3 font-semibold">Deal {row.dealNumber}</th>
                      {players.map(player => <td key={player.id} className="px-3 py-3 text-right tabular-nums">{signed(row.changes[player.id])}</td>)}
                    </tr>
                  ))}
                  {rows.length === 1 && (
                    <tr><td colSpan={players.length + 1} className="px-3 py-6 text-center text-white/55">No completed deals yet.</td></tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gold/30 bg-gold/10 font-bold text-gold-light">
                    <th scope="row" className="px-3 py-3">Total</th>
                    {players.map(player => <td key={player.id} className="px-3 py-3 text-right tabular-nums">{signed(rows[rows.length - 1].changes[player.id])}</td>)}
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </div>
      )}
    </>
  );
};

MatchScorecard.propTypes = {
  players: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string.isRequired, name: PropTypes.string.isRequired })).isRequired,
  matchScoreHistory: PropTypes.arrayOf(PropTypes.shape({
    dealNumber: PropTypes.number.isRequired,
    changes: PropTypes.object.isRequired
  }))
};

MatchScorecard.defaultProps = { matchScoreHistory: [] };
