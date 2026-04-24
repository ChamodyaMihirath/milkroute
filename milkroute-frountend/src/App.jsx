import { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler } from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import { MilkRouteProvider, useMR, todayISO, daysAgoISO, totalL, PRICE_PER_LITER } from "./context/MilkRouteContext";
import "./App.css";


ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler);

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const C = {
  green:"#639922",greenDark:"#27500A",greenLight:"#EAF3DE",greenMid:"#97C459",
  teal:"#1D9E75",amber:"#BA7517",amberDark:"#633806",
  purple:"#534AB7",purpleDark:"#26215C",purpleLight:"#EEEDFE",
  gray:"#888780",grayLight:"#F1EFE8",grayDark:"#2C2C2A",
  red:"#A32D2D",border:"#E0E0DC",
};

const mkIcon = (color, border, shape = "circle") => L.divIcon({
  className: "",
  html: shape === "diamond"
    ? `<div style="width:13px;height:13px;background:${color};border:2px solid ${border};transform:rotate(45deg);border-radius:2px;"></div>`
    : `<div style="width:12px;height:12px;background:${color};border:2px solid ${border};border-radius:50%;"></div>`,
  iconSize: [14, 14], iconAnchor: [7, 7],
});
const greenIcon   = mkIcon(C.green,  C.greenDark,  "circle");
const purpleIcon  = mkIcon(C.purple, C.purpleDark, "diamond");
const gpsIcon     = mkIcon(C.amber,  C.amberDark,  "circle");
const pendingIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;background:#E24B4A;border:2px solid #A32D2D;border-radius:50%;"></div>`,
  iconSize: [16, 16], iconAnchor: [8, 8],
});

function getDates(n) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}
function fmtDate(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}
function MapClicker({ active, onClick }) {
  useMapEvents({ click: e => { if (active) onClick(e.latlng); } });
  return null;
}

const chartFont = { family: "'IBM Plex Mono', monospace", size: 10 };
const baseChartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

function Btn({ children, variant = "default", size = "md", className = "", ...props }) {
  const cls = ["mr-btn", size === "sm" ? "mr-btn-sm" : "", variant !== "default" ? `mr-btn-${variant}` : "", className].filter(Boolean).join(" ");
  return <button className={cls} {...props}>{children}</button>;
}
function Field({ label, children }) {
  return <div className="mr-field"><label>{label}</label>{children}</div>;
}
function Inp({ className = "", ...props }) {
  return <input className={`mr-input ${className}`} {...props} />;
}
function Sel({ children, className = "", ...props }) {
  return <select className={`mr-select ${className}`} {...props}>{children}</select>;
}
function SectionLabel({ children }) { return <div className="mr-section-lbl">{children}</div>; }
function Badge({ children, color = "green" }) { return <span className={`mr-badge mr-badge-${color}`}>{children}</span>; }
function Card({ children, className = "" }) { return <div className={`mr-card ${className}`}>{children}</div>; }
function MetricCard({ label, value, color = C.grayDark }) {
  return <div className="mr-metric"><div className="mr-metric-val" style={{ color }}>{value}</div><div className="mr-metric-lbl">{label}</div></div>;
}
function Avatar({ name = "?", size = 30 }) {
  const i = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return <div className="mr-avatar" style={{ width: size, height: size }}>{i}</div>;
}
function Empty({ children }) { return <div className="mr-empty">{children}</div>; }
function ChartTitle({ children }) { return <div className="mr-chart-title">{children}</div>; }
function LegendDot({ color, label, border }) {
  return <span className="mr-legend-dot"><span className="mr-legend-dot-swatch" style={{ background: color, border: border ? `1px solid ${C.border}` : "none" }} />{label}</span>;
}
function LoadingScreen() {
  return (
    <div className="mr-loading">
      <div className="mr-loading-title"><span style={{ color: C.green }}>■</span> MilkRoute</div>
      <div className="mr-loading-sub">Connecting to database…</div>
      <div className="mr-loading-bar-wrap"><div className="mr-loading-bar" /></div>
    </div>
  );
}
function ErrorBanner({ message, onRetry }) {
  return (
    <div className="mr-error-banner">
      <span className="mr-error-msg">⚠ {message}</span>
      <Btn size="sm" variant="danger" onClick={onRetry}>Retry</Btn>
    </div>
  );
}

function DashboardTab() {
  const { farmers, logs, logsFor, loading, error, loadAll } = useMR();
  const [range, setRange] = useState(30);
  if (loading) return <LoadingScreen />;
  const recent = logs.filter(l => l.date >= daysAgoISO(range));
  const total = totalL(recent);
  const expected = farmers.reduce((s, f) => s + (f.milk || 0) * range, 0);
  const eff = expected > 0 ? Math.round((total / expected) * 100) : 0;
  const active = new Set(recent.map(l => l.farmerId)).size;
  const avgDay = range > 0 ? (total / range).toFixed(1) : 0;
  const dates = getDates(range);
  const dailyMap = Object.fromEntries(dates.map(d => [d, 0]));
  recent.forEach(l => { if (dailyMap[l.date] !== undefined) dailyMap[l.date] += parseFloat(l.liters || 0); });
  const dailyVals = dates.map(d => +dailyMap[d].toFixed(1));
  const step = range <= 14 ? 1 : range <= 30 ? 3 : 7;
  const labels = dates.map((d, i) => i % step === 0 ? fmtDate(d) : "");
  const farmerTotals = farmers.map(f => ({ name: f.name.length > 12 ? f.name.slice(0,11)+"…" : f.name, total: Math.round(totalL(logsFor(f._id).filter(l => l.date >= daysAgoISO(range)))), expected: (f.milk || 0) * range })).sort((a, b) => b.total - a.total);
  const qCounts = { good: 0, average: 0, poor: 0 };
  recent.forEach(l => { if (qCounts[l.quality] !== undefined) qCounts[l.quality]++; });
  const hasQ = Object.values(qCounts).some(v => v > 0);
  const thisWeek = totalL(logs.filter(l => l.date >= daysAgoISO(7)));
  const lastWeek = totalL(logs.filter(l => l.date >= daysAgoISO(14) && l.date < daysAgoISO(7)));
  const wow = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;
  return (
    <div className="mr-panel">
      {error && <ErrorBanner message={error} onRetry={loadAll} />}
      <div className="mr-panel-header">
        <div><div className="mr-panel-title">Dashboard</div><div className="mr-panel-subtitle">Overview of all collection activity</div></div>
        <Sel style={{ width: "auto" }} value={range} onChange={e => setRange(+e.target.value)}>
          <option value={7}>Last 7 days</option><option value={14}>Last 14 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
        </Sel>
      </div>
      <div className="mr-metrics">
        <MetricCard label="Total collected" value={`${Math.round(total)}L`} color={C.greenDark} />
        <MetricCard label="Avg / day"       value={`${avgDay}L`} />
        <MetricCard label="Efficiency"      value={`${eff}%`} color={eff >= 80 ? C.greenDark : eff >= 50 ? C.amber : C.red} />
        <MetricCard label="Active farmers"  value={active} />
        <MetricCard label="Week trend"      value={wow !== null ? `${wow >= 0 ? "▲" : "▼"} ${Math.abs(wow)}%` : "—"} color={wow > 0 ? C.greenDark : wow < 0 ? C.red : C.gray} />
      </div>
      <Card>
        <div className="mr-chart-header"><ChartTitle>Daily collection (litres)</ChartTitle><div className="mr-chart-legend"><LegendDot color={C.greenMid} label="Collected" /></div></div>
        <div style={{ height: 180 }}>
          <Bar data={{ labels, datasets: [{ data: dailyVals, backgroundColor: C.greenMid, borderColor: C.green, borderWidth: 1, borderRadius: 3 }] }}
            options={{ ...baseChartOpts, scales: { x: { grid: { display: false }, ticks: { font: chartFont, color: C.gray } }, y: { grid: { color: "rgba(0,0,0,0.04)" }, ticks: { font: chartFont, color: C.gray, callback: v => v + "L" } } }, plugins: { ...baseChartOpts.plugins, tooltip: { callbacks: { label: ctx => ctx.parsed.y + "L" } } } }} />
        </div>
      </Card>
      <div className="mr-chart-2col">
        <Card>
          <div className="mr-chart-header"><ChartTitle>Per-farmer totals</ChartTitle><div className="mr-chart-legend"><LegendDot color="#5DCAA5" label="Collected" /><LegendDot color={C.grayLight} label="Expected" border /></div></div>
          <div style={{ height: Math.max(160, farmerTotals.length * 44 + 40) }}>
            {farmerTotals.length > 0 ? <Bar data={{ labels: farmerTotals.map(f => f.name), datasets: [{ label: "Collected", data: farmerTotals.map(f => f.total), backgroundColor: "#5DCAA5", borderRadius: 3 }, { label: "Expected", data: farmerTotals.map(f => f.expected), backgroundColor: C.grayLight, borderColor: "#B4B2A9", borderWidth: 1, borderRadius: 3 }] }} options={{ ...baseChartOpts, indexAxis: "y", scales: { x: { grid: { color: "rgba(0,0,0,0.04)" }, ticks: { font: chartFont, color: C.gray, callback: v => v + "L" } }, y: { grid: { display: false }, ticks: { font: { ...chartFont, size: 11 }, color: C.grayDark } } }, plugins: { ...baseChartOpts.plugins, tooltip: { callbacks: { label: ctx => ctx.parsed.x + "L" } } } }} /> : <Empty>No data yet.</Empty>}
          </div>
        </Card>
        <Card>
          <div className="mr-chart-header"><ChartTitle>Quality breakdown</ChartTitle><div className="mr-chart-legend"><LegendDot color={C.teal} label="Good" /><LegendDot color={C.amber} label="Average" /><LegendDot color={C.red} label="Poor" /></div></div>
          <div style={{ height: 160 }}>
            {hasQ ? <Doughnut data={{ labels: ["Good","Average","Poor"], datasets: [{ data: [qCounts.good, qCounts.average, qCounts.poor], backgroundColor: [C.teal, C.amber, "#F09595"], borderWidth: 1, borderColor: "#fff" }] }} options={{ ...baseChartOpts, cutout: "60%", plugins: { ...baseChartOpts.plugins, tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.parsed}` } } } }} /> : <Empty>No quality data yet.</Empty>}
          </div>
        </Card>
      </div>
    </div>
  );
}

function FarmersTab({ onSelectFarmer }) {
  const { farmers, addFarmer, removeFarmer, addToRoute, routeOrder, logsFor, balanceFor, loading, error, loadAll } = useMR();
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", milk: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const filtered = farmers.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));
  const handleAdd = async () => {
    if (!form.name || !form.milk) { alert("Name and milk required."); return; }
    setSaving(true);
    try { await addFarmer({ name: form.name, milk: parseFloat(form.milk), phone: form.phone, lat: 7.8731, lng: 80.7718 }); setForm({ name: "", milk: "", phone: "" }); }
    catch (e) { alert("Failed: " + e.message); } finally { setSaving(false); }
  };
  if (loading) return <LoadingScreen />;
  return (
    <div className="mr-panel">
      {error && <ErrorBanner message={error} onRetry={loadAll} />}
      <Inp placeholder="Search farmer…" value={search} onChange={e => setSearch(e.target.value)} />
      <Card>
        <SectionLabel>Add new farmer</SectionLabel>
        <div className="mr-form-grid-4">
          <Field label="Name"><Inp value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Farmer name" /></Field>
          <Field label="Daily milk (L)"><Inp type="number" value={form.milk} onChange={e => setForm({ ...form, milk: e.target.value })} placeholder="30" /></Field>
          <Field label="Phone"><Inp value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+94 77…" /></Field>
          <div className="mr-form-align-bottom"><Btn variant="green" onClick={handleAdd} disabled={saving}>{saving ? "Saving…" : "Add"}</Btn></div>
        </div>
        <div className="mr-form-tip">Tip: After adding, pin the exact location in the Map tab.</div>
      </Card>
      {filtered.length === 0 ? <Empty>{farmers.length === 0 ? "No farmers yet." : "No match found."}</Empty> : filtered.map(f => {
        const fl = logsFor(f._id);
        const todayLit = fl.filter(l => l.date === todayISO()).reduce((s, l) => s + parseFloat(l.liters || 0), 0);
        const weekL = Math.round(totalL(fl.filter(l => l.date >= daysAgoISO(7))));
        const bal = balanceFor(f._id);
        const inRoute = !!routeOrder.find(r => r._id === f._id);
        return (
          <Card key={f._id}>
            <div className="mr-farmer-card-header">
              <Avatar name={f.name} size={38} />
              <div style={{ flex: 1 }}><div className="mr-farmer-card-name">{f.name}</div><div className="mr-farmer-card-meta">{f.phone || "—"} · Expected {f.milk}L/day</div></div>
              <Badge color={todayLit >= (f.milk || 0) ? "green" : todayLit > 0 ? "amber" : "red"}>{todayLit > 0 ? Math.round(todayLit) + "L today" : "No log"}</Badge>
            </div>
            <div className="mr-farmer-stats">
              <div className="mr-farmer-stat" style={{ background: C.grayLight }}><div className="mr-farmer-stat-val" style={{ color: C.greenDark }}>{weekL}L</div><div className="mr-farmer-stat-lbl" style={{ color: C.gray }}>This week</div></div>
              <div className="mr-farmer-stat" style={{ background: C.grayLight }}><div className="mr-farmer-stat-val" style={{ color: C.grayDark }}>{fl.length}</div><div className="mr-farmer-stat-lbl" style={{ color: C.gray }}>Total logs</div></div>
              <div className="mr-farmer-stat" style={{ background: bal > 0 ? "#FAEEDA" : "#EAF3DE" }}><div className="mr-farmer-stat-val" style={{ color: bal > 0 ? C.amberDark : C.greenDark }}>Rs {Math.abs(Math.round(bal))}</div><div className="mr-farmer-stat-lbl" style={{ color: bal > 0 ? C.amberDark : C.greenDark }}>{bal > 0 ? "Owed" : "Settled"}</div></div>
            </div>
            <div className="mr-farmer-actions">
              <Btn size="sm" onClick={() => onSelectFarmer(f)}>View history</Btn>
              <Btn size="sm" variant={inRoute ? "ghost" : "green"} onClick={() => !inRoute && addToRoute(f)}>{inRoute ? "In route ✓" : "+ Add to route"}</Btn>
              <Btn size="sm" variant="danger" onClick={() => window.confirm(`Remove ${f.name}?`) && removeFarmer(f._id)}>Remove</Btn>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function FarmerDetailTab({ farmer, onBack }) {
  const { logsFor, addLog, deleteLog, addPayment, paymentsFor, balanceFor } = useMR();
  const [range, setRange] = useState(30);
  const [logForm, setLogForm] = useState({ date: todayISO(), liters: "", quality: "good", note: "" });
  const [payForm, setPayForm] = useState({ amount: "" });
  const [saving, setSaving] = useState(false);
  const id = farmer._id;
  const fl = logsFor(id);
  const recent = fl.filter(l => l.date >= daysAgoISO(range));
  const total = totalL(recent);
  const avgDay = (total / range).toFixed(1);
  const bal = balanceFor(id);
  let streak = 0; const td = new Date();
  while (true) { const iso = td.toISOString().slice(0, 10); if (fl.some(l => l.date === iso)) { streak++; td.setDate(td.getDate() - 1); } else break; }
  const nowL = totalL(fl.filter(l => l.date >= daysAgoISO(range)));
  const prevL = totalL(fl.filter(l => l.date >= daysAgoISO(range * 2) && l.date < daysAgoISO(range)));
  const trendPct = prevL > 0 ? Math.round(((nowL - prevL) / prevL) * 100) : null;
  const dates = getDates(range);
  const dm = Object.fromEntries(dates.map(d => [d, null]));
  recent.forEach(l => { dm[l.date] = (dm[l.date] || 0) + parseFloat(l.liters || 0); });
  const dailyVals = dates.map(d => dm[d] !== null ? +dm[d].toFixed(1) : null);
  const step = range <= 14 ? 1 : range <= 30 ? 3 : 7;
  const handleAddLog = async () => {
    if (!logForm.liters) { alert("Enter litres."); return; }
    setSaving(true);
    try { await addLog({ farmerId: id, date: logForm.date, liters: parseFloat(logForm.liters), quality: logForm.quality, note: logForm.note }); setLogForm({ date: todayISO(), liters: "", quality: "good", note: "" }); }
    catch (e) { alert("Failed: " + e.message); } finally { setSaving(false); }
  };
  const handlePay = async () => {
    if (!payForm.amount) { alert("Enter amount."); return; }
    setSaving(true);
    try { await addPayment({ farmerId: id, amount: parseFloat(payForm.amount), date: todayISO(), note: "Manual payment" }); setPayForm({ amount: "" }); }
    catch (e) { alert("Failed: " + e.message); } finally { setSaving(false); }
  };
  return (
    <div className="mr-panel">
      <div className="mr-detail-header">
        <Btn size="sm" onClick={onBack}>← Back</Btn>
        <Avatar name={farmer.name} size={36} />
        <div><div className="mr-detail-name">{farmer.name}</div><div className="mr-detail-meta">{farmer.phone || "—"} · Expected {farmer.milk}L/day</div></div>
        <Sel style={{ marginLeft: "auto", width: "auto" }} value={range} onChange={e => setRange(+e.target.value)}>
          <option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option><option value={90}>90 days</option>
        </Sel>
      </div>
      <div className="mr-metrics">
        <MetricCard label={`Total (${range}d)`} value={`${Math.round(total)}L`} color={C.greenDark} />
        <MetricCard label="Avg/day" value={`${avgDay}L`} />
        <MetricCard label="Streak" value={`${streak}d`} color={streak >= 7 ? C.greenDark : C.grayDark} />
        <MetricCard label="vs prev period" value={trendPct !== null ? `${trendPct >= 0 ? "▲" : "▼"} ${Math.abs(trendPct)}%` : "—"} color={trendPct > 0 ? C.greenDark : trendPct < 0 ? C.red : C.gray} />
        <MetricCard label={bal > 0 ? "Owed" : "Balance"} value={`Rs ${Math.abs(Math.round(bal))}`} color={bal > 0 ? C.amberDark : C.greenDark} />
      </div>
      <Card>
        <div className="mr-chart-header"><ChartTitle>Daily vs target ({farmer.milk}L)</ChartTitle><div className="mr-chart-legend"><LegendDot color={C.green} label="Collected" /><LegendDot color={C.border} label="Target" border /></div></div>
        <div style={{ height: 180 }}>
          <Line data={{ labels: dates.map((d, i) => i % step === 0 ? fmtDate(d) : ""), datasets: [{ label: "Collected", data: dailyVals, borderColor: C.green, backgroundColor: "rgba(93,202,165,0.1)", borderWidth: 2, pointRadius: dailyVals.map(v => v !== null ? 3 : 0), pointBackgroundColor: C.green, spanGaps: false, fill: true, tension: 0.3 }, { label: "Target", data: dates.map(() => farmer.milk), borderColor: "#B4B2A9", borderDash: [5, 4], borderWidth: 1.5, pointRadius: 0, fill: false }] }}
            options={{ ...baseChartOpts, scales: { x: { grid: { display: false }, ticks: { font: chartFont, color: C.gray } }, y: { min: 0, grid: { color: "rgba(0,0,0,0.04)" }, ticks: { font: chartFont, color: C.gray, callback: v => v + "L" } } }, plugins: { ...baseChartOpts.plugins, tooltip: { callbacks: { label: ctx => ctx.dataset.label + ": " + ctx.parsed.y + "L" } } } }} />
        </div>
      </Card>
      <div className="mr-chart-2col">
        <Card>
          <SectionLabel>Add milk log</SectionLabel>
          <div className="mr-form-col" style={{ marginTop: 10 }}>
            <div className="mr-form-grid-2">
              <Field label="Date"><Inp type="date" value={logForm.date} onChange={e => setLogForm({ ...logForm, date: e.target.value })} /></Field>
              <Field label="Litres"><Inp type="number" step="0.5" placeholder="24" value={logForm.liters} onChange={e => setLogForm({ ...logForm, liters: e.target.value })} /></Field>
            </div>
            <Field label="Quality"><Sel value={logForm.quality} onChange={e => setLogForm({ ...logForm, quality: e.target.value })}><option value="good">Good</option><option value="average">Average</option><option value="poor">Poor</option></Sel></Field>
            <Field label="Note"><Inp placeholder="Optional…" value={logForm.note} onChange={e => setLogForm({ ...logForm, note: e.target.value })} /></Field>
            <Btn variant="green" onClick={handleAddLog} disabled={saving}>{saving ? "Saving…" : "Save log"}</Btn>
          </div>
        </Card>
        <Card>
          <SectionLabel>Record payment</SectionLabel>
          <div className="mr-form-col" style={{ marginTop: 10 }}>
            <div className={`mr-balance-box ${bal > 0 ? "mr-balance-box-owed" : "mr-balance-box-settled"}`}>
              <div className="mr-balance-lbl" style={{ color: bal > 0 ? C.amberDark : C.greenDark }}>{bal > 0 ? "Outstanding balance" : "Fully settled"}</div>
              <div className="mr-balance-val" style={{ color: bal > 0 ? C.amberDark : C.greenDark }}>Rs {Math.abs(Math.round(bal))}</div>
              <div className="mr-balance-sub">@ Rs {PRICE_PER_LITER}/L · {Math.round(totalL(fl))}L total</div>
            </div>
            <Field label="Payment amount (Rs)"><Inp type="number" placeholder="5000" value={payForm.amount} onChange={e => setPayForm({ amount: e.target.value })} /></Field>
            <Btn variant="green" onClick={handlePay} disabled={saving}>{saving ? "Saving…" : "Record payment"}</Btn>
            <SectionLabel>Payment history</SectionLabel>
            {paymentsFor(id).slice(0, 5).map(p => (
              <div key={p._id} className="mr-payment-row"><span>{fmtDate(p.date)}</span><span className="mr-payment-amount">Rs {Math.round(p.amount)}</span></div>
            ))}
          </div>
        </Card>
      </div>
      <Card>
        <SectionLabel>Collection history</SectionLabel>
        {fl.length === 0 ? <Empty>No logs yet.</Empty> : fl.slice(0, 60).map(l => (
          <div key={l._id} className="mr-log-row">
            <div><div className="mr-log-date">{fmtDate(l.date)}</div>{l.note && <div className="mr-log-note">{l.note}</div>}</div>
            <div className="mr-log-right">
              <Badge color={l.quality === "good" ? "green" : l.quality === "poor" ? "red" : "amber"}>{l.quality}</Badge>
              <span className="mr-log-val">{parseFloat(l.liters).toFixed(1)}L</span>
              <Btn size="sm" variant="danger" onClick={() => deleteLog(l._id)}>✕</Btn>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function RouteTab() {
  const { farmers, routeOrder, setRouteOrder, addToRoute, clearRoute, optimizedOrder, setOptimizedOrder, manRoute, optRoute, routeError, optimizing, savings, calcManual, runOptimize, calcOpt } = useMR();
  const removeFromRoute = idx => { setRouteOrder(p => p.filter((_, i) => i !== idx)); setOptimizedOrder([]); };
  return (
    <div className="mr-panel">
      <div className="mr-panel-title">Route planner</div>
      <Card>
        <SectionLabel>Add farmers to route</SectionLabel>
        <div className="mr-form-col" style={{ gap: 6, marginTop: 8 }}>
          {farmers.length === 0 && <Empty>No farmers yet.</Empty>}
          {farmers.map(f => { const inRoute = !!routeOrder.find(r => r._id === f._id); return (
            <div key={f._id} className="mr-farmer-list-item"><Avatar name={f.name} size={28} /><span className="mr-farmer-list-name">{f.name}</span><Btn size="sm" variant={inRoute ? "ghost" : "green"} onClick={() => !inRoute && addToRoute(f)}>{inRoute ? "Added ✓" : "+ Add"}</Btn></div>
          ); })}
        </div>
      </Card>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <SectionLabel>Manual order ({routeOrder.length} stops)</SectionLabel>
          <Btn size="sm" variant="danger" onClick={clearRoute}>Clear all</Btn>
        </div>
        {routeOrder.length === 0 ? <Empty>No farmers added yet.</Empty> : routeOrder.map((f, i) => (
          <div key={f._id}>{i > 0 && <div className="mr-route-connector-green" />}<div className="mr-route-step mr-route-step-green"><div className="mr-route-step-num mr-route-step-num-green">{i + 1}</div><div className="mr-route-name">{f.name}</div><Btn size="sm" variant="danger" onClick={() => removeFromRoute(i)}>✕</Btn></div></div>
        ))}
        {manRoute && (
          <div className="mr-route-result mr-route-result-green">
            <div className="mr-route-result-row"><span className="mr-route-result-lbl mr-route-result-lbl-green">Distance</span><span className="mr-route-result-val mr-route-result-val-green">{manRoute.km} km</span></div>
            <div className="mr-route-result-row"><span className="mr-route-result-lbl mr-route-result-lbl-green">Est. time</span><span className="mr-route-result-val mr-route-result-val-green">{manRoute.min} min</span></div>
          </div>
        )}
        <div className="mr-btn-row"><Btn variant="green" className="mr-btn-full" onClick={calcManual}>▶ Calculate route</Btn></div>
      </Card>
      <Card>
        <SectionLabel>◆ TSP auto-optimize</SectionLabel>
        <div className="mr-tsp-desc">Nearest-neighbour + 2-opt finds the shortest order through all selected farmers.</div>
        <Btn variant="purple" className="mr-btn-full" onClick={runOptimize} disabled={optimizing}>{optimizing ? "⟳ Optimizing…" : "◆ Optimize route"}</Btn>
        {savings && (<div className="mr-savings-banner"><span className="mr-savings-icon">▲</span><div><div className="mr-savings-main">{parseFloat(savings.km) > 0 ? `Saves ~${savings.km} km (${savings.pct}%)` : "Already optimal."}</div><div className="mr-savings-sub">vs. your manual order</div></div></div>)}
        {optimizedOrder.length > 0 && (<>
          <div className="mr-opt-section-lbl">Optimized order</div>
          {optimizedOrder.map((f, i) => (<div key={f._id}>{i > 0 && <div className="mr-route-connector-purple" />}<div className="mr-route-step mr-route-step-purple"><div className="mr-route-step-num mr-route-step-num-purple">{i + 1}</div><div className="mr-route-name">{f.name}</div></div></div>))}
          {optRoute && (<div className="mr-route-result mr-route-result-purple"><div className="mr-route-result-row"><span className="mr-route-result-lbl mr-route-result-lbl-purple">Optimized distance</span><span className="mr-route-result-val mr-route-result-val-purple">{optRoute.km} km</span></div><div className="mr-route-result-row"><span className="mr-route-result-lbl mr-route-result-lbl-purple">Est. time</span><span className="mr-route-result-val mr-route-result-val-purple">{optRoute.min} min</span></div></div>)}
          <div className="mr-btn-row"><Btn variant="purple" className="mr-btn-full" onClick={calcOpt}>Draw optimized route on map</Btn></div>
        </>)}
        {routeError && <div className="mr-route-error">{routeError}</div>}
      </Card>
    </div>
  );
}

function MapTab() {
  const { farmers, addFarmer, updateFarmer, addToRoute, optimizedOrder, manRoute, optRoute, gpsActive, gpsPosition, gpsTrail, startGPS, stopGPS, pendingLoc, setPendingLoc } = useMR();
  const mapRef = useRef(null);
  const [addMode, setAddMode] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", milk: "", phone: "" });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const handleAddFarmer = async () => {
    if (!newForm.name || !newForm.milk || !pendingLoc) { alert("Fill all fields and click map."); return; }
    setSaving(true);
    try { await addFarmer({ name: newForm.name, milk: parseFloat(newForm.milk), phone: newForm.phone, lat: pendingLoc.lat, lng: pendingLoc.lng }); setNewForm({ name: "", milk: "", phone: "" }); setPendingLoc(null); setAddMode(false); }
    catch (e) { alert("Failed: " + e.message); } finally { setSaving(false); }
  };
  const handleEditSave = async () => {
    setSaving(true);
    try { await updateFarmer(editId, { name: editForm.name, milk: parseFloat(editForm.milk) }); setEditId(null); }
    catch (e) { alert("Failed: " + e.message); } finally { setSaving(false); }
  };
  const dotColor = addMode ? C.amber : gpsActive ? C.teal : C.green;
  const modeText = addMode ? "Pin mode — click map" : gpsActive ? "GPS active" : "View mode";
  return (
    <div className="mr-map-wrap">
      <div className="mr-map-controls">
        <Btn variant={addMode ? "green" : "default"} size="sm" onClick={() => { setAddMode(v => !v); setPendingLoc(null); }}>{addMode ? "✕ Cancel pin" : "+ Pin farmer"}</Btn>
        <Btn variant={gpsActive ? "danger" : "default"} size="sm" onClick={gpsActive ? stopGPS : startGPS}>{gpsActive ? "⬤ Stop GPS" : "◎ Track GPS"}</Btn>
      </div>
      <div className="mr-map-mode-badge"><div className="mr-map-mode-dot" style={{ background: dotColor }} />{modeText}</div>
      {addMode && (
        <div className="mr-map-form">
          <div className="mr-map-form-title">New farmer</div>
          <div className="mr-form-grid-2">
            <Field label="Name"><Inp value={newForm.name} onChange={e => setNewForm({ ...newForm, name: e.target.value })} placeholder="Name" /></Field>
            <Field label="Milk (L/day)"><Inp type="number" value={newForm.milk} onChange={e => setNewForm({ ...newForm, milk: e.target.value })} placeholder="30" /></Field>
          </div>
          <Field label="Phone"><Inp value={newForm.phone} onChange={e => setNewForm({ ...newForm, phone: e.target.value })} placeholder="+94 77…" /></Field>
          <div className={`mr-map-loc-badge ${pendingLoc ? "mr-map-loc-badge-set" : "mr-map-loc-badge-empty"}`}>{pendingLoc ? `${pendingLoc.lat.toFixed(4)}, ${pendingLoc.lng.toFixed(4)}` : "Click on the map to pin location"}</div>
          <Btn variant="green" onClick={handleAddFarmer} disabled={saving}>{saving ? "Saving…" : "Add farmer"}</Btn>
        </div>
      )}
      <MapContainer center={[7.8731, 80.7718]} zoom={8} style={{ flex: 1 }} ref={mapRef}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OSM" />
        <MapClicker active={addMode} onClick={latlng => setPendingLoc(latlng)} />
        {pendingLoc && <Marker position={[pendingLoc.lat, pendingLoc.lng]} icon={pendingIcon} />}
        {farmers.map(f => {
          const isOpt = optimizedOrder.some(r => r._id === f._id);
          return (
            <Marker key={f._id} position={[f.lat || 7.8731, f.lng || 80.7718]} icon={isOpt ? purpleIcon : greenIcon}>
              <Popup>
                {editId === f._id ? (
                  <div className="mr-popup-edit-form">
                    <div className="mr-popup-edit-title">Edit farmer</div>
                    <input className="mr-popup-edit-input" value={editForm.name || ""} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="Name" />
                    <input className="mr-popup-edit-input" type="number" value={editForm.milk || ""} onChange={e => setEditForm({ ...editForm, milk: e.target.value })} placeholder="Milk L/day" />
                    <div className="mr-popup-edit-actions">
                      <button className="mr-popup-edit-save" onClick={handleEditSave} disabled={saving}>{saving ? "…" : "Save"}</button>
                      <button className="mr-popup-edit-cancel" onClick={() => setEditId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="mr-popup">
                    <div className="mr-popup-name">{f.name}</div>
                    <div className="mr-popup-meta">{f.milk}L/day · {f.phone || "—"}</div>
                    <div className="mr-popup-actions">
                      <button className="mr-popup-btn-route" onClick={() => addToRoute(f)}>+ Route</button>
                      <button className="mr-popup-btn-edit" onClick={() => { setEditId(f._id); setEditForm({ name: f.name, milk: f.milk }); }}>Edit</button>
                    </div>
                  </div>
                )}
              </Popup>
            </Marker>
          );
        })}
        {manRoute?.path && <Polyline positions={manRoute.path} pathOptions={{ color: C.teal, weight: 3, opacity: 0.7, dashArray: "6,4" }} />}
        {optRoute?.path && <Polyline positions={optRoute.path} pathOptions={{ color: C.purple, weight: 3, opacity: 0.85 }} />}
        {gpsTrail.length > 1 && <Polyline positions={gpsTrail} pathOptions={{ color: C.amber, weight: 2, opacity: 0.6 }} />}
        {gpsPosition && <Marker position={[gpsPosition.lat, gpsPosition.lng]} icon={gpsIcon}><Popup>Your location</Popup></Marker>}
      </MapContainer>
    </div>
  );
}

// ─── DAILY COLLECTION TAB ─────────────────────────────────────────────────────
function DailyTab() {
  const { farmers, logs, addLog, deleteLog, logsFor } = useMR();
  const [date, setDate] = useState(todayISO());
  const [liters, setLiters] = useState({});   // { farmerId: "24.5" }
  const [saving, setSaving] = useState({});   // { farmerId: true }

  // For each farmer, find if they already have a log on this date
  const logForDay = (farmerId) =>
    logs.find(l => l.farmerId === farmerId && l.date === date);

  const handleAdd = async (farmer) => {
    const val = parseFloat(liters[farmer._id]);
    if (!val || val <= 0) { alert("Enter a valid litre amount."); return; }
    setSaving(s => ({ ...s, [farmer._id]: true }));
    try {
      const existing = logForDay(farmer._id);
      if (existing) await deleteLog(existing._id);   // replace if already logged
      await addLog({ farmerId: farmer._id, date, liters: val, quality: "good", note: "" });
      setLiters(l => ({ ...l, [farmer._id]: "" }));
    } catch (e) { alert("Failed: " + e.message); }
    finally { setSaving(s => ({ ...s, [farmer._id]: false })); }
  };

  // Pre-fill inputs from existing logs when date changes
  useEffect(() => {
    const prefill = {};
    farmers.forEach(f => {
      const log = logs.find(l => l.farmerId === f._id && l.date === date);
      if (log) prefill[f._id] = String(log.liters);
    });
    setLiters(prefill);
  }, [date, farmers, logs]);

  const loggedFarmers = farmers.filter(f => logForDay(f._id));
  const totalToday   = loggedFarmers.reduce((s, f) => s + parseFloat(logForDay(f._id).liters || 0), 0);
  const remaining    = farmers.length - loggedFarmers.length;

  return (
    <div className="mr-panel">
      {/* Header */}
      <div className="mr-panel-header">
        <div>
          <div className="mr-panel-title">Daily collection</div>
          <div className="mr-panel-subtitle">Log milk for all farmers at once</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="mr-section-lbl" style={{ border: "none", paddingBottom: 0 }}>Date</span>
          <Inp
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ width: "auto" }}
          />
        </div>
      </div>

      {/* Summary stats */}
      <div className="mr-metrics">
        <MetricCard label="Total farmers"  value={farmers.length} />
        <MetricCard label="Logged today"   value={loggedFarmers.length} color={loggedFarmers.length > 0 ? "#27500A" : "#888780"} />
        <MetricCard label="Total so far"   value={`${Math.round(totalToday)}L`} color={totalToday > 0 ? "#27500A" : "#888780"} />
        <MetricCard label="Remaining"      value={remaining} color={remaining > 0 ? "#BA7517" : "#27500A"} />
      </div>

      {/* Farmer table */}
      {farmers.length === 0
        ? <Empty>No farmers yet — add them in the Farmers tab.</Empty>
        : (
          <Card>
            {/* Table header */}
            <div className="dc-table-head">
              <span>Farmer</span>
              <span>Litres collected</span>
              <span>Action</span>
            </div>

            {farmers.map(f => {
              const existing = logForDay(f._id);
              const isSaved  = !!existing;
              const isSaving = saving[f._id];
              const val      = liters[f._id] ?? "";

              return (
                <div key={f._id} className={`dc-row ${isSaved ? "dc-row-done" : ""}`}>
                  {/* Farmer name + expected */}
                  <div className="dc-farmer">
                    <Avatar name={f.name} size={28} />
                    <div>
                      <div className="dc-farmer-name">{f.name}</div>
                      <div className="dc-farmer-expected">expected {f.milk}L</div>
                    </div>
                  </div>

                  {/* Litre input */}
                  <input
                    className={`dc-input ${isSaved ? "dc-input-saved" : ""}`}
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="0.0"
                    value={val}
                    onChange={e => setLiters(l => ({ ...l, [f._id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === "Enter") handleAdd(f); }}
                  />

                  {/* Action */}
                  <div className="dc-action">
                    {isSaved && val === String(existing.liters) ? (
                      <span className="dc-saved-tick">&#10003; saved</span>
                    ) : (
                      <button
                        className="dc-add-btn"
                        onClick={() => handleAdd(f)}
                        disabled={isSaving || !val}
                      >
                        {isSaving ? "…" : isSaved ? "Update" : "+ Add"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </Card>
        )
      }
    </div>
  );
}

function TopNav({ tab, setTab }) {
  const { farmers, totalMilkToday, routeOrder, loading } = useMR();
  const tabs = [{ id: "dashboard", label: "Dashboard" }, { id: "farmers", label: `Farmers (${farmers.length})` }, ,{ id: "daily", label: "Daily entry" },{ id: "route", label: `Route (${routeOrder.length})` }, { id: "map", label: "Map" },];
  return (
    <nav className="mr-nav">
      <div className="mr-nav-logo"><span className="mr-nav-logo-dot">■</span> MilkRoute</div>
      <div className="mr-nav-tabs">
        {tabs.map(t => <button key={t.id} className={`mr-nav-tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>
      <div className="mr-nav-right">
        {loading && <span className="mr-nav-syncing">● syncing…</span>}
        <span>Today <span className="mr-nav-today-val">{Math.round(totalMilkToday)}L</span></span>
      </div>
    </nav>
  );
}

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [detailFarmer, setDetail] = useState(null);
  return (
    <MilkRouteProvider>
      <div className="mr-app">
        <TopNav tab={tab === "detail" ? "farmers" : tab} setTab={t => { setTab(t); setDetail(null); }} />
        <div className="mr-body">
          {tab === "dashboard" && <DashboardTab />}
          {tab === "farmers"   && <FarmersTab onSelectFarmer={f => { setDetail(f); setTab("detail"); }} />}
          {tab === "detail"    && detailFarmer && <FarmerDetailTab farmer={detailFarmer} onBack={() => { setDetail(null); setTab("farmers"); }} />}
          {tab === "daily" && <DailyTab />} 
          {tab === "route"     && <RouteTab />}
          {tab === "map"       && <MapTab />}  
        </div>
      </div>
    </MilkRouteProvider>
  );
}