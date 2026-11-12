import { Code2, CreditCard, Film, FolderOpen, Home, Image as ImageIcon, Settings, Smartphone } from "lucide-react";
import { COSTS } from "@/lib/pricing";

export const TOOLS = [
  {
    href: "/dashboard/image",
    label: "Image gen",
    icon: ImageIcon,
    description: "Text to image with style presets and aspect ratios.",
    cost: `${COSTS.image} coins per image`,
    tint: "from-red-600/15 to-red-600/5 text-red-700 dark:text-red-400",
  },
  {
    href: "/dashboard/video",
    label: "Video gen",
    icon: Film,
    description: "Turn a prompt into a short clip. Rendering runs in the background.",
    cost: `${COSTS.video} coins per 5 s`,
    tint: "from-orange-500/15 to-orange-500/5 text-orange-700 dark:text-orange-400",
  },
  {
    href: "/dashboard/shorts",
    label: "Shorts gen",
    icon: Smartphone,
    description: "Topic in, vertical video out: hook, scenes, captions, hashtags.",
    cost: `${COSTS.shorts} coins per short`,
    tint: "from-amber-500/15 to-amber-500/5 text-amber-700 dark:text-amber-400",
  },
  {
    href: "/dashboard/code",
    label: "Code gen",
    icon: Code2,
    description: "Chat that writes code, with a live preview for web pages.",
    cost: `${COSTS.code} coin per message`,
    tint: "from-rose-600/15 to-rose-600/5 text-rose-700 dark:text-rose-400",
  },
] as const;

export const NAV = [
  { section: null, items: [{ href: "/dashboard", label: "Home", icon: Home }] },
  { section: "Create", items: TOOLS.map(({ href, label, icon }) => ({ href, label, icon })) },
  {
    section: "Account",
    items: [
      { href: "/dashboard/library", label: "My library", icon: FolderOpen },
      { href: "/dashboard/billing", label: "Billing and coins", icon: CreditCard },
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
    ],
  },
];
