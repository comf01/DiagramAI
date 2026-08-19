const AI_SETTINGS_KEY = "driftboard.ai.v1";

export const AI_MODELS = [
  { id: "claude-opus-5", name: "Claude Opus 5", blurb: "best quality" },
  { id: "claude-sonnet-5", name: "Claude Sonnet 5", blurb: "fast & capable" },
  { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", blurb: "cheapest" },
] as const;

export type AiModelId = (typeof AI_MODELS)[number]["id"];

export interface AiSettings {
  apiKey: string;
  model: AiModelId;
}

const DEFAULTS: AiSettings = { apiKey: "", model: "claude-opus-5" };

export function loadAiSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(AI_SETTINGS_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<AiSettings>;
      const model = AI_MODELS.some((m) => m.id === s.model) ? (s.model as AiModelId) : DEFAULTS.model;
      return { apiKey: typeof s.apiKey === "string" ? s.apiKey : "", model };
    }
  } catch {
    /* corrupted storage — fall through to defaults */
  }
  return { ...DEFAULTS };
}

export function saveAiSettings(s: AiSettings): void {
  try {
    localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* storage full — ignore */
  }
}

/** "sk-ant-…abcd" style display form; never render the full key back. */
export function maskKey(key: string): string {
  if (key.length <= 10) return "•".repeat(key.length);
  return `${key.slice(0, 7)}…${key.slice(-4)}`;
}
