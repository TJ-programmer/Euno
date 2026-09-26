create table if not exists public.email_delivery_queue (
  id uuid primary key default gen_random_uuid(),

  email text not null,

  status text not null default 'waiting'
    check (status in (
      'waiting',
      'processing',
      'sent',
      'failed',
      'expired'
    )),

  attempts integer not null default 0,

  next_attempt_at timestamptz not null default now(),

  last_error text,

  sent_at timestamptz,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

create index if not exists email_delivery_queue_worker_idx
on public.email_delivery_queue (status, next_attempt_at);

create index if not exists email_delivery_queue_email_idx
on public.email_delivery_queue (lower(email));


alter table public.email_delivery_queue enable row level security;


create or replace function public.set_email_delivery_queue_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


drop trigger if exists email_delivery_queue_updated_at
on public.email_delivery_queue;

create trigger email_delivery_queue_updated_at
before update on public.email_delivery_queue
for each row
execute function public.set_email_delivery_queue_updated_at();
