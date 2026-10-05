"use client";

import { Activity, ArrowDownRight, ArrowRight, Boxes, Bolt, CircleAlert, Clock3, Gauge, MapPin, PackageCheck, Wind } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getFacilityMockData, getFacilityZoneName } from "@/lib/mockData";
import { MetricCard, Panel, SectionHeading, StatusPill } from "@/components/ui";
import { FacilityStatus } from "@/components/operations/FacilityStatus";
import { useLiveFacility } from "@/hooks/useLiveFacility";
import { useSelectedFacility } from "@/components/facility-selection";

function eventTime(timestamp: string) { return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(timestamp)); }

export default function DashboardPage() {
  const router = useRouter();
  const selectedFacility = useSelectedFacility();
  const { zones: facilityZones } = useLiveFacility(selectedFacility);
  const facilityData = getFacilityMockData(selectedFacility);
  const events = facilityData.events;
  const totalEnergy = facilityData.energyByZone.reduce((sum, zone) => sum + zone.energy, 0);
  const activeZones = facilityZones.filter((zone) => zone.status === "Active").length;
  const openAlarms = events.filter((event) => event.type === "Alarm" && event.resolutionStatus === "Open").length;
  const production = selectedFacility === "Jakarta Plant 02" ? 7240 : selectedFacility === "Jakarta Plant 03" ? 9160 : 8420;
  const oee = selectedFacility === "Jakarta Plant 02" ? 78.3 : selectedFacility === "Jakarta Plant 03" ? 89.1 : 84.6;
  const energyIntensity = selectedFacility === "Jakarta Plant 02" ? "0.51" : selectedFacility === "Jakarta Plant 03" ? "0.38" : "0.42";
  const shiftProgress = selectedFacility === "Jakarta Plant 02" ? 72 : selectedFacility === "Jakarta Plant 03" ? 91 : 84;
  return <div className="space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.19em] text-slate-500"><MapPin size={12} className="text-cyan-400"/> {selectedFacility} <span className="text-slate-700">/</span> Operations center</div><h1 className="text-[25px] font-semibold tracking-tight text-slate-50 sm:text-[29px]">Unified operations</h1><p className="mt-1.5 text-xs text-slate-500">Live overview of facility performance and activity.</p></div><div className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-[#0e141b] px-3 py-2 text-[10px] text-slate-400"><Clock3 size={13} className="text-slate-500"/> Monday, 28 September 2026</div></div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Total energy" value={totalEnergy.toLocaleString("en-US")} unit="kWh" delta={selectedFacility === "Jakarta Plant 02" ? "↑ 3.1%" : "↓ 4.2%"} hint="vs. last shift" icon={Bolt} tone="cyan"/><MetricCard label="Active zones" value={`${activeZones} / ${facilityZones.length}`} delta={selectedFacility === "Jakarta Plant 03" ? "+2 zones" : "+1 zone"} hint="since last shift" icon={Activity} tone="green"/><MetricCard label="Open alarms" value={String(openAlarms).padStart(2,"0")} delta="Needs attention" hint={`${selectedFacility} alerts`} icon={CircleAlert} tone="rose"/><MetricCard label="Total production" value={production.toLocaleString("en-US")} unit="units" delta={selectedFacility === "Jakarta Plant 02" ? "↑ 3.8%" : "↑ 8.6%"} hint="of facility target" icon={PackageCheck} tone="amber"/></div>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(330px,0.85fr)]">
      <FacilityStatus zones={facilityZones} selectedZoneId={null} setSelectedZoneId={() => undefined} onZoneSelect={(zoneId) => router.push(`/operations?zone=${encodeURIComponent(zoneId)}`)} />
      <Panel className="flex flex-col"><div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4"><SectionHeading eyebrow={selectedFacility} title="Recent events"/><Link href="/events" className="flex items-center gap-1 text-[10px] text-cyan-300 hover:text-cyan-200">All events <ArrowRight size={12}/></Link></div><div className="flex-1 divide-y divide-white/[0.045]">{events.slice(0,4).map((event)=><div key={event.id} className="flex gap-3 px-5 py-4"><div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${event.type==="Alarm"?"bg-rose-400/10 text-rose-300":event.type==="Warning"?"bg-amber-400/10 text-amber-300":"bg-cyan-400/10 text-cyan-300"}`}>{event.type==="Alarm"?<CircleAlert size={13}/>:event.type==="Warning"?<ArrowDownRight size={13}/>:<Activity size={13}/>}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><StatusPill value={event.type}/><span className="shrink-0 font-mono text-[9px] text-slate-600">{eventTime(event.timestamp)}</span></div><div className="mt-2 truncate text-[11px] text-slate-300">{event.description}</div><div className="mt-1 font-mono text-[9px] text-slate-600">{getFacilityZoneName(event.zoneId)} <span className="mx-1 text-slate-700">/</span> {event.id}</div></div></div>)}</div><Link href="/events" className="flex items-center justify-center gap-2 border-t border-white/[0.06] py-3 text-[10px] text-slate-500 transition hover:text-slate-300">View event log <ArrowRight size={12}/></Link></Panel>
    </div>
    <div className="grid gap-4 md:grid-cols-3"><Panel className="flex items-center gap-4 p-4"><div className="rounded-lg bg-cyan-300/[0.08] p-2.5 text-cyan-300"><Gauge size={17}/></div><div className="flex-1"><div className="text-[10px] uppercase tracking-[0.13em] text-slate-500">Line efficiency</div><div className="mt-1 text-lg font-semibold">{oee}<span className="ml-1 text-[11px] font-normal text-slate-500">%</span></div></div><div className="h-1 w-12 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-cyan-400" style={{ width: `${oee}%` }}/></div></Panel><Panel className="flex items-center gap-4 p-4"><div className="rounded-lg bg-amber-300/[0.08] p-2.5 text-amber-300"><Wind size={17}/></div><div className="flex-1"><div className="text-[10px] uppercase tracking-[0.13em] text-slate-500">Energy intensity</div><div className="mt-1 text-lg font-semibold">{energyIntensity}<span className="ml-1 text-[11px] font-normal text-slate-500">kWh / unit</span></div></div><div className="text-[9px] text-emerald-400">{selectedFacility === "Jakarta Plant 02" ? "↑ 1.4%" : "↓ 2.1%"}</div></Panel><Panel className="flex items-center gap-4 p-4"><div className="rounded-lg bg-emerald-300/[0.08] p-2.5 text-emerald-300"><Boxes size={17}/></div><div className="flex-1"><div className="text-[10px] uppercase tracking-[0.13em] text-slate-500">Shift A progress</div><div className="mt-1 text-lg font-semibold">{shiftProgress}<span className="ml-1 text-[11px] font-normal text-slate-500">% complete</span></div></div><div className="text-[9px] text-slate-500">Ends 16:00</div></Panel></div>
  </div>;
}
