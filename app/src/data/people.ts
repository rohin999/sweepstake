import type { Person } from "../lib/types";

// The 12 players. `colour` tags a person's teams on the bracket; keep distinct.
// Note: "Ishaan" and "Ishan" are two different people — kept separate on purpose.
export const PEOPLE: Person[] = [
  { id: "p01", name: "Zaki", colour: "#ef4444" },
  { id: "p02", name: "Chip", colour: "#f97316" },
  { id: "p03", name: "Dhiren", colour: "#eab308" },
  { id: "p04", name: "Ishaan", colour: "#84cc16" },
  { id: "p05", name: "Kareem", colour: "#22c55e" },
  { id: "p06", name: "Krish", colour: "#14b8a6" },
  { id: "p07", name: "Jayne", colour: "#06b6d4" },
  { id: "p08", name: "Rithik", colour: "#3b82f6" },
  { id: "p09", name: "Vinay", colour: "#6366f1" },
  { id: "p10", name: "Viren", colour: "#a855f7" },
  { id: "p11", name: "Khem", colour: "#ec4899" },
  { id: "p12", name: "Rohin", colour: "#f43f5e" },
];
