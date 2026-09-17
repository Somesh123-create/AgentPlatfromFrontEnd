# AgentHub UI - AI Agent Instructions

## Project Overview
**AgentHub UI** is a React + TypeScript + Vite frontend for managing MCP (Model Context Protocol) servers. It provides authentication, MCP server CRUD, version management, building, and deployment.

## Build & Development Commands
```bash
npm run dev      # Start development server
npm run build    # Type-check + production build
npm run preview  # Preview production build
```
No test or lint scripts are currently configured.

## Tech Stack
- **React 18** with TypeScript
- **Vite** for build/dev server
- **Tailwind CSS** + **shadcn/ui** for styling
- **React Router v6** for routing
- **clsx** + **tailwind-merge** for className composition

## Architecture & Conventions

### Path Aliases
Use `@/` for imports from `src/` (configured in `tsconfig.app.json` and `vite.config.ts`):
```ts
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
```

### Folder Structure
```
src/
├── auth/           # AuthProvider, useAuth hook
├── components/
│   ├── ui/         # shadcn/ui base components (Button, Input, etc.)
│   ├── auth/       # Auth-related components (ProtectedRoute, AuthFields)
│   ├── account/    # Account pages components
│   ├── landing/    # Landing page components
│   └── workspace/  # Workspace layout components
├── data/           # Static data (agents.ts)
├── lib/
│   ├── api.ts      # All API functions + types
│   └── utils.ts    # cn() utility
├── pages/          # Page components (route targets)
└── routes/         # Route definitions (AppRoutes)
```

### Authentication
- JWT tokens stored in `localStorage` under key `agenthub_access_token`
- `AuthProvider` wraps the app, exposes `useAuth()` hook
- `ProtectedRoute` component guards authenticated routes
- Token automatically attached to API requests via `authenticatedRequest()` / `mcpRequest()`

### API Layer (`src/lib/api.ts`)
- Two base URLs: `VITE_API_BASE_URL` (default: `http://localhost:8000`) and `VITE_MCP_API_BASE_URL` (default: `http://localhost:8001`)
- All API functions are typed with request/response types
- Errors throw `Error` with server message or status
- Use `mcpRequest()` for MCP-specific endpoints, `authenticatedRequest()` for user endpoints

### UI Components (shadcn/ui pattern)
- Components use `forwardRef` with `variant`/`size` props
- Class composition via `cn()` from `@/lib/utils`
- Example: `Button` with variants `primary | secondary | ghost | outline` and sizes `sm | md | lg | icon`

### Routing
- Public routes: `/`, `/login`, `/register`, `/forgot-password`
- Protected routes (wrapped in `ProtectedRoute`): `/home`, `/mcp-servers*`, `/deployments`, `/profile`, `/update-password`
- Catch-all `*` redirects to landing page

## Key Files to Reference
- `src/lib/api.ts` — All API types and functions
- `src/auth/AuthProvider.tsx` — Auth context and hooks
- `src/routes/index.tsx` — Route definitions
- `src/components/ui/button.tsx` — Example shadcn/ui component pattern
- `components.json` — shadcn/ui configuration

## Environment Variables
Create `.env.local` from `.env.example`:
```
VITE_API_BASE_URL=http://localhost:8000
VITE_MCP_API_BASE_URL=http://localhost:8001
```

## Common Pitfalls
1. **No test setup** — Add Vitest/Jest if tests are needed
2. **No lint/format scripts** — Consider adding ESLint + Prettier
3. **API errors** — All API functions throw on non-2xx; handle with try/catch
4. **Token expiry** — `refreshUser()` in AuthProvider handles 401 by signing out
5. **Dark mode** — Uses `class` strategy; toggle via `theme-toggle.tsx` component