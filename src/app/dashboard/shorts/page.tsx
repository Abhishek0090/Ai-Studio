import { PageHeader } from "@/components/ui/primitives";
import { listGenerations, toDTO } from "@/lib/generations";
import { COSTS } from "@/lib/pricing";
import { requireUser } from "@/lib/session";
import { ShortsStudio } from "./shorts-studio";

export const metadata = { title: "Shorts gen" };

export default async function ShortsPage() {
  const user = await requireUser();
  const history = await listGenerations(user.id, { tool: "shorts", limit: 10 });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Shorts gen"
        description={`Topic in, vertical video out: hook, scenes, captions and hashtags. ${COSTS.shorts} coins per short.`}
      />
      <ShortsStudio history={history.map(toDTO)} />
    </div>
  );
}
