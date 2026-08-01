# lawcrm

Team Scheduling & Task Management — MVP pilot.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

App runs at http://localhost:3000.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm test` | Vitest unit tests |

See [docs/deployment_guide.md](docs/deployment_guide.md) for full setup including Supabase local stack.
