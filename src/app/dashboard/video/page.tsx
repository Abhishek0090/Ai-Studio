import { PageHeader } from "@/components/ui/primitives";
import { listGenerations, toDTO } from "@/lib/generations";
import { requireUser } from "@/lib/session";
import { VideoStudio } from "./video-studio";

export const metadata = { title: "Video gen" };

export default async function VideoPage() {
  const user = await requireUser();
  const history = await listGenerations(user.id, { tool: "video", limit: 12 });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Video gen" description="Describe a scene. Rendering runs in the background, so you can leave this page." />
      <VideoStudio history={history.map(toDTO)} />
    </div>
  );
}
