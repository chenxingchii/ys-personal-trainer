create table if not exists public.training_samples (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  athlete_id_hash text not null,
  consent_version text not null,
  rule_version text not null,
  champion_model_version text not null,
  quality real not null check (quality >= 0 and quality <= 1),
  usable_frame_count integer not null check (usable_frame_count >= 0),
  metadata jsonb,
  analysis jsonb not null,
  champion_comparison jsonb,
  expert_labels jsonb,
  annotation_status text not null default 'unreviewed'
    check (annotation_status in ('unreviewed', 'reviewed', 'excluded'))
);

create index if not exists training_samples_created_at_idx
  on public.training_samples (created_at desc);

create index if not exists training_samples_annotation_status_idx
  on public.training_samples (annotation_status);

create index if not exists training_samples_athlete_id_idx
  on public.training_samples (athlete_id_hash);

alter table public.training_samples enable row level security;

-- 仅由服务端 service role 写入；不要给匿名客户端开放 insert/select 策略。
