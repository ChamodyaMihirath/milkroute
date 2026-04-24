/**
 * MilkRouteContext.jsx — API-backed version (replaces localStorage)
 */

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { farmersAPI, logsAPI, paymentsAPI } from "../api";

const Ctx = createContext(null);
export const useMR = () => useContext(Ctx);

export function haversine(a, b) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
export function routeLength(pts) {
  return pts.reduce((s, p, i) => i ? s + haversine(pts[i - 1], p) : 0, 0);
}
function tspNN(pts) {
  if (pts.length <= 2) return [...pts];
  const vis = new Array(pts.length).fill(false);
  const route = [pts[0]]; vis[0] = true;
  for (let s = 1; s < pts.length; s++) {
    const last = route[route.length - 1];
    let bd = Infinity, bi = -1;
    pts.forEach((p, i) => { if (!vis[i]) { const d = haversine(last, p); if (d < bd) { bd = d; bi = i; } } });
    vis[bi] = true; route.push(pts[bi]);
  }
  return route;
}
function twoOpt(route) {
  let improved = true, best = [...route];
  while (improved) {
    improved = false;
    for (let i = 1; i < best.length - 1; i++) {
      for (let j = i + 1; j < best.length; j++) {
        const nxt = best[j + 1] || best[0];
        const d0 = haversine(best[i-1], best[i]) + haversine(best[j], nxt);
        const d1 = haversine(best[i-1], best[j]) + haversine(best[i], nxt);
        if (d1 < d0 - 0.001) { best.splice(i, j-i+1, ...best.slice(i, j+1).reverse()); improved = true; }
      }
    }
  }
  return best;
}
async function fetchORSRoute(list, orsKey) {
  const res = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: orsKey },
    body: JSON.stringify({ coordinates: list.map(f => [f.lng, f.lat]) }),
  });
  const data = await res.json();
  if (!data.features) throw new Error("No route returned");
  const path = data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
  const { distance, duration } = data.features[0].properties.summary;
  return { path, km: (distance / 1000).toFixed(1), min: Math.round(duration / 60) };
}

export const PRICE_PER_LITER = 80;
export const todayISO  = () => new Date().toISOString().slice(0, 10);
export const daysAgoISO = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
export const totalL    = logs => logs.reduce((s, l) => s + parseFloat(l.liters || 0), 0);

export function MilkRouteProvider({ children }) {
  const ORS_KEY = import.meta.env.VITE_ORS_KEY || "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjU4OWRkMGFkOTZiMjQxYjQ5ZmQ4ODlkMTgzYjBkNmEyIiwiaCI6Im11cm11cjY0In0=";

  const [farmers,  setFarmers]  = useState([]);
  const [logs,     setLogs]     = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const [routeOrder,     setRouteOrder]     = useState([]);
  const [optimizedOrder, setOptimizedOrder] = useState([]);
  const [manRoute,       setManRoute]       = useState(null);
  const [optRoute,       setOptRoute]       = useState(null);
  const [routeError,     setRouteError]     = useState("");
  const [optimizing,     setOptimizing]     = useState(false);
  const [savings,        setSavings]        = useState(null);

  const [gpsActive,   setGpsActive]   = useState(false);
  const [gpsPosition, setGpsPosition] = useState(null);
  const [gpsTrail,    setGpsTrail]    = useState([]);
  const [gpsWatchId,  setGpsWatchId]  = useState(null);
  const [pendingLoc,  setPendingLoc]  = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [f, l, p] = await Promise.all([farmersAPI.getAll(), logsAPI.getAll(), paymentsAPI.getAll()]);
      setFarmers(f); setLogs(l); setPayments(p);
    } catch (err) {
      setError(`Cannot connect to backend: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const addFarmer    = async d => { const f = await farmersAPI.create(d); setFarmers(p => [...p, f]); return f; };
  const removeFarmer = async id => {
    await farmersAPI.remove(id);
    setFarmers(p => p.filter(f => f._id !== id));
    setLogs(p => p.filter(l => l.farmerId !== id));
    setPayments(p => p.filter(pay => pay.farmerId !== id));
    setRouteOrder(p => p.filter(f => f._id !== id));
  };
  const updateFarmer = async (id, d) => {
    const u = await farmersAPI.update(id, d);
    setFarmers(p => p.map(f => f._id === id ? u : f));
    return u;
  };

  const addLog    = async e => { const l = await logsAPI.create(e); setLogs(p => [l, ...p]); return l; };
  const deleteLog = async id => { await logsAPI.remove(id); setLogs(p => p.filter(l => l._id !== id)); };
  const logsFor   = id => logs.filter(l => l.farmerId === id);

  const addPayment    = async e => { const pay = await paymentsAPI.create(e); setPayments(p => [pay, ...p]); return pay; };
  const deletePayment = async id => { await paymentsAPI.remove(id); setPayments(p => p.filter(pay => pay._id !== id)); };
  const paymentsFor   = id => payments.filter(p => p.farmerId === id);
  const balanceFor    = id => {
    const earned = logsFor(id).reduce((s, l) => s + parseFloat(l.liters || 0) * PRICE_PER_LITER, 0);
    const paid   = paymentsFor(id).reduce((s, p) => s + parseFloat(p.amount || 0), 0);
    return earned - paid;
  };

  const addToRoute = f => {
    if (routeOrder.find(r => r._id === f._id)) return;
    setRouteOrder(p => [...p, f]);
    setOptimizedOrder([]); setManRoute(null); setOptRoute(null); setSavings(null);
  };
  const clearRoute = () => {
    setRouteOrder([]); setOptimizedOrder([]);
    setManRoute(null); setOptRoute(null); setSavings(null); setRouteError("");
  };
  const calcManual = async () => {
    if (routeOrder.length < 2) { alert("Add at least 2 farmers."); return; }
    setRouteError("");
    try { setManRoute(await fetchORSRoute(routeOrder, ORS_KEY)); }
    catch { setRouteError("Route failed — check ORS API key."); }
  };
  const runOptimize = async () => {
    if (routeOrder.length < 2) { alert("Add at least 2 farmers first."); return; }
    setOptimizing(true);
    await new Promise(r => setTimeout(r, 30));
    const opt = twoOpt(tspNN(routeOrder));
    setOptimizedOrder(opt);
    const mk = routeLength(routeOrder), ok = routeLength(opt), saved = mk - ok;
    setSavings({ km: saved.toFixed(1), pct: Math.round((saved / mk) * 100) });
    setOptimizing(false);
  };
  const calcOpt = async () => {
    if (!optimizedOrder.length) return;
    try { setOptRoute(await fetchORSRoute(optimizedOrder, ORS_KEY)); }
    catch { setRouteError("Optimized route failed."); }
  };

  const startGPS = () => {
    if (!navigator.geolocation) { alert("Geolocation not supported."); return; }
    const id = navigator.geolocation.watchPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setGpsPosition({ lat, lng });
        setGpsTrail(p => [...p.slice(-300), [lat, lng]]);
      },
      () => alert("GPS error — allow location access."),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    setGpsWatchId(id); setGpsActive(true);
  };
  const stopGPS = () => {
    if (gpsWatchId) navigator.geolocation.clearWatch(gpsWatchId);
    setGpsActive(false); setGpsWatchId(null);
  };

  const totalMilkToday = totalL(logs.filter(l => l.date === todayISO()));

  return (
    <Ctx.Provider value={{
      farmers, logs, payments, loading, error, loadAll,
      addFarmer, removeFarmer, updateFarmer,
      addLog, deleteLog, logsFor,
      addPayment, deletePayment, paymentsFor, balanceFor,
      routeOrder, setRouteOrder, addToRoute, clearRoute,
      optimizedOrder, setOptimizedOrder,
      manRoute, optRoute, routeError, optimizing, savings,
      calcManual, runOptimize, calcOpt,
      gpsActive, gpsPosition, gpsTrail, startGPS, stopGPS,
      pendingLoc, setPendingLoc,
      totalMilkToday,
    }}>
      {children}
    </Ctx.Provider>
  );
}