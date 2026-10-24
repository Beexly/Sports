import { useState } from "react";
import { saveLead, type Lead } from "@/lib/leads";

export function LeadForm({
  product,
  business,
  cta,
  onSaved,
  ink,
}: {
  product: Lead["product"];
  business?: string;
  cta: string;
  onSaved: (lead: Lead) => void;
  ink?: boolean;
}) {
  const [name, setName] = useState("");
  const [biz, setBiz] = useState(business ?? "");
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setErr("Name and email — that's the whole gate.");
      return;
    }
    const lead = saveLead({
      product,
      name: name.trim(),
      business: biz.trim() || business || "",
      email: email.trim(),
    });
    onSaved(lead);
  }

  const field = ink
    ? "w-full rounded-md border border-ink/15 bg-paper px-3 py-3 text-ink outline-none"
    : "w-full rounded-md border border-line bg-ink-2 px-3 py-3 text-paper outline-none";

  return (
    <form onSubmit={submit} className="grid gap-3">
      <label className="grid gap-1 text-sm">
        <span className="kicker">Name</span>
        <input className={field} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="kicker">Business</span>
        <input className={field} value={biz} onChange={(e) => setBiz(e.target.value)} autoComplete="organization" />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="kicker">Email</span>
        <input
          className={field}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </label>
      {err ? <p className="text-sm text-copper">{err}</p> : null}
      <button type="submit" className={ink ? "btn-on-paper" : "btn-primary"}>
        {cta}
      </button>
      <p className={`text-xs ${ink ? "text-faint" : "text-muted"}`}>
        Nothing is emailed from this preview. The lead stays on this device until Garrett ships a real inbox.
      </p>
    </form>
  );
}
