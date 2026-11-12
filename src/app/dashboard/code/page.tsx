import { PageHeader } from "@/components/ui/primitives";
import { COSTS } from "@/lib/pricing";
import { CodeChat } from "./code-chat";

export const metadata = { title: "Code gen" };

export default function CodePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Code gen" description={`Ask for code in any language. Web pages get a live preview. ${COSTS.code} coin per message.`} />
      <CodeChat />
    </div>
  );
}
