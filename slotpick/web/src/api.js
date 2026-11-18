const BASE = (process.env.REACT_APP_API_URL || '').replace(/\/+$/, '');

async function request(path, options = {}) {
  if (!BASE) {
    const error = new Error('REACT_APP_API_URL is not configured for this frontend build.');
    error.status = 0;
    throw error;
  }

  const { token, headers: extraHeaders, ...fetchOptions } = options;
  const headers = { Accept: 'application/json', ...extraHeaders };

  if (fetchOptions.body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${BASE}${path}`, { ...fetchOptions, headers });
  } catch {
    const error = new Error(`Could not reach the API at ${BASE}. Check that the backend is running.`);
    error.status = 0;
    throw error;
  }

  let result = {};
  try {
    result = await response.json();
  } catch {
    if (response.ok) return {};
  }

  if (!response.ok) {
    const details = Array.isArray(result.details)
      ? result.details.map(({ field, message }) => `${field}: ${message}`).join('; ')
      : '';
    const error = new Error(details ? `${result.error}: ${details}` : result.error || 'Request failed');
    error.status = response.status;
    throw error;
  }

  return result;
}

export const register = (details) =>
  request('/api/auth/register', { method: 'POST', body: JSON.stringify(details) });

export const login = (credentials) =>
  request('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) });

export const getMe = (token) => request('/api/auth/me', { token });
export const getCustomerDeliveries = (token) => request('/api/customer/deliveries', { token });
export const bookCustomerSlot = (token, deliveryId, slotId) =>
  request(`/api/customer/deliveries/${encodeURIComponent(deliveryId)}/slot`, {
    method: 'POST',
    token,
    body: JSON.stringify({ slotId }),
  });
export const getAgentDeliveries = (token) => request('/api/agent/deliveries', { token });
export const updateAgentDeliveryStatus = (token, deliveryId, status) =>
  request(`/api/agent/deliveries/${encodeURIComponent(deliveryId)}/status`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ status }),
  });
export const getAdminStatus = (token) => request('/api/admin/ping', { token });

export const getDelivery = (token) =>
  request(`/api/deliveries/${encodeURIComponent(token)}`);

export const confirmSlot = (token, slotId) =>
  request(`/api/deliveries/${encodeURIComponent(token)}/slot`, {
    method: 'POST',
    body: JSON.stringify({ slotId }),
  });
