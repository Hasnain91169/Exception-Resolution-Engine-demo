export const policies = {
  delay_threshold_hours: 8,
  percent_delay_threshold: 0.2,
  high_severity_goods: ["fresh_produce", "pharma"],
  high_priority_customers: ["platinum"],
  recommend_air_if: { max_value_eur: 100000, max_delay_hours: 72 },
  recommend_reroute_if_strike: true,
  comms_next_update_hours: 4
} as const
