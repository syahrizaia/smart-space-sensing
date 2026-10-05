"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, ArrowLeft, ArrowRight, BellRing, Bolt, Check, ChevronRight, ClipboardPlus, Command, Download, FileSpreadsheet, FileText, Gauge, Search, Settings2, Wrench, X } from "lucide-react";
import { useLiveFacility } from "@/hooks/useLiveFacility";
import { getFacilityMockData, getFacilityZoneName, type FacilityEvent } from "@/lib/mockData";
import type { FacilityName } from "@/lib/facilities";

type Props = { open: boolean; onClose: () => void; facility: FacilityName };
type Asset = ReturnType<typeof useLiveFacility>["equipment"][number];

const aliases: Record<string, string[]> = {
  "M-204": ["MTR-201", "CNC-04", "CNC Precision Mill 03", "Mesin CNC"],
  "M-118": ["MTR-118", "PACK-02", "Sensor Packing"],
  "U-031": ["COMP-031", "SENS-PRESS-03", "Air Compressor"],
  "W-012": ["CONV-04", "SENS-TEMP-03", "Line 2 Gudang", "Gudang"],
};
const quickPrompts = ["Mesin mana yang paling boros energi hari ini?", "Downtime Line 1 Shift A kemarin", "Suhu Cold Storage melebihi batas"];
const cx = (...classes: string[]) => classes.filter(Boolean).join(" ");

export function CommandPalette({ open, onClose, facility }: Props) {
  const { equipment, connected } = useLiveFacility(facility);
  const { events } = getFacilityMockData(facility);
  const [query, setQuery] = useState("");
  const [asset, setAsset] = useState<Asset | null>(null);
  const [acknowledged, setAcknowledged] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [workOrderOpen, setWorkOrderOpen] = useState(false);
  const [workOrderDetails, setWorkOrderDetails] = useState("");
  const [shift, setShift] = useState("A");
  const [shiftTarget, setShiftTarget] = useState("2400");
  const inputRef = useRef<HTMLInputElement>(null);
  const lowered = query.trim().toLocaleLowerCase("id");
  const alarmAcknowledged = acknowledged.includes("Alarm #102") || (typeof window !== "undefined" && window.localStorage.getItem(`ack-${facility}-102`) === "true");

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const matchingAssets = useMemo(() => equipment.filter((item) => [item.id, item.name, item.zone, item.zoneId, ...(aliases[item.id] ?? [])].some((value) => value.toLocaleLowerCase("id").includes(lowered))), [equipment, lowered]);
  const matchingEvents = useMemo(() => events.filter((event) => {
    const haystack = `${event.id} ${event.description} ${event.type} ${event.zoneId} ${getFacilityZoneName(event.zoneId)} ${event.id.endsWith("1048") ? "ERR-502 critical" : event.type === "Warning" ? "ERR-301 warning" : "ERR-102 info"}`.toLocaleLowerCase("id");
    return lowered && haystack.includes(lowered);
  }), [events, lowered]);

  const insight = useMemo(() => {
    if (!lowered) return null;
    if (/boros|energi|energy|kwh/.test(lowered)) {
      const top = [...equipment].sort((a, b) => b.power - a.power)[0];
      return { title: "Konsumsi energi tertinggi saat ini", body: `${top?.name ?? "Belum ada data"} · ${top?.power ?? 0} kW · ${top?.zone ?? ""}`, icon: Bolt };
    }
    if (/downtime|mati|offline/.test(lowered)) {
      const found = equipment.filter((item) => item.status !== "Active" && (!/line 1|shift a/.test(lowered) || /line 1|produksi/i.test(item.zone)));
      return { title: "Downtime yang terdeteksi", body: found.length ? found.map((item) => `${item.name} (${item.status})`).join(" · ") : "Tidak ada aset offline pada data live saat ini. Data downtime historis belum terhubung.", icon: Activity };
    }
    if (/suhu|temperatur|temperature|cold storage/.test(lowered)) {
      return { title: "Peringatan suhu Cold Storage", body: "8,7 °C · ambang contoh 8,0 °C · Warning aktif (EV-1045)", icon: Gauge };
    }
    return null;
  }, [equipment, lowered]);

  if (!open) return null;
  const saveNotice = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(""), 4200); };
  const runQuickAction = (action: "ack" | "work-order" | "shift" | "export") => {
    if (action === "ack") { window.localStorage.setItem(`ack-${facility}-102`, "true"); setAcknowledged((current) => current.includes("Alarm #102") ? current : [...current, "Alarm #102"]); saveNotice(alarmAcknowledged ? "Alarm #102 sudah di-acknowledge." : "Alarm #102 berhasil di-acknowledge."); }
    if (action === "work-order") setWorkOrderOpen(true);
    if (action === "shift") {
      const saved = window.localStorage.getItem(`shift-target-${facility}`);
      if (saved) { try { const data = JSON.parse(saved) as { shift: string; target: string }; setShift(data.shift); setShiftTarget(data.target); } catch { /* use defaults */ } }
      setWorkOrderOpen(false); setAsset(null); setQuery("__shift_target__");
    }
    if (action === "export") setQuery("__export__");
  };
  const exportCsv = () => {
    const lines = [["Asset ID", "Machine", "Area", "Status", "Power (kW)", "Temperature (°C)", "Efficiency (%)"], ...equipment.map((item) => [item.id, item.name, item.zone, item.status, item.power, item.temperature, item.efficiency])];
    const csv = lines.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `energy-report-${facility.replaceAll(" ", "-")}-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
    saveNotice("Laporan energi berhasil diunduh sebagai CSV (Excel).");
  };
  const printReport = () => {
    const popup = window.open("", "_blank", "width=900,height=700");
    if (!popup) { saveNotice("Izinkan pop-up browser untuk mencetak laporan PDF."); return; }
    const rows = equipment.map((item) => `<tr><td>${item.id}</td><td>${item.name}</td><td>${item.zone}</td><td>${item.status}</td><td>${item.power} kW</td></tr>`).join("");
    popup.document.write(`<!doctype html><title>Energy report · ${facility}</title><style>body{font:14px Arial;margin:40px;color:#17212b}h1{font-size:24px}p{color:#53616e}table{border-collapse:collapse;width:100%;margin-top:24px}td,th{padding:10px;border:1px solid #ccd4da;text-align:left}th{background:#eef3f6}@media print{button{display:none}}</style><h1>Energy Report · ${facility}</h1><p>Daily snapshot · ${new Date().toLocaleString("id-ID")} · Power readings (kW)</p><table><thead><tr><th>Asset</th><th>Machine</th><th>Area</th><th>Status</th><th>Power</th></tr></thead><tbody>${rows}</tbody></table><button onclick="window.print()">Print / Save as PDF</button>`);
    popup.document.close(); popup.focus(); popup.print();
  };

  const shortcutRow = (Icon: typeof BellRing, title: string, detail: string, onClick: () => void, tone = "cyan") => <button key={title} onClick={onClick} className="group flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.018] px-3 py-3 text-left transition hover:border-cyan-300/20 hover:bg-cyan-300/[0.04]"><span className={cx("flex h-9 w-9 items-center justify-center rounded-lg", tone === "rose" ? "bg-rose-400/10 text-rose-300" : "bg-cyan-300/[0.08] text-cyan-300")}><Icon size={16}/></span><span className="min-w-0 flex-1"><span className="block text-[11px] font-medium text-slate-200">{title}</span><span className="mt-1 block text-[9px] text-slate-500">{detail}</span></span><ChevronRight size={14} className="text-slate-600 group-hover:text-cyan-300"/></button>;

  const exportView = query === "__export__";
  const shiftView = query === "__shift_target__";
  return <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/70 px-3 pt-[8vh] backdrop-blur-sm sm:px-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-label="Command Palette" className="w-full max-w-[660px] overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0c1219] shadow-[0_30px_100px_rgba(0,0,0,.65)]">
      <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3.5"><Search size={17} className="shrink-0 text-cyan-300"/><input ref={inputRef} value={query.startsWith("__") ? "" : query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && matchingAssets[0]) setAsset(matchingAssets[0]); }} placeholder="Cari aset, alarm, area, atau tanyakan sesuatu…" className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-100 outline-none placeholder:text-slate-600"/><kbd className="hidden rounded-md border border-white/[0.08] px-1.5 py-1 text-[9px] text-slate-500 sm:block">ESC</kbd><button onClick={onClose} aria-label="Tutup pencarian" className="rounded-md p-1.5 text-slate-500 hover:bg-white/[0.05] hover:text-white"><X size={16}/></button></div>
      <div className="max-h-[72vh] overflow-y-auto p-4 sm:p-5">
        {notice && <div role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-2.5 text-[10px] text-emerald-200"><Check size={14}/>{notice}</div>}
        {asset ? <div><button onClick={() => setAsset(null)} className="mb-4 flex items-center gap-2 text-[10px] text-slate-500 hover:text-cyan-200"><ArrowLeft size={13}/>Kembali ke hasil</button><AssetDetail asset={asset} connected={connected}/></div>
          : shiftView ? <div><Heading title="Ubah target produksi shift" detail="Perbarui parameter target. Pengaturan disimpan di browser untuk facility ini."/><form className="mt-5 space-y-4" onSubmit={(event) => { event.preventDefault(); window.localStorage.setItem(`shift-target-${facility}`, JSON.stringify({ shift, target: shiftTarget })); saveNotice(`Target Shift ${shift} diperbarui menjadi ${Number(shiftTarget).toLocaleString("id-ID")} unit.`); setQuery(""); }}><label className="block text-[10px] text-slate-400">Shift<select value={shift} onChange={(event) => setShift(event.target.value)} className="mt-1.5 w-full rounded-lg border border-white/[0.08] bg-[#090d12] px-3 py-2.5 text-xs text-slate-200"><option>A</option><option>B</option><option>C</option></select></label><label className="block text-[10px] text-slate-400">Target produksi (unit)<input type="number" min="1" value={shiftTarget} onChange={(event) => setShiftTarget(event.target.value)} className="mt-1.5 w-full rounded-lg border border-white/[0.08] bg-[#090d12] px-3 py-2.5 text-xs text-slate-200"/></label><button className="w-full rounded-lg bg-cyan-300 py-2.5 text-[10px] font-semibold text-slate-950">Simpan target shift</button></form></div>
          : exportView ? <div><Heading title="Export laporan energi" detail={`${facility} · pembacaan daya terkini dari aset yang dipantau.`}/><div className="mt-4 grid gap-2 sm:grid-cols-2">{shortcutRow(FileSpreadsheet, "Unduh Excel / CSV", "File CSV kompatibel dengan Excel", exportCsv)}{shortcutRow(FileText, "Cetak / simpan PDF", "Buka dialog cetak browser", printReport)}</div></div>
          : workOrderOpen ? <div><Heading title="Buat work order" detail="Buat tiket perbaikan baru untuk facility yang dipilih."/><form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); setWorkOrderOpen(false); setWorkOrderDetails(""); saveNotice(`Work order baru dibuat: ${workOrderDetails.trim()}`); }}><label className="block text-[10px] text-slate-400">Aset / area terkait<input required placeholder="Contoh: MTR-201 · Line 1" value={workOrderDetails} onChange={(event) => setWorkOrderDetails(event.target.value)} className="mt-1.5 w-full rounded-lg border border-white/[0.08] bg-[#090d12] px-3 py-2.5 text-xs text-slate-200 placeholder:text-slate-600"/></label><button disabled={!workOrderDetails.trim()} className="w-full rounded-lg bg-cyan-300 py-2.5 text-[10px] font-semibold text-slate-950 disabled:opacity-40">Buat work order</button></form></div>
          : lowered ? <div className="space-y-5">
            {insight && <section><div className="mb-2 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.17em] text-violet-300"><Activity size={12}/>Smart Search · Insight</div><div className="rounded-xl border border-violet-300/15 bg-violet-300/[0.045] p-3.5"><div className="text-[11px] font-medium text-slate-100">{insight.title}</div><div className="mt-1.5 text-[10px] leading-relaxed text-slate-400">{insight.body}</div></div></section>}
            {matchingAssets.length > 0 && <section><SectionLabel>Aset &amp; sensor ({matchingAssets.length})</SectionLabel><div className="space-y-1.5">{matchingAssets.slice(0, 5).map((item) => <button key={item.id} onClick={() => setAsset(item)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/[0.04]"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-300/[0.08] text-cyan-300"><Gauge size={15}/></span><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-medium text-slate-200">{item.name} <span className="font-mono text-cyan-300">{item.id}</span></span><span className="mt-1 block text-[9px] text-slate-500">{item.zone} · {item.status} · {item.power} kW</span></span><ArrowRight size={13} className="text-slate-600"/></button>)}</div></section>}
            {matchingEvents.length > 0 && <section><SectionLabel>Event history ({matchingEvents.length})</SectionLabel><div className="space-y-1">{matchingEvents.slice(0, 5).map((event) => <EventRow key={event.id} event={event}/>)}</div></section>}
            {!insight && !matchingAssets.length && !matchingEvents.length && <div className="rounded-xl border border-white/[0.06] p-5 text-center text-[10px] text-slate-500">Tidak ada aset atau event yang cocok. Coba nama area, kode aset, atau pertanyaan operasional.</div>}
          </div>
          : <div className="space-y-5">
            <section><SectionLabel>Aksi cepat</SectionLabel><div className="grid gap-2 sm:grid-cols-2">{shortcutRow(BellRing, "Acknowledge Alarm #102", alarmAcknowledged ? "Sudah ditangani · klik untuk lihat status" : "Tandai alarm telah ditangani", () => runQuickAction("ack"), "rose")}{shortcutRow(ClipboardPlus, "Create Work Order", "Buat tiket perbaikan baru", () => runQuickAction("work-order"))}{shortcutRow(Download, "Export Energy Report", "Unduh PDF atau Excel / CSV", () => runQuickAction("export"))}{shortcutRow(Settings2, "Switch Shift Target", "Ubah target produksi shift", () => runQuickAction("shift"))}</div></section>
            <section><SectionLabel>Smart Search · Coba tanyakan</SectionLabel><div className="flex flex-wrap gap-2">{quickPrompts.map((prompt) => <button key={prompt} onClick={() => setQuery(prompt)} className="rounded-full border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-left text-[9px] text-slate-400 hover:border-violet-300/20 hover:text-violet-200">{prompt}</button>)}</div></section>
            <div className="flex items-center gap-2 border-t border-white/[0.06] pt-3 text-[9px] text-slate-600"><Command size={12}/>Pencarian aset, alarm, kode error · Enter pilih aset · Ctrl K untuk buka</div>
          </div>}
      </div>
    </section>
  </div>;
}

function Heading({ title, detail }: { title: string; detail: string }) { return <><div className="text-[13px] font-semibold text-slate-100">{title}</div><div className="mt-1 text-[10px] text-slate-500">{detail}</div></>; }
function SectionLabel({ children }: { children: React.ReactNode }) { return <div className="mb-2.5 text-[9px] font-semibold uppercase tracking-[0.17em] text-slate-500">{children}</div>; }
function EventRow({ event }: { event: FacilityEvent }) { const severity = event.type === "Alarm" ? "Critical" : event.type === "Warning" ? "Warning" : "Info"; const code = event.id.endsWith("1048") ? "ERR-502" : event.type === "Warning" ? "ERR-301" : "ERR-102"; return <div className="flex items-start gap-3 rounded-lg border border-white/[0.045] px-3 py-2.5"><span className={cx("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", severity === "Critical" ? "bg-rose-400" : severity === "Warning" ? "bg-amber-300" : "bg-cyan-300")}/><div className="min-w-0 flex-1"><div className="text-[10px] text-slate-200">{event.description}</div><div className="mt-1 text-[9px] text-slate-500">{code} · {severity} · {getFacilityZoneName(event.zoneId)} · {event.id}</div></div></div>; }

function AssetDetail({ asset, connected }: { asset: Asset; connected: boolean }) {
  const history = [asset.power * 0.89, asset.power * 0.94, asset.power * 0.91, asset.power * 1.02, asset.power * 0.97, asset.power, asset.power * 1.04, asset.power];
  const points = history.map((value, index) => `${(index / (history.length - 1)) * 100},${36 - (value / (asset.power * 1.1)) * 28}`).join(" ");
  return <div><div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/[0.09] text-cyan-300"><Gauge size={18}/></span><div className="min-w-0 flex-1"><div className="font-mono text-[10px] text-cyan-300">{(aliases[asset.id] ?? [])[0] ?? asset.id} · {asset.id}</div><div className="mt-1 text-[14px] font-semibold text-slate-100">{asset.name}</div><div className="mt-1 text-[10px] text-slate-500">{asset.zone} · {asset.zoneId}</div></div><span className={cx("rounded-full px-2 py-1 text-[9px]", asset.status === "Active" ? "bg-emerald-300/10 text-emerald-300" : asset.status === "Idle" ? "bg-amber-300/10 text-amber-300" : "bg-rose-300/10 text-rose-300")}>{connected ? "LIVE · " : "SAMPLE · "}{asset.status}</span></div><div className="mt-4 grid grid-cols-3 gap-2">{[["Daya", `${asset.power} kW`], ["Suhu", `${asset.temperature} °C`], ["Efisiensi", `${asset.efficiency}%`]].map(([label, value]) => <div key={label} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5"><div className="text-[8px] uppercase tracking-wide text-slate-600">{label}</div><div className="mt-1 font-mono text-[11px] text-slate-200">{value}</div></div>)}</div><div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.015] p-3"><div className="flex items-center justify-between"><div className="text-[9px] font-medium text-slate-300">Tren pembacaan terkini · daya</div><span className="text-[8px] text-emerald-300">● LIVE</span></div><svg viewBox="0 0 100 40" preserveAspectRatio="none" className="mt-2 h-20 w-full"><defs><linearGradient id="sensorTrend" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#67e8f9" stopOpacity=".27"/><stop offset="1" stopColor="#67e8f9" stopOpacity="0"/></linearGradient></defs><polygon points={`0,40 ${points} 100,40`} fill="url(#sensorTrend)"/><polyline points={points} fill="none" stroke="#67e8f9" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/></svg><div className="flex justify-between text-[8px] text-slate-600"><span>-7 min</span><span>sekarang</span></div></div><div className="mt-3 flex items-start gap-2 rounded-lg border border-white/[0.05] px-3 py-2.5 text-[9px] text-slate-400"><Wrench size={12} className="mt-0.5 text-cyan-300"/><div><span className="text-slate-300">Kalibrasi terakhir:</span> 18 Sep 2026 · jadwal berikutnya 18 Des 2026<br/><span className="text-slate-600">Riwayat contoh lokal</span></div></div></div>;
}
