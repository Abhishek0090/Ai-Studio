import "server-only";

/**
 * Video has no usable free API tier, so rendering is simulated: a job takes
 * a few seconds, sometimes fails (to exercise refunds), then returns a sample
 * clip. Replace `startRender` with a real provider (fal.ai, Replicate, Veo)
 * and have its webhook call `finalizeGeneration` when the money is there.
 */

const SAMPLE_VIDEO =
  process.env.MOCK_VIDEO_URL ||
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

export const VIDEO_PROVIDER = "mock-renderer";

export function startRender(kind: "video" | "shorts") {
  const failureRate = Number(process.env.MOCK_FAILURE_RATE ?? "0.1");
  const seconds = kind === "shorts" ? 14 : 9;
  return {
    readyAt: new Date(Date.now() + (seconds + Math.random() * 4) * 1000),
    willFail: Math.random() < failureRate,
  };
}

export function renderOutput() {
  return SAMPLE_VIDEO;
}
