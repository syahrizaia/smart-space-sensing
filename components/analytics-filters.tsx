"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown, Clock3, MapPin } from "lucide-react";

const timeRangeOptions = ["Today", "Last 7 Days", "This Month", "Custom Range"] as const;
const zoneGroups = [
  {
    label: "Zona Administratif & Pemantauan - Office & Control",
    options: [
      "Ruang Kontrol (Control Room)",
      "Kantor Pabrik (Plant Office)",
    ],
  },
] as const;
const zoneOptions = ["All Zones", ...zoneGroups.flatMap((group) => group.options)] as const;
const shiftOptions = [
  "All Shifts",
  "Morning Shift (06:00-14:00)",
  "Evening Shift (14:00-22:00)",
  "Night Shift (22:00-06:00)",
] as const;

type FilterValues = {
  timeRange: (typeof timeRangeOptions)[number];
  zone: (typeof zoneOptions)[number];
  shift: (typeof shiftOptions)[number];
};

type FilterField = keyof FilterValues;

const filterConfig = [
  { key: "timeRange", label: "Time Range", icon: CalendarDays },
  { key: "zone", label: "Zone/Area", icon: MapPin },
  { key: "shift", label: "Shift", icon: Clock3 },
] as const;

function FilterOptions({ filter }: { filter: (typeof filterConfig)[number]["key"] }) {
  if (filter === "zone") {
    return <>
      <option value="All Zones" className="bg-[#0e141b] text-slate-200">All Zones</option>
      {zoneGroups.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.options.map((option) => <option key={option} value={option} className="bg-[#0e141b] text-slate-200">{option}</option>)}
        </optgroup>
      ))}
    </>;
  }

  const options = filter === "timeRange" ? timeRangeOptions : shiftOptions;
  return <>{options.map((option) => <option key={option} value={option} className="bg-[#0e141b] text-slate-200">{option}</option>)}</>;
}

export function AnalyticsFilters() {
  const [filters, setFilters] = useState<FilterValues>({
    timeRange: "Last 7 Days",
    zone: "All Zones",
    shift: "All Shifts",
  });

  function handleFilterChange<K extends FilterField>(field: K, value: FilterValues[K]) {
    const updatedFilters = { ...filters, [field]: value };
    setFilters(updatedFilters);

    // Mock-up hook: replace this with the analytics API update when it is available.
    console.info("Analytics filters changed", updatedFilters);
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Analytics filters">
      {filterConfig.map(({ key, label, icon: Icon }) => (
        <div key={key} className="min-w-0">
          <label htmlFor={`analytics-${key}`} className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
            <Icon size={12} className="text-slate-500" aria-hidden="true" />
            {label}
          </label>
          <div className="relative">
            <select
              id={`analytics-${key}`}
              value={filters[key]}
              onChange={(event) => handleFilterChange(key, event.target.value as FilterValues[typeof key])}
              className="h-10 w-full appearance-none rounded-lg border border-white/[0.08] bg-[#0e141b] pl-3 pr-9 text-xs text-slate-200 outline-none transition-colors hover:border-white/[0.14] focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/10"
            >
              <FilterOptions filter={key} />
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
          </div>
        </div>
      ))}
    </div>
  );
}
