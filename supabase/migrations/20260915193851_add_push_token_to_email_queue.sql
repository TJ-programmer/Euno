alter table public.email_delivery_queue
add column if not exists push_token text;
