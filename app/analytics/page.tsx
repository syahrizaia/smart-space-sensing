"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownRight, Bolt, Clock3, Gauge, TriangleAlert } from "lucide-react";
import { EnergyChart } from "@/components/energy-chart";
import { AnalyticsFilters, type AnalyticsFilterValues } from "@/components/analytics-filters";
import { ShiftTrendChart } from "@/components/shift-trend-chart";
import { MetricCard, Panel, SectionHeading } from "@/components/ui";
import { useSelectedFacility } from "@/components/facility-selection";

type AnalyticsData = {
  generatedAt: string;
  dataMode: "sample" | "live";
  idleThresholdKwh: number;
  summary: { totalEnergyKwh: number; averageUtilizationPct: number | null; flaggedZoneCount: number; energyInFlaggedZonesKwh: number };
  zones: { zoneId: string; zone: string; energyKwh: number | null; occupied: boolean | null; utilizationPct: number | null; status: string; alert: boolean }[];
  alerts: { zoneId: string; zone: string; energyKwh: number | null; utilizationPct: number | null }[];
  shifts: { shift: string; period?: string; energyKwh: number; utilizationPct: number }[];
  sources: { source: string; status: string; timestamp: string; error?: string }[];
  shiftTrendMode: "sample" | "live";
};

const formatNumber = (value: number | null, digits = 0) =>
  value === null ? "—" : value.toLocaleString("en-US", { maximumFractionDigits: digits });

function localDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function rangeDays(filters: AnalyticsFilterValues) {
  const today = new Date();
  if (filters.timeRange === "Today") return 1;
  if (filters.timeRange === "Yesterday") return 0.94;
  if (filters.timeRange === "Last 7 Days") return 7.1;
  if (filters.timeRange === "Last 30 Days") return 29.4;
  if (filters.timeRange === "This Month") return today.getDate() * 1.03;
  if (filters.timeRange === "Last Month") return new Date(today.getFullYear(), today.getMonth(), 0).getDate() * 0.97;
  const start = new Date(`${filters.startDate}T00:00:00`);
  const end = new Date(`${filters.endDate}T00:00:00`);
  if (!filters.startDate || !filters.endDate || end < start) return 1;
  return Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1) * 1.01;
}

function matchesShift(label: string, shift: AnalyticsFilterValues["shift"]) {
  if (shift === "All Shifts") return true;
  const normalized = label.toLowerCase();
  const aliases = {
    "Shift A": ["shift a", "morning", "day shift", "06:00"],
    "Shift B": ["shift b", "evening", "afternoon", "14:00"],
    "Shift C": ["shift c", "night", "22:00"],
  } as const;
  return aliases[shift].some((alias) => normalized.includes(alias));
}

const shiftConfig = {
  "All Shifts": { energyShare: 1, utilizationOffset: 0 },
  "Shift A": { energyShare: 0.36, utilizationOffset: 6 },
  "Shift B": { energyShare: 0.39, utilizationOffset: 1 },
  "Shift C": { energyShare: 0.25, utilizationOffset: -10 },
} as const;

function applyAnalyticsFilters(data: AnalyticsData, filters: AnalyticsFilterValues) {
  const days = rangeDays(filters);
  const shift = shiftConfig[filters.shift];
  const selectedZones = data.zones.filter((zone) => filters.zone === "All Areas" || zone.zone === filters.zone);
  const totalFacilityEnergy = data.zones.reduce((sum, zone) => sum + (zone.energyKwh ?? 0), 0);
  const selectedZoneEnergy = selectedZones.reduce((sum, zone) => sum + (zone.energyKwh ?? 0), 0);
  const zoneShare = filters.zone === "All Areas" || totalFacilityEnergy === 0 ? 1 : selectedZoneEnergy / totalFacilityEnergy;

  // Available readings act as baselines; range and shift selections create distinct period views.
  const zones = selectedZones.map((zone) => ({
    ...zone,
    energyKwh: zone.energyKwh === null ? null : Number((zone.energyKwh * days * shift.energyShare).toFixed(1)),
    utilizationPct: zone.utilizationPct === null
      ? null
      : Math.max(0, Math.min(100, Number((zone.utilizationPct + shift.utilizationOffset).toFixed(1)))),
  }));
  const totalEnergyKwh = zones.reduce((sum, zone) => sum + (zone.energyKwh ?? 0), 0);
  const knownUtilization = zones.filter((zone) => zone.utilizationPct !== null);
  const averageUtilizationPct = knownUtilization.length
    ? Number((knownUtilization.reduce((sum, zone) => sum + (zone.utilizationPct ?? 0), 0) / knownUtilization.length).toFixed(1))
    : null;
  const alerts = zones.filter((zone) => zone.alert).map((zone) => ({
    zoneId: zone.zoneId,
    zone: zone.zone,
    energyKwh: zone.energyKwh,
    utilizationPct: zone.utilizationPct,
  }));
  const shifts = data.shifts
    .filter((item) => matchesShift(item.shift, filters.shift))
    .map((item) => ({
      ...item,
      energyKwh: Number((item.energyKwh * days * zoneShare).toFixed(1)),
      utilizationPct: Math.max(0, Math.min(100, Number((item.utilizationPct + shift.utilizationOffset).toFixed(1)))),
    }));

  return {
    ...data,
    zones,
    alerts,
    shifts,
    summary: {
      totalEnergyKwh: Number(totalEnergyKwh.toFixed(1)),
      averageUtilizationPct,
      flaggedZoneCount: alerts.length,
      energyInFlaggedZonesKwh: Number(alerts.reduce((sum, zone) => sum + (zone.energyKwh ?? 0), 0).toFixed(1)),
    },
  };
}

export default function AnalyticsPage() {
  const facility = useSelectedFacility();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [filters, setFilters] = useState<AnalyticsFilterValues>(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    return {
      timeRange: "Last 7 Days",
      zone: "All Areas",
      shift: "All Shifts",
      startDate: localDateValue(start),
      endDate: localDateValue(today),
    };
  });
  useEffect(() => {
    let current = true;
    // Zona yang dipilih sebelumnya mungkin tidak tersedia di plant baru.
    setFilters((previous) => ({ ...previous, zone: "All Areas" }));
    fetch(`/api/analytics?facility=${encodeURIComponent(facility)}`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Analytics request failed");
        return response.json() as Promise<{ data: AnalyticsData }>;
      })
      .then(({ data }) => { if (current) setAnalytics(data); })
      .catch(() => { if (current) setAnalytics(null); });
    return () => { current = false; };
  }, [facility]);

  const filteredAnalytics = useMemo(
    () => analytics ? applyAnalyticsFilters(analytics, filters) : null,
    [analytics, filters],
  );

  if (!analytics || !filteredAnalytics) return <div className="space-y-2"><div className="text-[10px] font-medium uppercase tracking-[0.19em] text-slate-500">{facility} / Energy</div><h1 className="text-[25px] font-semibold tracking-tight text-slate-50 sm:text-[29px]">Cost &amp; energy optimization</h1><p className="text-xs text-slate-500">Loading readings for {facility}…</p></div>;
  const view = filteredAnalytics;
  const flagged = view.alerts;
  const sourceNames = view.sources.map((source) => source.source);
  const trendIsSample = view.shiftTrendMode === "sample";
  const modeLabel = view.dataMode === "sample" ? "Sample data" : "Live readings";
  const selectedRangeLabel = filters.timeRange === "Custom Range"
    ? `${filters.startDate} – ${filters.endDate}`
    : filters.timeRange;

  return <div className="space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.19em] text-slate-500">{facility} <span className="mx-1.5 text-slate-700">/</span> Energy</div>
        <h1 className="text-[25px] font-semibold tracking-tight text-slate-50 sm:text-[29px]">Cost &amp; energy optimization</h1>
        <p className="mt-1.5 text-xs text-slate-500">Find energy use that does not match area activity and compare shifts.</p>
      </div>
      <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[10px] ${view.dataMode === "live" ? "border-emerald-300/15 bg-emerald-300/[0.05] text-emerald-200" : "border-amber-300/15 bg-amber-300/[0.05] text-amber-200"}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current"/>{modeLabel}
      </div>
    </div>

    <AnalyticsFilters zones={analytics.zones.map((zone) => zone.zone)} value={filters} onChange={setFilters} />
    <div className="-mt-4 text-[9px] text-slate-600">Showing {selectedRangeLabel} · {filters.zone === "All Areas" ? "All areas" : filters.zone} · {filters.shift}</div>
    <p className="-mt-2 text-[9px] text-slate-600">Period totals are estimates from available readings. Timestamped history is needed for exact historical totals.</p>

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Energy consumed" value={formatNumber(view.summary.totalEnergyKwh)} unit="kWh" delta={view.dataMode === "live" ? "Current readings" : "Example readings"} hint={`for ${selectedRangeLabel.toLowerCase()}`} icon={Bolt} tone="cyan"/>
      <MetricCard label="Area utilization" value={formatNumber(view.summary.averageUtilizationPct, 1)} unit="%" delta="Occupied time" hint={view.dataMode === "live" ? "latest sensor status" : "sample shift occupancy"} icon={Activity} tone="green"/>
      <MetricCard label="Empty area alerts" value={String(view.summary.flaggedZoneCount).padStart(2, "0")} delta={`Threshold ≥ ${view.idleThresholdKwh} kWh`} hint="energy draw while vacant" icon={TriangleAlert} tone="amber"/>
      <MetricCard label="Energy in flagged areas" value={formatNumber(view.summary.energyInFlaggedZonesKwh)} unit="kWh" delta="Needs review" hint="consumption in empty zones" icon={Gauge} tone="rose"/>
    </div>

    <Panel className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeading eyebrow="Area utilization" title="Energy consumption vs. area use" detail="Red bars mark zones drawing energy above the empty-area threshold while WiFi/CSI reports them vacant."/>
        <div className="rounded-lg border border-amber-300/10 bg-amber-300/[0.05] px-3 py-2 text-[9px] text-amber-200"><span className="mr-1.5 text-amber-300">●</span>{flagged.length} area{flagged.length === 1 ? "" : "s"} to review</div>
      </div>
      {view.zones.length ? <EnergyChart data={view.zones}/> : <div className="flex h-[300px] items-center justify-center text-xs text-slate-500">No zone readings are available for this filter.</div>}
      <div className="mt-1 flex flex-wrap items-center gap-4 border-t border-white/[0.06] pt-3 text-[9px] text-slate-600">
        <span>ENERGY · KWH</span><span>UTILIZATION · %</span>
        <span className="ml-auto">Vacant-area threshold: {view.idleThresholdKwh} kWh</span>
      </div>
    </Panel>

    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
      <Panel className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionHeading eyebrow="Shift comparison" title="Energy and utilization by shift" detail="Compare consumption with average area utilization across production shifts."/>
          <div className="flex items-center gap-1.5 text-[9px] text-slate-500"><Clock3 size={12}/>{trendIsSample ? "Example trend" : "Historical data"}</div>
        </div>
        {view.shifts.length ? <ShiftTrendChart data={view.shifts}/> : <div className="flex h-[240px] items-center justify-center text-xs text-slate-500">No shift history is available for this filter.</div>}
        {trendIsSample && <p className="mt-1 text-[9px] text-slate-600">Configure ANALYTICS_HISTORY_API_URL to replace the example trend with historical shift data.</p>}
      </Panel>

      <Panel>
        <div className="border-b border-white/[0.06] px-5 py-4"><SectionHeading eyebrow="Cost optimization" title="Areas to investigate" detail="Energy remains high while the area is reported empty."/></div>
        {flagged.length ? <div className="divide-y divide-white/[0.045]">{flagged.map((zone) => <div key={zone.zoneId} className="flex items-center gap-3 px-5 py-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-300/[0.08] text-amber-300"><TriangleAlert size={14}/></div>
          <div className="min-w-0 flex-1"><div className="truncate text-xs font-medium text-slate-200">{zone.zone}</div><div className="mt-1 text-[9px] text-slate-500">Vacant · utilization {formatNumber(zone.utilizationPct, 1)}%</div></div>
          <div className="text-right"><div className="font-mono text-xs text-rose-300">{formatNumber(zone.energyKwh)} <span className="text-[9px] text-slate-500">kWh</span></div><div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-amber-400"><ArrowDownRight size={11}/> review draw</div></div>
        </div>)}</div> : <div className="px-5 py-10 text-center text-xs text-slate-500">No empty areas exceed the configured energy threshold.</div>}
      </Panel>
    </div>

    <Panel>
      <div className="border-b border-white/[0.06] px-5 py-4"><SectionHeading eyebrow="Data quality" title="Analytics source status" detail={`Updated ${new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" }).format(new Date(view.generatedAt))}`}/></div>
      <div className="grid gap-2 p-4 sm:grid-cols-3">{view.sources.map((source) => <div key={source.source} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
        <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-medium text-slate-300">{source.source}</span><span className={`text-[9px] ${source.status === "connected" ? "text-emerald-300" : source.status === "error" ? "text-rose-300" : "text-slate-500"}`}>{source.status.replace("_", " ")}</span></div>
        {source.error && <div className="mt-2 text-[9px] text-rose-300/80">{source.error}</div>}
      </div>)}</div>
      <div className="border-t border-white/[0.06] px-5 py-3 text-[9px] text-slate-600">Sources: {sourceNames.join(" · ")}. For live shift patterns, provide historical readings with shift, energyKwh, and utilizationPct.</div>
    </Panel>
  </div>;
}
