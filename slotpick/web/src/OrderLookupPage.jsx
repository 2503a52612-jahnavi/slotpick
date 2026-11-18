import { useState } from 'react';
import { bookOrderSlot, lookupOrder } from './api';

const PLATFORMS = ['Amazon', 'Flipkart', 'Myntra', 'Ajio', 'Meesho'];

function formatDay(date) {
  return new Date(`${date}T00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatStatus(status) {
  return status.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function OrderLookupPage({ onNavigate }) {
  const [platform, setPlatform] = useState('');
  const [orderId, setOrderId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const [error, setError] = useState('');

  async function search(event) {
    event.preventDefault();
    const normalizedOrderId = orderId.trim();
    if (!normalizedOrderId) {
      setError('Enter your order ID to search.');
      setResult(null);
      return;
    }

    setLoading(true);
    setResult(null);
    setError('');

    try {
      const delivery = await lookupOrder({ platform, orderId: normalizedOrderId });
      setResult(delivery);
    } catch (requestError) {
      setError(
        requestError.status === 404
          ? 'We could not find that order. Check the platform and order ID, then try again.'
          : requestError.message
      );
    } finally {
      setLoading(false);
    }
  }

  async function bookSlot(slot) {
    setBookingId(slot.id);
    setError('');

    try {
      const booking = await bookOrderSlot({
        platform: result.platform,
        orderId: result.orderId,
        slotId: slot.id,
      });
      setResult((current) => ({
        ...current,
        status: booking.status,
        selectedSlot: booking.selectedSlot,
      }));
    } catch (requestError) {
      if (requestError.status === 409) {
        try {
          const refreshed = await lookupOrder({
            platform: result.platform,
            orderId: result.orderId,
          });
          setResult(refreshed);
          setError('That slot is no longer available. Review the latest available times.');
        } catch (refreshError) {
          setError(refreshError.message);
        }
      } else {
        if (requestError.status === 410) {
          try {
            const refreshed = await lookupOrder({
              platform: result.platform,
              orderId: result.orderId,
            });
            setResult(refreshed);
          } catch (refreshError) {
            setError(refreshError.message);
          }
        }
        setError(requestError.message);
      }
    } finally {
      setBookingId(null);
    }
  }

  const bookingOpen = result
    && result.status === 'pending'
    && new Date(result.selectionExpiresAt).getTime() > Date.now();
  const availableSlots = result ? result.slots.filter((slot) => slot.available) : [];

  return (
    <div className="landing-page lookup-page">
      <header className="landing-header">
        <a className="landing-brand" href="#/" aria-label="SlotPick home">
          <span className="landing-brand-mark" aria-hidden="true"><span /></span>
          <span>slotpick</span>
        </a>
        <div className="landing-header-actions">
          <button className="landing-login-link" type="button" onClick={() => onNavigate('/')}>
            Back home
          </button>
          <button className="landing-button landing-button-small" type="button" onClick={() => onNavigate('/login')}>
            Login
          </button>
        </div>
      </header>

      <main className="lookup-main">
        <section className="lookup-intro">
          <p className="landing-eyebrow"><span /> DELIVERY, ON YOUR TIME</p>
          <h1>Find your order.<br /><em>Pick your moment.</em></h1>
          <p>Choose where you shopped and enter your order ID to see delivery details and available times.</p>
        </section>

        <section className="lookup-card" aria-labelledby="lookup-title">
          <h2 id="lookup-title">Look up your order</h2>
          <p className="lookup-card-description">Use the platform and order ID from your order confirmation.</p>
          <form className="lookup-form" onSubmit={search}>
            <div className="lookup-field">
              <label htmlFor="order-platform">Shopping platform</label>
              <select
                id="order-platform"
                name="platform"
                value={platform}
                onChange={(event) => setPlatform(event.target.value)}
                disabled={loading || bookingId !== null}
                required
              >
                <option value="" disabled>Select a platform</option>
                {PLATFORMS.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>

            <div className="lookup-field">
              <label htmlFor="order-id">Order ID</label>
              <input
                id="order-id"
                name="orderId"
                type="text"
                autoComplete="off"
                maxLength="80"
                placeholder="Enter your order ID"
                value={orderId}
                onChange={(event) => setOrderId(event.target.value)}
                disabled={loading || bookingId !== null}
                required
              />
            </div>
            <button className="landing-button lookup-search-button" type="submit" disabled={loading || bookingId !== null}>
              {loading ? 'Searching…' : 'Search order'}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          {error && <p className="lookup-error" role="alert">{error}</p>}

          {result && (
            <section className="lookup-result" aria-labelledby="order-result-title" aria-live="polite">
              <div className="lookup-result-heading">
                <div>
                  <p className="landing-eyebrow">ORDER FOUND</p>
                  <h2 id="order-result-title">{result.platform} order</h2>
                </div>
                <span className={`lookup-status lookup-status-${result.status.replace(/[^a-z0-9-]/g, '-')}`}>
                  {formatStatus(result.status)}
                </span>
              </div>

              <dl className="lookup-order-details">
                <div>
                  <dt>Platform</dt>
                  <dd>{result.platform}</dd>
                </div>
                <div>
                  <dt>Order ID</dt>
                  <dd>{result.orderId}</dd>
                </div>
                <div>
                  <dt>Delivery status</dt>
                  <dd>{formatStatus(result.status)}</dd>
                </div>
              </dl>

              {result.selectedSlot && (
                <p className="lookup-booked-slot">
                  Delivery time: <strong>{formatDay(result.selectedSlot.date)}, {result.selectedSlot.start}–{result.selectedSlot.end}</strong>
                </p>
              )}

              <div className="lookup-available">
                <h3>Available slots</h3>
                {bookingOpen ? (
                  availableSlots.length ? (
                    <div className="lookup-slot-list">
                      {availableSlots.map((slot) => (
                        <button
                          className="lookup-slot"
                          key={slot.id}
                          type="button"
                          disabled={bookingId !== null}
                          onClick={() => bookSlot(slot)}
                        >
                          <span>{formatDay(slot.date)}</span>
                          <strong>{slot.start}–{slot.end}</strong>
                          <span className="lookup-slot-action">
                            {bookingId === slot.id ? 'Booking…' : 'Choose'}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="lookup-empty">There are no available delivery slots right now.</p>
                  )
                ) : result.status === 'pending' ? (
                  <p className="lookup-empty">The slot selection window has expired.</p>
                ) : result.status === 'scheduled' ? (
                  <p className="lookup-empty">Your delivery time is booked.</p>
                ) : (
                  <p className="lookup-empty">This delivery is not accepting slot bookings.</p>
                )}
              </div>
            </section>
          )}
        </section>

        <p className="lookup-help">
          Need a hand?{' '}
          <button type="button" onClick={() => onNavigate('/login')}>Sign in to your account</button>
        </p>
      </main>
    </div>
  );
}
