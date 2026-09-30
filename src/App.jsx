import { useState, useEffect, useRef, useMemo } from "react";
import {
  Power, Square, RotateCcw, Wifi, WifiOff, ChevronRight, Coffee,
  Gauge, Scale, LayoutGrid, BarChart3, Boxes, History, ClipboardList,
  SlidersHorizontal, AlertTriangle, CheckCircle2, Circle,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

/* ---------------------------------------------------------------
   TOKENS
--------------------------------------------------------------- */
const C = {
  bg: "#F1E8D2",
  panel: "#FBF6E9",
  panelRaised: "#ECDCAF",
  line: "#C7AC79",
  lineLit: "#8B6B3D",
  text: "#241A10",
  textDim: "#6B5233",
  textFaint: "#9C8558",
  amber: "#C99A2E",
  green: "#5C3B1E",
  red: "#1C130B",
  blue: "#3D2914",
  arabica: "#A9752D",
  robusta: "#2B1B0E",
  sidebarBg: "#221609",
  sidebarText: "#F1E8D2",
  sidebarTextDim: "#A5885A",
  sidebarBorder: "#3D2914",
  sidebarActiveBg: "rgba(201,154,46,0.14)",
};

const mono = { fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace" };
const sans = { fontFamily: "'Inter', 'Segoe UI', sans-serif" };

const STATUS_COLOR = {
  Idle: C.textFaint,
  Processing: C.amber,
  Completed: C.green,
  Error: C.red,
};

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { id: "control", label: "Machine control", icon: SlidersHorizontal },
  { id: "sorting", label: "Sorting monitor", icon: Coffee },
  { id: "weight", label: "Weight monitor", icon: Scale },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "batches", label: "Batch management", icon: ClipboardList },
  { id: "history", label: "Batch history", icon: History },
  { id: "inventory", label: "Inventory", icon: Boxes },
];

const CATS = ["large", "medium", "small", "fine"];
const CAT_LABEL = { large: "Large", medium: "Medium", small: "Small", fine: "Fine / debris" };
const CAT_COLOR = { large: "#E3BE58", medium: "#B98A3E", small: "#6B4226", fine: "#231710" };

const SEED_BATCHES = [
  { id: "B001", date: "2026-09-13 08:02", beanType: "Arabica", mode: "Automatic", vibrationSpeed: 62, inputWeight: 1000,
    weights: { large: 350, medium: 400, small: 150, fine: 100 }, processingTime: 12 * 60 },
  { id: "B002", date: "2026-09-13 09:41", beanType: "Robusta", mode: "Automatic", vibrationSpeed: 55, inputWeight: 1200,
    weights: { large: 456, medium: 480, small: 180, fine: 84 }, processingTime: 14 * 60 },
  { id: "B003", date: "2026-09-14 07:55", beanType: "Arabica", mode: "Manual", vibrationSpeed: 48, inputWeight: 900,
    weights: { large: 288, medium: 351, small: 162, fine: 99 }, processingTime: 16 * 60 },
  { id: "B004", date: "2026-09-14 10:20", beanType: "Robusta", mode: "Automatic", vibrationSpeed: 58, inputWeight: 1100,
    weights: { large: 385, medium: 440, small: 176, fine: 99 }, processingTime: 13 * 60 },
];

function computeMetrics(b) {
  const sorted = b.weights.large + b.weights.medium + b.weights.small;
  const totalRecovered = sorted + b.weights.fine;
  const yieldPct = (sorted / b.inputWeight) * 100;
  const finePct = (b.weights.fine / b.inputWeight) * 100;
  const shrinkagePct = ((b.inputWeight - totalRecovered) / b.inputWeight) * 100;
  return { sorted, totalRecovered, yieldPct, finePct, shrinkagePct };
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function clamp(v, min, max) {
  if (isNaN(v)) return min;
  return Math.min(Math.max(v, min), max);
}

function nextBatchId(batches) {
  const nums = batches.map((b) => parseInt(b.id.replace(/\D/g, ""), 10)).filter((n) => !isNaN(n));
  const n = (nums.length ? Math.max(...nums) : 0) + 1;
  return "B" + String(n).padStart(3, "0");
}

/* ---------------------------------------------------------------
   SMALL UI PRIMITIVES
--------------------------------------------------------------- */
function Panel({ title, right, children, style }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, ...style }}>
      {title && (
        <div
          className="flex items-center justify-between px-4 py-2.5"
          style={{ borderBottom: `1px solid ${C.line}` }}
        >
          <span style={{ ...sans, color: C.textDim, fontSize: 12, letterSpacing: "0.02em" }}>{title}</span>
          {right}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

function StatusPill({ status }) {
  const color = STATUS_COLOR[status];
  return (
    <div
      className="inline-flex items-center gap-2 px-2.5 py-1"
      style={{ border: `1px solid ${color}55`, background: `${color}14` }}
    >
      {status === "Processing" ? (
        <span
          className="inline-block rounded-full"
          style={{ width: 6, height: 6, background: color, boxShadow: `0 0 0 3px ${color}33` }}
        />
      ) : (
        <Circle size={7} color={color} fill={color} />
      )}
      <span style={{ ...mono, color, fontSize: 12, fontWeight: 600 }}>{status}</span>
    </div>
  );
}

function Metric({ label, value, unit, color }) {
  return (
    <div>
      <div style={{ ...sans, color: C.textFaint, fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div style={{ ...mono, color: color || C.text, fontSize: 22, fontWeight: 600, lineHeight: 1 }}>
        {value}
        {unit && <span style={{ fontSize: 13, color: C.textDim, marginLeft: 4 }}>{unit}</span>}
      </div>
    </div>
  );
}

function BeanTag({ bean }) {
  const color = bean === "Arabica" ? C.arabica : C.robusta;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5"
      style={{ border: `1px solid ${color}66`, color, ...mono, fontSize: 11 }}
    >
      <span style={{ width: 6, height: 6, background: color, display: "inline-block", borderRadius: 1 }} />
      {bean}
    </span>
  );
}

function ModePill({ mode }) {
  const color = mode === "Automatic" ? C.blue : C.amber;
  return (
    <span style={{ ...mono, fontSize: 11, color, border: `1px solid ${color}55`, padding: "2px 8px" }}>
      {mode}
    </span>
  );
}

function Button({ children, onClick, disabled, variant = "default", icon: Icon }) {
  const styles = {
    default: { bg: C.panelRaised, fg: C.text, border: C.lineLit },
    primary: { bg: `${C.green}1A`, fg: C.green, border: `${C.green}66` },
    danger: { bg: `${C.red}1A`, fg: C.red, border: `${C.red}66` },
    neutral: { bg: `${C.blue}1A`, fg: C.blue, border: `${C.blue}66` },
  }[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center gap-2 px-4 py-2.5 transition-colors"
      style={{
        background: disabled ? C.panel : styles.bg,
        color: disabled ? C.textFaint : styles.fg,
        border: `1px solid ${disabled ? C.line : styles.border}`,
        cursor: disabled ? "not-allowed" : "pointer",
        ...mono,
        fontSize: 12.5,
        fontWeight: 600,
        letterSpacing: "0.01em",
      }}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

function NumberField({ value, onCommit, suffix, width = 80, disabled }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  function commit() {
    const n = Number(draft);
    if (draft.trim() === "" || isNaN(n)) {
      setDraft(String(value));
      return;
    }
    onCommit(n);
  }

  return (
    <div
      className="flex items-center"
      style={{
        width,
        border: `1px solid ${C.lineLit}`,
        background: disabled ? C.panel : C.panelRaised,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <input
        type="number"
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") { commit(); e.currentTarget.blur(); } }}
        className="w-full bg-transparent text-right outline-none px-2 py-1.5"
        style={{ ...mono, fontSize: 15, fontWeight: 700, color: C.text }}
      />
      {suffix && (
        <span style={{ ...mono, fontSize: 12, color: C.textDim, paddingRight: 8 }}>{suffix}</span>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   MAIN APP
--------------------------------------------------------------- */
export default function CoffeeSorterApp() {
  const [view, setView] = useState("dashboard");
  const [connected, setConnected] = useState(true);
  const [batches, setBatches] = useState(SEED_BATCHES);

  const [machine, setMachine] = useState({
    status: "Idle",
    batchId: nextBatchId(SEED_BATCHES),
    beanType: "Arabica",
    mode: "Automatic",
    vibrationSpeed: 60,
    processingTime: 0,
    liveWeight: 0,
    inputTarget: 1000,
    sortingCategory: "—",
  });
  const [live, setLive] = useState({ large: 0, medium: 0, small: 0, fine: 0 });

  const tickRef = useRef(null);

  // simulated ESP32 stream
  useEffect(() => {
    if (machine.status !== "Processing") return;
    tickRef.current = setInterval(() => {
      setMachine((m) => {
        const nextTime = m.processingTime + 1;
        const progress = Math.min(m.liveWeight + m.inputTarget / 60, m.inputTarget);
        const done = progress >= m.inputTarget;
        const cats = ["Large", "Medium", "Small", "Fine/debris"];
        return {
          ...m,
          processingTime: nextTime,
          liveWeight: Math.round(progress),
          sortingCategory: cats[Math.floor(nextTime / 2) % cats.length],
          status: done ? "Completed" : "Processing",
        };
      });
      setLive((prev) => {
        const step = 1000 / 60;
        const jitter = () => 0.85 + Math.random() * 0.3;
        return {
          large: prev.large + step * 0.35 * jitter(),
          medium: prev.medium + step * 0.4 * jitter(),
          small: prev.small + step * 0.15 * jitter(),
          fine: prev.fine + step * 0.1 * jitter(),
        };
      });
    }, 200);
    return () => clearInterval(tickRef.current);
  }, [machine.status]);

  // finalize on completion
  useEffect(() => {
    if (machine.status === "Completed") {
      const rounded = {
        large: Math.round(live.large),
        medium: Math.round(live.medium),
        small: Math.round(live.small),
        fine: Math.round(live.fine),
      };
      const record = {
        id: machine.batchId,
        date: new Date().toISOString().slice(0, 16).replace("T", " "),
        beanType: machine.beanType,
        mode: machine.mode,
        vibrationSpeed: machine.vibrationSpeed,
        inputWeight: machine.inputTarget,
        weights: rounded,
        processingTime: machine.processingTime,
      };
      setBatches((prev) => [record, ...prev]);
      setInventory((inv) => {
        const next = structuredClone(inv);
        CATS.forEach((c) => { next[machine.beanType][c] += rounded[c] / 1000; });
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machine.status]);

  const [inventory, setInventory] = useState({
    Arabica: { large: 5.2, medium: 7.4, small: 2.1, fine: 0.8 },
    Robusta: { large: 3.5, medium: 4.8, small: 1.2, fine: 0.4 },
  });

  function handleStart() {
    if (machine.status === "Processing") return;
    setLive({ large: 0, medium: 0, small: 0, fine: 0 });
    setMachine((m) => ({ ...m, status: "Processing", processingTime: 0, liveWeight: 0 }));
  }
  function handleStop() {
    setMachine((m) => ({ ...m, status: m.status === "Processing" ? "Idle" : m.status }));
  }
  function handleReset() {
    clearInterval(tickRef.current);
    setLive({ large: 0, medium: 0, small: 0, fine: 0 });
    setMachine((m) => ({
      ...m,
      status: "Idle",
      processingTime: 0,
      liveWeight: 0,
      batchId: nextBatchId(batches),
      sortingCategory: "—",
    }));
  }
  function setBeanType(t) {
    if (machine.status === "Processing") return;
    setMachine((m) => ({ ...m, beanType: t }));
  }
  function setMode(mode) {
    if (machine.status === "Processing") return;
    setMachine((m) => ({ ...m, mode }));
  }
  function setSpeed(v) {
    setMachine((m) => ({ ...m, vibrationSpeed: v }));
  }
  function setInputTarget(v) {
    if (machine.status === "Processing") return;
    setMachine((m) => ({ ...m, inputTarget: v }));
  }

  const [historySel, setHistorySel] = useState(null);
  const lastBatch = batches[0];

  return (
    <div
      className="w-full h-full min-h-[720px] flex"
      style={{ background: C.bg, color: C.text, ...sans }}
    >
      {/* Sidebar */}
      <div
        className="flex flex-col shrink-0"
        style={{ width: 216, background: C.sidebarBg, borderRight: `1px solid ${C.sidebarBorder}` }}
      >
        <div className="px-4 py-4 flex items-center gap-2" style={{ borderBottom: `1px solid ${C.sidebarBorder}` }}>
          <div
            className="flex items-center justify-center"
            style={{ width: 26, height: 26, background: `${C.amber}22`, border: `1px solid ${C.amber}77` }}
          >
            <Coffee size={14} color={C.amber} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.01em", color: C.sidebarText }}>Bean Sorter</div>
            <div style={{ fontSize: 10, color: C.sidebarTextDim, ...mono }}>ESP32 control node</div>
          </div>
        </div>

        <nav className="flex-1 py-2">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = view === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left"
                style={{
                  background: active ? C.sidebarActiveBg : "transparent",
                  borderLeft: `2px solid ${active ? C.amber : "transparent"}`,
                  color: active ? C.sidebarText : C.sidebarTextDim,
                }}
              >
                <Icon size={15} />
                <span style={{ fontSize: 12.5 }}>{n.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-3" style={{ borderTop: `1px solid ${C.sidebarBorder}` }}>
          <button
            onClick={() => setConnected((c) => !c)}
            className="w-full flex items-center gap-2"
            style={{ color: connected ? C.amber : C.sidebarTextDim, ...mono, fontSize: 11 }}
          >
            {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
            {connected ? "ESP32 linked" : "ESP32 offline"}
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <div
          className="flex items-center justify-between px-6 py-3.5 shrink-0"
          style={{ borderBottom: `1px solid ${C.line}` }}
        >
          <div className="flex items-center gap-2" style={{ ...mono, fontSize: 11, color: C.textFaint }}>
            <span>{NAV.find((n) => n.id === view)?.label}</span>
          </div>
          <div className="flex items-center gap-3">
            <BeanTag bean={machine.beanType} />
            <ModePill mode={machine.mode} />
            <StatusPill status={machine.status} />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {view === "dashboard" && <Dashboard machine={machine} live={live} />}
          {view === "control" && (
            <Control
              machine={machine}
              onStart={handleStart}
              onStop={handleStop}
              onReset={handleReset}
              setBeanType={setBeanType}
              setMode={setMode}
              setSpeed={setSpeed}
              setInputTarget={setInputTarget}
              connected={connected}
            />
          )}
          {view === "sorting" && <SortingMonitor machine={machine} live={live} />}
          {view === "weight" && <WeightMonitor machine={machine} live={live} />}
          {view === "analytics" && <Analytics batches={batches} lastBatch={lastBatch} />}
          {view === "batches" && <BatchManagement machine={machine} live={live} lastBatch={lastBatch} />}
          {view === "history" && <BatchHistory batches={batches} sel={historySel} setSel={setHistorySel} />}
          {view === "inventory" && <Inventory inventory={inventory} />}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   1. DASHBOARD
--------------------------------------------------------------- */
function Dashboard({ machine, live }) {
  const total = live.large + live.medium + live.small + live.fine;
  return (
    <div className="flex flex-col gap-5 max-w-5xl">
      <Panel title="System status">
        <div className="grid grid-cols-4 gap-6">
          <Metric label="STATUS" value={machine.status} color={STATUS_COLOR[machine.status]} />
          <Metric label="BATCH NUMBER" value={machine.batchId} />
          <Metric label="BEAN TYPE" value={machine.beanType} color={machine.beanType === "Arabica" ? C.arabica : C.robusta} />
          <Metric label="OPERATING MODE" value={machine.mode} color={machine.mode === "Automatic" ? C.blue : C.amber} />
        </div>
      </Panel>

      <div className="grid grid-cols-3 gap-5">
        <Panel title="Vibration speed">
          <Gauge className="mb-1" size={16} color={C.textFaint} />
          <div style={{ ...mono, fontSize: 30, fontWeight: 700 }}>{machine.vibrationSpeed}<span style={{ fontSize: 15, color: C.textDim }}>%</span></div>
          <div className="mt-2 h-1.5 w-full" style={{ background: C.line }}>
            <div className="h-full" style={{ width: `${machine.vibrationSpeed}%`, background: C.amber }} />
          </div>
        </Panel>
        <Panel title="Processing time">
          <div style={{ ...mono, fontSize: 30, fontWeight: 700 }}>{fmtTime(machine.processingTime)}</div>
          <div style={{ fontSize: 11, color: C.textFaint, marginTop: 6 }}>mm:ss elapsed this batch</div>
        </Panel>
        <Panel title="Live weight">
          <div style={{ ...mono, fontSize: 30, fontWeight: 700 }}>{Math.round(total)}<span style={{ fontSize: 15, color: C.textDim }}> g</span></div>
          <div style={{ fontSize: 11, color: C.textFaint, marginTop: 6 }}>of {machine.inputTarget} g target</div>
        </Panel>
      </div>

      <Panel title="Current sorting category">
        <div className="flex items-center gap-3">
          <div style={{ width: 8, height: 8, background: C.blue, borderRadius: "50%" }} />
          <span style={{ ...mono, fontSize: 18, fontWeight: 600 }}>{machine.sortingCategory}</span>
        </div>
      </Panel>

      <div style={{ fontSize: 11.5, color: C.textFaint }}>
        Start, stop, and reset the batch from Machine control.
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   2. MACHINE CONTROL
--------------------------------------------------------------- */
function Control({ machine, onStart, onStop, onReset, setBeanType, setMode, setSpeed, setInputTarget, connected }) {
  const locked = machine.status === "Processing";
  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      {!connected && (
        <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: `${C.red}14`, border: `1px solid ${C.red}55` }}>
          <AlertTriangle size={14} color={C.red} />
          <span style={{ fontSize: 12.5, color: C.red }}>ESP32 is offline — commands will queue until the link is restored.</span>
        </div>
      )}

      <Panel title="Operating mode">
        <div className="grid grid-cols-2 gap-3">
          {["Manual", "Automatic"].map((m) => {
            const active = machine.mode === m;
            const color = m === "Automatic" ? C.blue : C.amber;
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                disabled={locked}
                className="py-3.5 flex flex-col items-center gap-1"
                style={{
                  border: `1px solid ${active ? color : C.line}`,
                  background: active ? `${color}14` : C.panelRaised,
                  color: active ? color : C.textDim,
                  cursor: locked ? "not-allowed" : "pointer",
                  opacity: locked && !active ? 0.5 : 1,
                }}
              >
                <span style={{ ...mono, fontWeight: 700, fontSize: 13 }}>{m.toUpperCase()}</span>
              </button>
            );
          })}
        </div>
        {locked && <div style={{ fontSize: 11, color: C.textFaint, marginTop: 8 }}>Stop the batch to change mode.</div>}
      </Panel>

      <Panel title="Bean type">
        <div className="grid grid-cols-2 gap-3">
          {["Arabica", "Robusta"].map((t) => {
            const active = machine.beanType === t;
            const color = t === "Arabica" ? C.arabica : C.robusta;
            return (
              <button
                key={t}
                onClick={() => setBeanType(t)}
                disabled={locked}
                className="py-3 flex items-center justify-center gap-2"
                style={{
                  border: `1px solid ${active ? color : C.line}`,
                  background: active ? `${color}14` : C.panelRaised,
                  color: active ? color : C.textDim,
                  cursor: locked ? "not-allowed" : "pointer",
                }}
              >
                <span style={{ width: 7, height: 7, background: color, display: "inline-block" }} />
                <span style={{ ...mono, fontSize: 12.5 }}>{t}</span>
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel title="Vibration speed">
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={100}
            value={machine.vibrationSpeed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="flex-1"
            style={{ accentColor: C.amber }}
          />
          <NumberField
            value={machine.vibrationSpeed}
            onCommit={(v) => setSpeed(clamp(v, 0, 100))}
            suffix="%"
            width={78}
          />
        </div>
      </Panel>

      <Panel title="Batch input weight (target)">
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={200}
            max={2000}
            step={50}
            value={machine.inputTarget}
            onChange={(e) => setInputTarget(Number(e.target.value))}
            disabled={locked}
            className="flex-1"
            style={{ accentColor: C.blue }}
          />
          <NumberField
            value={machine.inputTarget}
            onCommit={(v) => setInputTarget(clamp(v, 200, 5000))}
            suffix="g"
            width={92}
            disabled={locked}
          />
        </div>
      </Panel>

      <Panel title="Batch controls">
        <div className="flex gap-3">
          <Button variant="primary" icon={Power} onClick={onStart} disabled={locked}>START SORTING</Button>
          <Button variant="danger" icon={Square} onClick={onStop} disabled={!locked}>STOP SORTING</Button>
          <Button icon={RotateCcw} onClick={onReset}>RESET BATCH</Button>
        </div>
      </Panel>

      <div style={{ fontSize: 11, color: C.textFaint, ...mono, lineHeight: 1.7 }}>
        WEB APP → WI-FI/LAN → ESP32 → L298N → VIBRATION MOTOR
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   3. SORTING MONITOR
--------------------------------------------------------------- */
function SortingMonitor({ machine, live }) {
  const total = live.large + live.medium + live.small + live.fine;
  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <Panel
        title={`Bean type: ${machine.beanType}`}
        right={<BeanTag bean={machine.beanType} />}
      >
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.line}` }}>
              <th className="text-left py-2" style={{ fontSize: 11, color: C.textFaint, fontWeight: 500 }}>CATEGORY</th>
              <th className="text-right py-2" style={{ fontSize: 11, color: C.textFaint, fontWeight: 500 }}>WEIGHT</th>
              <th className="text-right py-2" style={{ fontSize: 11, color: C.textFaint, fontWeight: 500 }}>SHARE</th>
            </tr>
          </thead>
          <tbody>
            {CATS.map((c) => (
              <tr key={c} style={{ borderBottom: `1px solid ${C.line}` }}>
                <td className="py-2.5 flex items-center gap-2" style={{ fontSize: 13 }}>
                  <span style={{ width: 7, height: 7, background: CAT_COLOR[c], display: "inline-block" }} />
                  {CAT_LABEL[c]}
                </td>
                <td className="text-right" style={{ ...mono, fontSize: 13 }}>{Math.round(live[c])} g</td>
                <td className="text-right" style={{ ...mono, fontSize: 13, color: C.textDim }}>
                  {total > 0 ? ((live[c] / total) * 100).toFixed(1) : "0.0"}%
                </td>
              </tr>
            ))}
            <tr>
              <td className="py-2.5" style={{ fontSize: 13, fontWeight: 600 }}>Total</td>
              <td className="text-right" style={{ ...mono, fontSize: 13, fontWeight: 700 }}>{Math.round(total)} g</td>
              <td className="text-right" style={{ ...mono, fontSize: 13, color: C.textDim }}>100%</td>
            </tr>
          </tbody>
        </table>
      </Panel>

      <div className="grid grid-cols-4 gap-3">
        {CATS.map((c) => (
          <Panel key={c}>
            <div style={{ fontSize: 11, color: C.textFaint, marginBottom: 4 }}>{CAT_LABEL[c]}</div>
            <div style={{ ...mono, fontSize: 20, fontWeight: 700, color: CAT_COLOR[c] }}>{Math.round(live[c])} g</div>
          </Panel>
        ))}
      </div>

      <Panel title="Live classification feed">
        <div className="flex items-center gap-3">
          <span
            className="inline-block rounded-full"
            style={{ width: 6, height: 6, background: machine.status === "Processing" ? C.green : C.textFaint }}
          />
          <span style={{ ...mono, fontSize: 13 }}>
            {machine.status === "Processing" ? `Sorting → ${machine.sortingCategory}` : "No active batch"}
          </span>
        </div>
      </Panel>
    </div>
  );
}

/* ---------------------------------------------------------------
   4. WEIGHT MONITOR
--------------------------------------------------------------- */
function WeightMonitor({ machine, live }) {
  const sorted = live.large + live.medium + live.small;
  const total = sorted + live.fine;
  const inputW = machine.inputTarget;
  const remaining = Math.max(inputW - total, 0);
  const yieldPct = inputW ? (sorted / inputW) * 100 : 0;
  const finePct = inputW ? (live.fine / inputW) * 100 : 0;
  const shrinkPct = inputW ? ((inputW - total) / inputW) * 100 : 0;

  return (
    <div className="flex flex-col gap-5 max-w-4xl">
      <div style={{ fontSize: 11, color: C.textFaint, ...mono }}>
        LOAD CELL → HX711 → ESP32 → WEB APP → DATABASE
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Panel><Metric label="TOTAL INPUT WEIGHT" value={inputW} unit="g" /></Panel>
        <Panel><Metric label="TOTAL SORTED WEIGHT" value={Math.round(sorted)} unit="g" color={C.green} /></Panel>
        <Panel><Metric label="FINE / DEBRIS WEIGHT" value={Math.round(live.fine)} unit="g" color={C.red} /></Panel>
        <Panel><Metric label="REMAINING / UNACCOUNTED" value={Math.round(remaining)} unit="g" color={C.amber} /></Panel>
      </div>

      <Panel title="Weight per category">
        <div className="flex flex-col gap-2.5">
          {CATS.map((c) => {
            const pct = inputW ? (live[c] / inputW) * 100 : 0;
            return (
              <div key={c}>
                <div className="flex justify-between mb-1" style={{ fontSize: 12 }}>
                  <span style={{ color: C.textDim }}>{CAT_LABEL[c]}</span>
                  <span style={{ ...mono }}>{Math.round(live[c])} g</span>
                </div>
                <div className="h-1.5 w-full" style={{ background: C.line }}>
                  <div className="h-full" style={{ width: `${Math.min(pct, 100)}%`, background: CAT_COLOR[c] }} />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid grid-cols-3 gap-4">
        <Panel title="Yield"><div style={{ ...mono, fontSize: 26, fontWeight: 700, color: C.green }}>{yieldPct.toFixed(1)}%</div>
          <div style={{ fontSize: 11, color: C.textFaint, marginTop: 4 }}>sorted ÷ input × 100</div></Panel>
        <Panel title="Fine / debris %"><div style={{ ...mono, fontSize: 26, fontWeight: 700, color: C.red }}>{finePct.toFixed(1)}%</div>
          <div style={{ fontSize: 11, color: C.textFaint, marginTop: 4 }}>fine ÷ input × 100</div></Panel>
        <Panel title="Shrinkage"><div style={{ ...mono, fontSize: 26, fontWeight: 700, color: C.amber }}>{shrinkPct.toFixed(1)}%</div>
          <div style={{ fontSize: 11, color: C.textFaint, marginTop: 4 }}>(input − recovered) ÷ input</div></Panel>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   5. ANALYTICS
--------------------------------------------------------------- */
function Analytics({ batches, lastBatch }) {
  const m = computeMetrics(lastBatch);
  const sizeDist = CATS.map((c) => ({ name: CAT_LABEL[c], value: lastBatch.weights[c], color: CAT_COLOR[c] }));

  const trend = useMemo(
    () =>
      [...batches].reverse().map((b) => {
        const mm = computeMetrics(b);
        return {
          id: b.id,
          yieldPct: +mm.yieldPct.toFixed(1),
          finePct: +mm.finePct.toFixed(1),
          minutes: +(b.processingTime / 60).toFixed(1),
        };
      }),
    [batches]
  );

  const comparison = useMemo(
    () =>
      [...batches].slice(0, 6).reverse().map((b) => ({
        id: b.id,
        large: b.weights.large,
        medium: b.weights.medium,
        small: b.weights.small,
        fine: b.weights.fine,
      })),
    [batches]
  );

  return (
    <div className="flex flex-col gap-5 max-w-5xl">
      <Panel title={`Batch summary — ${lastBatch.id}`} right={<BeanTag bean={lastBatch.beanType} />}>
        <div className="grid grid-cols-4 gap-6 mb-4">
          <Metric label="INPUT WEIGHT" value={lastBatch.inputWeight} unit="g" />
          <Metric label="SORTED WEIGHT" value={m.sorted} unit="g" />
          <Metric label="YIELD" value={m.yieldPct.toFixed(0)} unit="%" color={C.green} />
          <Metric label="PROCESSING TIME" value={fmtTime(lastBatch.processingTime)} />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {CATS.map((c) => (
            <div key={c} style={{ fontSize: 12 }}>
              <span style={{ color: C.textDim }}>{CAT_LABEL[c]}: </span>
              <span style={{ ...mono, color: CAT_COLOR[c] }}>
                {((lastBatch.weights[c] / lastBatch.inputWeight) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-5">
        <Panel title="Size distribution — last batch">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={sizeDist} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {sizeDist.map((d, i) => <Cell key={i} fill={d.color} stroke={C.panel} />)}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11, color: C.textDim }} />
              <Tooltip contentStyle={{ background: C.panelRaised, border: `1px solid ${C.line}`, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Weight distribution by category (recent batches)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={comparison}>
              <CartesianGrid stroke={C.line} vertical={false} />
              <XAxis dataKey="id" tick={{ fill: C.textFaint, fontSize: 11 }} axisLine={{ stroke: C.line }} tickLine={false} />
              <YAxis tick={{ fill: C.textFaint, fontSize: 11 }} axisLine={{ stroke: C.line }} tickLine={false} />
              <Tooltip contentStyle={{ background: C.panelRaised, border: `1px solid ${C.line}`, fontSize: 12 }} />
              <Bar dataKey="large" stackId="a" fill={CAT_COLOR.large} />
              <Bar dataKey="medium" stackId="a" fill={CAT_COLOR.medium} />
              <Bar dataKey="small" stackId="a" fill={CAT_COLOR.small} />
              <Bar dataKey="fine" stackId="a" fill={CAT_COLOR.fine} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Yield & fine/debris trend">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend}>
              <CartesianGrid stroke={C.line} vertical={false} />
              <XAxis dataKey="id" tick={{ fill: C.textFaint, fontSize: 11 }} axisLine={{ stroke: C.line }} tickLine={false} />
              <YAxis tick={{ fill: C.textFaint, fontSize: 11 }} axisLine={{ stroke: C.line }} tickLine={false} />
              <Tooltip contentStyle={{ background: C.panelRaised, border: `1px solid ${C.line}`, fontSize: 12 }} />
              <Line type="monotone" dataKey="yieldPct" stroke={C.amber} strokeWidth={2} dot={false} name="Yield %" />
              <Line type="monotone" dataKey="finePct" stroke={C.red} strokeWidth={2} dot={{ r: 3 }} name="Fine %" />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Processing time per batch (min)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trend}>
              <CartesianGrid stroke={C.line} vertical={false} />
              <XAxis dataKey="id" tick={{ fill: C.textFaint, fontSize: 11 }} axisLine={{ stroke: C.line }} tickLine={false} />
              <YAxis tick={{ fill: C.textFaint, fontSize: 11 }} axisLine={{ stroke: C.line }} tickLine={false} />
              <Tooltip contentStyle={{ background: C.panelRaised, border: `1px solid ${C.line}`, fontSize: 12 }} />
              <Bar dataKey="minutes" fill={C.blue} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   6. BATCH MANAGEMENT
--------------------------------------------------------------- */
function BatchManagement({ machine, live, lastBatch }) {
  const total = live.large + live.medium + live.small + live.fine;
  const inProgress = machine.status === "Processing" || (machine.status === "Idle" && total > 0);

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <Panel
        title={`Active batch — ${machine.batchId}`}
        right={<StatusPill status={machine.status} />}
      >
        <div className="grid grid-cols-2 gap-y-3 gap-x-8" style={{ fontSize: 13 }}>
          <Field label="Bean type" value={machine.beanType} />
          <Field label="Operating mode" value={machine.mode} />
          <Field label="Vibration speed" value={`${machine.vibrationSpeed}%`} />
          <Field label="Input target" value={`${machine.inputTarget} g`} />
          <Field label="Live weight" value={`${Math.round(total)} g`} />
          <Field label="Processing time" value={fmtTime(machine.processingTime)} />
        </div>
      </Panel>

      <Panel title="On completion">
        <div style={{ fontSize: 12.5, color: C.textDim, lineHeight: 1.7 }}>
          This batch is saved automatically once sorting finishes — bean type, mode, speed,
          input weight, category weights, yield, shrinkage, and processing time all get written
          to the batch record. Live category weights are on{" "}
          <span style={{ color: C.text, fontWeight: 600 }}>Sorting monitor</span>, and every saved
          record (including this one once it's done) shows up on{" "}
          <span style={{ color: C.text, fontWeight: 600 }}>Batch history</span>.
        </div>
      </Panel>

      {!inProgress && (
        <div style={{ fontSize: 12, color: C.textFaint }}>
          No batch is currently running. Start one from Machine control to populate this record live.
          Most recently saved: <span style={{ ...mono, color: C.textDim }}>{lastBatch.id}</span> ({lastBatch.date}).
        </div>
      )}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: C.textFaint }}>{label}</div>
      <div style={{ ...mono, marginTop: 2 }}>{value}</div>
    </div>
  );
}

/* ---------------------------------------------------------------
   7. INVENTORY
--------------------------------------------------------------- */
function Inventory({ inventory }) {
  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      {Object.entries(inventory).map(([bean, cats]) => {
        const color = bean === "Arabica" ? C.arabica : C.robusta;
        const total = CATS.reduce((s, c) => s + cats[c], 0);
        return (
          <Panel key={bean} title={bean} right={<span style={{ ...mono, fontSize: 12, color }}>{total.toFixed(1)} kg total</span>}>
            <div className="flex flex-col gap-2.5">
              {CATS.map((c, i) => (
                <div key={c} className="flex items-center gap-3">
                  <span style={{ ...mono, fontSize: 12, color: C.textFaint, width: 14 }}>{i === CATS.length - 1 ? "└" : "├"}</span>
                  <span style={{ fontSize: 13, width: 100 }}>{CAT_LABEL[c]}</span>
                  <div className="flex-1 h-1.5" style={{ background: C.line }}>
                    <div className="h-full" style={{ width: `${(cats[c] / total) * 100}%`, background: color }} />
                  </div>
                  <span style={{ ...mono, fontSize: 13, width: 64, textAlign: "right" }}>{cats[c].toFixed(1)} kg</span>
                </div>
              ))}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------
   8. BATCH HISTORY
--------------------------------------------------------------- */
function BatchHistory({ batches, sel, setSel }) {
  const selected = batches.find((b) => b.id === sel) || null;

  return (
    <div className="flex flex-col gap-5 max-w-5xl">
      <Panel title="All batches">
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.line}` }}>
              {["BATCH", "DATE", "TYPE", "INPUT", "YIELD", "FINE/DEBRIS", "TIME"].map((h) => (
                <th key={h} className="text-left py-2 pr-4" style={{ fontSize: 11, color: C.textFaint, fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => {
              const m = computeMetrics(b);
              const active = sel === b.id;
              return (
                <tr
                  key={b.id}
                  onClick={() => setSel(active ? null : b.id)}
                  style={{ borderBottom: `1px solid ${C.line}`, cursor: "pointer", background: active ? C.panelRaised : "transparent" }}
                >
                  <td className="py-2.5 pr-4" style={{ ...mono, fontSize: 13 }}>{b.id}</td>
                  <td className="py-2.5 pr-4" style={{ fontSize: 12.5, color: C.textDim }}>{b.date}</td>
                  <td className="py-2.5 pr-4"><BeanTag bean={b.beanType} /></td>
                  <td className="py-2.5 pr-4" style={{ ...mono, fontSize: 13 }}>{b.inputWeight} g</td>
                  <td className="py-2.5 pr-4" style={{ ...mono, fontSize: 13, color: C.green }}>{m.yieldPct.toFixed(0)}%</td>
                  <td className="py-2.5 pr-4" style={{ ...mono, fontSize: 13, color: C.red }}>{m.finePct.toFixed(0)}%</td>
                  <td className="py-2.5 pr-4" style={{ ...mono, fontSize: 13 }}>{fmtTime(b.processingTime)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>

      {selected && (
        <Panel
          title={`Batch detail — ${selected.id}`}
          right={<button onClick={() => setSel(null)} style={{ color: C.textFaint, fontSize: 12 }}>close ✕</button>}
        >
          <div className="grid grid-cols-4 gap-y-4 gap-x-6 mb-4" style={{ fontSize: 13 }}>
            <Field label="Date / time" value={selected.date} />
            <Field label="Bean type" value={selected.beanType} />
            <Field label="Operating mode" value={selected.mode} />
            <Field label="Vibration speed" value={`${selected.vibrationSpeed}%`} />
          </div>
          <table className="w-full">
            <tbody>
              {CATS.map((c) => (
                <tr key={c} style={{ borderBottom: `1px solid ${C.line}` }}>
                  <td className="py-2" style={{ fontSize: 13 }}>{CAT_LABEL[c]}</td>
                  <td className="py-2 text-right" style={{ ...mono, fontSize: 13, color: CAT_COLOR[c] }}>{selected.weights[c]} g</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(() => {
            const m = computeMetrics(selected);
            return (
              <div className="grid grid-cols-3 gap-4 mt-4">
                <Field label="Yield" value={`${m.yieldPct.toFixed(1)}%`} />
                <Field label="Fine / debris %" value={`${m.finePct.toFixed(1)}%`} />
                <Field label="Shrinkage" value={`${m.shrinkagePct.toFixed(1)}%`} />
              </div>
            );
          })()}
        </Panel>
      )}
    </div>
  );
}
