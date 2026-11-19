import { useEffect, useState } from 'react';
import {
  bookCustomerSlot,
  changePassword,
  getAdminStatus,
  getAgentDeliveries,
  getCustomerDeliveries,
} from './api';

const STATUS_LABELS = {
  pending: 'Pending',
  scheduled: 'Scheduled',
  'out-for-delivery': 'Out for delivery',
  delivered: 'Delivered',
  completed: 'Delivered',
  cancelled: 'Cancelled',
};

function roleName(role) {
  if (role === 'agent') return 'Delivery Agent';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function statusLabel(status) {
  return STATUS_LABELS[status] || status.replace(/-/g, ' ');
}

function formatDay(date) {
  return new Date(`${date}T00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export default function AccountPage({ user, token, onLogout, onAuthenticated }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deliveries, setDeliveries] = useState([]);
  const [adminMessage, setAdminMessage] = useState('');
  const [bookingId, setBookingId] = useState(null);
  const [bookingErrors, setBookingErrors] = useState({});
  const [slotPickerId, setSlotPickerId] = useState(null);
  const [activeDay, setActiveDay] = useState(null);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [refreshError, setRefreshError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  useEffect(() => {
    let active = true;
    let requestPending = false;

    async function loadAccountData(showLoading) {
      if (requestPending) return;
      requestPending = true;
      if (showLoading) {
        setLoading(true);
        setError('');
      }
      try {
        if (user.role === 'customer') {
          const result = await getCustomerDeliveries(token);
          if (active) {
            setDeliveries(result.deliveries);
            setRefreshError('');
          }
        } else if (user.role === 'agent') {
          const result = await getAgentDeliveries(token);
          if (active) setDeliveries(result.deliveries);
        } else if (user.role === 'admin') {
          const result = await getAdminStatus(token);
          if (active) setAdminMessage(result.message);
        }
      } catch (requestError) {
        if (!active) return;
        if (requestError.status === 401) onLogout();
        else if (showLoading) setError(requestError.message);
        else setRefreshError(requestError.message);
      } finally {
        requestPending = false;
        if (active && showLoading) setLoading(false);
      }
    }

    loadAccountData(true);
    const refreshTimer = user.role === 'customer'
      ? window.setInterval(() => loadAccountData(false), 15000)
      : null;
    return () => {
      active = false;
      if (refreshTimer) window.clearInterval(refreshTimer);
    };
  }, [onLogout, retryCount, token, user.role]);

  async function selectSlot(delivery, slot) {
    setBookingId(delivery._id);
    setBookingErrors((current) => ({ ...current, [delivery._id]: '' }));
    try {
      await bookCustomerSlot(token, delivery._id, slot._id);
      const result = await getCustomerDeliveries(token);
      setDeliveries(result.deliveries);
      setSlotPickerId(null);
      setSelectedSlotId(null);
    } catch (requestError) {
      if (requestError.status === 401) {
        onLogout();
        return;
      }

      const message = requestError.status === 409
        ? 'That slot is no longer available. Refreshing the available times…'
        : requestError.status === 410
          ? 'The slot selection window has expired.'
          : requestError.message;
      setBookingErrors((current) => ({ ...current, [delivery._id]: message }));

      if (requestError.status === 409) {
        setSelectedSlotId(null);
        try {
          const result = await getCustomerDeliveries(token);
          setDeliveries(result.deliveries);
        } catch (refreshError) {
          if (refreshError.status === 401) onLogout();
          else setBookingErrors((current) => ({ ...current, [delivery._id]: refreshError.message }));
        }
      }
    } finally {
      setBookingId(null);
    }
  }

  async function updatePassword(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setPasswordBusy(true);
    setPasswordError('');
    setPasswordMessage('');
    try {
      const result = await changePassword(token, {
        currentPassword: String(form.get('currentPassword')),
        newPassword: String(form.get('newPassword')),
      });
      formElement.reset();
      setPasswordMessage(result.message);
      onAuthenticated({ token: result.token, user });
    } catch (requestError) {
      if (requestError.status === 401) {
        onLogout();
        return;
      }
      setPasswordError(requestError.message);
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <main className="card account-card">
      <header className="account-header">
        <div>
          <h1>Your account</h1>
          <p className="muted">{user.name} · {roleName(user.role)}</p>
          <p>{user.email}</p>
        </div>
        <button className="secondary-button" type="button" onClick={onLogout}>Sign out</button>
      </header>

      <section className="account-security">
        <h2>Change password</h2>
        <p className="muted">Use at least 12 characters. Changing it signs out your other sessions.</p>
        <form className="form" onSubmit={updatePassword}>
          <label htmlFor="current-password">Current password</label>
          <input id="current-password" name="currentPassword" type="password" autoComplete="current-password" maxLength="72" required />
          <label htmlFor="new-password">New password</label>
          <input id="new-password" name="newPassword" type="password" autoComplete="new-password" minLength="12" maxLength="72" required />
          {passwordError && <p className="msg" role="alert">{passwordError}</p>}
          {passwordMessage && <p className="success-msg" role="status">{passwordMessage}</p>}
          <button className="secondary-button" type="submit" disabled={passwordBusy}>
            {passwordBusy ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </section>

      {loading && <p role="status">Loading your account…</p>}
      {error && (
        <div>
          <p className="msg" role="alert">{error}</p>
          <button className="secondary-button" type="button" onClick={() => setRetryCount((count) => count + 1)}>
            Try again
          </button>
        </div>
      )}
      {!loading && !error && user.role === 'admin' && <p>{adminMessage}</p>}
      {!loading && !error && user.role !== 'admin' && (
        <section>
          <h2>{user.role === 'agent' ? 'Assigned deliveries' : 'My deliveries'}</h2>
          {user.role === 'customer' && (
            <p className="muted">Delivery statuses refresh automatically every 15 seconds.</p>
          )}
          {refreshError && <p className="msg" role="status">Could not refresh delivery status: {refreshError}</p>}
          {deliveries.length === 0 ? (
            <p className="muted">No deliveries are linked to this account yet.</p>
          ) : (
            <ul className="delivery-list">
              {deliveries.map((delivery) => {
                const status = String(delivery.status || '').toLowerCase();
                const statusClass = status.replace(/[^a-z0-9-]/g, '-');
                const slots = (delivery.slots || []).filter(
                  (slot) => slot.active && slot.bookedCount < slot.capacity
                );
                const selectionOpen =
                  status === 'pending' &&
                  new Date(delivery.selectionExpiresAt).getTime() > Date.now();
                const days = [...new Set((delivery.slots || []).map((slot) => slot.date))];
                const selectedSlot = (delivery.slots || []).find(
                  (slot) => String(slot._id) === selectedSlotId
                );

                return (
                  <li key={delivery._id}>
                    <div className="delivery-summary">
                      <strong>{delivery.orderId}</strong>
                      <span className={`status-label status-${statusClass}`}>
                        {statusLabel(status)}
                      </span>
                    </div>
                    {user.role === 'customer' && (
                      <span><strong>Platform:</strong> {delivery.platform}</span>
                    )}
                    <span>{delivery.address}</span>
                    {delivery.selectedSlotId && (
                      <span>
                        {formatDay(delivery.selectedSlotId.date)} · {delivery.selectedSlotId.start}–{delivery.selectedSlotId.end}
                      </span>
                    )}

                    {user.role === 'customer' && status === 'pending' && (
                      <div className="available-slots">
                        {bookingErrors[delivery._id] && (
                          <p className="msg" role="alert">{bookingErrors[delivery._id]}</p>
                        )}
                        <button
                          className="secondary-button"
                          type="button"
                          disabled={!selectionOpen || slots.length === 0 || bookingId !== null}
                          aria-expanded={slotPickerId === delivery._id}
                          onClick={() => {
                            if (slotPickerId === delivery._id) {
                              setSlotPickerId(null);
                              setSelectedSlotId(null);
                            } else {
                              setSlotPickerId(delivery._id);
                              setSelectedSlotId(null);
                              setActiveDay(slots[0]?.date || days[0] || null);
                            }
                          }}
                        >
                          Choose a slot
                        </button>
                        {!selectionOpen && <p className="muted">The slot selection window has expired.</p>}
                        {selectionOpen && slots.length === 0 && (
                          <p className="muted">No delivery slots are currently available.</p>
                        )}
                        {slotPickerId === delivery._id && selectionOpen && (
                          <div>
                            <strong>Choose a delivery time</strong>
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
                            <div className="delivery-slot-list">
                              {(delivery.slots || [])
                                .filter((slot) => slot.date === activeDay)
                                .map((slot) => {
                                  const available = slot.active && slot.bookedCount < slot.capacity;
                                  return (
                                    <button
                                      key={slot._id}
                                      className={selectedSlotId === slot._id ? 'day on' : 'day'}
                                      type="button"
                                      disabled={!available || bookingId !== null}
                                      aria-pressed={selectedSlotId === slot._id}
                                      onClick={() => setSelectedSlotId(slot._id)}
                                    >
                                      {slot.start}–{slot.end}{!available && ' · Full'}
                                    </button>
                                  );
                                })}
                            </div>
                            <button
                              className="confirm"
                              type="button"
                              disabled={!selectedSlot || bookingId === delivery._id}
                              onClick={() => selectSlot(delivery, selectedSlot)}
                            >
                              {bookingId === delivery._id
                                ? 'Booking…'
                                : selectedSlot
                                  ? `Book ${selectedSlot.start}–${selectedSlot.end}`
                                  : 'Select a time'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
