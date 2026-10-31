export function HeldNotice({ evaluated, published, reason }: { evaluated: number; published: number; reason: string }) {
  return (
    <section className="held-notice" aria-label="College football hold">
      <div className="held-title-wrap">
        <p className="section-index">CFB / Saturday</p>
        <h2>Held is a finding.</h2>
      </div>
      <div className="held-counts">
        <div><strong className="num">{evaluated}</strong><span>games evaluated</span></div>
        <div><strong className="num">{published}</strong><span>published</span></div>
      </div>
      <p className="held-reason">{reason}</p>
    </section>
  );
}
