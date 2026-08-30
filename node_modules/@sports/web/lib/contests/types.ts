import { z } from "zod";

export const ContestEntrySchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Name is too short")
    .max(32, "Name is too long")
    .regex(/^[a-zA-Z0-9 _.\-]+$/, "Letters, numbers, spaces, . _ - only"),
  email: z.string().trim().email("Valid email required").max(120),
  picks: z
    .array(
      z.object({
        gameId: z.string().min(1),
        side: z.enum(["home", "away"]),
      }),
    )
    .min(6, "Pick every game on the slate")
    .max(16, "At most 16 picks")
    .superRefine((picks, ctx) => {
      const seen = new Set<string>();
      for (const p of picks) {
        if (seen.has(p.gameId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Duplicate game pick",
          });
          return;
        }
        seen.add(p.gameId);
      }
    }),
  consent: z
    .boolean()
    .refine((v) => v === true, { message: "Consent is required" }),
  honeypot: z.string().max(0).optional().or(z.literal("")),
});

export type ContestEntryInput = z.infer<typeof ContestEntrySchema>;

export type StoredContestEntry = {
  id: string;
  weekId: string;
  displayName: string;
  emailHash: string;
  picks: Array<{ gameId: string; side: "home" | "away" }>;
  createdAt: string;
  score: number | null;
  correct: number | null;
  total: number | null;
};

export type ContestGame = {
  gameId: string;
  label: string;
  away: string;
  home: string;
  kickoff: string;
  /** null until operator settles via settlement file */
  result: "home" | "away" | "push" | null;
};

export type ContestWeek = {
  weekId: string;
  title: string;
  sport: "NFL" | "NBA" | "MLB" | "NHL" | "MULTI";
  opensAt: string;
  locksAt: string;
  status: "open" | "locked" | "settled";
  games: ContestGame[];
  rules: readonly string[];
  /** Honest label: synthetic methodology slate vs operator-settled */
  slateKind: "methodology_paper";
};
