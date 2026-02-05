import Link from 'next/link'

export default function Home() {
  return (
    <div className="fade-in">
      <section className="hero">
        <div>
          <p className="eyebrow">Exception Handling AI</p>
          <h1 className="hero-title">Operational control center for shipment exceptions</h1>
          <p>
            Demo 3 shows a deterministic, auditable workflow for logistics operations. Simulate or execute resolution
            actions without external dependencies.
          </p>
          <div className="hero-actions">
            <Link className="btn primary" href="/exception-demo">
              Open Exception Demo
            </Link>
            <Link className="btn ghost" href="/exception-demo#workflow">
              View workflow
            </Link>
          </div>
        </div>
        <div className="hero-card">
          <div className="stat-stack">
            <div className="stat">
              <span className="stat-label">Automation mode</span>
              <span className="stat-value">Rule-based resolution</span>
            </div>
            <div className="stat">
              <span className="stat-label">Audit readiness</span>
              <span className="stat-value">Full evidence trail</span>
            </div>
            <div className="stat">
              <span className="stat-label">Response time</span>
              <span className="stat-value">Sub-second simulation</span>
            </div>
          </div>
          <div className="grid-2" style={{ marginTop: 16 }}>
            <div className="card" style={{ padding: 14 }}>
              <h4>Trigger types</h4>
              <p>Delay, risk, reroute, inventory impact.</p>
            </div>
            <div className="card" style={{ padding: 14 }}>
              <h4>Outputs</h4>
              <p>Resolution options, comms, audit events.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid-3" style={{ marginTop: 20 }}>
        <div className="card">
          <h3>Deterministic logic</h3>
          <p>Every outcome is explainable with thresholds and evidence.</p>
        </div>
        <div className="card">
          <h3>Human-in-the-loop</h3>
          <p>Override or apply recommended actions with a single click.</p>
        </div>
        <div className="card">
          <h3>Comms ready</h3>
          <p>Customer messaging and internal summaries generated on demand.</p>
        </div>
      </section>
    </div>
  )
}
