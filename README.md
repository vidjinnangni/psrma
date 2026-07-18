# PRISMA Systematic Review & Meta-Analysis

Web tool for conducting a systematic review and meta-analysis following the **PRISMA 2020** workflow, using the public [OpenAlex](https://openalex.org/) API as the sole bibliographic search source.

Built for **solo, local use**: no account, no authentication, one SQLite database per workstation.

## Features

The pipeline covers all eight stages of a systematic review, from search to export:

1. **OpenAlex search** — query builder (keywords, dates, document types, open access), result count preview before import, background import for large searches (up to 10,000 results) with live progress tracking.
2. **Deduplication** — automatic by OpenAlex ID at import time (a work found by multiple searches is never duplicated).
3. **Title/abstract screening** — full-screen card interface, include/exclude/maybe, keyboard shortcuts (← → ↓/M), exclusion reasons, history with undo.
4. **Full-text screening** — same mechanics, restricted to records included at the previous stage, with a direct link to the full text (DOI).
5. **PRISMA flow diagram** — generated automatically from screening decisions, PNG/SVG export.
6. **Data extraction** — project-configurable fields (text, number, boolean, list), editable grid for included studies.
7. **Meta-analysis** — effect sizes (mean difference, Hedges' g, odds ratio, risk ratio, or custom measure), fixed- or random-effects pooling (DerSimonian-Laird), forest plot, I², τ², Q, p-value.
8. **Export** — CSV datasets (records, extraction, effect sizes), automatically assembled Markdown report, PRISMA 2020 checklist worksheet (27 items) to document ahead of publication.

Project management: create, delete (with confirmation and full cascade of associated data).

## Tech stack

**Backend** — Python 3.11+, [FastAPI](https://fastapi.tiangolo.com/), [SQLAlchemy 2.0](https://www.sqlalchemy.org/) (SQLite), [httpx](https://www.python-httpx.org/) for OpenAlex calls. Meta-analysis statistics are implemented in pure Python (the `math` module), with no external stats dependency.

**Frontend** — [React 19](https://react.dev/) + TypeScript, [Vite](https://vite.dev/), [Tailwind CSS 4](https://tailwindcss.com/), [react-router-dom](https://reactrouter.com/), [html-to-image](https://github.com/bubkoo/html-to-image) for exporting the PRISMA diagram.

Minimalist art direction: black/gray/white, blue for links and primary actions, light/dark adaptive.

## Architecture

```
backend/
  app/
    main.py                  # FastAPI entry point, CORS, router mounting
    database.py               # SQLAlchemy engine, session, declarative base
    models.py                  # SQLAlchemy models (Project, Record, ScreeningDecision, ...)
    schemas.py                  # Pydantic schemas (API requests/responses)
    openalex.py                  # OpenAlex HTTP client (search, pagination, abstract reconstruction)
    meta_analysis.py              # effect size calculation and statistical pooling
    prisma_checklist_items.py      # static definition of the 27 PRISMA 2020 checklist items
    routers/                        # one FastAPI router per functional domain
  data/                               # SQLite database (created on first run, not versioned)

frontend/
  src/
    lib/api.ts                # typed API client (fetch + types shared with the backend)
    pages/                      # one page per pipeline stage
    components/ForestPlot.tsx    # forest plot SVG component
    App.tsx, main.tsx              # routing and React entry point

.claude/launch.json            # launch config for both servers (Claude Code usage)
```

## Installation

### Prerequisites

- Python 3.11 or later
- Node.js 20 or later

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Frontend

```bash
cd frontend
npm install
```

## Running the app

Two servers to start in parallel, in two terminals:

```bash
# Terminal 1 — backend (http://localhost:8000)
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend (http://localhost:5173)
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The Vite frontend proxies `/api/*` calls to the backend on port 8000 (see `frontend/vite.config.ts`).

The SQLite database is created automatically on first backend startup, at `backend/data/prisma_tool.db`.

## Type-checking (frontend)

The frontend's root `tsconfig.json` is a *solution*-style config (`"files": []` + `references`): `npx tsc --noEmit` alone checks nothing. Use:

```bash
npx tsc -p tsconfig.app.json --noEmit
```

## Security

- **No authentication**: the tool is designed to run locally on `127.0.0.1`, for a single user. Don't expose the backend on a network interface reachable from outside without adding an authentication layer.
- **CSV exports protected against formula injection**: cells starting with `=`, `+`, `-`, `@`, or a tab (OpenAlex titles, exclusion reasons, extraction values) are neutralized before being written, to prevent formula/command execution when the file is opened in Excel or LibreOffice.
- **No sensitive data sent to third parties** beyond the search requests sent to the public OpenAlex API.

## Limitations

- **Single bibliographic source**: OpenAlex only. No multi-database aggregation (PubMed, Scopus, Cochrane...).
- **Exact deduplication only**: based on OpenAlex ID. No fuzzy title matching for cross-source duplicates (not relevant here since only one source is used).
- **PRISMA 2020 checklist as a worksheet aid**: the 27 items are freely paraphrased from the structure of the PRISMA 2020 statement (Page et al., 2021), not a reproduction of the official document. Check against [the original document](http://www.prisma-statement.org/) before any submission.
- **Best-effort background import**: if an unexpected failure occurs during the error-recovery phase, a search may remain displayed as "in progress" without completing; start a new search in that case.
- **No blinded multi-reviewer screening**: a single person, one decision per study and per stage.
