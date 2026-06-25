# AGENTS.md — RelayClarity

This project's durable memory lives in the **global Obsidian vault**, scoped to RelayClarity:

```
/home/ellis/Desktop/SaaS/Vibyra/_ai/RelayClarity/
```

Read first: `_ai/RelayClarity/RelayClarity Memory.md` (entry point / read order), then
`Project Context.md` and `Architecture.md`. The project home note is
`01 Projects/RelayClarity.md` in the same vault.

Write durable RelayClarity context back to `_ai/RelayClarity/` (Decisions/, Runs/), not into this
repo and not into Vibyra's core notes. The vault is the git-synced source of truth; commits there
should be path-scoped to `_ai/RelayClarity/` plus the index files.

Quick start: `npm run dev` (backend :8787 + Vite client :5173) · `npm test` · `npm run typecheck`.
