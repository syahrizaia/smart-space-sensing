import { ArrowUpRight, Gauge, Info } from "lucide-react";
import { Panel } from "@/components/ui";
import { useSelectedFacility } from "@/components/facility-selection";

const facilityMetrics = {
  "Jakarta Plant 01": { oee: 84.6, trend: "+1.2%", availability: 92, performance: 95, quality: 96.5 },
  "Jakarta Plant 02": { oee: 78.3, trend: "+0.4%", availability: 88, performance: 91, quality: 97.8 },
  "Jakarta Plant 03": { oee: 89.1, trend: "+2.1%", availability: 94.8, performance: 95.7, quality: 98.4 },
} as const;

const metricDescriptions = [
  {
    name: "Availability",
    translatedName: "Ketersediaan",
    key: "availability",
    description: "Persentase waktu produksi saat peralatan tersedia dan beroperasi.",
    color: "bg-cyan-300",
    textColor: "text-cyan-300",
  },
  {
    name: "Performance",
    translatedName: "Kinerja",
    key: "performance",
    description: "Kecepatan produksi aktual dibandingkan dengan kecepatan ideal.",
    color: "bg-violet-300",
    textColor: "text-violet-300",
  },
  {
    name: "Quality",
    translatedName: "Kualitas",
    key: "quality",
    description: "Persentase produk baik dibandingkan seluruh produk yang dibuat.",
    color: "bg-emerald-300",
    textColor: "text-emerald-300",
  },
] as const;

export function OeeCard() {
  const facility = useSelectedFacility();
  const metrics = facilityMetrics[facility];
  const breakdown = metricDescriptions.map((metric) => ({
    ...metric,
    value: metrics[metric.key],
  }));
  const scoreTone = metrics.oee > 85
    ? { text: "text-emerald-300", border: "border-emerald-300/20", glow: "bg-emerald-300/[0.06]" }
    : metrics.oee >= 75
      ? { text: "text-amber-300", border: "border-amber-300/20", glow: "bg-amber-300/[0.06]" }
      : { text: "text-rose-300", border: "border-rose-300/20", glow: "bg-rose-300/[0.06]" };
  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
        <div>
          <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-cyan-400/80">Production efficiency</div>
          <h2 className="text-[15px] font-semibold tracking-tight text-slate-100">Overall Equipment Effectiveness (OEE)</h2>
          <p className="mt-1 text-[11px] text-slate-500">Real-time production efficiency</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[9px] text-slate-500">
          <Gauge size={12} className="text-cyan-300" /> Current shift
        </div>
      </div>

      <div className="grid gap-5 p-5 md:grid-cols-[minmax(180px,0.75fr)_minmax(0,1.8fr)] md:items-center">
        <div className={`flex min-h-36 flex-col justify-center rounded-lg border ${scoreTone.border} ${scoreTone.glow} px-5 py-4`}>
          <div className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500">OEE score</div>
          <div className={`mt-1 font-mono text-[42px] font-semibold leading-none tracking-[-0.06em] ${scoreTone.text}`}>
            {metrics.oee}<span className="ml-1 text-[22px]">%</span>
          </div>
          <div className="mt-3 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-300">
            <ArrowUpRight size={13} /> {metrics.trend} vs last shift
          </div>
        </div>

        <div className="space-y-4">
          {breakdown.map((metric) => (
            <div key={metric.name}>
              <div className="mb-2 flex items-center gap-2">
                <span className="min-w-0 flex-1 text-[11px] font-medium text-slate-300">
                  {metric.name}<span className="ml-1.5 text-[9px] font-normal text-slate-600">{metric.translatedName}</span>
                </span>
                <button
                  type="button"
                  title={metric.description}
                  aria-label={`${metric.name}: ${metric.description}`}
                  className="rounded-full text-slate-600 outline-none transition hover:text-slate-300 focus-visible:ring-2 focus-visible:ring-cyan-300/70"
                >
                  <Info size={12} />
                </button>
                <span className={`w-12 text-right font-mono text-[11px] font-medium ${metric.textColor}`}>{metric.value}%</span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]"
                role="progressbar"
                aria-label={`${metric.name} (${metric.translatedName})`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={metric.value}
              >
                <div className={`h-full rounded-full ${metric.color}`} style={{ width: `${metric.value}%` }} />
              </div>
            </div>
          ))}
          <p className="pt-0.5 text-[9px] text-slate-600">Indicative shift values · OEE = Availability × Performance × Quality</p>
        </div>
      </div>
    </Panel>
  );
}
