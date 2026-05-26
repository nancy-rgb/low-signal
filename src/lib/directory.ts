export interface DirectoryEntry {
  id: string;
  name: string;
  category: "medical" | "legal" | "hotline" | "shelter" | "press";
  region: string;
  contact: string;
  notes?: string;
}

// Static seed data. Swap for region-specific lists when connecting backend.
export const DIRECTORY: DirectoryEntry[] = [
  {
    id: "d1",
    name: "Emergency medical line",
    category: "hotline",
    region: "International",
    contact: "112 / local emergency number",
    notes: "Use only when safe to do so.",
  },
  {
    id: "d2",
    name: "Front Line Defenders",
    category: "legal",
    region: "International",
    contact: "+353 1 212 3750 / https://www.frontlinedefenders.org",
    notes: "Protection grants and emergency support for human rights defenders.",
  },
  {
    id: "d3",
    name: "Access Now Digital Security Helpline",
    category: "hotline",
    region: "International (24/7)",
    contact: "help@accessnow.org",
    notes: "Digital security support for activists and journalists.",
  },
  {
    id: "d4",
    name: "Reporters Without Borders",
    category: "press",
    region: "International",
    contact: "https://rsf.org",
    notes: "Press freedom support and emergency relocation for journalists.",
  },
  {
    id: "d5",
    name: "MSF emergency clinics",
    category: "medical",
    region: "Varies",
    contact: "https://www.msf.org",
  },
  {
    id: "d6",
    name: "UNHCR — refugee assistance",
    category: "shelter",
    region: "International",
    contact: "https://help.unhcr.org",
  },
];
