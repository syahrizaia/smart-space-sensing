"use client";

import { Activity, AlertTriangle, Boxes, Radio, RefreshCw } from "lucide-react";
import { useState } from "react";
import { facilitySchedules, useLiveFacility } from "@/hooks/useLiveFacility";
import { EquipmentHealth } from "@/components/operations/EquipmentHealth";
import { FacilityStatus } from "@/components/operations/FacilityStatus";
import { ProductionSchedule } from "@/components/operations/ProductionSchedule";

export function OperationsDashboard({ initialZoneId }: { initialZoneId: string | null }) {
  const { zones, equipment, connected, lastUpdate } = useLiveFacility();
  const validInitialZoneId = zones.some((zone) => zone.id === initialZoneId) ? initialZoneId : null;
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(validInitialZoneId);
  const active = zones.filter((zone) => zone.status === "Active").length;
  const warnings = zones.filter((zone) => zone.status === "Offline").length;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.19em] text-slate-500"><Activity size={12} className="text-cyan-400"/> Jakarta Plant 01 <span className="text-slate-700">/</span> Operations context</div><h1 className="text-[25px] font-semibold tracking-tight text-slate-50 sm:text-[29px]">Unified operations</h1><p className="mt-1.5 text-xs text-slate-500">Real-time view of zones, equipment health, and production flow.</p></div><div className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-[#0e141b] px-3 py-2 text-[10px] text-slate-400"><Radio size={13} className={connected ? "text-emerald-400" : "text-amber-400"}/><span>{connected ? "LIVE TELEMETRY" : "CONNECTING"}</span>{lastUpdate && <span className="hidden text-slate-600 sm:inline">· {lastUpdate.toLocaleTimeString("en-GB", { timeZone: "Asia/Jakarta", hour12: false })} WIB</span>}</div></div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-[#0e141b] p-4"><div className="rounded-lg bg-emerald-400/[0.08] p-2.5 text-emerald-300"><Activity size={16}/></div><div><div className="text-[9px] uppercase tracking-wider text-slate-500">Active zones</div><div className="mt-1 text-lg font-semibold text-slate-100">{active}<span className="ml-1 text-[10px] font-normal text-slate-500">/ {zones.length}</span></div></div></div><div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-[#0e141b] p-4"><div className="rounded-lg bg-cyan-400/[0.08] p-2.5 text-cyan-300"><Boxes size={16}/></div><div><div className="text-[9px] uppercase tracking-wider text-slate-500">Equipment monitored</div><div className="mt-1 text-lg font-semibold text-slate-100">{equipment.length}<span className="ml-1 text-[10px] font-normal text-slate-500">machines</span></div></div></div><div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-[#0e141b] p-4"><div className={`rounded-lg p-2.5 ${warnings ? "bg-rose-400/[0.08] text-rose-300" : "bg-emerald-400/[0.08] text-emerald-300"}`}><AlertTriangle size={16}/></div><div><div className="text-[9px] uppercase tracking-wider text-slate-500">Zone warnings</div><div className="mt-1 text-lg font-semibold text-slate-100">{String(warnings).padStart(2, "0")}<span className="ml-1 text-[10px] font-normal text-slate-500">requiring attention</span></div></div></div></div>
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.75fr)]"><div className="space-y-4"><FacilityStatus zones={zones} selectedZoneId={selectedZoneId} setSelectedZoneId={setSelectedZoneId}/><ProductionSchedule schedules={facilitySchedules} zones={zones} selectedZoneId={selectedZoneId} setSelectedZoneId={setSelectedZoneId}/></div><div className="space-y-4"><EquipmentHealth equipment={equipment} selectedZoneId={selectedZoneId} setSelectedZoneId={setSelectedZoneId}/><div className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.015] px-4 py-3 text-[9px] text-slate-600"><RefreshCw size={11} className="text-cyan-400/70"/> Mock WebSocket feed · refreshes every second</div></div></div>
  </div>;
}
