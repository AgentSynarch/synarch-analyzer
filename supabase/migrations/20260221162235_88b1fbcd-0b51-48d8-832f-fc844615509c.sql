
-- Add new columns to deployed_forks for richer agent data
ALTER TABLE public.deployed_forks
  ADD COLUMN github_username TEXT,
  ADD COLUMN agent_name TEXT,
  ADD COLUMN description TEXT,
  ADD COLUMN auto_restart BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN log_level TEXT NOT NULL DEFAULT 'info',
  ADD COLUMN max_retries INTEGER NOT NULL DEFAULT 3;

-- Update seed data with some github usernames
UPDATE public.deployed_forks SET github_username = 'octocat', agent_name = 'task-runner' WHERE fork_name = 'FORK-0001';
UPDATE public.deployed_forks SET github_username = 'torvalds', agent_name = 'code-checker' WHERE fork_name = 'FORK-0002';
UPDATE public.deployed_forks SET github_username = 'mojombo', agent_name = 'data-sync' WHERE fork_name = 'FORK-0003';
UPDATE public.deployed_forks SET github_username = 'defunkt', agent_name = 'batch-worker' WHERE fork_name = 'FORK-0004';
UPDATE public.deployed_forks SET github_username = 'pjhyett', agent_name = 'scraper-bot' WHERE fork_name = 'FORK-0005';
UPDATE public.deployed_forks SET github_username = 'wycats', agent_name = 'lint-agent' WHERE fork_name = 'FORK-0006';
UPDATE public.deployed_forks SET github_username = 'ezmobius', agent_name = 'etl-pipeline' WHERE fork_name = 'FORK-0007';
UPDATE public.deployed_forks SET github_username = 'ivey', agent_name = 'file-watcher' WHERE fork_name = 'FORK-0008';
