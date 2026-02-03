import { Option } from './options'
import { policies } from '@/data/policies'

export function formatIso(dt: string | Date) {
  const d = typeof dt === 'string' ? new Date(dt) : dt
  return new Date(d.getTime()).toISOString()
}

export function createCustomerMessage(params: { shipmentId: string; cause: string; recommended: Option; predicted_eta: string }) {
  const { shipmentId, cause, recommended, predicted_eta } = params
  const newEta = new Date(predicted_eta)
  newEta.setHours(newEta.getHours() + recommended.delta_hours)

  const message = `Shipment ${shipmentId}: We detected an issue (${cause}). We are proposing to ${recommended.title} which is expected to change arrival by +${recommended.delta_hours}h (new ETA ~ ${formatIso(newEta)}). If you prefer an alternative, please let us know. Next update within ${policies.comms_next_update_hours} hours.`

  return { customer_message: message, new_eta: formatIso(newEta) }
}

export function createInternalSummary(params: { shipmentId: string; goods: string; severityLevel: string; severityScore: number; options: Option[]; recommended: Option }) {
  const { shipmentId, goods, severityLevel, severityScore, options, recommended } = params

  const lines: string[] = []
  lines.push(`Exception for ${shipmentId} — goods: ${goods} — severity: ${severityLevel.toUpperCase()} (${severityScore})`)
  lines.push('Options evaluated:')
  for (const o of options) {
    lines.push(`- ${o.option_id}: ${o.title} | +${o.delta_hours}h | €${o.cost_eur}`)
  }
  lines.push(`Recommended: ${recommended.option_id} — ${recommended.title}`)

  // note potential fees/risk
  if (recommended.title.toLowerCase().includes('reroute') && recommended.delta_hours > 0) {
    lines.push('Note: demurrage risk present for strike — update TMS and notify carrier.')
  }
  if (goods === 'pharma' || goods === 'fresh_produce') {
    lines.push('Cold-chain/damage risk flagged — expedite communications and handling.')
  }

  lines.push('Next tasks: Update TMS route; Notify carrier; Send customer comms')

  return { internal_summary: lines.join('\n') }
}
