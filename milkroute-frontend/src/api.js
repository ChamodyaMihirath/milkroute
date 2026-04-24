/**
 * api.js — all HTTP calls to the MilkRoute backend
 * Base URL reads from Vite env var, falls back to localhost:5000
 */

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const BASE = `${BASE_URL}/api`;

async function req(method, path, body) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Farmers ───────────────────────────────────────────────────────────────────
export const farmersAPI = {
  getAll:  ()         => req("GET",    "/farmers"),
  create:  (data)     => req("POST",   "/farmers", data),
  update:  (id, data) => req("PUT",    `/farmers/${id}`, data),
  remove:  (id)       => req("DELETE", `/farmers/${id}`),
};

// ── Milk logs ─────────────────────────────────────────────────────────────────
export const logsAPI = {
  getAll:   (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req("GET", `/logs${qs ? "?" + qs : ""}`);
  },
  create:   (data)  => req("POST",   "/logs", data),
  remove:   (id)    => req("DELETE", `/logs/${id}`),
  summary:  (from, to) => req("GET", `/logs/summary?from=${from}&to=${to}`),
};

// ── Payments ──────────────────────────────────────────────────────────────────
export const paymentsAPI = {
  getAll:  (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req("GET", `/payments${qs ? "?" + qs : ""}`);
  },
  create:  (data) => req("POST",   "/payments", data),
  remove:  (id)   => req("DELETE", `/payments/${id}`),
  balance: (farmerId) => req("GET", `/payments/balance/${farmerId}`),
};