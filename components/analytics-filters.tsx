"use client";

import { CalendarDays, ChevronDown, Clock3, MapPin } from "lucide-react";

export const timeRangeOptions = [
  "Today",
  "Yesterday",
  "Last 7 Days",
  "Last 30 Days",
  "This Month",
  "Last Month",
  "Custom Range",
] as const;

export const shiftOptions = ["All Shifts", "Shift A", "Shift B", "Shift C"] as const;

export type AnalyticsFilterValues = {
  timeRange: (typeof timeRangeOptions)[number];
  zone: string;
  shift: (typeof shiftOptions)[number];
  startDate: string;
  endDate: string;
};

const filterConfig = [
  { key: "timeRange", label: "Time Range", icon: CalendarDays },
  { key: "zone", label: "Zone/Area", icon: MapPin },
  { key: "shift", label: "Shift", icon: Clock3 },
] as const;

function FilterOptions({ filter, zones }: { filter: (typeof filterConfig)[number]["key"]; zones: string[] }) {
  if (filter === "zone") {
    return <>
      <option value="All Areas" className="bg-[#0e141b] text-slate-200">All Areas</option>
      {zones.map((zone) => <option key={zone} value={zone} className="bg-[#0e141b] text-slate-200">{zone}</option>)}
    </>;
  }

  const options = filter === "timeRange" ? timeRangeOptions : shiftOptions;
  return <>{options.map((option) => <option key={option} value={option} className="bg-[#0e141b] text-slate-200">{option}</option>)}</>;
}

export function AnalyticsFilters({
  zones,
  value,
  onChange,
}: {
  zones: string[];
  value: AnalyticsFilterValues;
  onChange: (value: AnalyticsFilterValues) => void;
}) {
  function handleChange<K extends keyof AnalyticsFilterValues>(field: K, nextValue: AnalyticsFilterValues[K]) {
    onChange({ ...value, [field]: nextValue });
  }

  return (
    <div className="space-y-3" aria-label="Analytics filters">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {filterConfig.map(({ key, label, icon: Icon }) => (
          <div key={key} className="min-w-0">
            <label htmlFor={`analytics-${key}`} className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
              <Icon size={12} className="text-slate-500" aria-hidden="true" />
              {label}
            </label>
            <div className="relative">
              <select
                id={`analytics-${key}`}
                value={value[key]}
                onChange={(event) => handleChange(key, event.target.value as AnalyticsFilterValues[typeof key])}
                className="h-10 w-full appearance-none rounded-lg border border-white/[0.08] bg-[#0e141b] pl-3 pr-9 text-xs text-slate-200 outline-none transition-colors hover:border-white/[0.14] focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/10"
              >
                <FilterOptions filter={key} zones={zones} />
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            </div>
          </div>
        ))}
      </div>
      {value.timeRange === "Custom Range" && (
        <div className="grid gap-3 rounded-lg border border-white/[0.06] bg-white/[0.015] p-3 sm:grid-cols-2">
          <label className="text-[10px] font-medium text-slate-400">
            Start date
            <input type="date" value={value.startDate} max={value.endDate} onChange={(event) => handleChange("startDate", event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-white/[0.08] bg-[#0e141b] px-3 text-xs text-slate-200 outline-none focus:border-cyan-300/40" />
          </label>
          <label className="text-[10px] font-medium text-slate-400">
            End date
            <input type="date" value={value.endDate} min={value.startDate} max={new Date().toISOString().slice(0, 10)} onChange={(event) => handleChange("endDate", event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-white/[0.08] bg-[#0e141b] px-3 text-xs text-slate-200 outline-none focus:border-cyan-300/40" />
          </label>
        </div>
      )}
    </div>
  );
}
