import { useEffect, useRef, useState } from "react";
import { IG_DM } from "@/lib/kit-offer";
import {
  SIGN_STYLES,
  SIGN_TYPES,
  composeSign,
  type SignStyle,
  type SignType,
} from "@/lib/signpreview";
import { LeadForm } from "@/components/studio/lead-form";

export function SignBuilder({ embed, shop }: { embed?: boolean; shop?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const photoRef = useRef<HTMLImageElement | null>(null);
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [type, setType] = useState<SignType>("storefront");
  const [style, setStyle] = useState<SignStyle>("classic");
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  const [upsell, setUpsell] = useState(false);
  const [captured, setCaptured] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "/studio/storefront.jpg";
    img.onload = () => {
      photoRef.current = img;
      setReady(true);
    };
  }, []);

  function render() {
    const canvas = canvasRef.current;
    const photo = photoRef.current;
    const biz = name.trim();
    if (!canvas || !photo || !biz) return;
    composeSign(canvas, photo, { name: biz, tagline: tagline.trim(), type, style });
    setDone(true);
    setUpsell(true);
  }

  return (
    <div className={embed ? "" : "overflow-hidden rounded-[28px] border border-line bg-ink-2"}>
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="p-6 md:p-10">
          <p className="kicker">{shop || "Free mockup"}</p>
          <h2 className="display mt-3 text-xl">See the sign before you buy it.</h2>
          <label className="mt-6 grid gap-1 text-sm">
            <span className="kicker">Business name</span>
            <input
              className="w-full rounded-md border border-line bg-ink px-3 py-3 font-display text-xl text-paper outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder="River Oaks Signs"
            />
          </label>
          <label className="mt-4 grid gap-1 text-sm">
            <span className="kicker">Tagline (optional)</span>
            <input
              className="w-full rounded-md border border-line bg-ink px-3 py-3 text-paper outline-none"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={60}
              placeholder="Letters · Panels · Night"
            />
          </label>
          <p className="kicker mt-5">Sign type</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SIGN_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={`rounded-full border px-3 py-2 text-sm ${type === t.id ? "border-paper bg-paper text-ink" : "border-line text-paper"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="kicker mt-5">Style</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {SIGN_STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStyle(s.id)}
                className={`rounded-full border px-3 py-2 text-sm ${style === s.id ? "border-paper bg-paper text-ink" : "border-line text-paper"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn-primary mt-6 w-full" onClick={render} disabled={!ready}>
            Design my sign
          </button>
          <p className="mt-3 text-xs text-muted">Free concept. Spelling is exact — type is drawn on the photo, not guessed.</p>
        </div>

        <div className="relative bg-ink p-4 md:p-6">
          <div className="sign-stage overflow-hidden rounded-[18px] border border-line">
            <canvas
              ref={canvasRef}
              width={1280}
              height={720}
              className={`block h-auto w-full ${done ? "opacity-100" : "opacity-0"}`}
              aria-label="Sign mockup"
            />
            {!done ? (
              <img
                src="/studio/storefront.jpg"
                alt="Sample storefront — River Oaks Signs, fictional shop"
                className="block h-auto w-full"
              />
            ) : null}
          </div>

          {upsell ? (
            <div className="mt-4 rounded-[18px] border border-copper/40 bg-ink-2 p-5">
              <p className="kicker">The moment</p>
              <h3 className="display mt-2 text-xl">Print-ready package · $150 flat</h3>
              <p className="mt-2 text-sm text-muted">
                Three style variations, a file your shop can cut, and an intro to a trusted local fabricator.
              </p>
              {captured ? (
                <p className="mt-4 text-sm text-paper">Got it. DM “SIGN” to @gbeexly when you want the files.</p>
              ) : (
                <div className="mt-4">
                  <LeadForm
                    product="signpreview"
                    business={name}
                    cta="Hold the $150 package"
                    onSaved={() => setCaptured(true)}
                  />
                </div>
              )}
              <a href={IG_DM} className="btn-ghost mt-3 text-sm">
                Or DM “SIGN”
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
