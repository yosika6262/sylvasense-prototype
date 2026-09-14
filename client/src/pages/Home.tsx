import { useMemo, useState } from "react";
import { Streamdown } from "streamdown";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Cloud,
  Download,
  FileJson,
  Layers3,
  Leaf,
  MapPin,
  Menu,
  Minus,
  PanelRight,
  Play,
  Radio,
  RefreshCw,
  Satellite,
  Send,
  Sparkles,
  TreePine,
  Upload,
  X,
  Zap,
} from "lucide-react";

type LayerKey = "optical" | "sar" | "crowns" | "biomass" | "change";

type LayerState = Record<LayerKey, boolean>;

const defaultLayers: LayerState = {
  optical: true,
  sar: false,
  crowns: true,
  biomass: false,
  change: true,
};

const crownPoints = [
  [225, 311], [270, 278], [317, 337], [355, 285], [392, 315], [430, 262],
  [468, 302], [505, 254], [542, 322], [581, 286], [619, 332], [658, 278],
  [697, 320], [735, 288], [283, 392], [331, 365], [377, 404], [426, 372],
  [476, 414], [524, 367], [572, 405], [620, 375], [670, 414], [715, 378],
  [367, 446], [430, 447], [495, 443], [557, 451], [626, 447], [688, 443],
];

const questions = [
  "What changed since the baseline?",
  "Can I use this biomass number for a carbon credit?",
  "Why is the risk level moderate?",
];

const fallbackAreas = [
  { id: "western-ghats", name: "Western Ghats pilot", region: "India · Kerala" },
  { id: "amazon-manaus", name: "Amazon basin", region: "Brazil · Amazonas" },
  { id: "congo-basin", name: "Congo basin", region: "DRC · Tshopo" },
  { id: "borneo-heart", name: "Borneo Heart", region: "Indonesia · Kalimantan" },
  { id: "new-guinea", name: "New Guinea highlands", region: "Papua New Guinea · Morobe" },
  { id: "carpathians", name: "Carpathian forest", region: "Romania · Maramures" },
  { id: "pacific-northwest", name: "Pacific Northwest", region: "USA · Washington" },
  { id: "tasmania", name: "Tasmanian wilderness", region: "Australia · Tasmania" },
  { id: "atlantic-forest", name: "Atlantic Forest", region: "Brazil · Bahia" },
  { id: "sundarbans", name: "Sundarbans edge", region: "Bangladesh · Khulna" },
] as const;

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value);
}

function StatusDot({ color = "#78dba3" }: { color?: string }) {
  return <span className="status-dot" style={{ background: color, boxShadow: `0 0 0 4px ${color}20` }} />;
}

function MetricCard({
  label,
  value,
  unit,
  delta,
  tone = "green",
  icon: Icon,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  tone?: "green" | "amber" | "violet" | "blue";
  icon: typeof Activity;
}) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <div className="metric-icon"><Icon size={16} strokeWidth={1.7} /></div>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}<span>{unit}</span></div>
      {delta && <div className={`metric-delta ${delta.startsWith("-") ? "negative" : "positive"}`}>
        {delta.startsWith("-") ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}{delta}
      </div>}
    </article>
  );
}

function LayerToggle({
  label,
  description,
  active,
  color,
  onClick,
}: {
  label: string;
  description: string;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button className={`layer-row ${active ? "active" : ""}`} onClick={onClick} aria-pressed={active}>
      <span className="layer-swatch" style={{ background: active ? color : "#34443d", boxShadow: active ? `0 0 0 4px ${color}18` : "none" }} />
      <span className="layer-copy"><b>{label}</b><small>{description}</small></span>
      <span className={`toggle ${active ? "on" : ""}`}><span /></span>
    </button>
  );
}

function ForestMap({ layers, area }: { layers: LayerState; area?: { name?: string; lat?: number; lon?: number; changeAreaHa?: number; risk?: string } }) {
  const seed = Math.abs(Math.round((area?.lat ?? 11.105) * 10 + (area?.lon ?? 76.405))) % 7;
  const drift = seed * 9;
  const riskColor = area?.risk === "high" ? "#ef986d" : area?.risk === "low" ? "#84d7a1" : "#f5c46f";
  return (
    <div className="map-shell">
      <div className="map-toolbar">
        <div className="map-mode"><span className="map-mode-dot" /> Satellite evidence</div>
        <div className="map-toolbar-actions"><button title="Upload polygon"><Upload size={15} /></button><button title="Refresh layer"><RefreshCw size={15} /></button><button title="Help"><CircleHelp size={15} /></button></div>
      </div>
      <svg className="forest-map" viewBox="0 0 1000 540" role="img" aria-label="Interactive forest evidence map">
        <defs>
          <linearGradient id="mapBg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#14231e" /><stop offset="0.58" stopColor="#19362b" /><stop offset="1" stopColor="#0e211c" /></linearGradient>
          <radialGradient id="canopyGlow"><stop stopColor="#3d8061" stopOpacity=".42" /><stop offset="1" stopColor="#11261e" stopOpacity="0" /></radialGradient>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="#9bd6a214" strokeWidth="1" /></pattern>
          <filter id="soft"><feGaussianBlur stdDeviation="12" /></filter>
        </defs>
        <rect width="1000" height="540" fill="url(#mapBg)" />
        <rect width="1000" height="540" fill="url(#grid)" opacity=".55" />
        <g opacity=".25" filter="url(#soft)"><ellipse cx="260" cy="250" rx="260" ry="120" fill="url(#canopyGlow)" /><ellipse cx="750" cy="400" rx="280" ry="145" fill="url(#canopyGlow)" /></g>
        <path d="M-20 135 C160 90 185 185 330 133 S555 44 710 124 S890 175 1020 99" stroke="#7ac291" strokeOpacity=".16" strokeWidth="2" fill="none" />
        <path d="M-20 182 C155 137 241 237 381 196 S630 104 792 184 S912 232 1020 173" stroke="#7ac291" strokeOpacity=".12" strokeWidth="2" fill="none" />
        <path d="M-30 488 C136 421 224 470 347 422 S574 352 715 429 S889 488 1030 400" stroke="#9ee0ad" strokeOpacity=".13" strokeWidth="4" fill="none" />
        <g opacity=".25"><path d="M58 496L224 170L430 496Z" fill="#7ebf8b" /><path d="M420 512L665 132L950 512Z" fill="#5d9674" /></g>
        <g className="map-raster" opacity={layers.optical ? 1 : .18} transform={`translate(${drift} ${seed * 3})`}>
          {Array.from({ length: 90 }).map((_, i) => {
            const x = (i * 97) % 960 + 15; const y = (i * 53) % 380 + 70;
            const r = 14 + (i % 5) * 4;
            return <circle key={i} cx={x} cy={y} r={r} fill={i % 3 === 0 ? "#2f684b" : i % 3 === 1 ? "#22583f" : "#3b7a55"} opacity={0.22 + (i % 4) * .06} />;
          })}
        </g>
        {layers.sar && <g opacity=".54"><path d="M100 400L910 120M42 456L850 176M150 500L960 220" stroke="#d8a56a" strokeWidth="2" strokeDasharray="5 9" /><text x="745" y="110" fill="#f1c98f" fontSize="11" letterSpacing="2">SAR STRUCTURE SIGNAL</text></g>}
        {layers.change && <g className="change-layer" transform={`translate(${seed * 4} ${seed * 2})`}><path d="M600 253L712 248L767 331L711 370L629 344Z" fill="#e6885d" fillOpacity=".20" stroke={riskColor} strokeWidth="2" strokeDasharray="6 5" /><path d="M678 368L770 342L826 390L789 438L693 427Z" fill="#b67bf0" fillOpacity=".17" stroke="#c998f5" strokeWidth="2" strokeDasharray="6 5" /><text x="706" y="307" fill="#ffc09d" fontSize="11" letterSpacing="1.8">{area?.risk?.toUpperCase() ?? "POSSIBLE"} CHANGE</text></g>}
        {layers.biomass && <g opacity=".72"><circle cx="410" cy="332" r="92" fill="#c6db68" fillOpacity=".16" /><circle cx="650" cy="397" r="106" fill="#e0a15f" fillOpacity=".12" /><text x="353" y="335" fill="#d7ee8a" fontSize="11">HIGH AGB ZONE</text></g>}
        {layers.crowns && <g className="crowns-layer">{crownPoints.map(([cx, cy], i) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={8 + (i % 3) * 2} fill="#9ce3b0" fillOpacity=".09" stroke="#9ce3b0" strokeOpacity=".65" strokeWidth="1.3" />)}</g>}
        <path d="M200 370L268 276L404 236L548 256L692 235L795 323L757 430L636 462L460 475L302 444Z" fill="#86d5a0" fillOpacity=".045" stroke={riskColor} strokeWidth="2.2" strokeDasharray="8 6" />
        <circle cx="530" cy="351" r="7" fill="#f5c46f" stroke="#15271e" strokeWidth="4" /><circle cx="530" cy="351" r="15" fill="none" stroke="#f5c46f" strokeOpacity=".4" strokeWidth="2" />
        <g className="map-labels"><text x="42" y="55">{area?.lat?.toFixed(3) ?? "11.105"}° {area?.lat && area.lat < 0 ? "S" : "N"}</text><text x="824" y="515">{Math.abs(area?.lon ?? 76.405).toFixed(3)}° {area?.lon && area.lon < 0 ? "W" : "E"}</text><text x="46" y="500">{area?.name?.toUpperCase() ?? "FOREST AREA"}</text></g>
        <g className="map-scale"><rect x="40" y="453" width="100" height="3" fill="#d4edda" /><text x="40" y="446">1 km</text></g>
      </svg>
      <div className="map-footer"><div><StatusDot color={riskColor} /><span>{area?.name ?? "Target polygon"}</span><span className="map-coords">{area?.lat?.toFixed(3) ?? "11.105"}°, {area?.lon?.toFixed(3) ?? "76.405"}° · {area?.changeAreaHa?.toFixed(1) ?? "6.7"} ha signal</span></div><div className="map-zoom"><button>−</button><span>1.8×</span><button>+</button></div></div>
    </div>
  );
}

function TrendChart() {
  return <div className="trend-chart"><svg viewBox="0 0 700 160" preserveAspectRatio="none"><defs><linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#84dba5" stopOpacity=".22" /><stop offset="1" stopColor="#84dba5" stopOpacity="0" /></linearGradient></defs><path d="M0 101 C31 94 42 75 76 88 S129 108 161 69 S213 67 243 76 S294 53 326 58 S374 70 405 78 S447 65 476 74 S522 87 555 83 S605 88 635 103 S670 108 700 124V160H0Z" fill="url(#areaFill)" /><path d="M0 101 C31 94 42 75 76 88 S129 108 161 69 S213 67 243 76 S294 53 326 58 S374 70 405 78 S447 65 476 74 S522 87 555 83 S605 88 635 103 S670 108 700 124" fill="none" stroke="#86dba7" strokeWidth="3" strokeLinecap="round" /><path d="M0 120 C42 118 87 113 126 111 S211 106 253 112 S337 118 378 109 S456 112 498 118 S580 130 636 128 S673 124 700 128" fill="none" stroke="#c085e9" strokeWidth="2" strokeDasharray="5 7" opacity=".9" /><line x1="635" y1="16" x2="635" y2="145" stroke="#e6a96e" strokeDasharray="4 5" opacity=".6" /><circle cx="635" cy="103" r="5" fill="#e6a96e" stroke="#183126" strokeWidth="3" /></svg><div className="trend-x"><span>DEC 2024</span><span>APR 2025</span><span>AUG 2025</span><span>DEC 2025</span></div></div>;
}

export default function Home() {
  const { data: areas } = trpc.analysis.areas.useQuery();
  const areaCatalog = areas?.length ? areas : fallbackAreas;
  const [selectedAreaId, setSelectedAreaId] = useState("western-ghats");
  const { data: snapshot, isLoading } = trpc.analysis.snapshot.useQuery({ areaId: selectedAreaId });
  const ask = trpc.analysis.askAssistant.useMutation();
  const [layers, setLayers] = useState<LayerState>(defaultLayers);
  const [activeTab, setActiveTab] = useState<"overview" | "quality">("overview");
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([
    { role: "assistant", text: "I’m grounded in the current Western Ghats evidence stack. Ask me about vegetation, possible change, biomass, or data limitations." },
  ]);
  const [running, setRunning] = useState(false);
  const [runComplete, setRunComplete] = useState(true);
  const [datePosition, setDatePosition] = useState(100);
  const [activeNav, setActiveNav] = useState("overview");

  const selectedArea = areaCatalog.find((area) => area.id === selectedAreaId);
  const current = snapshot ?? {
    areaHa: 124.8, ndviMean: .71, ndviChange: -.08, treeCount: 184, agb: 126.4, carbon: 59.4, changeAreaHa: 6.7, validPixels: 97.05, crownConfidence: .82, changeConfidence: .76, cloudCover: .26, opticalDate: "13 Dec 2025", baselineDate: "19 Dec 2024", source: "Sentinel-2 L2A + Sentinel-1 GRD demonstration stack", resolutionM: 10,
  } as const;

  const visibleLayerCount = useMemo(() => Object.values(layers).filter(Boolean).length, [layers]);

  const toggleLayer = (key: LayerKey) => setLayers((value) => ({ ...value, [key]: !value[key] }));

  const runAnalysis = () => {
    if (running) return;
    setRunning(true); setRunComplete(false);
    window.setTimeout(() => { setRunning(false); setRunComplete(true); }, 1900);
  };

  const submitQuestion = async (text = question) => {
    const trimmed = text.trim();
    if (!trimmed || ask.isPending) return;
    setQuestion(""); setMessages((items) => [...items, { role: "user", text: trimmed }]);
    try {
      const result = await ask.mutateAsync({ question: trimmed, areaId: selectedAreaId });
      setMessages((items) => [...items, { role: "assistant", text: result.answer }]);
    } catch {
      setMessages((items) => [...items, { role: "assistant", text: "The evidence guide is unavailable right now. Please try again." }]);
    }
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "sylvasense-analysis.json"; anchor.click(); URL.revokeObjectURL(url);
  };

  const navPanels: Record<string, { eyebrow: string; title: string; body: string; accent: string; items: string[] }> = {
    layers: { eyebrow: "WORKSPACE / EVIDENCE", title: "Evidence layers", body: "Control the evidence stack for the selected forest area. Toggle layers below or use the map controls to compare vegetation, structure, crowns, biomass, and change signals.", accent: "#86dba7", items: ["Optical vegetation · Sentinel-2 NDVI", "SAR structure · Sentinel-1 VV / VH", "Crown instances · detectree2 / Mask R-CNN", "Biomass estimate · baseline model", "Possible change · temporal signal"] },
    crowns: { eyebrow: "WORKSPACE / TREE LEVEL", title: "Crown inventory", body: "Review the tree-level inventory currently associated with the selected area. The linked detectree2 checkpoint is ready for high-resolution RGB inference; current values remain demonstration records until GeoJSON predictions are imported.", accent: "#c18be7", items: [`${formatNumber(current.treeCount)} crown records in snapshot`, "82% demonstration confidence", "High-resolution RGB required", "GeoJSON import ready", "Field review recommended"] },
    change: { eyebrow: "WORKSPACE / TEMPORAL WATCH", title: "Change watch", body: "Inspect possible forest change signals and prioritize areas for review. Signals are not automatically classified as deforestation; they may include seasonal or phenological variation.", accent: "#e5926d", items: [`${current.changeAreaHa.toFixed(1)} ha possible change signal`, `${((current.changeAreaHa / current.areaHa) * 100).toFixed(1)}% of selected polygon`, `Risk level · ${selectedArea && "risk" in selectedArea ? selectedArea.risk : "moderate"}`, "Compare baseline and latest scene", "Independent review required"] },
    areas: { eyebrow: "PROJECT / GEOGRAPHY", title: "Areas & polygons", body: "Choose any of the ten forest monitoring areas from the selector. The selected polygon controls every metric, map label, risk signal, and grounded assistant answer.", accent: "#84c4e4", items: areaCatalog.map((area) => `${area.name} · ${area.region}`) },
    exports: { eyebrow: "PROJECT / OUTPUTS", title: "Exports", body: "Download the current selected-area evidence snapshot as JSON for review, further analysis, or handoff to a real model pipeline.", accent: "#eab570", items: ["Analysis snapshot JSON", "Dates, CRS and source metadata", "Model provenance and caveats", "Area coordinates and risk summary", "Use Export report to download"] },
    methodology: { eyebrow: "PROJECT / SCIENCE", title: "Methodology", body: "SylvaSense separates evidence generation from GenAI explanation. Remote sensing and computer vision produce measurements; the assistant explains only the verified snapshot and surfaces limitations.", accent: "#86dba7", items: ["NDVI · vegetation activity", "SAR · canopy structure proxy", "Mask R-CNN / detectree2 · crown instances", "AGB · baseline estimate", "Change detection · review signal"] },
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><TreePine size={19} /></div><div><b>Sylva<span>Sense</span></b><small>Forest intelligence</small></div></div>
        <label className="workspace-select"><span className="workspace-avatar">{selectedArea?.region?.slice(0, 2).toUpperCase() ?? "WG"}</span><div><b>{selectedArea?.name ?? "Forest area"}</b><small>{selectedArea?.region ?? "Monitoring workspace"}</small></div><select aria-label="Select forest area" value={selectedAreaId} onChange={(event) => setSelectedAreaId(event.target.value)}>{areaCatalog.map((area) => <option key={area.id} value={area.id}>{area.name} · {area.region}</option>)}</select><ChevronDown size={15} /></label>
        <nav className="side-nav"><div className="nav-section">WORKSPACE</div><button className={`nav-item ${activeNav === "overview" ? "active" : ""}`} onClick={() => setActiveNav("overview")}><Activity size={17} /><span>Overview</span><span className="nav-count">01</span></button><button className={`nav-item ${activeNav === "layers" ? "active" : ""}`} onClick={() => setActiveNav("layers")}><Layers3 size={17} /><span>Evidence layers</span></button><button className={`nav-item ${activeNav === "crowns" ? "active" : ""}`} onClick={() => setActiveNav("crowns")}><TreePine size={17} /><span>Crown inventory</span><span className="nav-pill">BETA</span></button><button className={`nav-item ${activeNav === "change" ? "active" : ""}`} onClick={() => setActiveNav("change")}><Radio size={17} /><span>Change watch</span><span className="alert-count">2</span></button><div className="nav-section second">PROJECT</div><button className={`nav-item ${activeNav === "areas" ? "active" : ""}`} onClick={() => setActiveNav("areas")}><MapPin size={17} /><span>Areas & polygons</span></button><button className={`nav-item ${activeNav === "exports" ? "active" : ""}`} onClick={() => { setActiveNav("exports"); downloadJson(); }}><FileJson size={17} /><span>Exports</span></button><button className={`nav-item ${activeNav === "methodology" ? "active" : ""}`} onClick={() => setActiveNav("methodology")}><CircleHelp size={17} /><span>Methodology</span></button></nav>
        <div className="sidebar-bottom"><div className="pipeline-status"><div className="status-line"><StatusDot /><span>Pipeline healthy</span><span className="status-time">2m ago</span></div><div className="progress-track"><span style={{ width: "82%" }} /></div><small>Evidence synced · 4 of 4 sources</small></div><div className="user-chip"><div className="user-avatar">AS</div><div><b>Arjun Sharma</b><small>Project owner</small></div><Menu size={16} /></div></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><div className="mobile-brand"><div className="brand-mark"><TreePine size={17} /></div><b>Sylva<span>Sense</span></b></div><div className="breadcrumbs"><span>Workspace</span><span>/</span><b>{selectedArea?.name ?? "Forest area"}</b></div><div className="top-actions"><div className="live-indicator"><StatusDot /><span>Live analysis</span></div><button className="icon-button mobile-only"><Menu size={18} /></button><button className="outline-button" onClick={downloadJson}><Download size={15} /> Export report</button><button className="primary-button" onClick={runAnalysis} disabled={running}>{running ? <RefreshCw size={15} className="spin" /> : <Play size={15} />}{running ? "Processing" : "Run analysis"}</button></div></header>
        <div className="content-wrap">
          {activeNav !== "overview" && navPanels[activeNav] && <section className="workspace-panel" style={{ "--panel-accent": navPanels[activeNav].accent } as React.CSSProperties}><div className="workspace-panel-heading"><div><span className="eyebrow">{navPanels[activeNav].eyebrow}</span><h2>{navPanels[activeNav].title}</h2><p>{navPanels[activeNav].body}</p></div><button className="primary-button compact" onClick={() => setActiveNav("overview")}><Activity size={14} /> Back to overview</button></div><div className="workspace-panel-grid">{navPanels[activeNav].items.map((item) => <div className="workspace-item" key={item}><StatusDot color={navPanels[activeNav].accent} /><span>{item}</span></div>)}</div>{activeNav === "exports" && <button className="primary-button" onClick={downloadJson}><Download size={15} /> Download selected-area JSON</button>}</section>}
          <section className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> FOREST MONITORING / AREA {String((areaCatalog.findIndex((area) => area.id === selectedAreaId) ?? 0) + 1).padStart(2, "0")}</div><h1>{selectedArea?.name?.split(" ").slice(0, -1).join(" ") || selectedArea?.name || "Forest"} <em>{selectedArea?.name?.split(" ").slice(-1).join(" ") || "area"}</em></h1><p>Evidence-led canopy intelligence for a {current.areaHa} ha forest polygon.</p></div><div className="heading-meta"><div className="data-source"><Satellite size={16} /><span><b>Sentinel-2 + Sentinel-1</b><small>Last scene · {current.opticalDate}</small></span></div><div className="scene-quality"><span>SCENE QUALITY</span><b><StatusDot /> 97.0%</b></div></div></section>

          <section className="metric-grid"><MetricCard icon={Leaf} label="Mean NDVI" value={current.ndviMean.toFixed(2)} delta="-0.08 vs baseline" tone="green" /><MetricCard icon={TreePine} label="Crown instances" value={formatNumber(current.treeCount)} unit=" trees" delta="82% confidence" tone="violet" /><MetricCard icon={Zap} label="AGB estimate" value={current.agb.toFixed(1)} unit=" t/ha" delta="baseline model" tone="amber" /><MetricCard icon={AlertTriangle} label="Possible change" value={current.changeAreaHa.toFixed(1)} unit=" ha" delta="5.4% of polygon" tone="blue" /></section>

          <section className="analysis-grid">
            <div className="map-column">
              <div className="section-toolbar"><div className="tab-switch"><button className={activeTab === "overview" ? "selected" : ""} onClick={() => setActiveTab("overview")}>Evidence map</button><button className={activeTab === "quality" ? "selected" : ""} onClick={() => setActiveTab("quality")}>Quality report</button></div><div className="map-toolbar-meta"><span><span className="mini-legend optical" /> Optical</span><span><span className="mini-legend change" /> Change signal</span><span className="layer-count"><Layers3 size={13} /> {visibleLayerCount} layers</span></div></div>
              {activeTab === "overview" ? <ForestMap layers={layers} area={current} /> : <div className="quality-panel"><div className="quality-hero"><div><span className="eyebrow">DATA CONFIDENCE</span><h2>Strong enough for a pilot review</h2><p>Evidence coverage is high for vegetation analysis. Mask R-CNN is configured, but trained weights and field-reviewed labels are still required.</p></div><div className="quality-score">97<span>%</span><small>valid pixels</small></div></div><div className="quality-list"><div><span>Optical coverage</span><b>97.05%</b><i><span style={{ width: "97%" }} /></i></div><div><span>Scene cloud cover</span><b>0.26%</b><i><span style={{ width: "9%", background: "#f0bc70" }} /></i></div><div><span>Crown confidence</span><b>82%</b><i><span style={{ width: "82%", background: "#bc88e7" }} /></i></div><div><span>Change confidence</span><b>76%</b><i><span style={{ width: "76%", background: "#e38c67" }} /></i></div></div><div className="warning-box"><AlertTriangle size={17} /><span>Mask R-CNN crown segmentation requires high-resolution imagery, trained weights, and field validation before production use.</span></div></div>}
              <div className="timeline-panel"><div className="panel-heading"><div><span className="eyebrow">TEMPORAL SIGNAL</span><h3>Canopy activity over time</h3></div><div className="date-range"><CalendarDays size={14} /> Dec 2024 — Dec 2025 <ChevronDown size={13} /></div></div><TrendChart /><div className="trend-legend"><span><i className="line green" /> NDVI activity</span><span><i className="line violet" /> Structure proxy</span><span><i className="line amber" /> Review point</span><span className="trend-note"><ArrowDownRight size={13} /> 0.08 from baseline</span></div></div>
            </div>

            <aside className={`insight-column ${assistantOpen ? "" : "closed"}`}>
              <div className="insight-header"><div><span className="eyebrow"><Sparkles size={13} /> AI EVIDENCE GUIDE</span><h2>Ask about this area</h2></div><button className="icon-button" onClick={() => setAssistantOpen(!assistantOpen)}>{assistantOpen ? <X size={16} /> : <PanelRight size={16} />}</button></div>
              {assistantOpen && <><div className="assistant-intro"><div className="bot-orb"><Bot size={19} /></div><p>Pretrained detectree2 checkpoint linked; answers use the verified snapshot until a model run is executed.</p></div><div className="message-list">{messages.map((message, index) => <div key={index} className={`chat-message ${message.role}`}><div className="message-avatar">{message.role === "assistant" ? <Sparkles size={13} /> : "AS"}</div><div className="message-bubble">{message.role === "assistant" ? <Streamdown>{message.text}</Streamdown> : message.text}</div></div>)}{ask.isPending && <div className="chat-message assistant"><div className="message-avatar"><Sparkles size={13} /></div><div className="message-bubble typing"><span /><span /><span /></div></div>}</div><div className="question-chips">{questions.map((item) => <button key={item} onClick={() => submitQuestion(item)}>{item}</button>)}</div><form className="ask-form" onSubmit={(event) => { event.preventDefault(); submitQuestion(); }}><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about the evidence..." /><button type="submit" disabled={!question.trim() || ask.isPending}><Send size={16} /></button></form><div className="grounding-note"><Check size={13} /> Grounded in 1 analysis snapshot · <button onClick={downloadJson}>view JSON</button></div></>}
            </aside>
          </section>

          <section className="bottom-grid"><div className="layer-panel"><div className="panel-heading"><div><span className="eyebrow">EVIDENCE STACK</span><h3>Map layers</h3></div><button className="text-button">Manage <ChevronDown size={13} /></button></div><div className="layer-list"><LayerToggle label="Optical vegetation" description="Sentinel-2 · NDVI composite" color="#7bd39b" active={layers.optical} onClick={() => toggleLayer("optical")} /><LayerToggle label="SAR structure" description="Sentinel-1 · VV / VH signal" color="#e5b36d" active={layers.sar} onClick={() => toggleLayer("sar")} /><LayerToggle label="Crown instances" description="detectree2 linked · 184 demo records" color="#b982e6" active={layers.crowns} onClick={() => toggleLayer("crowns")} /><LayerToggle label="Biomass estimate" description="AGB · 126.4 t/ha baseline" color="#d5dc78" active={layers.biomass} onClick={() => toggleLayer("biomass")} /><LayerToggle label="Possible change" description="Temporal signal · 6.7 ha" color="#e28b68" active={layers.change} onClick={() => toggleLayer("change")} /></div></div><div className="run-panel"><div className="panel-heading"><div><span className="eyebrow">ANALYSIS CONFIGURATION</span><h3>Scene comparison</h3></div><button className="icon-button"><ChevronDown size={15} /></button></div><div className="config-row"><div><small>BASELINE</small><b>19 Dec 2024</b></div><div className="config-arrow">→</div><div><small>LATEST SCENE</small><b>13 Dec 2025</b></div><button className="date-button"><CalendarDays size={14} /></button></div><div className="date-slider"><div className="slider-label"><span>Scene timeline</span><b>{datePosition}% coverage</b></div><input type="range" min="0" max="100" value={datePosition} onChange={(event) => setDatePosition(Number(event.target.value))} /></div><div className="run-foot"><span><Cloud size={14} /> {current.cloudCover.toFixed(2)}% cloud cover</span><span><Radio size={14} /> {current.resolutionM} m resolution</span><button className="primary-button compact" onClick={runAnalysis} disabled={running}>{running ? "Updating..." : runComplete ? "Refresh evidence" : "Processing"}</button></div></div></section>
          <footer className="app-footer"><span><span className="footer-mark">S</span> SylvaSense · Evidence before explanation</span><span>Mask R-CNN track · <button>Methodology & limitations</button></span></footer>
        </div>
      </main>
    </div>
  );
}
