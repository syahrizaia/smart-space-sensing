export const facilities = ["Jakarta Plant 01", "Jakarta Plant 02", "Jakarta Plant 03"] as const;
export type FacilityName = (typeof facilities)[number];

export function isFacilityName(value: string | null): value is FacilityName {
  return facilities.includes(value as FacilityName);
}
