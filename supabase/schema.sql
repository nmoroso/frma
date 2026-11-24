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

-- =====================================================================
-- CATÁLOGO ADMINISTRABLE (productos, colores, fotos, modelos,
-- guardarropas e imágenes del inicio). Añadido en la versión 2.
-- Es seguro volver a ejecutar todo el archivo.
-- =====================================================================

-- ---------- Biblioteca de imágenes ----------
create table if not exists public.media (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  storage_path  text not null unique,           -- ruta dentro del bucket "media"
  width         integer,
  height        integer,
  bytes         integer,
  mime          text,
  original_name text,
  alt           text not null default '',
  kind          text not null default 'producto'
                check (kind in ('producto','modelo','detalle','outfit','editorial')),
  is_ai         boolean not null default false  -- imagen conceptual generada con IA
);
create index if not exists media_created_at_idx on public.media (created_at desc);

-- ---------- Productos ----------
create table if not exists public.products (
  id          text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), -- también es la URL y el item_id
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  name        text not null check (char_length(name) between 1 and 120),
  category    text not null,
  tagline     text not null default '',
  description text not null default '',
  price       integer not null check (price >= 0),          -- CLP
  material    text not null default '',                     -- material y composición
  fit         text not null default '',                     -- características y calce
  care        text not null default '',
  sizes       text[] not null default '{}',
  status      text not null default 'draft' check (status in ('draft','published')),
  sort_order  integer not null default 0
);

-- ---------- Variantes de color ----------
create table if not exists public.product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  text not null references public.products(id) on delete cascade on update cascade,
  slug        text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  color_name  text not null check (char_length(color_name) between 1 and 60),
  hex         text not null check (hex ~ '^#[0-9A-Fa-f]{6}$'),
  sku         text not null unique check (char_length(sku) between 1 and 80),
  sizes       text[],                 -- null = usa las tallas del producto
  price       integer check (price is null or price >= 0), -- null = precio del producto
  active      boolean not null default true,
  sort_order  integer not null default 0,
  unique (product_id, slug)
);
create index if not exists product_variants_product_idx on public.product_variants (product_id);

create table if not exists public.variant_media (
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  media_id   uuid not null references public.media(id) on delete cascade,
  sort_order integer not null default 0,        -- 0 = foto principal
  primary key (variant_id, media_id)
);

-- Prendas que aparecen en una foto (una foto de outfit puede tener varias)
create table if not exists public.media_products (
  id         bigint generated always as identity primary key,
  media_id   uuid not null references public.media(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade on update cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  unique nulls not distinct (media_id, product_id, variant_id)
);

-- ---------- Modelos ----------
create table if not exists public.models (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  name               text not null check (char_length(name) between 1 and 80),
  age                integer check (age is null or age between 16 and 90),
  notes              text not null default '',
  reference_media_id uuid references public.media(id) on delete set null,
  sort_order         integer not null default 0
);
create table if not exists public.model_media (
  model_id   uuid not null references public.models(id) on delete cascade,
  media_id   uuid not null references public.media(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (model_id, media_id)
);

-- ---------- Guardarropas y colecciones ----------
create table if not exists public.collections (
  id            text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  name          text not null,
  tagline       text not null default '',
  description   text not null default '',
  price         integer not null check (price >= 0),
  status        text not null default 'draft' check (status in ('draft','published')),
  top_sizes     text[] not null default '{}',
  bottom_sizes  text[] not null default '{}',
  hero_media_id uuid references public.media(id) on delete set null,
  sort_order    integer not null default 0
);
create table if not exists public.collection_items (
  collection_id text not null references public.collections(id) on delete cascade on update cascade,
  variant_id    uuid not null references public.product_variants(id) on delete cascade,
  role          text not null check (role in ('top','bottom')),
  sort_order    integer not null default 0,
  primary key (collection_id, variant_id)
);
create table if not exists public.collection_media (
  collection_id text not null references public.collections(id) on delete cascade on update cascade,
  media_id      uuid not null references public.media(id) on delete cascade,
  sort_order    integer not null default 0,
  primary key (collection_id, media_id)
);

-- ---------- Imágenes de la página principal ----------
create table if not exists public.home_images (
  id         uuid primary key default gen_random_uuid(),
  section    text not null,   -- hero | banner | category:<categoria> | wardrobe | editorial | featured
  media_id   uuid not null references public.media(id) on delete cascade,
  title      text not null default '',
  subtitle   text not null default '',
  href       text not null default '',
  sort_order integer not null default 0
);
create index if not exists home_images_section_idx on public.home_images (section, sort_order);

-- ---------- Seguridad del catálogo ----------
-- Los visitantes nunca leen la base de datos directamente: la tienda la consulta
-- desde el servidor y solo muestra lo publicado. Los cambios solo los hace el
-- servidor después de verificar que eres administrador (ADMIN_EMAILS).
do $$
declare t text;
begin
  foreach t in array array['media','products','product_variants','variant_media','media_products',
                           'models','model_media','collections','collection_items','collection_media','home_images']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- ---------- Almacenamiento de fotos ----------
-- Bucket público de solo lectura. Las subidas usan URLs firmadas que el servidor
-- entrega únicamente a administradores. Máximo 8 MB por archivo (ya optimizado).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 8388608, array['image/webp','image/jpeg','image/png','image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------- Guardado atómico desde el panel ----------
-- Guarda un producto con todos sus colores y fotos en una sola transacción:
-- si algo falla (por ejemplo un SKU repetido) no se guarda nada a medias.
create or replace function public.admin_save_product(p jsonb)
returns void
language plpgsql
set search_path = public
as $$
declare
  v jsonb;
  vid uuid;
  keep uuid[] := '{}';
  pos int := 0;
  mpos int;
  mid text;
begin
  update products set
    name        = p->>'name',
    category    = p->>'category',
    tagline     = coalesce(p->>'tagline', ''),
    description = coalesce(p->>'description', ''),
    price       = (p->>'price')::int,
    material    = coalesce(p->>'material', ''),
    fit         = coalesce(p->>'fit', ''),
    care        = coalesce(p->>'care', ''),
    sizes       = array(select jsonb_array_elements_text(coalesce(p->'sizes', '[]'::jsonb))),
    status      = p->>'status',
    sort_order  = coalesce((p->>'sortOrder')::int, 0),
    updated_at  = now()
  where id = p->>'id';
  if not found then
    raise exception 'Producto no encontrado: %', p->>'id';
  end if;

  for v in select * from jsonb_array_elements(coalesce(p->'variants', '[]'::jsonb)) loop
    if nullif(v->>'id', '') is not null then
      keep := keep || (v->>'id')::uuid;
    end if;
  end loop;

  -- Colores eliminados en el panel
  delete from product_variants where product_id = p->>'id' and not (id = any(keep));
  -- SKU temporal para permitir intercambiar SKUs entre colores
  update product_variants set sku = 'TMP-' || id::text where product_id = p->>'id';

  for v in select * from jsonb_array_elements(coalesce(p->'variants', '[]'::jsonb)) loop
    if nullif(v->>'id', '') is null then
      insert into product_variants (product_id, slug, color_name, hex, sku, sizes, price, active, sort_order)
      values (
        p->>'id', v->>'slug', v->>'name', upper(v->>'hex'), v->>'sku',
        case when jsonb_typeof(v->'sizes') = 'array' and jsonb_array_length(v->'sizes') > 0
             then array(select jsonb_array_elements_text(v->'sizes')) else null end,
        nullif(v->>'price', '')::int, coalesce((v->>'active')::boolean, true), pos)
      returning id into vid;
    else
      update product_variants set
        color_name = v->>'name',
        hex        = upper(v->>'hex'),
        sku        = v->>'sku',
        sizes      = case when jsonb_typeof(v->'sizes') = 'array' and jsonb_array_length(v->'sizes') > 0
                          then array(select jsonb_array_elements_text(v->'sizes')) else null end,
        price      = nullif(v->>'price', '')::int,
        active     = coalesce((v->>'active')::boolean, true),
        sort_order = pos
      where id = (v->>'id')::uuid and product_id = p->>'id'
      returning id into vid;
      if vid is null then
        raise exception 'Color no encontrado: %', v->>'id';
      end if;
    end if;

    delete from variant_media where variant_id = vid;
    mpos := 0;
    for mid in select jsonb_array_elements_text(coalesce(v->'mediaIds', '[]'::jsonb)) loop
      insert into variant_media (variant_id, media_id, sort_order) values (vid, mid::uuid, mpos)
      on conflict do nothing;
      mpos := mpos + 1;
    end loop;
    pos := pos + 1;
  end loop;
end $$;

-- Guarda un guardarropa con sus piezas y fotos en una sola transacción.
create or replace function public.admin_save_collection(p jsonb)
returns void
language plpgsql
set search_path = public
as $$
declare
  it jsonb;
  pos int := 0;
  mid text;
begin
  update collections set
    name          = p->>'name',
    tagline       = coalesce(p->>'tagline', ''),
    description   = coalesce(p->>'description', ''),
    price         = (p->>'price')::int,
    status        = p->>'status',
    top_sizes     = array(select jsonb_array_elements_text(coalesce(p->'topSizes', '[]'::jsonb))),
    bottom_sizes  = array(select jsonb_array_elements_text(coalesce(p->'bottomSizes', '[]'::jsonb))),
    hero_media_id = nullif(p->>'heroMediaId', '')::uuid,
    sort_order    = coalesce((p->>'sortOrder')::int, 0),
    updated_at    = now()
  where id = p->>'id';
  if not found then
    raise exception 'Guardarropa no encontrado: %', p->>'id';
  end if;

  delete from collection_items where collection_id = p->>'id';
  for it in select * from jsonb_array_elements(coalesce(p->'pieces', '[]'::jsonb)) loop
    insert into collection_items (collection_id, variant_id, role, sort_order)
    values (p->>'id', (it->>'variantId')::uuid, it->>'role', pos)
    on conflict do nothing;
    pos := pos + 1;
  end loop;

  delete from collection_media where collection_id = p->>'id';
  pos := 0;
  for mid in select jsonb_array_elements_text(coalesce(p->'mediaIds', '[]'::jsonb)) loop
    insert into collection_media (collection_id, media_id, sort_order) values (p->>'id', mid::uuid, pos)
    on conflict do nothing;
    pos := pos + 1;
  end loop;
end $$;

-- Solo el servidor (service_role) puede ejecutar estas funciones.
revoke all on function public.admin_save_product(jsonb) from public, anon, authenticated;
revoke all on function public.admin_save_collection(jsonb) from public, anon, authenticated;
grant execute on function public.admin_save_product(jsonb) to service_role;
grant execute on function public.admin_save_collection(jsonb) to service_role;
