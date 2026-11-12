import { PageHeader } from "@/components/ui/primitives";
import { listGenerations, toDTO } from "@/lib/generations";
import { requireUser } from "@/lib/session";
import { ImageStudio } from "./image-studio";

export const metadata = { title: "Image gen" };

export default async function ImagePage() {
  const user = await requireUser();
  const history = await listGenerations(user.id, { tool: "image", limit: 12 });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Image gen" description="Describe an image and pick a style. Each image costs 5 coins." />
      <ImageStudio history={history.map(toDTO)} />
    </div>
  );
}
