const BASE = process.env.REACT_APP_API_URL;

const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const mock = {
  orderId: 'ORD-48213',
  address: '12 Station Road, Hanamkonda',
  selectionExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  slots: [0, 1, 2].flatMap((n) =>
    [['09:00', '11:00'], ['11:00', '13:00'], ['14:00', '16:00'], ['16:00', '18:00'], ['18:00', '20:00']].map(
      ([start, end], i) => ({ id: `${n}-${i}`, date: day(n + 1), start, end, available: (n + i) % 4 !== 0 })
    )
  )
};

async function request(path, options) {
  const res = await fetch(`${BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok) {
    const err = new Error('request failed');
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const getDelivery = (token) => (BASE ? request(`/api/deliveries/${token}`) : Promise.resolve(mock));
export const confirmSlot = (token, slotId) =>
  BASE
    ? request(`/api/deliveries/${token}/slot`, { method: 'POST', body: JSON.stringify({ slotId }) })
    : Promise.resolve(mock.slots.find((s) => s.id === slotId));
