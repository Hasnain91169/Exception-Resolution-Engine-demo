import './globals.css'
import { ReactNode } from 'react'

export const metadata = {
  title: 'Exception Handling AI - Demo 3',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial', padding: 20, background: '#f5f6f7', minHeight: '100vh' }}>
          <header style={{ marginBottom: 20 }}>
            <h1 style={{ margin: 0, fontSize: 20 }}>Exception Handling AI — Demo 3</h1>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  )
}
