import { sha256Hex } from '@/lib/hash'

export type AuditEvent = {
  audit_event_id: string
  timestamp: string
  shipment_id: string
  trigger: any
  severity_assessment: any
  options_generated: Array<{ option_id: string; delta_hours: number; cost_eur: number; risk: string }>
  decision: { mode: 'simulate' | 'execute'; recommended_option_id: string; selected_option_id?: string; executed: boolean }
  comms: { customer_sent: boolean; internal_tasks_created: string[] }
  outputs: { customer_message_hash: string; internal_summary_hash: string }
  logged_by: string
}

export function createAuditEvent(params: {
  shipment_id: string
  trigger: any
  severity: any
  options: any[]
  decision_mode: 'simulate' | 'execute'
  recommended_option_id: string
  selected_option_id?: string
  customer_message: string
  internal_summary: string
  executed: boolean
}) {
  const ts = new Date().toISOString()
  const id = `EXC-${ts.split('T')[0]}-${Math.floor(Math.random() * 900 + 100)}`

  const options_generated = params.options.map((o) => ({ option_id: o.option_id, delta_hours: o.delta_hours, cost_eur: o.cost_eur, risk: o.risk }))

  const customer_message_hash = sha256Hex(params.customer_message)
  const internal_summary_hash = sha256Hex(params.internal_summary)

  const audit: AuditEvent = {
    audit_event_id: id,
    timestamp: ts,
    shipment_id: params.shipment_id,
    trigger: params.trigger,
    severity_assessment: params.severity,
    options_generated,
    decision: {
      mode: params.decision_mode,
      recommended_option_id: params.recommended_option_id,
      selected_option_id: params.selected_option_id,
      executed: params.executed
    },
    comms: { customer_sent: params.decision_mode === 'execute', internal_tasks_created: params.decision_mode === 'execute' ? ['Update TMS route', 'Notify carrier', 'Send customer comms'] : [] },
    outputs: { customer_message_hash, internal_summary_hash },
    logged_by: 'DemoSystem.ExceptionAI'
  }

  return audit
}
