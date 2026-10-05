export type ZoneStatus = "Active" | "Idle" | "Offline";
export type EventType = "Alarm" | "Warning" | "Info";
export type ResolutionStatus = "Open" | "Resolved";

export type Zone = {
  id: string;
  name: string;
  status: ZoneStatus;
  energyUsage: number;
  isOccupied: boolean;
};

export type FacilityEvent = {
  id: string;
  timestamp: string;
  type: EventType;
  zoneId: string;
  description: string;
  hasCctv: boolean;
  resolutionStatus: ResolutionStatus;
  actionNote: string;
};

export const zones: Zone[] = [
  { id: "Z-01", name: "Line 1", status: "Active", energyUsage: 142, isOccupied: true },
  { id: "Z-02", name: "Line 2", status: "Active", energyUsage: 126, isOccupied: true },
  { id: "Z-03", name: "Packing", status: "Idle", energyUsage: 84, isOccupied: false },
  { id: "Z-04", name: "Gudang", status: "Active", energyUsage: 68, isOccupied: true },
  { id: "Z-05", name: "Cold Storage", status: "Active", energyUsage: 198, isOccupied: true },
  { id: "Z-06", name: "Loading Bay", status: "Offline", energyUsage: 0, isOccupied: false },
  { id: "Z-07", name: "Utilities", status: "Active", energyUsage: 91, isOccupied: true },
  { id: "Z-08", name: "Quality Lab", status: "Idle", energyUsage: 52, isOccupied: false },
];

export const events: FacilityEvent[] = [
  { id: "EV-1048", timestamp: "2026-09-28T14:32:00+07:00", type: "Alarm", zoneId: "Z-06", description: "Loading bay sensor offline for 12 min", hasCctv: true, resolutionStatus: "Open", actionNote: "" },
  { id: "EV-1047", timestamp: "2026-09-28T14:18:00+07:00", type: "Warning", zoneId: "Z-03", description: "High energy draw while zone unoccupied", hasCctv: false, resolutionStatus: "Open", actionNote: "" },
  { id: "EV-1046", timestamp: "2026-09-28T13:56:00+07:00", type: "Info", zoneId: "Z-01", description: "Production target reached · Shift A", hasCctv: true, resolutionStatus: "Resolved", actionNote: "Target verified by shift lead." },
  { id: "EV-1045", timestamp: "2026-09-28T13:42:00+07:00", type: "Warning", zoneId: "Z-05", description: "Cold storage temperature trending high", hasCctv: true, resolutionStatus: "Open", actionNote: "" },
  { id: "EV-1044", timestamp: "2026-09-28T12:09:00+07:00", type: "Info", zoneId: "Z-07", description: "Preventive maintenance completed", hasCctv: false, resolutionStatus: "Resolved", actionNote: "Filters replaced; airflow normal." },
  { id: "EV-1043", timestamp: "2026-09-28T11:25:00+07:00", type: "Alarm", zoneId: "Z-02", description: "Conveyor motor vibration above threshold", hasCctv: true, resolutionStatus: "Resolved", actionNote: "Bearing tightened, vibration rechecked." },
];

export const energyByZone = [
  { zone: "Line 1", energy: 142, occupancy: 7.8 },
  { zone: "Line 2", energy: 126, occupancy: 6.9 },
  { zone: "Packing", energy: 84, occupancy: 1.2 },
  { zone: "Gudang", energy: 68, occupancy: 5.4 },
  { zone: "Cold store", energy: 198, occupancy: 8.0 },
  { zone: "Loading", energy: 37, occupancy: 0.5 },
  { zone: "Utilities", energy: 91, occupancy: 6.2 },
  { zone: "Quality lab", energy: 52, occupancy: 0.8 },
];

export const zoneName = (id: string) => zones.find((zone) => zone.id === id)?.name ?? id;

const alternateZoneNames = {
  "Jakarta Plant 02": ["Fabrication", "Assembly", "Packing", "Warehouse", "Paint Shop", "Loading Bay", "Utilities", "Quality Lab"],
  "Jakarta Plant 03": ["Line 3A", "Packaging", "Quality Control", "Dispatch", "Cold Storage 03", "Loading Dock", "Utilities 03", "Lab 03"],
} as const;

export function getFacilityMockData(facility: "Jakarta Plant 01" | "Jakarta Plant 02" | "Jakarta Plant 03") {
  if (facility === "Jakarta Plant 01") return { zones, events, energyByZone };
  const prefix = facility === "Jakarta Plant 02" ? "P2" : "P3";
  const offset = facility === "Jakarta Plant 02" ? 24 : -17;
  const names = alternateZoneNames[facility];
  const facilityZones = zones.map((zone, index) => ({
    ...zone,
    id: `${prefix}-${zone.id}`,
    name: names[index],
    energyUsage: Math.max(0, zone.energyUsage + offset + index * 3),
    isOccupied: facility === "Jakarta Plant 02" ? index !== 2 && index !== 7 : index !== 4 && index !== 5,
    status: facility === "Jakarta Plant 02" && index === 5 ? "Offline" as const : facility === "Jakarta Plant 03" && index === 4 ? "Idle" as const : zone.status,
  }));
  const facilityEvents = events.map((event) => ({
    ...event,
    id: `${prefix}-${event.id}`,
    zoneId: `${prefix}-${event.zoneId}`,
    description: `${facility}: ${event.description}`,
    resolutionStatus: facility === "Jakarta Plant 02" && event.id === "EV-1043"
      ? "Open" as const
      : facility === "Jakarta Plant 03" && event.id === "EV-1048"
        ? "Resolved" as const
        : event.resolutionStatus,
  }));
  const facilityEnergy = energyByZone.map((reading, index) => ({
    ...reading,
    zone: names[index].replace("Cold Storage 03", "Cold store").replace("Loading Dock", "Loading"),
    energy: Math.max(0, reading.energy + offset + index * 3),
    occupancy: Math.max(0, Math.min(8, reading.occupancy + (facility === "Jakarta Plant 02" ? -0.8 : 0.5))),
  }));
  return { zones: facilityZones, events: facilityEvents, energyByZone: facilityEnergy };
}

export function getFacilityZoneName(id: string) {
  const prefix = id.startsWith("P2-") ? "P2" : id.startsWith("P3-") ? "P3" : "";
  const baseId = prefix ? id.slice(prefix.length + 1) : id;
  const baseZone = zones.find((zone) => zone.id === baseId);
  if (!baseZone) return id;
  if (!prefix) return baseZone.name;
  const facility = prefix === "P2" ? "Jakarta Plant 02" : "Jakarta Plant 03";
  return alternateZoneNames[facility][zones.indexOf(baseZone)];
}
