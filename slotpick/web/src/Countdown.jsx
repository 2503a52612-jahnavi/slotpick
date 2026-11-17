import { useEffect, useState } from 'react';

export default function Countdown({ expiresAt, onExpire }) {
  const [left, setLeft] = useState(() => Math.max(0, new Date(expiresAt) - Date.now()));
  useEffect(() => {
    const t = setInterval(() => {
      const ms = Math.max(0, new Date(expiresAt) - Date.now());
      setLeft(ms);
      if (ms === 0) { clearInterval(t); onExpire(); }
    }, 1000);
    return () => clearInterval(t);
  }, [expiresAt, onExpire]);
  const m = String(Math.floor(left / 60000)).padStart(2, '0');
  const s = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
  return <span className={left < 60000 ? 'timer urgent' : 'timer'} role="timer">{m}:{s}</span>;
}
