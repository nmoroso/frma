-- =====================================================================
-- FRMA · Esquema de base de datos (Supabase / PostgreSQL)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega todo → Run.
-- Es seguro ejecutarlo más de una vez.
-- =====================================================================

-- ---------- LEADS (registro voluntario de interés) ----------
create table if not exists public.leads (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  email            text not null,
  email_normalized text not null,
  interest         text[] not null default '{general}',
  origin           text,            -- checkout | prelanzamiento | home | directo
  source_page      text,
  consent          boolean not null,
  consent_version  text not null,
  consent_at       timestamptz not null default now(),
  utm_source       text,
  utm_medium       text,
  utm_campaign     text,
  utm_content      text,
  utm_term         text,
  has_fbclid       boolean not null default false,
  session_id       text,
  visitor_id       text,
  experiment_id    text,
  variant_id       text,
  is_internal      boolean not null default false,
  unsubscribed_at  timestamptz,
  constraint leads_email_unique unique (email_normalized),
  constraint leads_consent_true check (consent = true),
  constraint leads_email_len check (char_length(email) between 6 and 254)
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);

-- ---------- EVENTOS DEL EMBUDO (medición propia, sin datos personales) ----------
-- Solo se registran si el visitante aceptó cookies de analítica.
create table if not exists public.funnel_events (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  event_name    text not null,
  session_id    text not null,
  visitor_id    text not null,
  page_path     text,
  items         jsonb not null default '[]'::jsonb,  -- [{id,type,variant,price,qty}]
  value         integer,
  lead_interest text,
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  utm_content   text,
  utm_term      text,
  has_fbclid    boolean not null default false,
  experiment_id text,
  variant_id    text,
  is_internal   boolean not null default false
);

create index if not exists funnel_events_created_at_idx on public.funnel_events (created_at desc);
create index if not exists funnel_events_name_idx on public.funnel_events (event_name);

-- ---------- SEGURIDAD ----------
-- RLS activado y SIN políticas: nadie puede leer ni escribir con la clave pública.
-- El sitio escribe desde el servidor con la service_role key (que nunca llega al navegador).
alter table public.leads enable row level security;
alter table public.funnel_events enable row level security;

revoke all on public.leads from anon, authenticated;
revoke all on public.funnel_events from anon, authenticated;
