"use client";

import { useEffect, useRef, useState } from "react";
import { getFacilityMockData, type FacilityEvent, type EventType } from "@/lib/mockData";
import type { FacilityName } from "@/lib/facilities";

const injections: Pick<FacilityEvent, "type" | "zoneId" | "description" | "hasCctv">[] = [
  { type: "Alarm", zoneId: "Z-02", description: "Conveyor motor vibration above threshold", hasCctv: true },
  { type: "Warning", zoneId: "Z-05", description: "Cold storage temperature trending high", hasCctv: true },
  { type: "Alarm", zoneId: "Z-06", description: "Loading bay sensor offline", hasCctv: true },
  { type: "Warning", zoneId: "Z-03", description: "Packing line throughput below target", hasCctv: false },
  { type: "Info", zoneId: "Z-01", description: "Production target checkpoint reached", hasCctv: true },
];

export function useLiveEvents(facility: FacilityName = "Jakarta Plant 01") {
  const [events, setEvents] = useState<FacilityEvent[]>(() => getFacilityMockData(facility).events);
  const [pendingWorkOrders, setPendingWorkOrders] = useState(() => facility === "Jakarta Plant 02" ? 4 : facility === "Jakarta Plant 03" ? 1 : 2);
  const [connected, setConnected] = useState(false);
  const sequence = useRef(facility === "Jakarta Plant 02" ? 2049 : facility === "Jakarta Plant 03" ? 3049 : 1049);

  useEffect(() => {
    const prefix = facility === "Jakarta Plant 01" ? "" : facility === "Jakarta Plant 02" ? "P2-" : "P3-";
    const socket = { readyState: 0 as number, close() { this.readyState = 3; } };
    const openTimer = window.setTimeout(() => {
      socket.readyState = 1;
      setConnected(true);
      let timer = 0;
      const scheduleMessage = () => {
        timer = window.setTimeout(() => {
          if (socket.readyState !== 1) return;
          const sample = injections[Math.floor(Math.random() * injections.length)];
          const type: EventType = sample.type;
          const fresh: FacilityEvent = {
            ...sample,
            zoneId: `${prefix}${sample.zoneId}`,
            description: facility === "Jakarta Plant 01" ? sample.description : `${facility}: ${sample.description}`,
            id: `EV-${sequence.current++}`,
            timestamp: new Date().toISOString(),
            type,
            resolutionStatus: "Open",
            actionNote: "",
          };
          setEvents((current) => [fresh, ...current]);
          scheduleMessage();
        }, 4500 + Math.floor(Math.random() * 4000));
      };
      scheduleMessage();
      cleanupTimer = () => window.clearTimeout(timer);
    }, 250);
    let cleanupTimer: (() => void) | undefined;
    return () => { window.clearTimeout(openTimer); cleanupTimer?.(); socket.close(); };
  }, [facility]);

  const createWorkOrder = (eventId: string, note: string) => {
    setEvents((current) => current.map((event) => event.id === eventId
      ? { ...event, resolutionStatus: "Resolved", actionNote: note }
      : event));
    setPendingWorkOrders((count) => count + 1);
  };

  return { events, pendingWorkOrders, connected, createWorkOrder };
}
