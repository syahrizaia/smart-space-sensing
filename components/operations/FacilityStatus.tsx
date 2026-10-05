"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Activity, Boxes, Camera, Factory, HeartPulse, Warehouse, Wifi, Wind, X } from "lucide-react";
import type { FacilityZone } from "@/hooks/useLiveFacility";

const icons = [Factory, Boxes, Wind, Warehouse];
const tones = { Active: "border-emerald-400/25 bg-emerald-400/[0.08]", Idle: "border-amber-400/25 bg-amber-400/[0.08]", Offline: "border-rose-400/30 bg-rose-400/[0.09]" };
const dots = { Active: "bg-emerald-400", Idle: "bg-amber-400", Offline: "bg-rose-400" };

const publicCameras = [
  { name: "San Pedro Harbor", operator: "Port of Los Angeles · EarthCam", stream: "https://share.earthcam.net/public/tJ90CoLmq7TzrY396Yd88Lx5olcAdpf_G2QebkU-inY/port_of_los_angeles/camera_1_-_san_pedro/live", source: "https://portoflosangeles.org/news/livestream" },
  { name: "Wilmington East Basin", operator: "Port of Los Angeles · EarthCam", stream: "https://share.earthcam.net/public/tJ90CoLmq7TzrY396Yd88Lx5olcAdpf_G2QebkU-inY/port_of_los_angeles/camera_2_-_wilmington/live", source: "https://portoflosangeles.org/news/livestream" },
  { name: "Everport Ingate", operator: "Everport · Los Angeles", image: "https://gate.etslax.com/GateImages/LAInGate.jpg", source: "https://portoflosangeles.org/business/terminals/container/gates" },
  { name: "APM Terminals Gate", operator: "APM Terminals · Pier 400", image: "https://cms-cd.apmterminals.com/apm/api/v1/gatecameras/gate-camera?id=e987a3c1-c7aa-4b66-a897-7e0977dc8a98", source: "https://www.apmterminals.com/en/los-angeles/practical-information/Gate-Cameras" },
];

function PublicCameraCard({ camera, refreshKey }: { camera: typeof publicCameras[number]; refreshKey: number }) {
  const [failed, setFailed] = useState(false);
  if ("stream" in camera) return <article className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#080d13]">
    <div className="relative aspect-video overflow-hidden bg-[#080d13]">
      <iframe title={`${camera.name} live camera`} src={camera.stream} allow="autoplay; fullscreen; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" loading="lazy" className="h-full w-full border-0" />
      <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1.5 rounded bg-black/70 px-2 py-1 text-[7px] font-semibold tracking-wider text-rose-200"><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400"/> LIVE STREAM</div>
    </div>
    <div className="flex items-center justify-between gap-2 px-2.5 py-2"><div className="min-w-0"><div className="truncate text-[9px] font-medium text-slate-200">{camera.name}</div><div className="truncate text-[8px] text-slate-500">{camera.operator}</div></div><a href={camera.source} target="_blank" rel="noreferrer" aria-label={`Open ${camera.name} source`} className="shrink-0 text-[8px] text-cyan-300 hover:text-cyan-100">Sumber ↗</a></div>
  </article>;

  const separator = camera.image.includes("?") ? "&" : "?";
  const imageUrl = camera.image.includes("/gate-camera?") ? `${camera.image}&v=${refreshKey}` : `${camera.image}${separator}refresh=${refreshKey}`;

  return <article className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#080d13]">
    <div className="relative aspect-video overflow-hidden bg-[#080d13]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {!failed ? <img key={imageUrl} src={imageUrl} alt={`${camera.name} public terminal camera`} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover"/> : <div className="flex h-full flex-col items-center justify-center gap-2 text-center"><Camera size={18} className="text-slate-600"/><span className="text-[9px] text-slate-500">Feed tidak tersedia</span><a href={camera.source} target="_blank" rel="noreferrer" className="text-[8px] text-cyan-300 hover:text-cyan-100">Buka sumber kamera ↗</a></div>}
      {!failed && <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded bg-black/70 px-2 py-1 text-[7px] font-semibold tracking-wider text-emerald-200"><i className="h-1.5 w-1.5 rounded-full bg-emerald-300"/> PUBLIC SNAPSHOT</div>}
    </div>
    <div className="flex items-center justify-between gap-2 px-2.5 py-2"><div className="min-w-0"><div className="truncate text-[9px] font-medium text-slate-200">{camera.name}</div><div className="truncate text-[8px] text-slate-500">{camera.operator}</div></div><a href={camera.source} target="_blank" rel="noreferrer" aria-label={`Open ${camera.name} source`} className="shrink-0 text-[8px] text-cyan-300 hover:text-cyan-100">Sumber ↗</a></div>
  </article>;
}

function AreaModal({ zone, onClose }: { zone: FacilityZone; onClose: () => void }) {
  const [scanTick, setScanTick] = useState(0);
  const [cameraRefresh, setCameraRefresh] = useState(() => Date.now());
  const [embedScale, setEmbedScale] = useState(0.72);
  const scanViewportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewport = scanViewportRef.current;
    if (!viewport) return;
    const observer = new ResizeObserver(([entry]) => setEmbedScale(Math.min(0.72, entry.contentRect.width / 1030)));
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setScanTick((tick) => tick + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setCameraRefresh(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const seed = [...zone.id].reduce((value, char) => value + char.charCodeAt(0), 0);
  const wave = (period: number, phase: number) => Math.sin(scanTick * (Math.PI * 2 / period) + phase);
  const people = zone.status === "Active" ? 1 + seed % 3 : 0;
  const active = zone.status === "Active";
  const heartRate = active ? Math.round(76 + seed % 13 + wave(7, 0) * 3) : null;
  const respiration = active ? Math.round(16 + seed % 4 + wave(11, 1) * 2) : null;
  const motion = active ? (3.2 + (seed % 48) / 10 + wave(5, 2) * 0.8).toFixed(2) : "0.00";
  const variance = (2.8 + (seed % 31) / 10 + wave(9, 3) * 0.32).toFixed(2);
  const rssi = zone.status === "Offline" ? "—" : `${-39 - seed % 19 + Math.round(wave(8, 0) * 2)} dBm`;
  const confidence = zone.status === "Offline" ? "—" : `${Math.round(84 + seed % 11 + wave(6, 1) * 3)}%`;
  const statusText = zone.status === "Offline" ? "SENSOR OFFLINE" : zone.status === "Idle" ? "AREA CLEAR" : "OCCUPANCY DETECTED";
  const statusColor = zone.status === "Offline" ? "text-rose-300" : zone.status === "Idle" ? "text-amber-300" : "text-emerald-300";

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm" onClick={onClose}>
    <section role="dialog" aria-modal="true" aria-labelledby="area-title" onClick={(event) => event.stopPropagation()} className="max-h-[95vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0e141b] shadow-2xl">
      <header className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
        <div><div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Area inspection · {zone.id}</div><h2 id="area-title" className="mt-1 text-base font-semibold text-slate-100">{zone.name}</h2></div>
        <button aria-label="Close area view" onClick={onClose} className="rounded-lg p-2 text-slate-500 transition hover:bg-white/[0.06] hover:text-white"><X size={16}/></button>
      </header>
      <div className="space-y-4 p-4 sm:p-5">
        <section>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div><h3 className="text-[10px] font-medium uppercase tracking-wider text-slate-300">RuView Wi-Fi Scan Results</h3><p className="mt-1 text-[9px] text-slate-500">3D occupancy sensing · {zone.name} · {zone.id}</p></div>
            <span className="flex items-center gap-1.5 rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-2.5 py-1 text-[8px] font-medium tracking-wide text-cyan-200"><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300"/> WIFI CSI SCAN</span>
          </div>
          <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_245px]">
            <div ref={scanViewportRef} className="ruview-viewport relative mx-auto w-full max-w-[742px] overflow-hidden rounded-xl border border-cyan-300/15 bg-[#080d14] shadow-[0_0_36px_rgba(34,211,238,.08)]" aria-label="RuView Observatory 3D Wi-Fi scan">
              <iframe title={`RuView 3D Wi-Fi scan for ${zone.name}`} src="https://ruview.pro/observatory/" className="ruview-iframe absolute h-[810px] w-[1440px] max-w-none border-0" style={{ left: `calc(50% - ${715 * embedScale}px)`, top: `${-65 * embedScale}px`, transform: `scale(${embedScale})`, transformOrigin: "top left" }} loading="eager" />
              <span className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-white/[0.08] bg-[#071018]/85 px-2.5 py-1.5 text-[8px] font-mono font-semibold tracking-wider text-cyan-100">{zone.id} · {zone.name}</span>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#090f16]">
              <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-slate-400"><HeartPulse size={12} className="text-rose-300"/> Vital signs <span className="ml-auto font-mono font-normal text-slate-600">1s</span></div>
              <div className="divide-y divide-white/[0.05]">
                <div className="px-3 py-2.5"><div className="text-[8px] uppercase tracking-wider text-slate-500">Heart rate</div><div className="mt-1 font-mono text-base font-semibold text-rose-300">{heartRate ?? "—"}<span className="ml-1 text-[9px] font-normal text-slate-500">BPM</span></div></div>
                <div className="px-3 py-2.5"><div className="text-[8px] uppercase tracking-wider text-slate-500">Respiration</div><div className="mt-1 font-mono text-base font-semibold text-sky-300">{respiration ?? "—"}<span className="ml-1 text-[9px] font-normal text-slate-500">RPM</span></div></div>
                <div className="px-3 py-2.5"><div className="text-[8px] uppercase tracking-wider text-slate-500">Confidence</div><div className="mt-1 font-mono text-base font-semibold text-emerald-300">{confidence}</div></div>
              </div>
              <div className="flex items-center gap-2 border-y border-white/[0.06] px-3 py-2.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-slate-400"><Wifi size={12} className="text-cyan-300"/> Wi-Fi signal</div>
              <div className="divide-y divide-white/[0.05]">
                <div className="px-3 py-2"><div className="text-[8px] uppercase tracking-wider text-slate-500">RSSI</div><div className="mt-0.5 font-mono text-xs font-semibold text-cyan-200">{rssi}</div></div>
                <div className="px-3 py-2"><div className="text-[8px] uppercase tracking-wider text-slate-500">Variance</div><div className="mt-0.5 font-mono text-xs font-semibold text-slate-200">{variance}</div></div>
                <div className="px-3 py-2"><div className="text-[8px] uppercase tracking-wider text-slate-500">Motion</div><div className="mt-0.5 font-mono text-xs font-semibold text-amber-200">{motion}</div></div>
                <div className="flex items-end justify-between px-3 py-2"><div><div className="text-[8px] uppercase tracking-wider text-slate-500">Persons</div><div className="mt-0.5 font-mono text-xs font-semibold text-slate-200">{people}</div></div><span className={`pb-0.5 text-[8px] font-semibold ${statusColor}`}>{statusText}</span></div>
              </div>
            </div>
          </div>
          <p className="mt-2 text-[8px] text-slate-600">3D renderer: RuView Observatory · Nilai vital signs dan sinyal Wi-Fi pada panel ini adalah data simulasi, diperbarui setiap detik.</p>
        </section>
        <section>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-[10px] font-medium uppercase tracking-wider text-slate-400">CCTV camera grid · Public industrial cameras</h3><p className="mt-1 text-[8px] text-slate-600">2 live streams Port of Los Angeles · 2 gate snapshots refresh every 60 seconds · public reference feeds, not cameras at this facility</p></div><span className="flex items-center gap-1.5 text-[8px] text-emerald-300"><i className="h-1.5 w-1.5 rounded-full bg-emerald-400"/>4 public cameras</span></div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">{publicCameras.map((camera) => <PublicCameraCard key={camera.name} camera={camera} refreshKey={cameraRefresh}/>)}</div>
        </section>
      </div>
      <footer className="border-t border-white/[0.06] px-5 py-3 text-[9px] text-slate-600">Wi-Fi CSI occupancy scan <span className="mx-2">·</span> {zone.name} <span className="mx-2">·</span> {zone.id}</footer>
    </section>
  </div>;
}
export function FacilityStatus({ zones, selectedZoneId, setSelectedZoneId, onZoneSelect }: { zones: FacilityZone[]; selectedZoneId: string | null; setSelectedZoneId: Dispatch<SetStateAction<string | null>>; onZoneSelect?: (zoneId: string) => void }) {
  const [areaZoneId, setAreaZoneId] = useState<string | null>(null);
  const activeArea = zones.find((zone) => zone.id === areaZoneId);
  const openArea = (id: string) => { setSelectedZoneId(id); setAreaZoneId(id); };
  return <><section className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#0e141b]"><div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4"><div><div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-400/80">Facility overview</div><h2 className="mt-1 text-[15px] font-semibold text-slate-100">Facility status</h2></div><span className="flex items-center gap-2 text-[9px] text-slate-500"><Activity size={13} className="text-cyan-300"/> Live zone map</span></div><div className="relative p-4 sm:p-5"><div className="pointer-events-none absolute inset-0 opacity-[0.13]" style={{ backgroundImage: "linear-gradient(rgba(148,163,184,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.15) 1px, transparent 1px)", backgroundSize: "28px 28px" }}/><div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2">{zones.map((zone, index) => { const Icon = icons[index]; const selected = selectedZoneId === zone.id; const selectZone = () => onZoneSelect ? onZoneSelect(zone.id) : setSelectedZoneId(zone.id); return <article key={zone.id} role="button" tabIndex={0} onClick={selectZone} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectZone(); } }} className={`min-h-36 cursor-pointer rounded-xl border p-4 transition hover:-translate-y-0.5 hover:brightness-110 focus:outline-none focus:ring-1 focus:ring-cyan-300/50 ${tones[zone.status]} ${selected ? "ring-1 ring-cyan-300/50" : ""}`}><div className="flex items-start justify-between"><div className="flex items-center gap-2.5"><span className="rounded-lg bg-black/20 p-2 text-slate-200"><Icon size={17}/></span><div><div className="font-mono text-[9px] tracking-wide text-slate-500">{zone.id}</div><h3 className="mt-0.5 text-xs font-semibold text-slate-100">{zone.name}</h3></div></div><span className={`mt-1 h-2 w-2 rounded-full ${dots[zone.status]} ${zone.status === "Active" ? "shadow-[0_0_9px_rgba(52,211,153,.7)]" : ""}`}/></div><div className="mt-5 flex items-end justify-between"><div><span className="text-[9px] uppercase tracking-wider text-slate-500">Line output</span><div className="mt-1 font-mono text-lg text-slate-100">{zone.output}<span className="ml-1 text-[9px] text-slate-500">%</span></div></div><div className="flex items-center gap-2"><span className="text-[9px] text-slate-400">{zone.status === "Offline" ? "Warning" : zone.status}</span>{!onZoneSelect && <button onClick={(event) => { event.stopPropagation(); openArea(zone.id); }} className="rounded-md border border-cyan-300/20 bg-cyan-300/[0.08] px-2.5 py-1.5 text-[9px] font-medium text-cyan-200 transition hover:bg-cyan-300/[0.16]">Lihat Area</button>}</div></div></article>; })}</div><div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.06] pt-3 text-[9px] text-slate-500"><span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-emerald-400"/>Active</span><span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-amber-400"/>Idle</span><span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-rose-400"/>Offline / warning</span></div></div></section>{activeArea && <AreaModal zone={activeArea} onClose={() => setAreaZoneId(null)}/>}</>;
}
