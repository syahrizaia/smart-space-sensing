"use client";

import { Activity, Boxes, Factory, Warehouse, Wind } from "lucide-react";
import type { FacilityZone } from "@/hooks/useLiveFacility";

const icons = [Factory, Boxes, Wind, Warehouse];
const tones = {
  Active: "border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300",
  Idle: "border-amber-400/25 bg-amber-400/[0.08] text-amber-300",
  Offline: "border-rose-400/30 bg-rose-400/[0.09] text-rose-300",
};
const dots = { Active: "bg-emerald-400", Idle: "bg-amber-400", Offline: "bg-rose-400" };

export function FacilityStatus({ zones }: { zones: FacilityZone[] }) {
  return <section className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#0e141b]">
    <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4"><div><div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-400/80">Facility overview</div><h2 className="mt-1 text-[15px] font-semibold text-slate-100">Facility status</h2></div><span className="flex items-center gap-2 text-[9px] text-slate-500"><Activity size={13} className="text-cyan-300"/> Live zone map</span></div>
    <div className="relative p-4 sm:p-5"><div className="pointer-events-none absolute inset-0 opacity-[0.13]" style={{ backgroundImage: "linear-gradient(rgba(148,163,184,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.15) 1px, transparent 1px)", backgroundSize: "28px 28px" }}/><div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2">
      {zones.map((zone, index) => { const Icon = icons[index]; return <article key={zone.id} className={`min-h-36 rounded-xl border p-4 transition-colors ${tones[zone.status]}`}><div className="flex items-start justify-between"><div className="flex items-center gap-2.5"><span className="rounded-lg bg-black/20 p-2"><Icon size={17}/></span><div><div className="font-mono text-[9px] tracking-wide text-slate-500">{zone.id}</div><h3 className="mt-0.5 text-xs font-semibold text-slate-100">{zone.name}</h3></div></div><span className={`mt-1 h-2 w-2 rounded-full ${dots[zone.status]} ${zone.status === "Active" ? "shadow-[0_0_9px_rgba(52,211,153,.7)]" : ""}`}/></div><div className="mt-5 flex items-end justify-between"><div><span className="text-[9px] uppercase tracking-wider text-slate-500">Line output</span><div className="mt-1 font-mono text-lg text-slate-100">{zone.output}<span className="ml-1 text-[9px] text-slate-500">%</span></div></div><span className="rounded-full border border-white/10 bg-black/15 px-2.5 py-1 text-[9px] text-slate-300">{zone.status === "Offline" ? "Warning" : zone.status}</span></div></article>; })}
    </div><div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.06] pt-3 text-[9px] text-slate-500"><span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-emerald-400"/>Active</span><span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-amber-400"/>Idle</span><span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-rose-400"/>Offline / warning</span></div></div>
  </section>;
}
