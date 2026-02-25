
-- Agent logs table for persistent log storage
CREATE TABLE public.agent_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid REFERENCES public.deployed_forks(id) ON DELETE CASCADE NOT NULL,
  level text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast agent-specific log queries
CREATE INDEX idx_agent_logs_agent_id ON public.agent_logs(agent_id);
CREATE INDEX idx_agent_logs_created_at ON public.agent_logs(created_at DESC);

-- RLS: public read + insert
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view logs" ON public.agent_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert logs" ON public.agent_logs FOR INSERT WITH CHECK (true);

-- Allow updates on deployed_forks (for heartbeat status changes)
CREATE POLICY "Anyone can update fork status" ON public.deployed_forks FOR UPDATE USING (true) WITH CHECK (true);

-- Enable realtime on both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_logs;
