export type Guest = { id: string; name: string; party: string; table: number | null };

export const SAMPLE_GUESTS: Guest[] = [
  { id: "g1", name: "Elena Navarro", party: "Couple", table: null },
  { id: "g2", name: "Marcus Navarro", party: "Couple", table: null },
  { id: "g3", name: "Lila Navarro", party: "Family", table: null },
  { id: "g4", name: "Ben Navarro", party: "Family", table: null },
  { id: "g5", name: "Wei Chen", party: "Family", table: null },
  { id: "g6", name: "Mei Chen", party: "Family", table: null },
  { id: "g7", name: "Ava Chen", party: "Family", table: null },
  { id: "g8", name: "Noah Whitfield", party: "Friends", table: null },
  { id: "g9", name: "Sofia Whitfield", party: "Friends", table: null },
  { id: "g10", name: "Jordan Hale", party: "Work", table: null },
  { id: "g11", name: "Priya Shah", party: "Work", table: null },
  { id: "g12", name: "Chris Lang", party: "College", table: null },
  { id: "g13", name: "Sam Lang", party: "College", table: null },
  { id: "g14", name: "Riley Brooks", party: "College", table: null },
  { id: "g15", name: "Tomas Ruiz", party: "Plus-one", table: null },
  { id: "g16", name: "Harper Quinn", party: "Plus-one", table: null },
];

export const TABLE_COUNT = 6;
export const SEATS_PER = 8;
