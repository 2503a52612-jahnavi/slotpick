import { useCallback, useEffect, useState } from 'react';
import { confirmSlot, getDelivery } from './api';
import Countdown from './Countdown';

const formatDay = (date) =>
  new Date(`${date}T00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

export default function DeliveryPage({ deliveryToken }) {
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading');
  const [selected, setSelected] = useState(null);
  const [activeDay, setActiveDay] = useState(null);
  const [message, setMessage] = useState('');

  const load = useCallback((notice = '') => {
    setState('loading');
    setMessage(notice);
    getDelivery(deliveryToken)
      .then((delivery) => {
        setData(delivery);
        if (delivery.status === 'scheduled' && delivery.selectedSlot) {
          setSelected(delivery.selectedSlot);
          setState('done');
        } else {
          setSelected(null);
          setActiveDay(delivery.slots[0]?.date || null);
          setState('pick');
        }
      })
      .catch((error) => {
        setMessage(error.message);
        setState(error.status === 410 ? 'expired' : 'error');
      });
  }, [deliveryToken]);

  useEffect(() => {
    load();
  }, [load]);

  const expire = useCallback(() => setState('expired'), []);

  async function submit() {
    if (!selected) return;
    setState('saving');
    try {
      const booking = await confirmSlot(deliveryToken, selected.id);
      setSelected(booking);
      setState('done');
    } catch (error) {
      if (error.status === 410) {
        setMessage(error.message);
        setState('expired');
      } else if (error.status === 409) {
        load('That slot was just taken. Choose another available time.');
      } else {
        setMessage(error.message);
        setState('pick');
      }
    }
  }

  if (state === 'loading') {
    return <main className="card" role="status">Loading your delivery…</main>;
  }
  if (state === 'error') {
    return (
      <main className="card">
        <h1>We can’t load this delivery</h1>
        <p className="msg" role="alert">{message || 'Check the link and try again.'}</p>
      </main>
    );
  }
  if (state === 'expired') {
    return (
      <main className="card">
        <h1>Time ran out</h1>
        <p>{message || 'We’ll deliver in the next available slot and message you the time.'}</p>
      </main>
    );
  }
  if (state === 'done') {
    return (
      <main className="card">
        <h1>Delivery booked</h1>
        <p className="big">{formatDay(selected.date)}, {selected.start}–{selected.end}</p>
        <p>Order {data.orderId} will arrive at {data.address}.</p>
      </main>
    );
  }

  const days = [...new Set(data.slots.map((slot) => slot.date))];
  const slots = data.slots.filter((slot) => slot.date === activeDay);
  const hasAvailableSlots = data.slots.some((slot) => slot.available);

  return (
    <main className="card">
      <header>
        <h1>Pick your delivery time</h1>
        <p>Order {data.orderId} · {data.address}</p>
        <p className="hold">
          Slot selection expires in{' '}
          <Countdown expiresAt={data.selectionExpiresAt} onExpire={expire} />
        </p>
      </header>
      {message && <p className="msg" role="alert">{message}</p>}
      {!hasAvailableSlots && <p className="muted">There are no available delivery slots.</p>}
      <div className="days" role="tablist" aria-label="Delivery dates">
        {days.map((day) => (
          <button
            key={day}
            type="button"
            role="tab"
            aria-selected={day === activeDay}
            className={day === activeDay ? 'day on' : 'day'}
            onClick={() => setActiveDay(day)}
          >
            {formatDay(day)}
          </button>
        ))}
      </div>
      <ul className="slots">
        {slots.map((slot) => (
          <li key={slot.id}>
            <button
              type="button"
              disabled={!slot.available}
              aria-pressed={selected?.id === slot.id}
              className={selected?.id === slot.id ? 'slot on' : 'slot'}
              onClick={() => setSelected(slot)}
            >
              {slot.start}–{slot.end}{!slot.available && <small> Full</small>}
            </button>
          </li>
        ))}
      </ul>
      <button
        className="confirm"
        type="button"
        disabled={!selected || state === 'saving'}
        onClick={submit}
      >
        {state === 'saving' ? 'Booking…' : selected ? `Book ${selected.start}–${selected.end}` : 'Choose a slot'}
      </button>
    </main>
  );
}
