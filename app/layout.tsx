import './globals.css'
import { ReactNode } from 'react'

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
              <div className="brand-mark">EH</div>
              <div>
                <div className="brand-title">Exception Handling AI</div>
                <div className="brand-subtitle">Demo 3 - Internal control workflow</div>
              </div>
            </div>
            <div className="topbar-actions">
              <div className="pill">Deterministic</div>
              <div className="pill accent">No external services</div>
            </div>
          </header>
          <main className="main-content">{children}</main>
          <footer className="footer">Rule-based resolution engine for logistics operations.</footer>
        </div>
      </body>
    </html>
  )
}
