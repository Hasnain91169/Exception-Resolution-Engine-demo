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

function coerceOptionId(raw: unknown): OptionId {
  // Accept existing A/B/C
  if (raw === "A" || raw === "B" || raw === "C") return raw;

  // If generator produced strings like "OPT_A" / "option_A" / "A1" etc, map by first matching letter
  const s = String(raw ?? "").toUpperCase();
  if (s.includes("A")) return "A";
  if (s.includes("B")) return "B";
  return "C";
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
