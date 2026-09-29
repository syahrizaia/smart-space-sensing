"use client";

import { useState } from "react";
import { Activity, BellRing, Radio } from "lucide-react";
import { CameraView } from "@/components/events/CameraView";
import { EventTimeline } from "@/components/events/EventTimeline";
import { ShiftHandover } from "@/components/events/ShiftHandover";
import { SmartWorkOrder } from "@/components/events/SmartWorkOrder";
import { useLiveEvents } from "@/hooks/useLiveEvents";
import type { FacilityEvent } from "@/lib/mockData";

export default function EventsPage() {
  const { events, pendingWorkOrders, connected, createWorkOrder } = useLiveEvents();
  const [selected, setSelected] = useState<FacilityEvent | null>(null);
  const [cameraEvent, setCameraEvent] = useState<FacilityEvent | null>(null);
  const unresolvedAlarms = events.filter((event) => event.type === "Alarm" && event.resolutionStatus === "Open").length;

  const selectEvent = (event: FacilityEvent) => {
    setSelected(event);
    setCameraEvent(event.hasCctv ? event : null);
  };

  const submitWorkOrder = (eventId: string, note: string) => {
    createWorkOrder(eventId, note);
    setSelected((current) => current?.id === eventId ? { ...current, resolutionStatus: "Resolved", actionNote: note } : current);
  };

  return <div className="space-y-6"><header className="flex flex-wrap items-end justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.19em] text-slate-500"><Activity size={12} className="text-cyan-400"/> Operations <span className="text-slate-700">/</span> Event management</div><h1 className="text-[25px] font-semibold tracking-tight text-slate-50 sm:text-[29px]">Events & work orders</h1><p className="mt-1.5 text-xs text-slate-500">Respond to facility alarms and coordinate corrective work.</p></div><div className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-[#0e141b] px-3 py-2 text-[10px] text-slate-400"><Radio size={13} className={connected ? "text-emerald-400" : "text-amber-400"}/>{connected ? "LIVE EVENT FEED" : "CONNECTING"}</div></header>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.8fr)]"><div className="space-y-4"><EventTimeline events={events} selectedId={selected?.id} onSelect={selectEvent}/><ShiftHandover unresolvedAlarms={unresolvedAlarms} pendingWorkOrders={pendingWorkOrders}/></div><div className="space-y-4"><section className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#0e141b]"><div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4"><div><div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-400/80">Surveillance</div><h2 className="mt-1 text-[15px] font-semibold text-slate-100">Camera view</h2></div><BellRing size={15} className="text-slate-600"/></div><div className="relative flex aspect-video flex-col items-center justify-center overflow-hidden bg-[#080d12]" style={{ backgroundImage: "linear-gradient(rgba(148,163,184,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.07) 1px,transparent 1px)", backgroundSize: "22px 22px" }}><div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,73,72,.25),transparent_70%)]"/><span className="relative rounded-xl border border-white/[0.08] bg-black/20 p-3 text-slate-600"><Activity size={20}/></span><p className="relative mt-3 text-[10px] text-slate-400">{selected ? selected.hasCctv ? `Camera available · ${selected.zoneId}` : "No camera linked to this event" : "Select a CCTV event to inspect the feed"}</p><p className="relative mt-1 font-mono text-[8px] text-slate-600">{selected?.hasCctv ? "SIMULATED CAMERA PREVIEW" : "CAMERA STANDBY"}</p></div><div className="flex items-center justify-between px-5 py-3 text-[9px] text-slate-600"><span>{selected ? selected.id : "No event selected"}</span><span className="flex items-center gap-1.5"><i className={`h-1.5 w-1.5 rounded-full ${selected?.hasCctv ? "bg-rose-400" : "bg-slate-600"}`}/>{selected?.hasCctv ? "Feed ready" : "Standby"}</span></div></section><SmartWorkOrder key={selected?.id ?? "none"} event={selected} onSubmit={submitWorkOrder}/></div></div>
    <CameraView event={cameraEvent} onClose={() => setCameraEvent(null)}/>
  </div>;
}
