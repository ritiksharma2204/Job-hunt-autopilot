# Job-Hunt Autopilot Agent

Multi-agent, multi-tenant system that scouts job postings, scores fit against a
user's resume, surfaces skill gaps, and tracks applications.

Days 1-3 status: **auth + deployment skeleton**. `/health` is public,
`/me` is the first protected route proving the full chain: frontend login →
Supabase JWT → backend verification → per-user identity.

## Stack
- Backend: FastAPI (Python)
- Auth + DB + Vector store: Supabase (Postgres + pgvector + Auth)
- LLM: Groq
- Job data: Adzuna API
- Backend hosting: Render (free tier)
- Frontend: Next.js + Tailwind, hosted on Vercel (added in Days 4+)

## One-time setup (do this before anything else)

### 1. Create a Supabase project
1. Go to supabase.com → New project (free tier).
2. Once created, go to **SQL Editor** → paste the contents of `supabase/schema.sql` → Run.
   This creates every table with Row Level Security already enabled.
3. Go to **Project Settings → API** and copy three values — you'll need them in step 3:
   - `Project URL` → this is `SUPABASE_URL`
   - `anon public` key → this is `SUPABASE_ANON_KEY`
   - `service_role` key → this is `SUPABASE_SERVICE_ROLE_KEY` (keep this one secret, never share it)

### 2. Get a Groq API key (free)
Go to console.groq.com → API Keys → create one.

### 3. Get Adzuna API credentials (free)
Go to developer.adzuna.com → register → you'll get an `app_id` and `app_key`.

### 4. Configure local backend
```bash
cd backend
cp .env.example .env
# open .env and paste in the values from steps 1-3
python -m venv venv
source venv/bin/activate   # on Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
Visit `http://localhost:8000/health` — you should see `{"status": "ok"}`.

### 5. Deploy the backend to Render
1. Push this repo to GitHub.
2. On render.com → New → Blueprint → connect your repo → it will detect `render.yaml`.
3. When prompted, paste in the same env values from your `.env` file.
4. Deploy. You'll get a live URL like `https://job-hunt-autopilot-api.onrender.com`.
5. Visit `<your-render-url>/health` to confirm it's live.

Note: free tier sleeps after 15 min idle — first request after sleep takes ~30-50s.
When demoing, hit `/health` a minute before to "wake it up."

## What's next (Days 4-14)
- Resume upload + Matcher agent (LangGraph + Groq)
- Scout agent (Adzuna integration)
- In-app Tracker dashboard (Next.js, deployed to Vercel)
- Load testing + README write-up with real throughput numbers
