"use client";

import { useEffect, useRef, useState } from "react";
import type { FacilityName } from "@/lib/facilities";

export type ZoneStatus = "Active" | "Idle" | "Offline";
export type ScheduleRange = "Day" | "Week" | "Month";
export type ProductionBatch = { time: string; product: string; target: number; status: "Complete" | "In progress" | "Upcoming" };
export type ScheduleData = Record<ScheduleRange, ProductionBatch[]>;
export type FacilityZone = { id: string; name: string; status: ZoneStatus; output: number; cctvFeedUrls: string[]; ruviewUrl: string };
export type Equipment = {
  id: string; name: string; zone: string; zoneId: string; status: ZoneStatus;
  temperature: number; speed: number; vibration: number; pressure: number; power: number; efficiency: number; runtimeHours: number;
  machineViewUrl: string; schedule: ScheduleData;
};

const batch = (time: string, product: string, target: number, status: ProductionBatch["status"]): ProductionBatch => ({ time, product, target, status });
const facilitySchedule: ScheduleData = {
  Day: [batch("08:00–10:30", "Housing assembly · Series A", 2400, "Complete"), batch("10:30–13:00", "Control module · Series C", 1800, "In progress"), batch("13:00–15:30", "Pump casing · Series B", 2100, "Upcoming"), batch("15:30–18:00", "Housing assembly · Series A", 2400, "Upcoming")],
  Week: [batch("Mon · 06:00", "Housing assembly · Series A", 9600, "Complete"), batch("Tue · 06:00", "Control module · Series C", 8400, "Complete"), batch("Wed · 06:00", "Pump casing · Series B", 9000, "In progress"), batch("Thu · 06:00", "Mixed production run", 10200, "Upcoming"), batch("Fri · 06:00", "Housing assembly · Series A", 9600, "Upcoming")],
  Month: [batch("Week 1", "Housing assembly · Series A", 42000, "Complete"), batch("Week 2", "Control module · Series C", 38800, "Complete"), batch("Week 3", "Pump casing · Series B", 40500, "In progress"), batch("Week 4", "Mixed production run", 43200, "Upcoming")],
};
const machineSchedule = (product: string, dailyTarget: number): ScheduleData => ({
  Day: [batch("06:00–10:00", product, Math.round(dailyTarget * 0.42), "Complete"), batch("10:00–14:00", product, Math.round(dailyTarget * 0.34), "In progress"), batch("14:00–18:00", product, Math.round(dailyTarget * 0.24), "Upcoming")],
  Week: [batch("Mon–Tue", `${product} · setup & run`, dailyTarget * 2, "Complete"), batch("Wed–Thu", `${product} · production run`, dailyTarget * 2, "In progress"), batch("Fri", `${product} · quality lot`, dailyTarget, "Upcoming")],
  Month: [batch("Week 1", `${product} · scheduled lots`, dailyTarget * 5, "Complete"), batch("Week 2", `${product} · scheduled lots`, dailyTarget * 5, "Complete"), batch("Week 3", `${product} · scheduled lots`, dailyTarget * 5, "In progress"), batch("Week 4", `${product} · scheduled lots`, dailyTarget * 5, "Upcoming")],
});

export const facilitySchedules = facilitySchedule;

const alternateFacilityProfiles: Record<Exclude<FacilityName, "Jakarta Plant 01">, { prefix: string; zones: string[]; machines: string[]; products: string[]; outputOffset: number; efficiencyOffset: number }> = {
  "Jakarta Plant 02": { prefix: "P2", zones: ["Fabrication", "Assembly", "Utilities", "Warehouse"], machines: ["Laser Cutter 02", "Robotic Assembler", "Boiler Unit", "Pallet Conveyor"], products: ["Steel frame · Series D", "Motor housing · Series E", "Steam supply", "Finished frame transfer"], outputOffset: -9, efficiencyOffset: -4.5 },
  "Jakarta Plant 03": { prefix: "P3", zones: ["Line 3A", "Packaging", "Quality Control", "Dispatch"], machines: ["CNC Precision Mill 03", "Case Packer 03", "Inspection Station", "Dispatch Conveyor"], products: ["Precision valve · Series F", "Export carton · Series G", "Valve inspection lot", "Export order transfer"], outputOffset: 7, efficiencyOffset: 2.8 },
};

function facilityZones(facility: FacilityName): FacilityZone[] {
  if (facility === "Jakarta Plant 01") return initialZones;
  const profile = alternateFacilityProfiles[facility];
  return initialZones.map((zone, index) => ({
    ...zone,
    id: `${profile.prefix}-${zone.id}`,
    name: profile.zones[index],
    status: facility === "Jakarta Plant 02" && index === 1 ? "Idle" : facility === "Jakarta Plant 03" && index === 3 ? "Idle" : zone.status,
    output: zone.output ? Math.max(0, Math.min(99, zone.output + profile.outputOffset + index * 2)) : 0,
    cctvFeedUrls: zone.cctvFeedUrls.map((url) => url.replace(zone.id, `${profile.prefix}-${zone.id}`)),
    ruviewUrl: zone.ruviewUrl.replace(zone.id, `${profile.prefix}-${zone.id}`),
  }));
}

function facilityEquipment(facility: FacilityName, zones: FacilityZone[]): Equipment[] {
  if (facility === "Jakarta Plant 01") return initialEquipment;
  const profile = alternateFacilityProfiles[facility];
  return initialEquipment.map((machine, index) => {
    const zone = zones[index];
    const active = zone.status === "Active";
    const id = `${profile.prefix}-${machine.id}`;
    return {
      ...machine,
      id,
      name: profile.machines[index],
      zone: zone.name,
      zoneId: zone.id,
      status: zone.status,
      temperature: Math.round((machine.temperature + (facility === "Jakarta Plant 02" ? 5 : -3) + index) * 10) / 10,
      speed: active ? Math.round(machine.speed * (facility === "Jakarta Plant 02" ? 0.91 : 1.08)) : 0,
      efficiency: Math.max(0, Math.min(100, Math.round((machine.efficiency + profile.efficiencyOffset + index) * 10) / 10)),
      machineViewUrl: `/mock-3d/machines/${id}`,
      schedule: machineSchedule(profile.products[index], Math.round(machine.schedule.Day[0]?.target / 0.42 || 1000)),
    };
  });
}

export function getFacilitySchedules(facility: FacilityName): ScheduleData {
  if (facility === "Jakarta Plant 01") return facilitySchedule;
  const profile = alternateFacilityProfiles[facility];
  const output = Math.round(2400 + profile.outputOffset * 40);
  return {
    Day: [batch("08:00–10:30", profile.products[0], output, "Complete"), batch("10:30–13:00", profile.products[1], Math.round(output * 0.78), "In progress"), batch("13:00–15:30", profile.products[2], Math.round(output * 0.86), "Upcoming"), batch("15:30–18:00", profile.products[3], Math.round(output * 0.9), "Upcoming")],
    Week: [batch("Mon · 06:00", profile.products[0], output * 4, "Complete"), batch("Tue · 06:00", profile.products[1], output * 3, "Complete"), batch("Wed · 06:00", profile.products[2], output * 4, "In progress"), batch("Thu · 06:00", profile.products[3], output * 4, "Upcoming")],
    Month: [batch("Week 1", profile.products[0], output * 18, "Complete"), batch("Week 2", profile.products[1], output * 17, "Complete"), batch("Week 3", profile.products[2], output * 19, "In progress"), batch("Week 4", profile.products[3], output * 20, "Upcoming")],
  };
}
const initialZones: FacilityZone[] = [
  { id: "Z-01", name: "Produksi", status: "Active", output: 84, cctvFeedUrls: ["/mock-cctv/Z-01/cam-01", "/mock-cctv/Z-01/cam-02", "/mock-cctv/Z-01/cam-03", "/mock-cctv/Z-01/cam-04"], ruviewUrl: "/mock-ruview/scans/Z-01" },
  { id: "Z-02", name: "Packing", status: "Active", output: 72, cctvFeedUrls: ["/mock-cctv/Z-02/cam-01", "/mock-cctv/Z-02/cam-02", "/mock-cctv/Z-02/cam-03", "/mock-cctv/Z-02/cam-04"], ruviewUrl: "/mock-ruview/scans/Z-02" },
  { id: "Z-03", name: "Utilitas", status: "Idle", output: 0, cctvFeedUrls: ["/mock-cctv/Z-03/cam-01", "/mock-cctv/Z-03/cam-02", "/mock-cctv/Z-03/cam-03", "/mock-cctv/Z-03/cam-04"], ruviewUrl: "/mock-ruview/scans/Z-03" },
  { id: "Z-04", name: "Gudang", status: "Active", output: 91, cctvFeedUrls: ["/mock-cctv/Z-04/cam-01", "/mock-cctv/Z-04/cam-02", "/mock-cctv/Z-04/cam-03", "/mock-cctv/Z-04/cam-04"], ruviewUrl: "/mock-ruview/scans/Z-04" },
];
const initialEquipment: Equipment[] = [
  { id: "M-204", name: "CNC Machining Center", zone: "Produksi", zoneId: "Z-01", temperature: 68, speed: 1420, vibration: 2.1, pressure: 6.4, power: 18.2, efficiency: 91.4, runtimeHours: 1268, status: "Active", machineViewUrl: "/mock-3d/machines/M-204", schedule: machineSchedule("Housing assembly · Series A", 2400) },
  { id: "M-118", name: "Automated Packer 02", zone: "Packing", zoneId: "Z-02", temperature: 54, speed: 860, vibration: 1.4, pressure: 5.8, power: 11.6, efficiency: 87.2, runtimeHours: 842, status: "Active", machineViewUrl: "/mock-3d/machines/M-118", schedule: machineSchedule("Control module · Series C", 1800) },
  { id: "U-031", name: "Air Compressor", zone: "Utilitas", zoneId: "Z-03", temperature: 42, speed: 0, vibration: 0.4, pressure: 7.1, power: 3.2, efficiency: 78.6, runtimeHours: 2084, status: "Idle", machineViewUrl: "/mock-3d/machines/U-031", schedule: machineSchedule("Compressed air demand", 980) },
  { id: "W-012", name: "Conveyor Line 04", zone: "Gudang", zoneId: "Z-04", temperature: 39, speed: 920, vibration: 1.1, pressure: 4.2, power: 8.4, efficiency: 94.1, runtimeHours: 613, status: "Active", machineViewUrl: "/mock-3d/machines/W-012", schedule: machineSchedule("Finished goods transfer", 2100) },
];

export function useLiveFacility(facility: FacilityName = "Jakarta Plant 01") {
  const [zones, setZones] = useState(() => facilityZones(facility));
  const [equipment, setEquipment] = useState(() => facilityEquipment(facility, facilityZones(facility)));
  const zonesRef = useRef(zones);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const seedZones = facilityZones(facility);
    zonesRef.current = seedZones;
    const socket = { readyState: 0 as number, close() { this.readyState = 3; } };
    let interval: number | undefined;
    const openTimer = window.setTimeout(() => {
      socket.readyState = 1;
      setConnected(true);
      interval = window.setInterval(() => {
        if (socket.readyState !== 1) return;
        const nextZones = zonesRef.current.map((zone, index) => {
          const pulse = Math.random();
          const status: ZoneStatus = pulse > 0.988 ? "Offline" : pulse > 0.94 || index === 2 ? "Idle" : "Active";
          return { ...zone, status, output: status === "Active" ? Math.max(60, Math.min(99, zone.output + Math.round(Math.random() * 6 - 3))) : 0 };
        });
        zonesRef.current = nextZones;
        setZones(nextZones);
        setEquipment((current) => current.map((machine) => {
          const status = nextZones.find((zone) => zone.id === machine.zoneId)?.status ?? machine.status;
          const vary = (value: number, amount: number, min: number, max: number) => Math.max(min, Math.min(max, value + (Math.random() * amount * 2 - amount)));
          return { ...machine, status, temperature: Math.round(vary(machine.temperature, 1.4, 30, 98) * 10) / 10, speed: status === "Active" ? Math.round(vary(machine.speed, 24, 0, 2400)) : 0, vibration: Math.round(vary(machine.vibration, 0.12, 0.1, 9.9) * 100) / 100, pressure: Math.round(vary(machine.pressure, 0.08, 0, 12) * 100) / 100, power: Math.round(vary(machine.power, 0.35, 0, 60) * 10) / 10, efficiency: Math.round(vary(machine.efficiency, 0.6, 0, 100) * 10) / 10, runtimeHours: Math.round((machine.runtimeHours + (status === "Active" ? 1 / 3600 : 0)) * 100) / 100 };
        }));
        setLastUpdate(new Date());
      }, 1000);
    }, 180);
    return () => { window.clearTimeout(openTimer); if (interval) window.clearInterval(interval); socket.close(); };
  }, [facility]);

  return { zones, equipment, connected, lastUpdate };
}
