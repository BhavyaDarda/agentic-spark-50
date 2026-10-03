ALTER TABLE public.research_runs ADD COLUMN IF NOT EXISTS critic_score integer;
UPDATE public.research_runs SET critic_score = (substring(plan->>'critic' from 'SCORE:\s*(\d{1,3})'))::int
WHERE critic_score IS NULL AND plan->>'critic' ~ 'SCORE:\s*\d{1,3}';
UPDATE public.research_runs SET status='failed', error=coalesce(error,'Run was interrupted before it finished.'), completed_at=now()
WHERE status IN ('running','queued') AND created_at < now() - interval '15 minutes';