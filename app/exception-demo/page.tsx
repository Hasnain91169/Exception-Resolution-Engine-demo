'use client'
import { useEffect, useMemo, useState } from 'react'
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
    runResolution()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function runResolution() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/exception/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipment_id: shipmentId, mode, selected_option_id: selectedOption }),
      })
      const json = await res.json()
      setResult(json)
    } catch (e) {
      setResult({ error: String(e) })
    } finally {
      setLoading(false)
    }
  }

  const currentShipment = useMemo(() => shipments.find((s) => s.shipment_id === shipmentId) ?? shipments[0], [shipmentId])
  const recommendedId = result?.exception?.recommendation?.recommended_option_id
  const llmAdvisor = result?.llm_advisor
  const alignmentStatus =
    llmAdvisor?.status === 'ok' && recommendedId && llmAdvisor.recommended_option_id
      ? recommendedId === llmAdvisor.recommended_option_id
        ? 'aligned'
        : 'diverged'
      : 'unavailable'
  const errorMessage = result?.error as string | undefined
  const hasResult = Boolean(result?.exception)

  return (
    <div className="fade-in" id="workflow">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Exception resolution</p>
          <h1>Control workflow for shipment exceptions</h1>
          <p>
            Use simulation to preview actions or execute a deterministic response. Every outcome is backed by a
            reasoning log and audit event.
          </p>
        </div>
        <div className="card">
          <div className="stat-stack">
            <div className="stat">
              <span className="stat-label">Active shipment</span>
              <span className="stat-value">{currentShipment.shipment_id}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Current location</span>
              <span className="stat-value">{currentShipment.current_location.terminal_name}</span>
            </div>
          <div className="stat">
            <span className="stat-label">Status</span>
            <span className="stat-value">{currentShipment.customer_priority} priority</span>
          </div>
          </div>
        </div>
      </section>

      <section className="card controls-card">
        <div className="control-grid">
          <label className="field">
            Shipment
            <select value={shipmentId} onChange={(e) => setShipmentId(e.target.value)}>
              {shipments.map((s) => (
                <option key={s.shipment_id} value={s.shipment_id}>
                  {s.shipment_id}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Mode
            <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
              <option value="simulate">Simulate</option>
              <option value="execute">Execute</option>
            </select>
          </label>
          <label className="field">
            Apply option
            <select value={selectedOption ?? ''} onChange={(e) => setSelectedOption((e.target.value as any) || undefined)}>
              <option value="">Auto</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </label>
        </div>
        <div className="control-actions">
          <button className="btn primary" onClick={runResolution} disabled={loading} aria-busy={loading}>
            {loading ? 'Running resolution' : 'Run resolution'}
          </button>
          <span className="muted">Mode determines whether actions are executed or simulated.</span>
        </div>
      </section>

      <section className="grid-3">
        <div className="card">
          <div className="card-header">
            <h3>Trigger and severity</h3>
            {result?.exception?.severity?.level ? <span className="tag">{result.exception.severity.level}</span> : null}
          </div>
          {errorMessage ? (
            <p className="empty-state">Error: {errorMessage}</p>
          ) : hasResult ? (
            <div className="stat-stack">
              <div className="stat">
                <span className="stat-label">Delay</span>
                <span className="stat-value">{result.exception.trigger.delay_hours} hours</span>
              </div>
              <div className="stat">
                <span className="stat-label">Percent delay</span>
                <span className="stat-value">{(result.exception.trigger.percent_delay * 100).toFixed(1)}%</span>
              </div>
              <div className="stat">
                <span className="stat-label">Cause</span>
                <span className="stat-value">{result.exception.trigger.cause}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Severity score</span>
                <span className="stat-value">{result.exception.severity.score}</span>
              </div>
              <div>
                <span className="stat-label">Evidence</span>
                <ul>
                  {Array.isArray(result.exception.trigger?.threshold_fired)
                    ? result.exception.trigger.threshold_fired.map((t: string) => <li key={t}>{t}</li>)
                    : null}
                  {(result.reasoning_log?.trigger_logs || []).map((l: string, i: number) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="empty-state">Run resolution to view trigger details.</p>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Resolution options</h3>
            <span className="pill">Ranked</span>
          </div>
          {errorMessage ? (
            <p className="empty-state">Error: {errorMessage}</p>
          ) : hasResult ? (
            <div>
              {result.exception.options.map((o: any) => (
                <div key={o.option_id} className={`option-card ${recommendedId === o.option_id ? 'recommended' : ''}`}>
                  <div className="option-header">
                    <div className="option-title">
                      <strong>
                        {o.option_id} - {o.title}
                      </strong>
                      {recommendedId === o.option_id ? <span className="badge">Recommended</span> : null}
                    </div>
                    <div className="option-meta">
                      <div>+{o.delta_hours} hours</div>
                      <div>EUR {o.cost_eur}</div>
                      <div>{o.risk.toUpperCase()}</div>
                    </div>
                  </div>
                  <details style={{ marginTop: 8 }}>
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
            <p className="empty-state">Run resolution to see options.</p>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Comms and audit</h3>
            <span className="pill accent">Ready to send</span>
          </div>
          {errorMessage ? (
            <p className="empty-state">Error: {errorMessage}</p>
          ) : hasResult ? (
            <div className="stat-stack">
              <section>
                <h4>Customer message</h4>
                <div className="pre-block">{result.exception.comms.customer_message.text}</div>
                <div className="muted" style={{ marginTop: 8 }}>
                  New ETA: {result.exception.comms.customer_message.new_eta}
                </div>
                <button
                  className="btn secondary"
                  onClick={() => navigator.clipboard.writeText(result.exception.comms.customer_message.text)}
                  style={{ marginTop: 8 }}
                >
                  Copy message
                </button>
              </section>

              <section>
                <h4>Internal summary</h4>
                <div className="pre-block">{result.exception.comms.internal_summary}</div>
                <button className="btn secondary" onClick={() => navigator.clipboard.writeText(result.exception.comms.internal_summary)} style={{ marginTop: 8 }}>
                  Copy summary
                </button>
              </section>

              <section>
                <h4>Audit trail</h4>
                <details>
                  <summary style={{ cursor: 'pointer' }}>View JSON</summary>
                  <pre className="audit-block">{JSON.stringify(result.audit_event, null, 2)}</pre>
                </details>
              </section>
            </div>
          ) : (
            <p className="empty-state">Run resolution to generate comms and audit data.</p>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3>LLM advisor</h3>
            <span className="pill">OpenAI</span>
          </div>
          {errorMessage ? (
            <p className="empty-state">Error: {errorMessage}</p>
          ) : hasResult ? (
            llmAdvisor?.status === 'ok' ? (
              <div className="stat-stack">
                <div className="stat">
                  <span className="stat-label">Recommended option</span>
                  <span className="stat-value">{llmAdvisor.recommended_option_id}</span>
                </div>
                <div className="stat">
                  <span className="stat-label">Ranked options</span>
                  <span className="stat-value">{(llmAdvisor.ranked_option_ids || []).join(' > ')}</span>
                </div>
                {llmAdvisor.rationale ? (
                  <div>
                    <span className="stat-label">Rationale</span>
                    <p>{llmAdvisor.rationale}</p>
                  </div>
                ) : null}
                {Array.isArray(llmAdvisor.tradeoffs) && llmAdvisor.tradeoffs.length ? (
                  <div>
                    <span className="stat-label">Tradeoffs</span>
                    <ul>
                      {llmAdvisor.tradeoffs.map((t: string, i: number) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {Array.isArray(llmAdvisor.risk_flags) && llmAdvisor.risk_flags.length ? (
                  <div>
                    <span className="stat-label">Risk flags</span>
                    <ul>
                      {llmAdvisor.risk_flags.map((t: string, i: number) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {typeof llmAdvisor.confidence === 'number' ? (
                  <div className="stat">
                    <span className="stat-label">Confidence</span>
                    <span className="stat-value">{Math.round(llmAdvisor.confidence * 100)}%</span>
                  </div>
                ) : null}
                <p className="muted" style={{ fontSize: 12 }}>
                  Advisory only. Final decision remains rule-based. {llmAdvisor.model ? `Model: ${llmAdvisor.model}.` : ''}{' '}
                  {llmAdvisor.latency_ms ? `Latency: ${llmAdvisor.latency_ms}ms.` : ''} {llmAdvisor.cached ? 'Cached.' : ''}
                </p>
              </div>
            ) : (
              <div className="stat-stack">
                <p className="empty-state">{llmAdvisor?.error || 'LLM advisor unavailable.'}</p>
                {llmAdvisor?.raw_output_text ? (
                  <details>
                    <summary style={{ cursor: 'pointer' }}>Raw LLM output</summary>
                    <pre className="audit-block">{llmAdvisor.raw_output_text}</pre>
                  </details>
                ) : null}
              </div>
            )
          ) : (
            <p className="empty-state">Run resolution to fetch LLM guidance.</p>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Advisor vs rule</h3>
            <span
              className={`status-chip ${
                alignmentStatus === 'aligned' ? 'good' : alignmentStatus === 'diverged' ? 'warn' : 'neutral'
              }`}
            >
              {alignmentStatus === 'aligned' ? 'Aligned' : alignmentStatus === 'diverged' ? 'Conflict' : 'Unavailable'}
            </span>
          </div>
          {errorMessage ? (
            <p className="empty-state">Error: {errorMessage}</p>
          ) : hasResult ? (
            <div className="compare-list">
              <div className="compare-row">
                <span className="stat-label">Rule recommendation</span>
                <strong>{recommendedId ?? '—'}</strong>
              </div>
              <div className="compare-row">
                <span className="stat-label">LLM recommendation</span>
                <strong>{llmAdvisor?.recommended_option_id ?? '—'}</strong>
              </div>
              <div className="compare-row">
                <span className="stat-label">LLM confidence</span>
                <strong>{typeof llmAdvisor?.confidence === 'number' ? `${Math.round(llmAdvisor.confidence * 100)}%` : '—'}</strong>
              </div>
              {alignmentStatus === 'diverged' ? (
                <p className="muted" style={{ fontSize: 12 }}>
                  Review tradeoffs before overriding policy.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="empty-state">Run resolution to compare recommendations.</p>
          )}
        </div>
      </section>
    </div>
  )
}
