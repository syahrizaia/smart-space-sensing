"use client";

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { energyByZone } from "@/lib/mockData";

export function EnergyChart() {
  return <div className="h-[330px] w-full pt-4"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={energyByZone} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
    <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false}/><XAxis dataKey="zone" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} dy={9}/><YAxis yAxisId="energy" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} tickFormatter={(v: number) => `${v}`} /><YAxis yAxisId="occupancy" orientation="right" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 10 }} unit="h" domain={[0, 10]}/>
    <Tooltip cursor={{ fill: "rgba(148,163,184,0.05)" }} contentStyle={{ background: "#111922", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 10, color: "#e2e8f0", fontSize: 11 }} labelStyle={{ color: "#94a3b8", marginBottom: 5 }} formatter={(value, name) => [name === "energy" ? `${value} kWh` : `${value} hrs`, name === "energy" ? "Energy" : "Occupied time"]}/>
    <Legend verticalAlign="top" align="right" height={32} iconType="circle" iconSize={7} formatter={(value) => <span className="ml-1 text-[10px] text-slate-400">{value === "energy" ? "Energy consumption" : "Occupancy time"}</span>}/>
    <Bar yAxisId="energy" dataKey="energy" name="energy" fill="#22d3ee" radius={[4, 4, 0, 0]} maxBarSize={26} fillOpacity={0.75}/><Line yAxisId="occupancy" type="monotone" dataKey="occupancy" name="occupancy" stroke="#fbbf24" strokeWidth={2} dot={{ r: 3, fill: "#fbbf24", stroke: "#111922", strokeWidth: 2 }} activeDot={{ r: 5 }}/>
  </ComposedChart></ResponsiveContainer></div>;
}
