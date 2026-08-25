"""
Two Supabase clients, on purpose:

- `anon_client`  — respects Row Level Security. Use this whenever an action
                    should be scoped to "whatever the logged-in user is allowed to see."
- `service_client` — bypasses RLS entirely. Use ONLY for trusted server-side
                    work (e.g. an agent writing results back after a background job).
                    Never expose the service role key to the frontend.
"""
from supabase import create_client, Client
from app.core.config import settings

anon_client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
service_client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
