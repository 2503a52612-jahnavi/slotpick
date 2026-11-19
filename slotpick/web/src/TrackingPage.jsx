import { useCallback, useEffect, useRef, useState } from 'react';
import { getTrackedDelivery } from './api';

const STATUS_LABELS = {
  pending: 'Awaiting your slot selection',
  scheduled: 'Delivery scheduled',
  'out-for-delivery': 'Out for delivery',
  delivered: 'Delivered',
  completed: 'Delivered',
  cancelled: 'Cancelled',
};

function formatDay(date) {
  return new Date(`${date}T00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function formatTimestamp(value) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function TrackingPage({ trackingToken, onNavigate }) {
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshError, setRefreshError] = useState('');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const hasDelivery = useRef(false);

  const refresh = useCallback(async (silent = false) => {
    try {
      const result = await getTrackedDelivery(trackingToken);
      setDelivery(result.delivery);
      hasDelivery.current = true;
      setError('');
      setRefreshError('');
    } catch (requestError) {
      if (silent && hasDelivery.current) setRefreshError(requestError.message);
      else setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [trackingToken]);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(() => refresh(true), 15000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  async function copyTrackingLink() {
    setCopied(false);
    setCopyError('');
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard access is unavailable. Select and copy the tracking link.');
      }
      const trackingUrl = `${window.location.origin}/track/${encodeURIComponent(trackingToken)}`;
      await navigator.clipboard.writeText(trackingUrl);
      setCopied(true);
    } catch (requestError) {
      setCopyError(requestError.message);
    }
  }

  if (loading) return <main className="card" role="status">Loading delivery tracking…</main>;
  if (error && !delivery) {
    return (
      <main className="card delivery-flow-card">
        <h1>We can’t load this tracking link</h1>
        <p className="msg" role="alert">{error}</p>
        <button className="secondary-button" type="button" onClick={() => onNavigate('/')}>
          Find another order
        </button>
      </main>
    );
  }
  if (!delivery) return null;

  const trackingUrl = `${window.location.origin}/track/${encodeURIComponent(trackingToken)}`;

  return (
    <main className="card delivery-flow-card tracking-card">
      <p className="landing-eyebrow">DELIVERY TRACKING</p>
      <div className="lookup-result-heading">
        <div>
          <h1>Order {delivery.orderId}</h1>
          <p className="muted">{delivery.platform} · {delivery.address}</p>
        </div>
        <span className={`lookup-status lookup-status-${delivery.status}`}>
          {STATUS_LABELS[delivery.status] || delivery.status.replace(/-/g, ' ')}
        </span>
      </div>

      {refreshError && <p className="msg" role="status">Could not refresh tracking: {refreshError}</p>}
      <p className="muted">Tracking refreshes automatically every 15 seconds.</p>

      {delivery.selectedSlot && (
        <p className="lookup-booked-slot">
          <strong>Delivery window:</strong> {formatDay(delivery.selectedSlot.date)} ·{' '}
          {delivery.selectedSlot.start}–{delivery.selectedSlot.end}
        </p>
      )}
      {delivery.assignedAgentName && (
        <p><strong>Delivery agent:</strong> {delivery.assignedAgentName}</p>
      )}
      {delivery.status === 'pending' && (
        <button
          className="secondary-button"
          type="button"
          onClick={() => onNavigate(`/schedule/${trackingToken}`)}
        >
          Choose a delivery slot
        </button>
      )}

      <section className="tracking-history" aria-labelledby="tracking-history-title">
        <h2 id="tracking-history-title">Status timeline</h2>
        <ol className="delivery-timeline">
          {delivery.statusHistory.map((entry, index) => (
            <li key={`${entry.status}-${entry.at}-${index}`}>
              <span className="timeline-marker" aria-hidden="true" />
              <div>
                <strong>{STATUS_LABELS[entry.status] || entry.status.replace(/-/g, ' ')}</strong>
                <time dateTime={entry.at}>{formatTimestamp(entry.at)}</time>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="tracking-link-section" aria-labelledby="tracking-link-title">
        <h2 id="tracking-link-title">Your private tracking link</h2>
        <p className="muted">Keep this link to check delivery updates later.</p>
        <input
          className="tracking-link-input"
          type="text"
          readOnly
          value={trackingUrl}
          aria-label="Private tracking link"
          onFocus={(event) => event.currentTarget.select()}
        />
        <button className="secondary-button" type="button" onClick={copyTrackingLink}>
          {copied ? 'Copied' : 'Copy tracking link'}
        </button>
        {copyError && <p className="msg" role="alert">{copyError}</p>}
      </section>
    </main>
  );
}
