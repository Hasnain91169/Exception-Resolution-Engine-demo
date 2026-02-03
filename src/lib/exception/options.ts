export type Option = {
  option_id: 'A' | 'B' | 'C'
  title: string
  delta_hours: number
  cost_eur: number
  risk: 'low' | 'medium' | 'high'
  steps: string[]
}

export function generateOptions(cause: string) {
  if (cause === 'port_strike') {
    return [
      {
        option_id: 'A',
        title: 'Reroute via Antwerp',
        delta_hours: 8,
        cost_eur: 300,
        risk: 'low',
        steps: ['Rebook carrier via Antwerp', 'Update TMS route', 'Notify customer']
      },
      {
        option_id: 'B',
        title: 'Wait for strike to end',
        delta_hours: 48,
        cost_eur: 0,
        risk: 'high',
        steps: ['Monitor strike updates', 'Keep cargo allocated', 'Notify operations']
      },
      {
        option_id: 'C',
        title: 'Air freight partial/offload',
        delta_hours: 12,
        cost_eur: 1500,
        risk: 'medium',
        steps: ['Arrange airlift for perishable top-tier pallets', 'Coordinate ground pickup', 'Notify customer']
      }
    ]
  }

  if (cause === 'weather') {
    return [
      {
        option_id: 'A',
        title: 'Reroute via alternate port',
        delta_hours: 6,
        cost_eur: 250,
        risk: 'low',
        steps: ['Rebook carrier via alternate port', 'Update TMS route', 'Notify customer']
      },
      {
        option_id: 'B',
        title: 'Wait out weather',
        delta_hours: 18,
        cost_eur: 0,
        risk: 'medium',
        steps: ['Monitor feeds', 'Confirm ETA updates', 'Notify operations']
      },
      {
        option_id: 'C',
        title: 'Air freight',
        delta_hours: 8,
        cost_eur: 1200,
        risk: 'medium',
        steps: ['Arrange airlift', 'Coordinate ground pickup', 'Notify customer']
      }
    ]
  }

  if (cause === 'customs_hold') {
    return [
      {
        option_id: 'A',
        title: 'Expedite clearance via broker',
        delta_hours: 6,
        cost_eur: 400,
        risk: 'low',
        steps: ['Engage customs broker', 'File expedite docs', 'Notify operations']
      },
      {
        option_id: 'B',
        title: 'Wait for clearance',
        delta_hours: 24,
        cost_eur: 0,
        risk: 'medium',
        steps: ['Monitor customs', 'Notify customer']
      },
      {
        option_id: 'C',
        title: 'Divert',
        delta_hours: 14,
        cost_eur: 600,
        risk: 'medium',
        steps: ['Plan divert port', 'Update TMS', 'Notify customer']
      }
    ]
  }

  // default
  return [
    { option_id: 'A', title: 'Reroute (default)', delta_hours: 6, cost_eur: 200, risk: 'low', steps: ['Rebook', 'Update TMS', 'Notify customer'] },
    { option_id: 'B', title: 'Wait (default)', delta_hours: 24, cost_eur: 0, risk: 'medium', steps: ['Monitor', 'Notify operations'] },
    { option_id: 'C', title: 'Expedite (default)', delta_hours: 12, cost_eur: 1000, risk: 'medium', steps: ['Arrange expedited transport', 'Notify customer'] }
  ]
}
