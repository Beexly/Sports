"use client";

/**
 * PersonalizedBriefing — reads local preferences and re-ranks Mission Control
 * toward what you're here for. First-time visitors get a quick, friendly intake;
 * after that it just adapts. Nothing leaves the device.
 */

import { useEffect, useState } from "react";
import { MissionControlView } from "@/components/cockpit/mission-control-view";
import type { BriefingCard } from "@/lib/cockpit/mission-control";
import {
  personalizeBriefing, loadPrefs, savePrefs, ALL_SPORTS, DEFAULT_PREFS,
  type Preferences, type Focus, type Experience,
} from "@/lib/prefs/preferences";

const FOCUS_LABEL: Record<Focus, string> = { betting: "Betting", fantasy: "Fantasy", both: "Betting + Fantasy" };

export function PersonalizedBriefing({ cards }: { cards: BriefingCard[] }) {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => { setPrefs(loadPrefs()); setLoaded(true); }, []);

  const shown = prefs ? personalizeBriefing(cards, prefs) : cards;
  const save = (p: Preferences) => { savePrefs(p); setPrefs(p); setEditing(false); };

  return (
    <div className="space-y-5">
      {loaded && (!prefs || editing) && <Intake initial={prefs ?? DEFAULT_PREFS} onSave={save} onCancel={prefs ? () => setEditing(false) : undefined} />}

      {prefs && !editing && (
        <div className="flex items-center gap-2 text-xs text-ion-2">
          <span>Personalized for <strong style={{ color: "var(--orbital-cyan)" }}>{FOCUS_LABEL[prefs.focus]}</strong> · {prefs.sports.join(", ") || "all sports"}</span>
          <button type="button" onClick={() => setEditing(true)} className="underline hover:text-ion-white">edit</button>
        </div>
      )}

      <MissionControlView cards={shown} />
    </div>
  );
}

function Intake({ initial, onSave, onCancel }: { initial: Preferences; onSave: (p: Preferences) => void; onCancel?: () => void }) {
  const [focus, setFocus] = useState<Focus>(initial.focus);
  const [sports, setSports] = useState<string[]>([...initial.sports]);
  const [experience, setExperience] = useState<Experience>(initial.experience);

  const toggleSport = (s: string) => setSports((xs) => (xs.includes(s) ? xs.filter((x) => x !== s) : [...xs, s]));

  return (
    <div className="surface-card p-6">
      <p className="text-xs uppercase tracking-label" style={{ color: "var(--orbital-cyan)" }}>Make it yours · 15 seconds</p>
      <h3 className="mt-2 font-display text-xl text-ion-white">Tune Mission Control to you.</h3>

      <div className="mt-5 space-y-4">
        <Field label="What are you here for?">
          <div className="flex flex-wrap gap-2">
            {(["betting", "fantasy", "both"] as Focus[]).map((f) => (
              <Chip key={f} active={focus === f} onClick={() => setFocus(f)}>{FOCUS_LABEL[f]}</Chip>
            ))}
          </div>
        </Field>

        <Field label="Which sports?">
          <div className="flex flex-wrap gap-2">
            {ALL_SPORTS.map((s) => <Chip key={s} active={sports.includes(s)} onClick={() => toggleSport(s)}>{s}</Chip>)}
          </div>
        </Field>

        <Field label="How would you describe yourself?">
          <div className="flex flex-wrap gap-2">
            {([["new", "New to it"], ["intermediate", "Some experience"], ["sharp", "Sharp / pro"]] as [Experience, string][]).map(([e, lbl]) => (
              <Chip key={e} active={experience === e} onClick={() => setExperience(e)}>{lbl}</Chip>
            ))}
          </div>
        </Field>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button type="button" onClick={() => onSave({ focus, sports, experience })} className="btn btn-primary">Save & personalize</button>
        {onCancel && <button type="button" onClick={onCancel} className="btn btn-ghost btn-sm">Cancel</button>}
        <span className="ml-auto text-label text-ink-600">Stored on your device only.</span>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs text-ion-2">{label}</p>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
      style={{
        background: active ? "var(--orbital-cyan)" : "rgba(255,255,255,0.05)",
        color: active ? "var(--void)" : "var(--ion-2)",
        border: `1px solid var(${active ? "--orbital-cyan" : "--titanium"})`,
      }}
    >
      {children}
    </button>
  );
}
