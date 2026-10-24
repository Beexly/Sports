import { notFound } from "next/navigation"
import { Footer } from "@/components/ui/footer"
import { isPagePublic } from "@/lib/launch/internal-surface-fence"

export default function MetricsPage(): JSX.Element {
  if (!isPagePublic("/intelligence/metrics")) notFound()

  return (
    <main id="main-content">
      <h1>Metric inventory</h1>
      <p>This surface stays dark unless the founder turns its flag on.</p>
      <Footer />
    </main>
  )
}
