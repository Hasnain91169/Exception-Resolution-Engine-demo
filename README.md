# Demo 3 — Exception Handling AI

This is a sales-grade demo of a deterministic, rules-based exception handling workflow for logistics operations.

Features:
- Next.js (App Router) + TypeScript
- No external services, no secrets, no database
- Deterministic rules + template-based comms
- Demo page: /exception-demo
- API: POST /api/exception/resolve

Run:
1. npm install
2. npm run dev
3. Open http://localhost:3000/exception-demo

Acceptance:
- Default shipment `CNT-90210` (Port strike, fresh produce)
- One click Run Resolution produces 3 options and recommendation A
- Audit event created with ID format EXC-YYYY-MM-DD-### and sha256 hashes

Files of interest:
- `src/data/shipments.ts`
- `src/data/policies.ts`
- `src/lib/exception/*`
- `app/api/exception/resolve/route.ts`
- `app/exception-demo/page.tsx`
