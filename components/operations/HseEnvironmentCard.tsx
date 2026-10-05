import { Activity, Droplets, Flame, OctagonAlert, Wind } from "lucide-react";
import { Panel } from "@/components/ui";
import { useSelectedFacility } from "@/components/facility-selection";

const facilityReadings = {
  "Jakarta Plant 01": { gas: "0 ppm · Normal", eStopTriggered: false, ph: "7.2", tss: "24", aqi: "45", aqiStatus: "Baik", aqiFill: 45 },
  "Jakarta Plant 02": { gas: "2 ppm · Normal", eStopTriggered: true, ph: "6.8", tss: "31", aqi: "53", aqiStatus: "Sedang", aqiFill: 53 },
  "Jakarta Plant 03": { gas: "0 ppm · Normal", eStopTriggered: false, ph: "7.6", tss: "18", aqi: "36", aqiStatus: "Baik", aqiFill: 36 },
} as const;

const getSafetyReadings = (gas: string, eStopTriggered: boolean) => [
  { name: "Smoke & Fire Detectors", value: "Clear", icon: Flame, critical: false },
  { name: "Gas Leak Sensor", value: gas, icon: Wind, critical: false },
  { name: "E-Stop Status", value: eStopTriggered ? "Line 2 Triggered" : "All Lines Active", icon: OctagonAlert, critical: eStopTriggered },
];

const getEnvironmentReadings = (reading: (typeof facilityReadings)[keyof typeof facilityReadings]) => [
  { name: "WWTP pH Level", value: reading.ph, unit: "pH", range: "Normal range 6–9", fill: (Number(reading.ph) / 14) * 100, scale: "0–14 pH", icon: Droplets, tone: "text-emerald-300", bar: "bg-emerald-300" },
  { name: "TSS (Total Suspended Solids)", value: reading.tss, unit: "mg/L", range: "Aman · nilai contoh", fill: (Number(reading.tss) / 50) * 100, scale: "visual scale 0–50 mg/L", icon: Activity, tone: "text-emerald-300", bar: "bg-emerald-300" },
  { name: "Air Quality / Emissions", value: reading.aqi, unit: "AQI", range: reading.aqiStatus, fill: reading.aqiFill, scale: "AQI 0–100", icon: Wind, tone: reading.aqiStatus === "Baik" ? "text-emerald-300" : "text-amber-300", bar: reading.aqiStatus === "Baik" ? "bg-emerald-300" : "bg-amber-300" },
];

export function HseEnvironmentCard() {
  const facility = useSelectedFacility();
  const readings = facilityReadings[facility];
  const safetyReadings = getSafetyReadings(readings.gas, readings.eStopTriggered);
  const environmentReadings = getEnvironmentReadings(readings);
  const hasCriticalSafetyReading = safetyReadings.some((reading) => reading.critical);
  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
        <div>
          <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-emerald-400/80">Safety &amp; sustainability</div>
          <h2 className="text-[15px] font-semibold tracking-tight text-slate-100">HSE &amp; Environment Status (ISO 45001 / 14001)</h2>
          <p className="mt-1 text-[11px] text-slate-500">Real-time safety and waste monitoring</p>
        </div>
        <div className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[9px] font-semibold tracking-[0.08em] ${hasCriticalSafetyReading ? "animate-pulse border-rose-300/25 bg-rose-300/[0.08] text-rose-300 motion-reduce:animate-none" : "border-emerald-300/15 bg-emerald-300/[0.06] text-emerald-300"}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          Status: {hasCriticalSafetyReading ? "CRITICAL" : "NORMAL"}
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-2">
        <section aria-labelledby="hse-safety-heading" className="rounded-lg border border-white/[0.055] bg-white/[0.015] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-[0.17em] text-cyan-300/80">K3 / Safety</div>
              <h3 id="hse-safety-heading" className="mt-1 text-xs font-semibold text-slate-200">Safety alerts</h3>
            </div>
            <span className="text-[9px] text-slate-600">3 sensors · {facility}</span>
          </div>
          <div className="space-y-2">
            {safetyReadings.map((reading) => {
              const Icon = reading.icon;
              return (
                <div key={reading.name} className="flex items-center gap-3 rounded-md border border-white/[0.045] bg-[#0b1117] px-3 py-2.5">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${reading.critical ? "bg-rose-300/[0.08] text-rose-300" : "bg-emerald-300/[0.07] text-emerald-300"}`}>
                    <Icon size={14} />
                  </div>
                  <span className="min-w-0 flex-1 text-[10px] text-slate-400">{reading.name}</span>
                  <span className={`shrink-0 text-right text-[10px] font-medium ${reading.critical ? "text-rose-300" : "text-emerald-300"}`}>
                    {reading.value}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="hse-environment-heading" className="rounded-lg border border-white/[0.055] bg-white/[0.015] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-[9px] font-semibold uppercase tracking-[0.17em] text-cyan-300/80">Lingkungan / Environment</div>
              <h3 id="hse-environment-heading" className="mt-1 text-xs font-semibold text-slate-200">IPAL / WWTP monitoring</h3>
            </div>
            <span className="text-[9px] text-slate-600">Example readings</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            {environmentReadings.map((reading) => {
              const Icon = reading.icon;
              return (
                <div key={reading.name} className="rounded-md border border-white/[0.05] bg-[#0b1117] p-3">
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                    <Icon size={11} className="text-cyan-300/80" />
                    <span className="truncate">{reading.name}</span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className={`font-mono text-[21px] font-semibold tracking-tight ${reading.tone}`}>{reading.value}</span>
                    <span className="text-[9px] text-slate-500">{reading.unit}</span>
                    <span className={`ml-auto text-[9px] font-medium ${reading.tone}`}>{reading.range}</span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]" role="progressbar" aria-label={`${reading.name}: ${reading.value} ${reading.unit}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={reading.fill}>
                    <div className={`h-full rounded-full ${reading.bar}`} style={{ width: `${reading.fill}%` }} />
                  </div>
                  <div className="mt-1 text-right text-[8px] text-slate-600">{reading.scale}</div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
      <div className="border-t border-white/[0.05] px-5 py-2.5 text-[9px] text-slate-600">
        Data contoh antarmuka · Ambang operasional perlu disesuaikan dengan konfigurasi fasilitas.
      </div>
    </Panel>
  );
}
