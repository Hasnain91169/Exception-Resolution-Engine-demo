import './globals.css'
import { ReactNode } from 'react'
import Link from 'next/link'

export const metadata = {
  title: 'Exception Handling AI - Demo 3',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="topbar fade-in">
            <div className="brand">
              <div className="brand-mark">AI</div>
              <div>
                <div className="brand-title">JavedAI</div>
                <div className="brand-subtitle">Demo 3 - Exception workflow</div>
              </div>
            </div>
            <nav className="topbar-actions">
              <Link href="/">Home</Link>
              <Link href="/exception-demo">Demos</Link>
              <Link href="/exception-demo#workflow">Case Studies</Link>
              <a href="https://vercel.com" target="_blank" rel="noreferrer">
                Resources
              </a>
            </nav>
            <Link href="/exception-demo" className="topbar-cta">
              Get Started
            </Link>
          </header>
          <main className="main-content">{children}</main>
          <footer className="footer">Rule-based resolution engine for logistics operations.</footer>
        </div>
      </body>
    </html>
  )
}
