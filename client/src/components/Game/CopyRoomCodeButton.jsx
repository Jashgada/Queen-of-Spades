import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

export const CopyRoomCodeButton = ({ code }) => {
  const [status, setStatus] = useState('');
  const timeoutRef = useRef(null);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setStatus('Copied');
    } catch {
      setStatus('Copy failed');
    }

    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setStatus(''), 1600);
  };

  return (
    <button
      type="button"
      onClick={copyRoomCode}
      aria-label={status === 'Copied' ? 'Room code copied' : `Copy room code ${code}`}
      title={status || 'Copy room code'}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-2 text-xs font-semibold text-white/75 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
        <rect x="7" y="6" width="9" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M13 6V4.5A1.5 1.5 0 0 0 11.5 3h-7A1.5 1.5 0 0 0 3 4.5v9A1.5 1.5 0 0 0 4.5 15H7" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <span aria-live="polite">{status || 'Copy'}</span>
    </button>
  );
};

CopyRoomCodeButton.propTypes = {
  code: PropTypes.string.isRequired
};
