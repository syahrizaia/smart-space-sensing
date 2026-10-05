"use client";

import { useSyncExternalStore } from "react";
import { facilities, type FacilityName } from "@/lib/facilities";

export { facilities, type FacilityName } from "@/lib/facilities";

const storageKey = "smart-space-facility";
const eventName = "smart-space-facility-change";
const fallbackFacility = facilities[0];

function getSnapshot(): FacilityName {
  if (typeof window === "undefined") return fallbackFacility;
  const savedFacility = window.localStorage.getItem(storageKey);
  if (facilities.includes(savedFacility as FacilityName)) return savedFacility as FacilityName;
  if (savedFacility === "Jakarta Plant 1") return facilities[0];
  if (savedFacility === "Jakarta Plant 2") return facilities[1];
  if (savedFacility === "Jakarta Plant 3") return facilities[2];
  return fallbackFacility;
}

function subscribe(onChange: () => void) {
  window.addEventListener(eventName, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(eventName, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function setSelectedFacility(facility: FacilityName) {
  window.localStorage.setItem(storageKey, facility);
  window.dispatchEvent(new Event(eventName));
}

export function useSelectedFacility() {
  return useSyncExternalStore(subscribe, getSnapshot, () => fallbackFacility);
}

export function CurrentFacilityName() {
  return <>{useSelectedFacility()}</>;
}
