# Environment Variables - Flixify V2

## Client-Side (VITE_*)

```bash
# Supabase
VITE_SUPABASE_URL=https://sdsvnkvmfhaubgcahvzv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkc3Zua3ZtZmhhdWJnY2Fodnp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MTM1NDgsImV4cCI6MjA4NzM4OTU0OH0.KslfPrwrIhDBlshOG5_KVvTaOEKYw4vuoJ0VBUx01HQ

# API
VITE_API_URL=/api

# App
NODE_ENV=production
VITE_DEV_MODE=false
```

## Server-Side (API Routes)

```bash
SUPABASE_URL=https://sdsvnkvmfhaubgcahvzv.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkc3Zua3ZtZmhhdWJnY2Fodnp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTgxMzU0OCwiZXhwIjoyMDg3Mzg5NTQ4fQ.hmUNVU4zQM85pPosbNNYDerMv8akHeezMbySbiSlPsk
```

## Usage

### Client (React)
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
```

### Server (API)
```typescript
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
```

## Coolify Deploy

1. Add all `VITE_*` vars → Build Time Environment
2. Add `SUPABASE_*` vars → Runtime Environment (Secret)
3. Port: 7180
4. Build: `npm run build`
5. Start: `npx serve dist` (or configure in package.json)

## Local Dev

```bash
npm run dev
# Uses .env.development automatically
```

## Build

```bash
npm run build
# Uses .env.production automatically
```

## Security

- `SUPABASE_SERVICE_KEY` → NEVER expose to client
- `VITE_*` vars → Public, exposed in bundle
- `.env` files → Listed in `.gitignore`
