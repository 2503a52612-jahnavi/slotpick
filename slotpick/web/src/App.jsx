import { useEffect, useState, useCallback } from 'react';
import { getDelivery, confirmSlot } from './api';
import Countdown from './Countdown';

const token = () => (window.location.hash.match(/\/d\/([\w-]+)/) || [])[1];
const fmtDay = (d) => new Date(d + 'T00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

export default function App() {
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading'); // loading | pick | saving | done | expired | error
  const [selected, setSelected] = useState(null);
  const [activeDay, setActiveDay] = useState(null);
  const [message, setMessage] = useState('');
  const t = token() || 'demo';

  const load = useCallback(() => {
    setState('loading');
    getDelivery(t)
      .then((d) => {
        setData(d);
        if (d.status === 'scheduled' && d.selectedSlot) {
          setSelected(d.selectedSlot);
          setState('done');
        } else {
          setActiveDay(d.slots[0]?.date);
          setState('pick');
        }
      })
      .catch((e) => setState(e.status === 410 ? 'expired' : 'error'));
  }, [t]);
  useEffect(load, [load]);

  const submit = async () => {
    setState('saving');
    try {
      const res = await confirmSlot(t, selected.id);
      setSelected(res);
      setState('done');
    } catch (e) {
      if (e.status === 410) return setState('expired');
      if (e.status === 409) { setMessage('Someone just took that slot. Pick another.'); setSelected(null); return load(); }
      setMessage('Could not save your slot. Check your connection and try again.');
      setState('pick');
    }
  };

  if (state === 'loading') return <main className="card"><p>Loading your delivery…</p></main>;
  if (state === 'error') return <main className="card"><h1>We can’t find this delivery</h1><p>Check the link in your message and try again.</p></main>;
  if (state === 'expired') return <main className="card"><h1>Time ran out</h1><p>We’ll deliver in the next available slot and message you the time.</p></main>;
  if (state === 'done') return (
    <main className="card">
      <h1>Delivery booked</h1>
      <p className="big">{fmtDay(selected.date)}, {selected.start}–{selected.end}</p>
      <p>Order {data.orderId} will arrive at {data.address}.</p>
    </main>
  );

  const days = [...new Set(data.slots.map((s) => s.date))];
  const slots = data.slots.filter((s) => s.date === activeDay);
  return (
    <main className="card">
      <header>
        <h1>Pick your delivery time</h1>
        <p>Order {data.orderId} · {data.address}</p>
        <p className="hold">Slot held for <Countdown expiresAt={data.selectionExpiresAt} onExpire={() => setState('expired')} /></p>
      </header>
      {message && <p className="msg" role="alert">{message}</p>}
      <div className="days" role="tablist">
        {days.map((d) => (
          <button key={d} role="tab" aria-selected={d === activeDay} className={d === activeDay ? 'day on' : 'day'} onClick={() => setActiveDay(d)}>{fmtDay(d)}</button>
        ))}
      </div>
      <ul className="slots">
        {slots.map((s) => (
          <li key={s.id}>
            <button disabled={!s.available} aria-pressed={selected?.id === s.id} className={selected?.id === s.id ? 'slot on' : 'slot'} onClick={() => setSelected(s)}>
              {s.start}–{s.end}{!s.available && <small> Full</small>}
            </button>
          </li>
        ))}
      </ul>
      <button className="confirm" disabled={!selected || state === 'saving'} onClick={submit}>
        {state === 'saving' ? 'Booking…' : selected ? `Book ${selected.start}–${selected.end}` : 'Choose a slot'}
      </button>
    </main>
  );
}
