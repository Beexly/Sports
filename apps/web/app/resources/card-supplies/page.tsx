import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";

export const metadata: Metadata = {
  title: "Pro Card Supplies & Operator Resources | GSE",
  description:
    "Curated grading supplies, vault storage, studio desk hardware, and film study tools.",
};

export interface SupplyItem {
  name: string;
  category: string;
  description: string;
  amazonQuery: string;
  recommendedUse: string;
}

export const CARD_SUPPLY_ITEMS: SupplyItem[] = [
  // 1. Grading & Submission Protection (6 items)
  {
    name: "Semi-Rigid Card Holders",
    category: "Grading & Submission Protection",
    description: "Industry-standard submission holders required by PSA, BGS, and SGC for clean, damage-free grading intake.",
    amazonQuery: "semi-rigid card holders",
    recommendedUse: "PSA & SGC submissions",
  },
  {
    name: "Penny Sleeves",
    category: "Grading & Submission Protection",
    description: "Ultra-clear, acid-free archival polyethylene sleeves preventing surface micro-scratches prior to holder insertion.",
    amazonQuery: "penny sleeves",
    recommendedUse: "Base protection before semi-rigid",
  },
  {
    name: "35pt Magnetic One-Touch",
    category: "Grading & Submission Protection",
    description: "UV-blocking magnetic enclosure with diamond recessed corners to protect pristine foil corners and edges.",
    amazonQuery: "35pt magnetic one-touch",
    recommendedUse: "High-value raw display",
  },
  {
    name: "Microfiber Grading Cloth",
    category: "Grading & Submission Protection",
    description: "Lint-free, optical-grade microfiber weave for removing surface fingerprints and dust without abrading chrome coatings.",
    amazonQuery: "microfiber grading cloth",
    recommendedUse: "Pre-grade surface wiping",
  },
  {
    name: "Centering Loupe",
    category: "Grading & Submission Protection",
    description: "10x–30x optical magnification with integrated reticle measuring 50/50 and 60/40 border ratios accurately.",
    amazonQuery: "centering loupe",
    recommendedUse: "Pre-submission centering measurement",
  },
  {
    name: "Archival Team Bags",
    category: "Grading & Submission Protection",
    description: "Resealable protective poly bags that seal magnetic holders and top loaders against ambient moisture and scuffs.",
    amazonQuery: "archival team bags",
    recommendedUse: "Outer dust & moisture seal",
  },

  // 2. Storage & Vault Cases (6 items)
  {
    name: "Waterproof Slab Case",
    category: "Storage & Vault Cases",
    description: "Heavy-duty locking hard case with high-density precut foam slots engineered to transport 50+ graded slabs securely.",
    amazonQuery: "waterproof slab case",
    recommendedUse: "Card show & vault transit",
  },
  {
    name: "3-Row Monster Box",
    category: "Storage & Vault Cases",
    description: "Reinforced corrugated storage box holding up to 3,000 cards or 800+ standard top loaders in labeled rows.",
    amazonQuery: "3-row monster box",
    recommendedUse: "Bulk inventory & set sorting",
  },
  {
    name: "Top Loaders 3x4",
    category: "Storage & Vault Cases",
    description: "Rigid polyvinyl chloride plastic protectors keeping standard trading cards flat, secure, and protected in inventory.",
    amazonQuery: "top loaders 3x4",
    recommendedUse: "Everyday trading & storage",
  },
  {
    name: "Card Dividers",
    category: "Storage & Vault Cases",
    description: "Heavyweight polypropylene index tabs designed to categorize sets, teams, and player inventory neatly.",
    amazonQuery: "card dividers",
    recommendedUse: "Inventory organization",
  },
  {
    name: "Silica Gel Desiccant Packs",
    category: "Storage & Vault Cases",
    description: "Food-grade moisture adsorbing packets preventing humidity warping and chrome peeling inside storage boxes.",
    amazonQuery: "silica gel desiccant packs",
    recommendedUse: "Vault & case climate control",
  },
  {
    name: "Thermal Label Printer",
    category: "Storage & Vault Cases",
    description: "Inkless high-speed 4x6 label printer for fast outbound shipping labels and professional inventory barcoding.",
    amazonQuery: "thermal label printer",
    recommendedUse: "Break fulfillment & shipping",
  },

  // 3. Breaking & Studio Desk (6 items)
  {
    name: "Overhead 4K Document Camera Mount",
    category: "Breaking & Studio Desk",
    description: "Articulated desk-clamp boom arm providing stable, glare-free vertical camera positioning for live breaks and high-res card inspections.",
    amazonQuery: "overhead 4k document camera mount",
    recommendedUse: "Live streaming & macro inspection",
  },
  {
    name: "LED Key Light Panel",
    category: "Breaking & Studio Desk",
    description: "Even, high-CRI diffusion lighting eliminating harsh hot spots on refractors, holograms, and slab acrylic.",
    amazonQuery: "led key light panel",
    recommendedUse: "Glare-free studio lighting",
  },
  {
    name: "Anti-Static Playmat",
    category: "Breaking & Studio Desk",
    description: "Smooth stitched-edge neoprene working surface that cushions cards during sorting and eliminates static cling.",
    amazonQuery: "anti-static playmat",
    recommendedUse: "Clean breaking desk surface",
  },
  {
    name: "Acrylic Card Stands",
    category: "Breaking & Studio Desk",
    description: "Crystal-clear display easels designed to showcase featured hits, one-touches, and slabs on camera without distraction.",
    amazonQuery: "acrylic card stands",
    recommendedUse: "On-camera card showcase",
  },
  {
    name: "Bubble Mailers #000",
    category: "Breaking & Studio Desk",
    description: "4x8 padded Kraft mailers engineered for safe single-card and small team-bag delivery via standard postal services.",
    amazonQuery: "bubble mailers 000",
    recommendedUse: "Secure customer mailouts",
  },
  {
    name: "Painters Tape",
    category: "Breaking & Studio Desk",
    description: "Low-tack masking tape that seals top loaders securely without leaving sticky adhesive residue on plastic.",
    amazonQuery: "painters tape",
    recommendedUse: "Residue-free top loader sealing",
  },

  // 4. Football Film & Quantitative Study (4 items)
  {
    name: "Grid Notebook",
    category: "Football Film & Quantitative Study",
    description: "Heavyweight dot-grid engineer notebook for schematic charting, route concept diagrams, and red zone personnel notes.",
    amazonQuery: "grid notebook",
    recommendedUse: "All-22 schematic charting",
  },
  {
    name: "Dual-Monitor Arm",
    category: "Football Film & Quantitative Study",
    description: "Heavy-duty gas-spring desk mount supporting side-by-side coach's film playback alongside live mathematical odds feeds.",
    amazonQuery: "dual-monitor arm",
    recommendedUse: "Multi-feed film & data workstation",
  },
  {
    name: "Mechanical Keypad",
    category: "Football Film & Quantitative Study",
    description: "Dedicated programmable macro numeric pad for rapid simulation execution, data entry, and video scrubbing.",
    amazonQuery: "mechanical keypad",
    recommendedUse: "Rapid simulation shortcuts",
  },
  {
    name: "Noise-Canceling Studio Headphones",
    category: "Football Film & Quantitative Study",
    description: "Closed-back active noise-canceling headphones for long deep-focus film breakdown and coach interview audio review.",
    amazonQuery: "noise-canceling studio headphones",
    recommendedUse: "Deep-focus film study",
  },
];

export const AMAZON_ASSOCIATES_TAG = "galaxysportse-20";

export function buildAmazonAssociatesUrl(query: string): string {
  const encoded = encodeURIComponent(query).replace(/%20/g, "+");
  return `https://www.amazon.com/s?k=${encoded}&tag=${AMAZON_ASSOCIATES_TAG}`;
}

export const CATEGORIES = [
  "Grading & Submission Protection",
  "Storage & Vault Cases",
  "Breaking & Studio Desk",
  "Football Film & Quantitative Study",
] as const;

export default function ResourcesCardSuppliesPage(): JSX.Element {
  return (
    <div className="relative min-h-screen w-full bg-[#0A0D14] text-[#F8FAFC]">
      <Nav />
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header & Title Section (title <= 60 chars) */}
        <div className="rounded-2xl border-2 border-slate-800 bg-slate-900/90 p-6 sm:p-10 shadow-2xl">
          <div className="flex flex-col gap-4">
            <span className="inline-block w-fit rounded-md bg-amber-500/20 border border-amber-400/50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
              OPERATOR RESOURCES &amp; DESK STACK
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Pro Card Supplies &amp; Operator Resources
            </h1>
            {/* One-sentence answer paragraph at top per §1E / W-72 */}
            <p className="text-base sm:text-lg leading-relaxed text-slate-200">
              A curated reference guide of tournament-grade grading supplies, vault cases, live breaking studio gear, and quantitative study tools used by Galaxy Sports Edge operators.
            </p>
          </div>

          {/* Prominent Affiliate Disclosure Banner per Rule R4 / §4.3 */}
          <div
            id="affiliate-disclosure"
            className="mt-6 rounded-xl border border-amber-500/30 bg-amber-950/40 p-4 text-xs sm:text-sm text-amber-200/90"
          >
            <p className="font-medium">
              Disclosure (#affiliate): As an Amazon Associate (tag: galaxysportse-20), Galaxy Sports Edge earns from qualifying purchases at no additional cost to you.
            </p>
          </div>
        </div>

        {/* Categories & 22 Live-Tagged Items */}
        <div className="mt-12 space-y-12">
          {CATEGORIES.map((category) => {
            const items = CARD_SUPPLY_ITEMS.filter((item) => item.category === category);
            return (
              <section key={category} className="space-y-6" aria-labelledby={`cat-${category.replace(/\s+/g, "-")}`}>
                <div className="border-b border-slate-800 pb-3">
                  <h2
                    id={`cat-${category.replace(/\s+/g, "-")}`}
                    className="text-2xl font-bold tracking-tight text-white"
                  >
                    {category}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Field-tested gear and verified specs for professional collectors and operators.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => {
                    const amazonUrl = buildAmazonAssociatesUrl(item.amazonQuery);
                    return (
                      <div
                        key={item.name}
                        className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-5 hover:border-slate-700 transition-colors"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                              {item.recommendedUse}
                            </span>
                          </div>
                          <h3 className="mt-3 text-lg font-semibold text-white">
                            {item.name}
                          </h3>
                          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                            {item.description}
                          </p>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-800/80">
                          <a
                            href={amazonUrl}
                            target="_blank"
                            rel="noopener noreferrer sponsored"
                            className="inline-flex w-full items-center justify-center rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-300 hover:bg-amber-500/20 hover:border-amber-400 transition-colors"
                          >
                            Check Price on Amazon &rarr;
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* CTA section with >= 2 internal links to /packages and /fantasy/dfs */}
        <div className="mt-16 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 to-slate-950 p-8 text-center sm:p-12 shadow-xl">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Power Your Game Day Preparation
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-slate-300">
            Combine verified operator hardware with institutional-grade football intelligence and mathematical simulation engines.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/packages"
              className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-6 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400 transition-colors"
            >
              Galaxy Picks Storefront &rarr;
            </Link>
            <Link
              href="/fantasy/dfs"
              className="inline-flex items-center justify-center rounded-lg border-2 border-slate-700 bg-slate-800 px-6 py-3 text-sm font-bold text-white hover:border-amber-400 transition-colors"
            >
              DFS Lineup Builder &rarr;
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
