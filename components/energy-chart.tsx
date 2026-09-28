"use client";

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import type { AnalyticsZone } from "@/lib/analytics-service";

export function EnergyChart({ data }: { data: AnalyticsZone[] }) {
  return <div className="h-[340px] w-full pt-4">
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
        <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false}/>
        <XAxis dataKey="zone" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} dy={9}/>
        <YAxis yAxisId="energy" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }}/>
        <YAxis yAxisId="utilization" orientation="right" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} tickFormatter={(value: number) => `${value}%`} domain={[0, 100]}/>
        <Tooltip
          cursor={{ fill: "rgba(148,163,184,0.05)" }}
          contentStyle={{ background: "#111922", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 10, color: "#e2e8f0", fontSize: 11 }}
          labelStyle={{ color: "#94a3b8", marginBottom: 5 }}
          formatter={(value, name) => [value === null ? "Unavailable" : name === "energyKwh" ? `${value} kWh` : `${value}%`, name === "energyKwh" ? "Energy" : "Area utilization"]}
          labelFormatter={(label, payload) => {
            const status = payload[0]?.payload?.status;
            return status ? `${label} · ${status}` : label;
          }}
        />
        <Legend verticalAlign="top" align="right" height={32} iconType="circle" iconSize={7} formatter={(value) => <span className="ml-1 text-[10px] text-slate-400">{value === "energyKwh" ? "Energy consumption" : "Area utilization"}</span>}/>
        <Bar yAxisId="energy" dataKey="energyKwh" name="energyKwh" radius={[4, 4, 0, 0]} maxBarSize={28} fillOpacity={0.8}>
          {data.map((zone) => <Cell key={zone.zoneId} fill={zone.alert ? "#fb7185" : "#22d3ee"}/>)}
        </Bar>
        <Line yAxisId="utilization" type="monotone" dataKey="utilizationPct" name="utilizationPct" stroke="#fbbf24" strokeWidth={2} connectNulls={false} dot={{ r: 3, fill: "#fbbf24", stroke: "#111922", strokeWidth: 2 }} activeDot={{ r: 5 }}/>
      </ComposedChart>
    </ResponsiveContainer>
  </div>;
}
