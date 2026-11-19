import { useEffect, useState } from 'react';
import { bookTrackedSlot, getTrackedDelivery } from './api';
import Countdown from './Countdown';

const formatDay = (date) =>
  new Date(`${date}T00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

export default function SchedulePage({ trackingToken, onNavigate }) {
  const [delivery, setDelivery] = useState(null);
  const [activeDay, setActiveDay] = useState(null);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    getTrackedDelivery(trackingToken)
      .then(({ delivery: result }) => {
        if (!active) return;
        setDelivery(result);
        setActiveDay(result.slots.find((slot) => slot.available)?.date || result.slots[0]?.date || null);
        setExpired(new Date(result.selectionExpiresAt).getTime() <= Date.now());
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [trackingToken]);

  async function submitBooking() {
    if (!selectedSlotId || saving) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await bookTrackedSlot(trackingToken, selectedSlotId);
      onNavigate(`/track/${trackingToken}`);
    } catch (requestError) {
      if (requestError.status === 409) {
        setNotice('That slot just filled. The available times have been refreshed.');
        try {
          const result = await getTrackedDelivery(trackingToken);
          setDelivery(result.delivery);
          setSelectedSlotId(null);
        } catch (refreshError) {
          setError(refreshError.message);
        }
      } else if (requestError.status === 410) {
        setExpired(true);
        setError('The slot selection window has expired.');
      } else {
        setError(requestError.message);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="card" role="status">Loading available delivery times…</main>;
  if (error && !delivery) {
    return (
      <main className="card delivery-flow-card">
        <h1>We can’t load this delivery</h1>
        <p className="msg" role="alert">{error}</p>
        <button className="secondary-button" type="button" onClick={() => onNavigate('/')}>
          Back to order lookup
        </button>
      </main>
    );
  }
  if (!delivery) return null;

  const days = [...new Set(delivery.slots.map((slot) => slot.date))];
  const slots = delivery.slots.filter((slot) => slot.date === activeDay);
  const selectedSlot = delivery.slots.find((slot) => slot.id === selectedSlotId);
  const canBook = delivery.status === 'pending' && !expired;

  if (delivery.status !== 'pending') {
    return (
      <main className="card delivery-flow-card">
        <h1>This delivery is already scheduled</h1>
        <p>Order {delivery.orderId} has status {delivery.status.replace(/-/g, ' ')}.</p>
        <button className="confirm" type="button" onClick={() => onNavigate(`/track/${trackingToken}`)}>
          View tracking
        </button>
      </main>
    );
  }

  return (
    <main className="card delivery-flow-card">
      <p className="landing-eyebrow">CHOOSE A DELIVERY TIME</p>
      <h1>Pick a slot for order {delivery.orderId}</h1>
      <p>{delivery.platform} · {delivery.address}</p>
      <p className="hold">
        Slot selection expires in{' '}
        <Countdown
          expiresAt={delivery.selectionExpiresAt}
          onExpire={() => setExpired(true)}
        />
      </p>

      {notice && <p className="success-msg" role="status">{notice}</p>}
      {error && <p className="msg" role="alert">{error}</p>}
      {!canBook && <p className="lookup-empty">The slot selection window has expired.</p>}
      {canBook && delivery.slots.every((slot) => !slot.available) && (
        <p className="lookup-empty">There are no available delivery slots.</p>
      )}

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
              disabled={!slot.available || !canBook || saving}
              aria-pressed={selectedSlotId === slot.id}
              className={selectedSlotId === slot.id ? 'slot on' : 'slot'}
              onClick={() => setSelectedSlotId(slot.id)}
            >
              {slot.start}–{slot.end}{!slot.available && <small> Full</small>}
            </button>
          </li>
        ))}
      </ul>

      <button
        className="confirm"
        type="button"
        disabled={!selectedSlot || !canBook || saving}
        onClick={submitBooking}
      >
        {saving ? 'Booking…' : selectedSlot ? `Book ${selectedSlot.start}–${selectedSlot.end}` : 'Choose a slot'}
      </button>
    </main>
  );
}
