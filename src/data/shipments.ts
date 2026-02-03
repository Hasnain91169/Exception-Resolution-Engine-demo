export type Shipment = {
  shipment_id: string
  origin: string
  destination: string
  goods_type: 'fresh_produce' | 'pharma' | 'general'
  goods_value_eur: number
  customer_priority: 'standard' | 'gold' | 'platinum'
  sla_target_pct: number
  planned_arrival: string
  predicted_eta: string
  delay_hours: number
  current_location: { terminal_name: string; gps_lat: number; gps_lng: number }
  event_feed: Array<{ ts: string; type: string; description: string; location: string }>
}

export const shipments: Shipment[] = [
  {
    shipment_id: 'CNT-90210',
    origin: 'Port X',
    destination: 'Warehouse A',
    goods_type: 'fresh_produce',
    goods_value_eur: 60000,
    customer_priority: 'platinum',
    sla_target_pct: 0.95,
    planned_arrival: '2026-02-01T08:00:00Z',
    predicted_eta: '2026-02-03T08:00:00Z',
    delay_hours: 48,
    current_location: { terminal_name: 'Port X', gps_lat: 51.0, gps_lng: 3.0 },
    event_feed: [
      {
        ts: '2026-01-30T10:00:00Z',
        type: 'operational',
        description: 'port strike at Port X - terminals closed',
        location: 'Port X'
      },
      {
        ts: '2026-01-29T20:00:00Z',
        type: 'update',
        description: 'carrier delayed departure due to strike warnings',
        location: 'Port X'
      }
    ]
  },
  {
    shipment_id: 'CNT-12345',
    origin: 'Port Y',
    destination: 'Warehouse B',
    goods_type: 'pharma',
    goods_value_eur: 45000,
    customer_priority: 'gold',
    sla_target_pct: 0.98,
    planned_arrival: '2026-02-05T12:00:00Z',
    predicted_eta: '2026-02-06T06:00:00Z',
    delay_hours: 18,
    current_location: { terminal_name: 'Port Y', gps_lat: 50.5, gps_lng: 3.5 },
    event_feed: [
      { ts: '2026-02-04T22:00:00Z', type: 'weather', description: 'severe winter weather', location: 'At Sea' }
    ]
  },
  {
    shipment_id: 'CNT-55555',
    origin: 'Port Z',
    destination: 'Warehouse C',
    goods_type: 'general',
    goods_value_eur: 12000,
    customer_priority: 'standard',
    sla_target_pct: 0.9,
    planned_arrival: '2026-02-02T08:00:00Z',
    predicted_eta: '2026-02-02T18:00:00Z',
    delay_hours: 10,
    current_location: { terminal_name: 'Port Z', gps_lat: 49.5, gps_lng: 3.9 },
    event_feed: [
      { ts: '2026-01-31T08:00:00Z', type: 'operational', description: 'minor equipment failure', location: 'Port Z' }
    ]
  }
]
