import { NextResponse } from "next/server";
import { shipments } from "@/data/shipments";
import { detectTrigger } from "@/lib/exception/trigger";
import { scoreSeverity } from "@/lib/exception/severity";
import { generateOptions } from "@/lib/exception/options";
import { recommendOption } from "@/lib/exception/recommend";
import {
  createCustomerMessage,
  createInternalSummary,
} from "@/lib/exception/templates";
import { createAuditEvent } from "@/lib/exception/audit";

// local helper to coerce option_id into the strict union type expected by Option[]
type OptionId = "A" | "B" | "C";
type LlmAdvisorStatus = "ok" | "skipped" | "error";

type LlmAdvisorResult = {
  status: LlmAdvisorStatus;
  model?: string;
  recommended_option_id?: OptionId;
  ranked_option_ids?: OptionId[];
  rationale?: string;
  tradeoffs?: string[];
  risk_flags?: string[];
  confidence?: number;
  cached?: boolean;
  latency_ms?: number;
  raw_output_text?: string;
  error?: string;
};

type CacheEntry = {
  value: LlmAdvisorResult;
  expiresAt: number;
};

const llmCache = new Map<string, CacheEntry>();
const parsedCacheTtl = Number(process.env.LLM_CACHE_TTL_MS);
const LLM_CACHE_TTL_MS = Number.isFinite(parsedCacheTtl) ? parsedCacheTtl : 120000;

function coerceOptionId(raw: unknown): OptionId {
  // Accept existing A/B/C
  if (raw === "A" || raw === "B" || raw === "C") return raw;

  // If generator produced strings like "OPT_A" / "option_A" / "A1" etc, map by first matching letter
  const s = String(raw ?? "").toUpperCase();
  if (s.includes("A")) return "A";
  if (s.includes("B")) return "B";
  return "C";
}

function tryParseJson(text: string): any | null {
  if (!text) return null;
  const cleaned = text.replace(/```json/gi, "```").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    // fall through
  }

  const extracted = extractFirstJsonBlock(cleaned);
  if (extracted) {
    try {
      return JSON.parse(extracted);
    } catch (error) {
      // fall through
    }
  }

  for (const line of cleaned.split(/\n+/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      // continue
    }
  }
  return null;
}

function extractFirstJsonBlock(text: string): string | null {
  let inString = false;
  let escaped = false;
  let depth = 0;
  let start = -1;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "\\" && inString) {
      escaped = !escaped;
      continue;
    }
    if (ch === '"' && !escaped) {
      inString = !inString;
    }
    escaped = false;
    if (inString) continue;

    if (ch === "{" || ch === "[") {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === "}" || ch === "]") {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

function extractAdvisorPayload(payload: any): Partial<LlmAdvisorResult> | null {
  if (!payload) return null;
  const message = payload?.choices?.[0]?.message;
  if (message?.refusal) {
    return { error: message.refusal };
  }
  if (typeof message?.content === "string") {
    return tryParseJson(message.content);
  }
  return null;
}

function getCache(key: string): LlmAdvisorResult | null {
  const entry = llmCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    llmCache.delete(key);
    return null;
  }
  return entry.value;
}

function setCache(key: string, value: LlmAdvisorResult) {
  if (value.status !== "ok") return;
  llmCache.set(key, { value, expiresAt: Date.now() + LLM_CACHE_TTL_MS });
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function fetchWithRetry(url: string, options: RequestInit, timeoutMs: number, attempts = 2) {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetchWithTimeout(url, options, timeoutMs);
      if (res.ok || i === attempts - 1 || (res.status < 500 && res.status !== 429)) return res;
      lastError = new Error(`OpenAI API error: ${res.status} ${res.statusText}`);
    } catch (error) {
      lastError = error;
      if (i === attempts - 1) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 200 * (i + 1)));
  }
  throw lastError;
}

async function getLlmAdvisor(input: {
  shipment: any;
  trigger: any;
  severity: any;
  options: any[];
  recommendation: any;
}): Promise<LlmAdvisorResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const parsedTimeout = Number(process.env.OPENAI_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(parsedTimeout) ? parsedTimeout : 6000;
  if (!apiKey) {
    return { status: "skipped", error: "Missing OPENAI_API_KEY." };
  }

  const systemPrompt =
    "You are an operations advisor for logistics exceptions. Use only the provided data. " +
    "Return JSON only that matches the schema. No prose, no markdown.";

  const userPayload = {
    shipment: {
      shipment_id: input.shipment.shipment_id,
      origin: input.shipment.origin,
      destination: input.shipment.destination,
      goods_type: input.shipment.goods_type,
      goods_value_eur: input.shipment.goods_value_eur,
      customer_priority: input.shipment.customer_priority,
      sla_target_pct: input.shipment.sla_target_pct,
      planned_arrival: input.shipment.planned_arrival,
      predicted_eta: input.shipment.predicted_eta,
      delay_hours: input.shipment.delay_hours,
      current_location: input.shipment.current_location,
      event_feed: input.shipment.event_feed,
    },
    trigger: input.trigger,
    severity: input.severity,
    options: input.options,
    rule_recommendation: input.recommendation,
  };

  const cacheKey = JSON.stringify({
    shipment_id: input.shipment.shipment_id,
    trigger: input.trigger,
    severity: input.severity,
    options: input.options,
    rule_recommendation: input.recommendation,
  });
  const cached = getCache(cacheKey);
  if (cached) {
    return { ...cached, cached: true };
  }

  try {
    const startedAt = Date.now();
    const res = await fetchWithRetry(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 300,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "llm_advisor",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  recommended_option_id: { type: "string", enum: ["A", "B", "C"] },
                  ranked_option_ids: {
                    type: "array",
                    items: { type: "string", enum: ["A", "B", "C"] },
                    minItems: 1,
                    maxItems: 3,
                  },
                  rationale: { type: "string" },
                  tradeoffs: { type: "array", items: { type: "string" } },
                  risk_flags: { type: "array", items: { type: "string" } },
                  confidence: { type: "number", minimum: 0, maximum: 1 },
                },
                required: [
                  "recommended_option_id",
                  "ranked_option_ids",
                  "rationale",
                  "tradeoffs",
                  "risk_flags",
                  "confidence",
                ],
              },
            },
          },
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Evaluate and rank resolution options. Data:\n${JSON.stringify(userPayload, null, 2)}`,
            },
          ],
        }),
      },
      timeoutMs
    );

    if (!res.ok) {
      const errorPayload = await res.json().catch(() => null);
      const errorMessage =
        errorPayload?.error?.message || errorPayload?.message || `OpenAI API error: ${res.status} ${res.statusText}`;
      return {
        status: "error",
        model,
        latency_ms: Date.now() - startedAt,
        error: errorMessage,
      };
    }

    const payload = await res.json();
    const parsed = extractAdvisorPayload(payload);
    if (!parsed) {
      return {
        status: "error",
        model,
        raw_output_text: payload?.choices?.[0]?.message?.content?.slice?.(0, 1200),
        error: "Unable to parse LLM response.",
      };
    }
    if ((parsed as any).error && typeof (parsed as any).error === "string") {
      return {
        status: "error",
        model,
        raw_output_text: payload?.choices?.[0]?.message?.content?.slice?.(0, 1200),
        error: `Model refusal: ${(parsed as any).error}`,
      };
    }

    const rankedRaw = Array.isArray((parsed as any).ranked_option_ids)
      ? (parsed as any).ranked_option_ids
      : [];
    const ranked = rankedRaw.map(coerceOptionId);
    const fallbackRecommended = coerceOptionId(input.recommendation.recommended_option_id);
    const recommended = (parsed as any).recommended_option_id
      ? coerceOptionId((parsed as any).recommended_option_id)
      : ranked[0] || fallbackRecommended;
    const rankedFallback = [recommended, fallbackRecommended, "A", "B", "C"].filter(
      (value, index, self) => self.indexOf(value as OptionId) === index
    ) as OptionId[];

    const result: LlmAdvisorResult = {
      status: "ok",
      model,
      recommended_option_id: recommended,
      ranked_option_ids: ranked.length ? ranked : rankedFallback,
      rationale: typeof (parsed as any).rationale === "string" ? (parsed as any).rationale : undefined,
      tradeoffs: Array.isArray((parsed as any).tradeoffs) ? (parsed as any).tradeoffs : undefined,
      risk_flags: Array.isArray((parsed as any).risk_flags) ? (parsed as any).risk_flags : undefined,
      confidence: typeof (parsed as any).confidence === "number" ? (parsed as any).confidence : undefined,
      latency_ms: Date.now() - startedAt,
    };

    setCache(cacheKey, result);
    return result;
  } catch (error) {
    return {
      status: "error",
      model,
      error: `OpenAI request failed: ${String(error)}`,
    };
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || !body.shipment_id || !body.mode) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const shipment = shipments.find((s) => s.shipment_id === body.shipment_id);
  if (!shipment)
    return NextResponse.json({ error: "Shipment not found" }, { status: 404 });

  // 1) Trigger
  const trigger = detectTrigger(shipment);

  // 2) Severity
  const severity = scoreSeverity(shipment);

  // 3) Options (normalize option_id to satisfy Option[] type)
  const options = (generateOptions(trigger.cause) as any[]).map((o) => ({
    ...o,
    option_id: coerceOptionId(o.option_id),
  }));

  // 4) Recommendation
  const recommendation = recommendOption({
    severityLevel: severity.level,
    severityScore: severity.score,
    cause: trigger.cause,
    delay_hours: trigger.delay_hours,
    options,
  });

  const llm_advisor = await getLlmAdvisor({
    shipment,
    trigger,
    severity,
    options,
    recommendation,
  });

  // Allow override selected option
  const selected_option_id: OptionId = coerceOptionId(
    body.selected_option_id || recommendation.recommended_option_id
  );
  const selected_option = options.find((o) => o.option_id === selected_option_id);

  // 5) Comms
  const recommended_option =
    options.find((o) => o.option_id === recommendation.recommended_option_id) ||
    options[0];

  const { customer_message, new_eta } = createCustomerMessage({
    shipmentId: shipment.shipment_id,
    cause: trigger.cause,
    recommended: recommended_option,
    predicted_eta: shipment.predicted_eta,
  });

  const internal = createInternalSummary({
    shipmentId: shipment.shipment_id,
    goods: shipment.goods_type,
    severityLevel: severity.level,
    severityScore: severity.score,
    options,
    recommended: recommended_option,
  });

  const mode: "simulate" | "execute" = body.mode === "execute" ? "execute" : "simulate";
  const executed = mode === "execute";

  // tasks for execute mode
  const internal_tasks = executed
    ? ["Update TMS route", "Notify carrier", "Send customer comms"]
    : [
        "Update TMS route (planned)",
        "Notify carrier (planned)",
        "Prepare customer comms (planned)",
      ];

  // 6) Audit
  const audit_event = createAuditEvent({
    shipment_id: shipment.shipment_id,
    trigger,
    severity,
    options,
    decision_mode: mode,
    recommended_option_id: recommendation.recommended_option_id,
    selected_option_id: selected_option_id,
    customer_message,
    internal_summary: internal.internal_summary,
    executed,
  });

  const response = {
    exception: {
      exception_id: audit_event.audit_event_id,
      shipment_id: shipment.shipment_id,
      trigger: {
        delay_hours: trigger.delay_hours,
        percent_delay: trigger.percent_delay,
        cause: trigger.cause,
        threshold_fired: trigger.thresholds_fired,
      },
      severity: { level: severity.level, score: severity.score, factors: severity.factors },
      options: options.map((o) => ({
        option_id: o.option_id,
        title: o.title,
        delta_hours: o.delta_hours,
        cost_eur: o.cost_eur,
        risk: o.risk,
        steps: o.steps,
      })),
      recommendation: {
        recommended_option_id: recommendation.recommended_option_id,
        rationale: recommendation.rationale,
        policy_rules: recommendation.policy_rules,
      },
      comms: {
        customer_message: { text: customer_message, new_eta },
        internal_summary: internal.internal_summary,
      },
    },
    audit_event,
    llm_advisor,
    reasoning_log: {
      trigger_logs: trigger.logs,
      severity_logs: severity.logs,
      options_note: `Generated ${options.length} options via rule:${trigger.cause}`,
      recommendation: recommendation,
    },
  };

  // If execute, include flags
  if (mode === "execute") {
    (response as any).exception.comms.customer_message = { text: customer_message, sent: true, new_eta };
    (response as any).audit_event.comms.customer_sent = true;
    (response as any).audit_event.comms.internal_tasks_created = internal_tasks;
  } else {
    (response as any).exception.comms.customer_message = { text: customer_message, sent: false, new_eta };
    (response as any).audit_event.comms.customer_sent = false;
    (response as any).audit_event.comms.internal_tasks_created = [];
  }

  return NextResponse.json(response);
}
