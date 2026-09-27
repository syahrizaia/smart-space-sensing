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
