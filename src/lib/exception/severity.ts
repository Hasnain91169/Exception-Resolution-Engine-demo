import { Shipment } from '@/data/shipments'

export type SeverityResult = {
  level: 'low' | 'medium' | 'high'
  score: number
  factors: string[]
  logs: string[]
}

export function scoreSeverity(shipment: Shipment): SeverityResult {
  const logs: string[] = []
  let score = 10
  const factors: string[] = []

  if (['fresh_produce', 'pharma'].includes(shipment.goods_type)) {
    score += 40
    factors.push('goods_type_high_risk')
    logs.push('goods_type => +40')
  }

  if (shipment.customer_priority === 'platinum') {
    score += 20
    factors.push('customer_priority_platinum')
    logs.push('customer_priority => +20')
  }

  if (shipment.delay_hours >= 24) {
    score += 15
    factors.push('delay>=24h')
    logs.push('delay>=24 => +15')
  }

  if (shipment.delay_hours >= 48) {
    score += 10
    factors.push('delay>=48h')
    logs.push('delay>=48 => +10')
  }

  if (shipment.goods_value_eur >= 50000) {
    score += 10
    factors.push('high_value_goods')
    logs.push('goods_value>=50000 => +10')
  }

  if (score > 100) score = 100

  const level: SeverityResult['level'] = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low'

  logs.push(`final_score=${score}`)
  logs.push(`level=${level}`)

  return { level, score, factors, logs }
}
