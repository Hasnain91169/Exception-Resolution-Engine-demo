import { Shipment } from '@/data/shipments'
import { policies } from '@/data/policies'

export type TriggerResult = {
  delay_hours: number
  percent_delay: number
  cause: string
  thresholds_fired: string[]
  evidence: string[]
  logs: string[]
}

export function detectTrigger(shipment: Shipment): TriggerResult {
  const logs: string[] = []
  const evidence: string[] = []

  const delay_hours = shipment.delay_hours

  // Use proxy planned_transit_hours = 120 if not derivable
  const planned_transit_hours = 120
  logs.push(`planned_transit_hours_proxy=${planned_transit_hours}`)

  const percent_delay = parseFloat((delay_hours / planned_transit_hours).toFixed(4))
  logs.push(`percent_delay=${percent_delay}`)

  const thresholds_fired: string[] = []
  if (delay_hours >= policies.delay_threshold_hours) {
    thresholds_fired.push('delay_threshold_hours')
  }
  if (percent_delay >= policies.percent_delay_threshold) {
    thresholds_fired.push('percent_delay_threshold')
  }
  logs.push(`thresholds_checked: delay>=${policies.delay_threshold_hours}, percent>=${policies.percent_delay_threshold}`)

  // Root cause heuristics
  let cause = 'operational'
  for (const ev of shipment.event_feed) {
    const text = ev.description.toLowerCase()
    if (text.includes('strike')) {
      cause = 'port_strike'
      evidence.push(ev.description)
      break
    }
    if (text.includes('weather')) {
      cause = 'weather'
      evidence.push(ev.description)
      break
    }
    if (text.includes('customs')) {
      cause = 'customs_hold'
      evidence.push(ev.description)
      break
    }
  }
  if (evidence.length === 0) {
    // collect top 1 feed items as evidence
    if (shipment.event_feed.length) evidence.push(shipment.event_feed[0].description)
  }

  logs.push(`root_cause=${cause}`)
  logs.push(`evidence_count=${evidence.length}`)

  return {
    delay_hours,
    percent_delay,
    cause,
    thresholds_fired,
    evidence,
    logs
  }
}
