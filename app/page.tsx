import Link from 'next/link'

export default function Home() {
  return (
    <div style={{ maxWidth: 900 }}>
      <p>This repository contains Demo 3: Exception Handling AI — an internal control workflow.</p>
      <p>
        <Link href="/exception-demo">Open Exception Demo</Link>
      </p>
      <section style={{ marginTop: 20 }}>
        <h3>About</h3>
        <p>Deterministic rule-based exception workflow for logistics ops. No external services. Typescript + Next.js.</p>
      </section>
    </div>
  )
}
