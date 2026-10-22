import { createFileRoute } from "@tanstack/react-router";
import { SignBuilder } from "@/components/signpreview/builder";

export const Route = createFileRoute("/signpreview/embed")({
  component: EmbedPage,
  validateSearch: (search: Record<string, unknown>) => ({
    shop: typeof search.shop === "string" ? search.shop : "",
  }),
});

function EmbedPage() {
  const { shop } = Route.useSearch();
  return (
    <div className="min-h-screen bg-ink p-3 text-paper">
      <SignBuilder embed shop={shop || "SignPreview"} />
    </div>
  );
}
