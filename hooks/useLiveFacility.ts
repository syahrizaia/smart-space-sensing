"use client";

import { useEffect, useRef, useState } from "react";

export type ZoneStatus = "Active" | "Idle" | "Offline";
export type FacilityZone = { id: string; name: string; status: ZoneStatus; output: number };
export type Equipment = { id: string; name: string; zone: string; temperature: number; speed: number; status: ZoneStatus };

const initialZones: FacilityZone[] = [
  { id: "Z-01", name: "Produksi", status: "Active", output: 84 },
  { id: "Z-02", name: "Packing", status: "Active", output: 72 },
  { id: "Z-03", name: "Utilitas", status: "Idle", output: 0 },
  { id: "Z-04", name: "Gudang", status: "Active", output: 91 },
];
const initialEquipment: Equipment[] = [
  { id: "M-204", name: "CNC Machining Center", zone: "Produksi", temperature: 68, speed: 1420, status: "Active" },
  { id: "M-118", name: "Automated Packer 02", zone: "Packing", temperature: 54, speed: 860, status: "Active" },
  { id: "U-031", name: "Air Compressor", zone: "Utilitas", temperature: 42, speed: 0, status: "Idle" },
  { id: "W-012", name: "Conveyor Line 04", zone: "Gudang", temperature: 39, speed: 920, status: "Active" },
];

export function useLiveFacility() {
  const [zones, setZones] = useState(initialZones);
  const [equipment, setEquipment] = useState(initialEquipment);
  const zonesRef = useRef(initialZones);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    // Mock a WebSocket lifecycle and its one-second telemetry messages.
    const socket = { readyState: 0 as number, close() { this.readyState = 3; } };
    const openTimer = window.setTimeout(() => {
      socket.readyState = 1;
      setConnected(true);
      const interval = window.setInterval(() => {
        if (socket.readyState !== 1) return;
        const nextZones = zonesRef.current.map((zone, index) => {
          const pulse = Math.random();
          const status: ZoneStatus = pulse > 0.985 ? "Offline" : pulse > 0.94 ? "Idle" : index === 2 ? "Idle" : "Active";
          return { ...zone, status, output: status === "Active" ? Math.max(60, Math.min(99, zone.output + Math.round(Math.random() * 6 - 3))) : 0 };
        });
        zonesRef.current = nextZones;
        setZones(nextZones);
        setEquipment((current) => current.map((machine) => {
          const zone = nextZones.find((item) => item.name === machine.zone);
          const status = zone?.status ?? machine.status;
          return { ...machine, status, temperature: Math.max(35, Math.min(96, machine.temperature + Math.round(Math.random() * 4 - 2))), speed: status === "Active" ? Math.max(700, machine.speed + Math.round(Math.random() * 36 - 18)) : 0 };
        }));
        setLastUpdate(new Date());
      }, 1000);
      cleanupInterval = interval;
    }, 180);
    let cleanupInterval: number | undefined;
    const zonesRef = { current: zones };
    return () => { window.clearTimeout(openTimer); if (cleanupInterval) window.clearInterval(cleanupInterval); socket.close(); setConnected(false); };
  }, []);

  return { zones, equipment, connected, lastUpdate };
}
