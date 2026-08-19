import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { Diagram } from "../types";
import { DIAGRAM_SYSTEM_PROMPT, extendPrompt } from "./prompts";
import { AiDiagramSchema, toDiagram, toExtension, type Extension } from "./schema";
import type { AiSettings } from "./settings";

export type AiResult<T> = { ok: true; value: T } | { ok: false; message: string };

async function requestAiDiagram(
  settings: AiSettings,
  userContent: string,
): Promise<AiResult<import("./schema").AiDiagram>> {
  const client = new Anthropic({
    apiKey: settings.apiKey,
    dangerouslyAllowBrowser: true,
  });

  try {
    const response = await client.messages.parse({
      model: settings.model,
      max_tokens: 16000,
      system: DIAGRAM_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
      output_config: { format: zodOutputFormat(AiDiagramSchema) },
    });
    if (!response.parsed_output) {
      return { ok: false, message: "The model returned unparseable output — try again." };
    }
    return { ok: true, value: response.parsed_output };
  } catch (error) {
    return { ok: false, message: describeError(error) };
  }
}

function describeError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) {
    return "Invalid API key — check it in AI settings.";
  }
  if (error instanceof Anthropic.RateLimitError) {
    return "Rate limited — wait a moment and retry.";
  }
  if (error instanceof Anthropic.BadRequestError) {
    return `The API rejected the request: ${error.message}`;
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return "Network error — check your connection and try again.";
  }
  if (error instanceof Anthropic.APIError) {
    return `API error${error.status ? ` ${error.status}` : ""}: ${error.message}`;
  }
  return error instanceof Error ? error.message : "Something went wrong — try again.";
}

/** Generate a full diagram from a natural-language brief. */
export async function generateDiagram(
  settings: AiSettings,
  brief: string,
): Promise<AiResult<Diagram>> {
  const r = await requestAiDiagram(settings, brief);
  if (!r.ok) return r;
  if (!r.value.nodes.length) {
    return { ok: false, message: "The model returned an empty diagram — try rephrasing." };
  }
  return { ok: true, value: toDiagram(r.value) };
}

/** Generate child nodes expanding one selected node. */
export async function extendNode(
  settings: AiSettings,
  diagram: Diagram,
  nodeId: string,
  brief: string,
): Promise<AiResult<Extension>> {
  const r = await requestAiDiagram(settings, extendPrompt(diagram, nodeId, brief));
  if (!r.ok) return r;
  const ext = toExtension(r.value, nodeId);
  if (!ext.nodes.length) {
    return { ok: false, message: "The model returned no new nodes — try rephrasing." };
  }
  return { ok: true, value: ext };
}
