"use client";

import { Panel, SectionHeading } from "@/components/ui";
import { Bell, Building2, ChevronRight, Database, ShieldCheck, UserRound } from "lucide-react";
import { useSelectedFacility } from "@/components/facility-selection";

const settings = [
  { icon: Building2, title: "Facility profile", desc: "Plant location, timezone, and operating shifts" },
  { icon: Bell, title: "Notifications", desc: "Alarm thresholds and delivery preferences" },
  { icon: UserRound, title: "Team & access", desc: "Manage operators and facility permissions" },
  { icon: Database, title: "Sensor integrations", desc: "Connected devices and data retention" },
];

export default function SettingsPage() {
  const facility = useSelectedFacility();
  return <div className="mx-auto max-w-3xl space-y-7"><div><div className="mb-2 text-[10px] font-medium uppercase tracking-[0.19em] text-slate-500">Workspace <span className="mx-1.5 text-slate-700">/</span> Preferences</div><h1 className="text-[25px] font-semibold tracking-tight text-slate-50">Settings</h1><p className="mt-1.5 text-xs text-slate-500">Manage facility configuration and workspace preferences.</p></div><Panel className="divide-y divide-white/[0.06]">{settings.map(({icon:Icon,title,desc}, index)=><button key={title} className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-white/[0.02]"><div className="rounded-lg border border-white/[0.06] bg-white/[0.025] p-2.5 text-slate-400"><Icon size={16}/></div><div className="flex-1"><div className="text-xs font-medium text-slate-200">{title}</div><div className="mt-1 text-[10px] text-slate-500">{desc}</div></div>{index===0&&<span className="hidden rounded-md border border-emerald-400/10 bg-emerald-400/[0.05] px-2 py-1 text-[9px] text-emerald-300 sm:block">{facility}</span>}<ChevronRight size={15} className="text-slate-600"/></button>)}</Panel><div className="flex items-start gap-3 rounded-xl border border-cyan-300/10 bg-cyan-300/[0.035] p-4"><ShieldCheck size={15} className="mt-0.5 text-cyan-300"/><div><div className="text-[10px] font-medium text-slate-300">Facility access protected</div><div className="mt-1 text-[9px] leading-relaxed text-slate-500">Your workspace is secured with role based access. Changes to sensor configuration are logged for audit.</div></div></div><SectionHeading title="Platform version" detail="Smart Space Sensing · Operations workspace v1.0.4"/></div>;
}
