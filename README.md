# Job-Hunt Autopilot Agent

A multi-agent, multi-tenant system that scouts job postings, scores fit
against a user's resume using an LLM, surfaces skill gaps, and tracks
applications through a pipeline dashboard.

**Live app:** https://your-vercel-url.vercel.app
**API health check:** https://your-render-url.onrender.com/health

> Free-tier hosting note: the backend sleeps after 15 minutes of
> inactivity and takes 30-50 seconds to wake on the first request. If the
> live demo looks slow on first load, that's why - refresh after ~1 minute.

---

## What it does

- **Upload multiple resumes** and pick which one is active for matching
  against jobs (a user can compare how different resumes score against
  the same posting)
- **Search real job postings** via the Adzuna API, scoped to any country
- **Score fit automatically** - an LLM-backed agent scores each job
  against your active resume's skill profile and surfaces specific skill
  gaps, not just a number
- **Track applications** through a status pipeline (saved -> applied ->
  interviewing -> offer / rejected) in a live dashboard
- **Multi-tenant from the ground up** - every user's data (resumes,
  matches, applications) is isolated via Postgres Row Level Security, not
  just filtered in application code

## Architecture

Three agents, each a distinct responsibility, orchestrated rather than
hardcoded as one script:

| Agent | What it does | How |
|---|---|---|
| **Scout** | Searches Adzuna for jobs, caches results | Direct API integration + Supabase upsert (deduped by external job ID) |
| **Matcher** | Scores a specific resume against a specific job, extracts skill gaps | **LangGraph** state graph: `fetch_context -> score_fit -> save_result` |
| **Tracker** | Manages the user's application pipeline | CRUD over a Postgres table, RLS-scoped per user |

## Tech stack

- **Backend:** FastAPI (Python)
- **Agent orchestration:** LangGraph
- **LLM:** Groq (`openai/gpt-oss-120b`)
- **Database, Auth, Row Level Security:** Supabase (Postgres)
- **Job data:** Adzuna API
- **Frontend:** Next.js 16, React 19, Tailwind CSS
- **Hosting:** Render (backend), Vercel (frontend) - both free tier
- **Load testing:** k6

## Screenshots

<!-- Add screenshots here: login page, dashboard with a scored job, tracker pipeline -->

## Local development

See [`backend/README.md`](backend/README.md) for backend setup (Supabase
schema, environment variables, running locally, deploying to Render).

Frontend:
```bash
cd frontend
npm install
cp .env.example .env.local   # fill in your Supabase + backend API URL
npm run dev
```

## Load testing

Full methodology, results, and a real bug found and fixed via load
testing (a concurrency issue that took p95 latency from 21.4s down to
1.44s under 30 concurrent users) are documented in
[`load-tests/README.md`](load-tests/README.md).

## Scaling notes

This deployment intentionally runs on free infrastructure - that's a
cost decision for a portfolio project, not a ceiling on the architecture.
The system is designed stateless and multi-tenant from the start (Row
Level Security per user, a queue-ready agent structure), which is what
would actually let it scale horizontally. What it is **not** claiming is
that it currently runs at production scale - see
[`load-tests/README.md`](load-tests/README.md) for the honest breakdown
of what would need to change (compute, LLM cost, job-data API limits,
database tier) to get there.

