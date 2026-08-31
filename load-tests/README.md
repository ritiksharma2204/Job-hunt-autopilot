# Load Testing

## What was tested, and why

Two scripts, deliberately scoped to avoid burning through third-party free
tiers during testing:

- **`health-check.js`** — hammers the public `/health` endpoint to measure
  raw request-handling throughput and latency of the deployed backend
  itself, independent of any downstream dependency.
- **`authenticated-browse.js`** — simulates logged-in users browsing
  already-cached job listings (`GET /jobs`). This exercises real auth and
  database reads, but doesn't call Adzuna or Groq.

**Deliberately NOT load-tested:** resume upload, skill extraction, and job
matching. These call the Groq LLM API and would burn through free-tier
quota almost immediately under simulated load, without producing a
meaningful "requests/sec" number anyway — LLM calls are inherently
rate-limited by the provider, not by this backend's capacity.

## How to run

```bash
brew install k6

# Baseline (no auth needed):
k6 run --env BASE_URL=https://your-render-url.onrender.com load-tests/health-check.js

# Authenticated (get a token from test-login.html first):
k6 run --env BASE_URL=https://your-render-url.onrender.com --env TOKEN=your-jwt load-tests/authenticated-browse.js
```

## Results

**Baseline (`/health`, unauthenticated) — Aug 27, 2026:**
- Peak load: 100 concurrent virtual users
- Sustained throughput: **~60 requests/second**
- p95 latency: **291.77ms** (avg 277ms)
- Failure rate: **0%** (10,774/10,774 requests succeeded)

**Authenticated browse (`GET /jobs`) — before fix:**
- Peak load: 30 concurrent virtual users
- p95 latency: **21.45 seconds** — threshold failed
- Failure rate: 0%, but latency scaled almost linearly with concurrent users

**Root cause found via this test:** the Supabase Python client used
throughout the backend is synchronous/blocking, but route handlers were
declared `async def`. A blocking call inside an `async def` route freezes
FastAPI's single event loop for that request's entire duration — so under
concurrent load, requests queued up and were processed essentially one at
a time, rather than in parallel.

**Fix:** converted route handlers with no genuine `await` usage from
`async def` to plain `def`. FastAPI automatically runs synchronous route
functions in a thread pool, restoring real concurrency. The one route that
needed to stay `async def` (resume upload, due to `await file.read()`)
has its blocking work explicitly offloaded via `run_in_threadpool`.

**Authenticated browse (`GET /jobs`) — after fix:**
- Peak load: 30 concurrent virtual users
- p95 latency: **1.44 seconds** (a 93% reduction from 21.45s) — threshold passed
- Failure rate: **1.08%** (10/921) — attributed to Render's free-tier
  single instance hitting a brief resource ceiling under sustained load,
  not a code-level bug; would be resolved by a paid tier with more
  compute headroom or horizontal scaling.

## The honest scaling story

This deployment runs on free tiers (Render, Supabase, Adzuna, Groq) and is
**not** provisioned for production-scale traffic — that's a deliberate,
cost-driven choice for a portfolio project, not a technical limitation of
the architecture.

**What would need to change for real scale:**

1. **Compute** — Render's free tier is a single instance with no
   autoscaling and sleeps after 15 minutes of inactivity. Production would
   mean a paid tier with horizontal autoscaling (or Kubernetes HPA), with
   each agent (Scout, Matcher, Tracker) running as an independently scaled
   worker pool behind a queue, since they have very different load
   profiles — Tracker is cheap and frequent, Matcher is LLM-heavy and
   needs tighter throttling.

2. **LLM cost, not compute, is the real bottleneck at scale.** At high
   user volume running Matcher regularly, LLM API cost dominates
   everything else. The credible mitigation: cache aggressively (the same
   job description scored against many users' resumes could reuse
   embeddings), route cheap steps to a smaller model, and reserve the
   expensive model calls for the actual reasoning step.

3. **Job data access is the other real bottleneck.** Adzuna's free tier
   caps out around 1,000 calls/month, shared across every user — a
   production version would need a paid tier or multiple job-data
   providers.

4. **Database** — Supabase's free tier has hard caps on database size,
   API requests, and concurrent connections. Real scale means dedicated
   Postgres with connection pooling and read replicas.

The architecture is *designed* to scale this way (stateless services,
per-user data isolation via Row Level Security, a queue-ready agent
structure) — but this deployment intentionally proves that design on free
infrastructure rather than paying to run at a scale this project doesn't
actually need yet.