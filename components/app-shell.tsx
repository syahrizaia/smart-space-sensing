"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Activity, Bell, CheckCircle2, ChevronDown, Command, LayoutDashboard, Settings, ChartNoAxesCombined, ClipboardList, Factory, Menu, Search, Wifi } from "lucide-react";
import { facilities, setSelectedFacility, useSelectedFacility } from "@/components/facility-selection";
import { CommandPalette } from "@/components/command-palette";

const nav = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Operations", href: "/operations", icon: Factory },
  { label: "Analytics", href: "/analytics", icon: ChartNoAxesCombined },
  { label: "Events", href: "/events", icon: ClipboardList, count: "3" },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [now, setNow] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [facilityNotice, setFacilityNotice] = useState<string | null>(null);
  const selectedFacility = useSelectedFacility();
  const previousFacility = useRef<string | null>(null);
  const facilityCritical = selectedFacility === "Jakarta Plant 02";
  useEffect(() => {
    const update = () => setNow(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date()));
    update(); const timer = setInterval(update, 1000); return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    // Lewati nilai awal, lalu beri tahu pengguna saat facility benar-benar berubah.
    if (previousFacility.current === null) {
      previousFacility.current = selectedFacility;
      return;
    }
    if (previousFacility.current === selectedFacility) return;

    previousFacility.current = selectedFacility;
    // Setiap pergantian plant dimulai dari bagian paling atas halaman.
    window.scrollTo({ top: 0, behavior: "smooth" });
    setFacilityNotice(selectedFacility);
    const timer = window.setTimeout(() => setFacilityNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [selectedFacility]);
  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);
  return <div className="min-h-screen bg-[#090d12] text-slate-100">
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col border-r border-white/[0.07] bg-[#0d1218] px-4 transition-transform lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex h-[76px] items-center gap-3 border-b border-white/[0.07] px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/[0.09] text-cyan-300"><Activity size={19}/></div>
        <div><div className="text-[13px] font-semibold tracking-wide">SMART SPACE</div><div className="mt-0.5 text-[9px] font-semibold tracking-[0.2em] text-slate-500">SENSING PLATFORM</div></div>
      </div>
      <div className="mt-5 rounded-xl border border-cyan-300/15 bg-gradient-to-br from-cyan-300/[0.07] to-white/[0.015] p-3 transition-colors">
        <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400"><Factory size={13} className="text-cyan-300"/> Facility</div><span className="rounded-full border border-emerald-300/15 bg-emerald-300/[0.07] px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-emerald-300">Aktif</span></div>
        <div className="relative mt-2.5">
          <select aria-label="Pilih facility" value={selectedFacility} onChange={(event) => setSelectedFacility(event.target.value as (typeof facilities)[number])} className="w-full appearance-none rounded-md bg-[#111a22]/70 py-2 pl-2 pr-7 text-left text-sm font-semibold text-cyan-100 outline-none ring-1 ring-white/[0.07] transition hover:ring-cyan-300/30 focus-visible:ring-cyan-300/50">
            {facilities.map((facility) => <option key={facility} value={facility} className="bg-[#0e141b] text-slate-200">{facility}</option>)}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-slate-500" />
        </div>
      </div>
      <div className="mb-2 mt-8 px-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-600">Workspace</div>
      <nav className="space-y-1">{nav.map(({ label, href, icon: Icon, count }) => {
        const active = path === href;
        return <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`group flex h-10 items-center gap-3 rounded-lg px-3 text-xs transition ${active ? "border border-cyan-300/10 bg-cyan-300/[0.08] font-medium text-cyan-200" : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"}`}>
          <Icon size={16} strokeWidth={1.8} className={active ? "text-cyan-300" : "text-slate-500 group-hover:text-slate-300"}/>{label}{count && <span className="ml-auto rounded-md border border-rose-400/15 bg-rose-400/[0.08] px-1.5 py-0.5 text-[9px] text-rose-300">{count}</span>}
        </Link>;
      })}</nav>
      <div className="mt-auto pb-4">
        <div className={`mb-3 flex items-center gap-2 rounded-lg border px-3 py-2.5 ${facilityCritical ? "border-rose-400/15 bg-rose-400/[0.05]" : "border-emerald-400/10 bg-emerald-400/[0.04]"}`}><Wifi size={13} className={facilityCritical ? "text-rose-400" : "text-emerald-400"}/><span className="text-[10px] text-slate-400">{facilityCritical ? "Critical safety event" : "All systems operational"}</span><span className={`ml-auto h-1.5 w-1.5 rounded-full ${facilityCritical ? "animate-pulse bg-rose-400" : "bg-emerald-400"}`}/></div>
        <button className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/[0.04]"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-200 to-cyan-700 text-[10px] font-bold text-slate-950">AR</div><div className="min-w-0 flex-1"><div className="text-xs font-medium">Aditya Rahman</div><div className="mt-0.5 text-[10px] text-slate-500">Facility Manager</div></div><ChevronDown size={14} className="text-slate-500"/></button>
      </div>
    </aside>
    {mobileOpen && <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-black/60 lg:hidden"/>}
    <div className="lg:pl-[252px]">
      <header className="sticky top-0 z-20 flex h-[66px] items-center justify-between border-b border-white/[0.07] bg-[#090d12]/90 px-5 backdrop-blur-xl sm:px-8">
        <div className="flex min-w-0 items-center gap-3"><button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 lg:hidden"><Menu size={18}/></button><div className="hidden items-center gap-2 text-[11px] text-slate-500 sm:flex"><span>Operations</span><span className="text-slate-700">/</span><span className="text-slate-300">{nav.find((item) => item.href === path)?.label ?? "Workspace"}</span></div><div className="sm:hidden text-xs font-medium">SMART SPACE</div><div className="flex min-w-0 items-center gap-2 rounded-lg border border-cyan-300/15 bg-cyan-300/[0.05] px-2.5 py-1.5"><Factory size={13} className="shrink-0 text-cyan-300"/><span className="hidden text-[8px] font-semibold uppercase tracking-wider text-slate-500 md:inline">Facility</span><span className="truncate text-[10px] font-semibold text-cyan-100 sm:text-[11px]">{selectedFacility}</span></div></div>
        <div className="flex items-center gap-3 sm:gap-5"><button aria-label="Search (Ctrl+K)" title="Search · Ctrl+K" onClick={() => setSearchOpen(true)} className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] p-2 text-slate-400 transition hover:border-cyan-300/20 hover:text-cyan-200"><Search size={15}/><span className="hidden text-[10px] sm:inline">Search</span><kbd className="hidden rounded border border-white/[0.08] px-1 py-0.5 text-[8px] text-slate-600 sm:inline">Ctrl K</kbd></button><div className="hidden items-center gap-2 text-[10px] text-slate-500 md:flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/>LIVE DATA</div><div className="font-mono text-xs tabular-nums text-slate-300">{now || "--:--:--"}<span className="ml-1 text-[9px] text-slate-600">WIB</span></div><button aria-label="Notifications" className="relative rounded-lg p-2 text-slate-400 hover:bg-white/[0.05]"><Bell size={17}/><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-400 ring-2 ring-[#090d12]"/></button><div className="hidden h-6 w-px bg-white/[0.08] sm:block"/><div className="hidden items-center gap-2 sm:flex"><div className="flex h-7 w-7 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10 text-[9px] font-semibold text-cyan-200">AR</div><span className="text-[11px] text-slate-300">Aditya</span></div></div>
      </header>
      <main className="mx-auto min-h-[calc(100vh-66px)] max-w-[1600px] px-5 py-7 sm:px-8 lg:px-10">{children}</main>
      <div className="pointer-events-none fixed bottom-4 right-5 hidden items-center gap-1.5 text-[9px] tracking-wide text-slate-700 xl:flex"><Command size={11}/> SMART SPACE SENSING <span className="text-slate-800">·</span> V1.0.4</div>
    </div>
    {facilityNotice && <div role="status" aria-live="polite" className="fixed right-5 top-[76px] z-50 flex max-w-[calc(100vw-2.5rem)] items-center gap-3 rounded-xl border border-emerald-300/20 bg-[#0e1718] px-4 py-3 shadow-xl shadow-black/30 transition-all"><CheckCircle2 size={18} className="shrink-0 text-emerald-300"/><div><div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-emerald-300">Facility berpindah</div><div className="mt-0.5 text-xs font-semibold text-slate-100">{facilityNotice}</div></div></div>}
    {searchOpen && <CommandPalette open onClose={() => setSearchOpen(false)} facility={selectedFacility}/>}
  </div>;
}
