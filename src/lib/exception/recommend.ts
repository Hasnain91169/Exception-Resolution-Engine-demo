import { policies } from '@/data/policies'
import { Option } from './options'

export type Recommendation = {
  recommended_option_id: 'A' | 'B' | 'C'
  rationale: string[]
  policy_rules: string[]
}

export function recommendOption(params: { severityLevel: string; severityScore: number; cause: string; delay_hours: number; options: Option[] }): Recommendation {
  const { severityLevel, severityScore, cause, delay_hours, options } = params
  const policy_rules: string[] = []
  const rationale: string[] = []

  // Rule 1
  if (severityLevel === 'high' && cause === 'port_strike' && policies.recommend_reroute_if_strike) {
    policy_rules.push('severity_high_and_port_strike_and_reroute_policy')
    rationale.push('High severity & port strike — prefer reroute to reduce demurrage and cold-chain risk')
    return { recommended_option_id: 'A', rationale, policy_rules }
  }

  // Rule 2
  if (severityLevel === 'high' && delay_hours >= 48) {
    policy_rules.push('high_severity_and_long_delay_recommend_air')
    // choose C if available (often air/expedite)
    const optC = options.find((o) => o.option_id === 'C')
    if (optC) {
      rationale.push('High severity & long delay — prioritize fastest option (C)')
      return { recommended_option_id: 'C', rationale, policy_rules }
    }
  }

  // Default: lowest risk with acceptable delta (prefer A)
  const sorted = [...options].sort((a, b) => {
    const riskWeight = (r: string) => (r === 'low' ? 0 : r === 'medium' ? 1 : 2)
    const ra = riskWeight(a.risk)
    const rb = riskWeight(b.risk)
    if (ra !== rb) return ra - rb
    return a.delta_hours - b.delta_hours
  })
  const chosen = sorted[0]
  policy_rules.push('prefer_lowest_risk_then_lowest_delta')
  rationale.push(`Prefer lowest risk option (${chosen.option_id})`)

  return { recommended_option_id: chosen.option_id, rationale, policy_rules }
}
