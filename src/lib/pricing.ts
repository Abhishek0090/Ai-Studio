/** Single source of truth for what things cost and what packs sell for. */

export const COSTS = {
  image: 5,
  video: 100,
  shorts: 300,
  code: 1,
} as const;

export const FREE_TIER = {
  signupBonus: 100,
  dailyCoins: 20,
  /** Max generations per user per minute, across all tools. */
  ratePerMinute: 10,
} as const;

export type CoinPack = {
  id: string;
  name: string;
  coins: number;
  pricePaise: number;
  note: string;
  popular?: boolean;
};

export const COIN_PACKS: CoinPack[] = [
  { id: "starter", name: "Starter", coins: 500, pricePaise: 49_900, note: "Good for trying things out" },
  { id: "creator", name: "Creator", coins: 1_100, pricePaise: 99_900, note: "10% bonus coins" },
  { id: "pro", name: "Pro", coins: 2_500, pricePaise: 199_900, note: "25% bonus coins", popular: true },
  { id: "studio", name: "Studio", coins: 7_000, pricePaise: 499_900, note: "40% bonus coins" },
];

export function findPack(id: string) {
  return COIN_PACKS.find((p) => p.id === id);
}

export function formatINR(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export function formatCoins(n: number) {
  return new Intl.NumberFormat("en-IN").format(n);
}
