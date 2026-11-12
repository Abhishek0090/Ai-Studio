"use client";

import { FolderOpen } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { GenerationCard } from "@/components/app/generation-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import type { GenerationDTO } from "@/lib/client-api";

export function LibraryGrid({ items: initial }: { items: GenerationDTO[] }) {
  const [items, setItems] = useState(initial);
  if (items.length === 0) {
    return (
      <Card className="bg-brand-glow flex flex-col items-center gap-3 p-12 text-center">
        <FolderOpen className="size-8 text-brand-start" />
        <p className="font-medium">Nothing here yet</p>
        <Button asChild variant="brand">
          <Link href="/dashboard/image">Create your first image</Link>
        </Button>
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((g) => (
        <GenerationCard key={g.id} g={g} onDelete={(id) => setItems((l) => l.filter((x) => x.id !== id))} />
      ))}
    </div>
  );
}
