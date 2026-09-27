import type { LucideIcon } from "lucide-react";

export function SectionHeading({ eyebrow, title, detail, action }: { eyebrow?: string; title: string; detail?: string; action?: React.ReactNode }) {
  return <div className="flex flex-wrap items-end justify-between gap-3"><div>{eyebrow && <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-400/80">{eyebrow}</div>}<h2 className="text-[15px] font-semibold tracking-tight text-slate-100">{title}</h2>{detail && <p className="mt-1 text-[11px] text-slate-500">{detail}</p>}</div>{action}</div>;
}

export function MetricCard({ label, value, unit, delta, icon: Icon, tone = "cyan", hint }: { label: string; value: string; unit?: string; delta?: string; icon: LucideIcon; tone?: "cyan" | "green" | "amber" | "rose"; hint: string }) {
  const toneMap = { cyan: "text-cyan-300 bg-cyan-300/[0.08] border-cyan-300/10", green: "text-emerald-300 bg-emerald-300/[0.08] border-emerald-300/10", amber: "text-amber-300 bg-amber-300/[0.08] border-amber-300/10", rose: "text-rose-300 bg-rose-300/[0.08] border-rose-300/10" };
  return <div className="group rounded-xl border border-white/[0.07] bg-[#0e141b] p-4 transition hover:border-white/[0.12] sm:p-5"><div className="flex items-start justify-between"><div className="text-[10px] font-medium uppercase tracking-[0.13em] text-slate-500">{label}</div><div className={`rounded-lg border p-2 ${toneMap[tone]}`}><Icon size={15}/></div></div><div className="mt-4 flex items-baseline gap-1.5"><span className="text-[25px] font-semibold tracking-tight text-slate-100">{value}</span>{unit && <span className="text-[11px] text-slate-500">{unit}</span>}</div><div className="mt-2 flex items-center gap-1.5 text-[10px]"><span className="text-emerald-400">{delta}</span><span className="text-slate-600">{hint}</span></div></div>;
}

export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <section className={`rounded-xl border border-white/[0.07] bg-[#0e141b] ${className}`}>{children}</section>; }

export function StatusPill({ value }: { value: string }) {
  const style = value === "Active" || value === "Resolved" || value === "Info" ? "border-emerald-400/15 bg-emerald-400/[0.08] text-emerald-300" : value === "Idle" || value === "Warning" ? "border-amber-400/15 bg-amber-400/[0.08] text-amber-300" : value === "Offline" || value === "Alarm" || value === "Open" ? "border-rose-400/15 bg-rose-400/[0.08] text-rose-300" : "border-white/10 bg-white/[0.04] text-slate-400";
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-medium ${style}`}><span className="h-1 w-1 rounded-full bg-current"/>{value}</span>;
}
