"use client";

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ShiftTrend } from "@/lib/analytics-service";

export function ShiftTrendChart({ data }: { data: ShiftTrend[] }) {
  return <div className="h-[270px] w-full pt-4">
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
        <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false}/>
        <XAxis dataKey="shift" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} dy={9}/>
        <YAxis yAxisId="energy" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }}/>
        <YAxis yAxisId="utilization" orientation="right" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} tickFormatter={(value: number) => `${value}%`} domain={[0, 100]}/>
        <Tooltip cursor={{ fill: "rgba(148,163,184,0.05)" }} contentStyle={{ background: "#111922", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 10, color: "#e2e8f0", fontSize: 11 }} formatter={(value, name) => [name === "energyKwh" ? `${value} kWh` : `${value}%`, name === "energyKwh" ? "Energy" : "Utilization"]} labelFormatter={(label, payload) => payload[0]?.payload?.period ? `${label} · ${payload[0].payload.period}` : label}/>
        <Legend verticalAlign="top" align="right" height={32} iconType="circle" iconSize={7} formatter={(value) => <span className="ml-1 text-[10px] text-slate-400">{value === "energyKwh" ? "Energy consumption" : "Area utilization"}</span>}/>
        <Bar yAxisId="energy" dataKey="energyKwh" name="energyKwh" fill="#22d3ee" fillOpacity={0.75} radius={[4, 4, 0, 0]} maxBarSize={38}/>
        <Line yAxisId="utilization" type="monotone" dataKey="utilizationPct" name="utilizationPct" stroke="#fbbf24" strokeWidth={2} dot={{ r: 3, fill: "#fbbf24", stroke: "#111922", strokeWidth: 2 }} activeDot={{ r: 5 }}/>
      </ComposedChart>
    </ResponsiveContainer>
  </div>;
}
