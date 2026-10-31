-- Durable single-workspace state. Only the trusted application server may access it.
-- All financial changes use SELECT FOR UPDATE and one database commit.
CREATE TABLE public.application_state (
  id integer PRIMARY KEY CHECK (id = 1),
  revision bigint NOT NULL DEFAULT 0,
  state jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.application_requests (
  request_id uuid PRIMARY KEY,
  actor_id uuid NOT NULL REFERENCES public.profiles(id),
  fingerprint text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.application_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_requests ENABLE ROW LEVEL SECURITY;
-- Browser roles cannot bypass application validation or forge audit entries.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
