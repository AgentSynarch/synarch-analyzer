
-- Create deployed_forks table
CREATE TABLE public.deployed_forks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_type TEXT NOT NULL,
  fork_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deployed_forks ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can view forks"
ON public.deployed_forks
FOR SELECT
USING (true);

-- Public insert access
CREATE POLICY "Anyone can insert forks"
ON public.deployed_forks
FOR INSERT
WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.deployed_forks;

-- Seed initial data
INSERT INTO public.deployed_forks (agent_type, fork_name, status, created_at) VALUES
  ('worker', 'FORK-0001', 'active', now() - interval '2 hours'),
  ('analyzer', 'FORK-0002', 'active', now() - interval '1 hour 45 minutes'),
  ('orchestrator', 'FORK-0003', 'active', now() - interval '1 hour 30 minutes'),
  ('worker', 'FORK-0004', 'idle', now() - interval '1 hour'),
  ('worker', 'FORK-0005', 'active', now() - interval '45 minutes'),
  ('analyzer', 'FORK-0006', 'active', now() - interval '30 minutes'),
  ('orchestrator', 'FORK-0007', 'active', now() - interval '15 minutes'),
  ('worker', 'FORK-0008', 'active', now() - interval '5 minutes');
