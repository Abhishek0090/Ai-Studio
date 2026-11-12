import Link from "next/link";
import { PageHeader } from "@/components/ui/primitives";
import type { Tool } from "@/db/schema";
import { listGenerations, toDTO } from "@/lib/generations";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { LibraryGrid } from "./library-grid";

export const metadata = { title: "My library" };

const FILTERS: { value: Tool | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
  { value: "shorts", label: "Shorts" },
  { value: "code", label: "Code" },
];

export default async function LibraryPage({ searchParams }: PageProps<"/dashboard/library">) {
  const user = await requireUser();
  const { tool: raw } = await searchParams;
  const tool = FILTERS.some((f) => f.value === raw && raw !== "all") ? (raw as Tool) : undefined;
  const items = await listGenerations(user.id, { tool, limit: 100 });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My library" description="Everything you have created. Share, download or delete." />
      <nav aria-label="Filter" className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = (tool ?? "all") === f.value;
          return (
            <Link
              key={f.value}
              href={f.value === "all" ? "/dashboard/library" : `/dashboard/library?tool=${f.value}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-10 items-center rounded-full border px-4 text-sm transition-colors",
                active ? "border-transparent bg-brand font-semibold text-white" : "border-border bg-card hover:bg-muted",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>
      <LibraryGrid key={tool ?? "all"} items={items.map(toDTO)} />
    </div>
  );
}
