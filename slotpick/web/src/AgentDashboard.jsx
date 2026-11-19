import { useEffect, useState } from 'react';
import { getAgentDeliveries, updateAgentDeliveryStatus } from './api';

const STATUS_LABELS = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  'out-for-delivery': 'Out for delivery',
  delivered: 'Delivered',
  completed: 'Delivered',
  cancelled: 'Cancelled',
};

function nextAction(delivery) {
  if (delivery.status === 'pending' && delivery.selectedSlotId) {
    return { status: 'scheduled', label: 'Confirm scheduled' };
  }
  if (delivery.status === 'scheduled') {
    return { status: 'out-for-delivery', label: 'Mark out for delivery' };
  }
  if (delivery.status === 'out-for-delivery') {
    return { status: 'delivered', label: 'Mark delivered' };
  }
  return null;
}

function formatDay(date) {
  return new Date(`${date}T00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export default function AgentDashboard({ user, token, onLogout }) {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rowErrors, setRowErrors] = useState({});
  const [updatingId, setUpdatingId] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    getAgentDeliveries(token)
      .then(({ deliveries: assigned }) => {
        if (active) setDeliveries(assigned);
      })
      .catch((requestError) => {
        if (!active) return;
        if (requestError.status === 401) onLogout();
        else setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [onLogout, retryCount, token]);

  async function changeStatus(delivery, nextStatus) {
    setUpdatingId(delivery._id);
    setRowErrors((current) => ({ ...current, [delivery._id]: '' }));
    try {
      const { delivery: updated } = await updateAgentDeliveryStatus(
        token,
        delivery._id,
        nextStatus
      );
      setDeliveries((current) =>
        current.map((item) => (item._id === updated._id ? updated : item))
      );
    } catch (requestError) {
      if (requestError.status === 401) {
        onLogout();
        return;
      }
      setRowErrors((current) => ({ ...current, [delivery._id]: requestError.message }));
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <main className="card account-card">
      <header className="account-header">
        <div>
          <h1>Agent Dashboard</h1>
          <p className="muted">{user.name} · Delivery Agent</p>
          <p>{user.email}</p>
        </div>
        <button className="secondary-button" type="button" onClick={onLogout}>Sign out</button>
      </header>

      <section>
        <h2>Assigned deliveries</h2>
        {loading && <p role="status">Loading assigned deliveries…</p>}
        {error && (
          <div>
            <p className="msg" role="alert">{error}</p>
            <button
              className="secondary-button"
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
            >
              Try again
            </button>
          </div>
        )}
        {!loading && !error && deliveries.length === 0 && (
          <p className="muted">No deliveries are assigned to you yet.</p>
        )}
        {!loading && !error && deliveries.length > 0 && (
          <ul className="delivery-list">
            {deliveries.map((delivery) => {
              const status = String(delivery.status || '').toLowerCase();
              const statusClass = status.replace(/[^a-z0-9-]/g, '-');
              const action = nextAction(delivery);

              return (
                <li key={delivery._id}>
                  <div className="delivery-summary">
                    <strong>{delivery.orderId}</strong>
                    <span className={`status-label status-${statusClass}`}>
                      {STATUS_LABELS[status] || status.replace(/-/g, ' ')}
                    </span>
                  </div>
                  <span><strong>Platform:</strong> {delivery.platform}</span>
                  <span><strong>Customer:</strong> {delivery.customerName || 'Name not provided'}</span>
                  <span>{delivery.address}</span>
                  {delivery.selectedSlotId && (
                    <span>
                      {formatDay(delivery.selectedSlotId.date)} · {delivery.selectedSlotId.start}–{delivery.selectedSlotId.end}
                    </span>
                  )}
                  {!delivery.selectedSlotId && (
                    <span className="muted">No delivery slot selected yet.</span>
                  )}
                  {status === 'pending' && !delivery.selectedSlotId && (
                    <p className="muted">Waiting for the customer to select a delivery slot.</p>
                  )}
                  {rowErrors[delivery._id] && (
                    <p className="msg" role="alert">{rowErrors[delivery._id]}</p>
                  )}
                  {action && (
                    <button
                      className="confirm status-action"
                      type="button"
                      disabled={updatingId !== null}
                      onClick={() => changeStatus(delivery, action.status)}
                    >
                      {updatingId === delivery._id ? 'Updating…' : action.label}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}