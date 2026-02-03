'use client'
import { useEffect, useState } from 'react'
import { shipments } from '@/data/shipments'

type Mode = 'simulate' | 'execute'

type ApiResponse = any

export default function ExceptionDemo() {
  const [shipmentId, setShipmentId] = useState('CNT-90210')
  const [mode, setMode] = useState<Mode>('simulate')
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | undefined>(undefined)
  const [result, setResult] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // run once with defaults to be ready on first load
    runResolution()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function runResolution() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/exception/resolve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shipment_id: shipmentId, mode, selected_option_id: selectedOption }) })
      const json = await res.json()
      setResult(json)
    } catch (e) {
      setResult({ error: String(e) })
    } finally {
      setLoading(false)
    }
  }

  const currentShipment = shipments.find((s) => s.shipment_id === shipmentId)!

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, maxWidth: 1100 }}>
      <section style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <label>
          Shipment:{' '}
          <select value={shipmentId} onChange={(e) => setShipmentId(e.target.value)}>
            {shipments.map((s) => (
              <option key={s.shipment_id} value={s.shipment_id}>
                {s.shipment_id}
              </option>
            ))}
          </select>
        </label>

        <label>
          Mode:{' '}
          <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
            <option value="simulate">Simulate</option>
            <option value="execute">Execute</option>
          </select>
        </label>

        <label>
          Apply Option:{' '}
          <select value={selectedOption ?? ''} onChange={(e) => setSelectedOption((e.target.value as any) || undefined)}>
            <option value="">(auto)</option>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </label>

        <button onClick={runResolution} disabled={loading} style={{ padding: '6px 12px' }}>
          {loading ? 'Running...' : 'Run Resolution'}
        </button>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div style={{ background: '#fff', padding: 12, borderRadius: 6 }}>
          <h3>Trigger + Severity</h3>
          <div style={{ fontFamily: 'monospace', fontSize: 13 }}>
            <div>Shipment: {shipmentId}</div>
            <div>Location: {currentShipment.current_location.terminal_name}</div>
            <hr />
            {result ? (
              <>
                <div>Delay: {result.exception.trigger.delay_hours}h</div>
                <div>Percent delay: {(result.exception.trigger.percent_delay * 100).toFixed(1)}%</div>
                <div>Cause: {result.exception.trigger.cause}</div>
                <div>
                  Severity: <strong>{result.exception.severity.level.toUpperCase()}</strong> ({result.exception.severity.score})
                </div>
                <div>
                  Evidence:
                  <ul>
                    {result.exception.trigger && result.exception.trigger.threshold && <li>{result.exception.trigger.threshold}</li>}
                    {(result.reasoning_log?.trigger_logs || []).map((l: string, i: number) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <div style={{ color: '#666' }}>Run resolution to view details</div>
            )}
          </div>
        </div>

        <div style={{ background: '#fff', padding: 12, borderRadius: 6 }}>
          <h3>Resolution Options</h3>
          <div style={{ fontFamily: 'monospace', fontSize: 13 }}>
            {result ? (
              <div>
                {result.exception.options.map((o: any) => (
                  <div key={o.option_id} style={{ borderBottom: '1px solid #eee', padding: '8px 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <strong>{o.option_id}</strong> — {o.title}
                        {result.exception.recommendation.recommended_option_id === o.option_id && (
                          <span style={{ marginLeft: 8, background: '#e6f3ff', color: '#023e8a', padding: '2px 6px', borderRadius: 4 }}>RECOMMENDED</span>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div>+{o.delta_hours}h</div>
                        <div>€{o.cost_eur}</div>
                        <div>{o.risk.toUpperCase()}</div>
                      </div>
                    </div>
                    <details style={{ marginTop: 6 }}>
                      <summary style={{ cursor: 'pointer' }}>Steps</summary>
                      <ul>
                        {o.steps.map((s: string, i: number) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </details>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#666' }}>Run resolution to see options</div>
            )}
          </div>
        </div>

        <div style={{ background: '#fff', padding: 12, borderRadius: 6 }}>
          <h3>Communications + Audit</h3>
          {result ? (
            <div style={{ fontFamily: 'monospace', fontSize: 13 }}>
              <section>
                <h4>Customer Message</h4>
                <pre style={{ background: '#f2f3f4', padding: 8 }}>{result.exception.comms.customer_message.text}</pre>
                <div>New ETA: {result.exception.comms.customer_message.new_eta}</div>
                <button
                  onClick={() => navigator.clipboard.writeText(result.exception.comms.customer_message.text)}
                  style={{ marginTop: 6, padding: '6px 10px' }}
                >
                  Copy
                </button>
              </section>

              <section style={{ marginTop: 10 }}>
                <h4>Internal Summary</h4>
                <pre style={{ background: '#f2f3f4', padding: 8 }}>{result.exception.comms.internal_summary}</pre>
                <button onClick={() => navigator.clipboard.writeText(result.exception.comms.internal_summary)} style={{ marginTop: 6, padding: '6px 10px' }}>
                  Copy
                </button>
              </section>

              <section style={{ marginTop: 10 }}>
                <h4>Audit Trail</h4>
                <details>
                  <summary style={{ cursor: 'pointer' }}>View JSON</summary>
                  <pre style={{ background: '#111', color: '#dff', padding: 12, overflow: 'auto' }}>{JSON.stringify(result.audit_event, null, 2)}</pre>
                </details>
              </section>
            </div>
          ) : (
            <div style={{ color: '#666' }}>Run to generate comms and audit</div>
          )}
        </div>
      </section>
    </div>
  )
}
