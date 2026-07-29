// src/utils/api.js
// In browser development, '/api' is proxied to localhost:4000 by
// vite.config.js. Deployed and Capacitor builds must provide the public API
// URL at build time, for example:
//   VITE_API_URL=https://schedio-api.example.com/api
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '');
const isNativeApp = Boolean(window.Capacitor?.isNativePlatform?.());
const BASE = configuredApiUrl || '/api';

function getToken() {
  return localStorage.getItem('schedio_token');
}

async function request(method, path, body = null) {
  const requestId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const headers = { 'Content-Type': 'application/json', 'X-Request-ID': requestId };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let res;
  try {
    console.info(`[api:${requestId}] request`, { method, path, base: BASE });
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {})
    });
  } catch (error) {
    console.error(`[api:${requestId}] network failure`, error);
    const nativeHint = isNativeApp && !configuredApiUrl
      ? ' This mobile build has no VITE_API_URL configured. Set it to the public HTTPS API URL (including /api), then rebuild and sync the app.'
      : ' Check your network connection and confirm that VITE_API_URL points to a reachable API.';
    throw new Error(`Unable to reach the API at ${BASE}.${nativeHint}`);
  }
  console.info(`[api:${requestId}] response received`, { status: res.status, ok: res.ok });

  let data;
  try {
    data = await res.json();
  } catch {
    // Response was not JSON; almost always means the API URL is wrong
    // (e.g. hitting a 404 HTML page because the backend isn't deployed/reachable).
    throw new Error(
      `Could not reach the API at ${BASE}${path} (status ${res.status}). ` +
      `Check that the backend is deployed and VITE_API_URL is set correctly.`
    );
  }
  if (!res.ok) {
    console.error(`[api:${requestId}] API error response`, { status: res.status, code: data.code, error: data.error });
    const err = new Error(data.error || 'Request failed');
    Object.assign(err, data); // e.g. { unverified: true, email } from /login
    throw err;
  }
  console.info(`[api:${requestId}] request completed`);
  return data;
}

export const api = {
  // Auth
  register: (body) => request('POST', '/auth/register', body),
  registerWithPassword: (body) => request('POST', '/auth/register-password', body),
  verifyOtp: (body) => request('POST', '/auth/verify-otp', body),
  resendOtp: (body) => request('POST', '/auth/resend-otp', body),
  login: (body) => request('POST', '/auth/login', body),
  loginWithEmail: (body) => request('POST', '/auth/login-email', body),
  firebaseLogin: (idToken) => request('POST', '/auth/firebase', { idToken }),
  me: () => request('GET', '/auth/me'),
  updateProfile: (body) => request('PATCH', '/auth/profile', body),

  // Users
  getUsers: () => request('GET', '/users'),
  heartbeat: () => request('PATCH', '/users/heartbeat'),

  // Classes
  getMyClasses: () => request('GET', '/classes'),
  getUserClasses: (userId) => request('GET', `/classes/user/${userId}`),
  createClass: (body) => request('POST', '/classes', body),
  updateClass: (id, body) => request('PATCH', `/classes/${id}`, body),
  deleteClass: (id) => request('DELETE', `/classes/${id}`),

  // Posts
  getPosts: () => request('GET', '/posts'),
  createPost: (body) => request('POST', '/posts', body),
  deletePost: (id) => request('DELETE', `/posts/${id}`),

  // Cover
  getCoverRequests: () => request('GET', '/cover'),
  createCoverRequest: (body) => request('POST', '/cover', body),
  respondToCover: (id, status) => request('PATCH', `/cover/${id}`, { status }),

  // Messages
  getMessages: (userId) => request('GET', `/messages/${userId}`),
  sendMessage: (toUserId, content) => request('POST', '/messages', { toUserId, content }),
  getUnreadCount: () => request('GET', '/messages/unread/count')
};
