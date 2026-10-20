const TOKEN_KEY = 'rc_token';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function api(path, { method = 'GET', body, params } = {}) {
  const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')).toString() : '';
  const token = getToken();
  let res;
  try {
    res = await fetch(`/api${path}${qs}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the API server. Make sure it is running (npm run dev) and check its terminal for errors.', 0);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (!data) throw new ApiError(`The API server is not responding (HTTP ${res.status}). Start it with "npm run dev" and check the terminal for errors such as a database or port problem.`, res.status);
    throw new ApiError(data.error || `Request failed (HTTP ${res.status})`, res.status, data.code);
  }
  return data;
}
