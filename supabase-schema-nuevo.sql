-- ═══════════════════════════════════════════════════════
-- KYNEXA — Esquema nuevo: guía gratuita + turnos
-- Correr esto en el SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════

-- ─── 1. Actualizar customers al modelo nuevo ───
-- Sacamos los campos viejos de developer (role/github/linkedin),
-- sumamos apellido y teléfono. nombre y email ya existían.

alter table customers
  drop column if exists role,
  drop column if exists github,
  drop column if exists linkedin;

alter table customers
  add column if not exists apellido text,
  add column if not exists telefono text;

-- email tiene que ser único, así "buscar o crear" funciona bien
-- (si ya tenías filas con emails duplicados, esto va a fallar —avisame si pasa)
alter table customers
  add constraint customers_email_unique unique (email);


-- ─── 2. guia_leads — quién pidió la guía gratuita ───
create table if not exists guia_leads (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id),
  created_at  timestamptz not null default now()
);

create index if not exists idx_guia_leads_customer on guia_leads(customer_id);


-- ─── 3. horarios_disponibles — los turnos que vos cargás a mano ───
-- Para agregar un turno nuevo, insertás una fila acá:
--   insert into horarios_disponibles (fecha, hora) values ('2026-09-03', '15:00');
create table if not exists horarios_disponibles (
  id         uuid primary key default gen_random_uuid(),
  fecha      date not null,
  hora       time not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_horarios_fecha on horarios_disponibles(fecha, hora);


-- ─── 4. reservas — quién agendó qué turno ───
-- El "unique" en horario_id es la pieza clave: la base de datos
-- rechaza automáticamente un segundo intento de reservar el mismo
-- turno, sin que dependamos de que el código lo chequee bien.
create table if not exists reservas (
  id            uuid primary key default gen_random_uuid(),
  horario_id    uuid not null unique references horarios_disponibles(id),
  customer_id   uuid not null references customers(id),
  nota          text,
  cv_file_path  text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_reservas_customer on reservas(customer_id);


-- ─── 5. Políticas RLS (mismo patrón que orders/customers ya tenían) ───
-- El backend usa la service_role key, que salta RLS igual —
-- pero las políticas quedan como capa extra de seguridad.
alter table guia_leads enable row level security;
alter table horarios_disponibles enable row level security;
alter table reservas enable row level security;

create policy "service_role_all_guia_leads" on guia_leads
  for all using (true) with check (true);

create policy "service_role_all_horarios" on horarios_disponibles
  for all using (true) with check (true);

create policy "service_role_all_reservas" on reservas
  for all using (true) with check (true);