-- PrivateAI Phase 2 schema
-- Embedding column is vector(768) for nomic-embed-text.
-- If you switch to a model with another size, add a new column or rebuild this one
-- (pgvector cannot change dimension in place).

create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  email text not null,
  full_name text not null,
  role text not null check (role in ('ADMIN', 'EMPLOYEE')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name)
);

create table if not exists user_departments (
  user_id uuid not null references profiles(id) on delete cascade,
  department_id uuid not null references departments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, department_id)
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  filename text not null,
  original_filename text not null,
  storage_path text not null,
  mime_type text not null,
  file_size integer not null,
  page_count integer,
  chunk_count integer,
  status text not null default 'UPLOADED' check (status in ('UPLOADED', 'PROCESSING', 'READY', 'FAILED')),
  is_company_wide boolean not null default false,
  uploaded_by uuid not null references profiles(id),
  processing_error text,
  checksum text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists document_departments (
  document_id uuid not null references documents(id) on delete cascade,
  department_id uuid not null references departments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (document_id, department_id)
);

create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  content text not null,
  embedding vector(768),
  page_number integer,
  chunk_index integer not null,
  token_count integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists document_chunks_embedding_idx
  on document_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('USER', 'ASSISTANT', 'SYSTEM')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists message_sources (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  document_chunk_id uuid references document_chunks(id) on delete set null,
  page_number integer,
  similarity_score double precision,
  excerpt text,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists company_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references companies(id) on delete cascade,
  chat_model text not null,
  embedding_model text not null,
  top_k integer not null default 5,
  temperature double precision not null default 0.2,
  system_prompt text not null,
  updated_at timestamptz not null default now()
);

-- Authorization is also enforced in this function, not only in the app.
create or replace function match_document_chunks(
  query_embedding vector(768),
  query_company_id uuid,
  allowed_department_ids uuid[],
  query_is_admin boolean,
  match_count integer,
  minimum_similarity double precision
)
returns table (
  chunk_id uuid,
  document_id uuid,
  content text,
  page_number integer,
  similarity double precision,
  filename text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    dc.id as chunk_id,
    dc.document_id,
    dc.content,
    dc.page_number,
    1 - (dc.embedding <=> query_embedding) as similarity,
    d.original_filename as filename
  from document_chunks dc
  join documents d on d.id = dc.document_id
  where dc.company_id = query_company_id
    and d.company_id = query_company_id
    and d.status = 'READY'
    and dc.embedding is not null
    and (
      query_is_admin
      or d.is_company_wide = true
      or exists (
        select 1
        from document_departments dd
        where dd.document_id = d.id
          and dd.department_id = any(allowed_department_ids)
      )
    )
    and (1 - (dc.embedding <=> query_embedding)) >= minimum_similarity
  order by dc.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

revoke all on function match_document_chunks(vector, uuid, uuid[], boolean, integer, double precision) from public;
grant execute on function match_document_chunks(vector, uuid, uuid[], boolean, integer, double precision) to authenticated, anon, service_role;

alter table companies enable row level security;
alter table profiles enable row level security;
alter table departments enable row level security;
alter table user_departments enable row level security;
alter table documents enable row level security;
alter table document_departments enable row level security;
alter table document_chunks enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table message_sources enable row level security;
alter table audit_logs enable row level security;
alter table company_settings enable row level security;

create or replace function current_profile()
returns profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from profiles where id = auth.uid() limit 1;
$$;

drop policy if exists companies_select on companies;
create policy companies_select on companies for select
  using (id = (select company_id from profiles where id = auth.uid()));

drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select
  using (company_id = (select company_id from profiles where id = auth.uid()));

drop policy if exists profiles_update_admin on profiles;
create policy profiles_update_admin on profiles for update
  using (
    company_id = (select company_id from profiles where id = auth.uid())
    and (select role from profiles where id = auth.uid()) = 'ADMIN'
  );

drop policy if exists departments_all_company on departments;
create policy departments_select on departments for select
  using (company_id = (select company_id from profiles where id = auth.uid()));
create policy departments_write_admin on departments for all
  using (
    company_id = (select company_id from profiles where id = auth.uid())
    and (select role from profiles where id = auth.uid()) = 'ADMIN'
  )
  with check (
    company_id = (select company_id from profiles where id = auth.uid())
    and (select role from profiles where id = auth.uid()) = 'ADMIN'
  );

drop policy if exists user_departments_select on user_departments;
create policy user_departments_select on user_departments for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and (
          p.id = user_departments.user_id
          or p.role = 'ADMIN'
        )
        and p.company_id = (select company_id from profiles where id = user_departments.user_id)
    )
  );

drop policy if exists documents_select on documents;
create policy documents_select on documents for select
  using (
    company_id = (select company_id from profiles where id = auth.uid())
    and (
      (select role from profiles where id = auth.uid()) = 'ADMIN'
      or is_company_wide = true
      or exists (
        select 1
        from document_departments dd
        join user_departments ud on ud.department_id = dd.department_id
        where dd.document_id = documents.id
          and ud.user_id = auth.uid()
      )
    )
  );

drop policy if exists documents_write_admin on documents;
create policy documents_insert_admin on documents for insert
  with check (
    company_id = (select company_id from profiles where id = auth.uid())
    and (select role from profiles where id = auth.uid()) = 'ADMIN'
  );
create policy documents_update_admin on documents for update
  using (
    company_id = (select company_id from profiles where id = auth.uid())
    and (select role from profiles where id = auth.uid()) = 'ADMIN'
  );
create policy documents_delete_admin on documents for delete
  using (
    company_id = (select company_id from profiles where id = auth.uid())
    and (select role from profiles where id = auth.uid()) = 'ADMIN'
  );

drop policy if exists document_departments_select on document_departments;
create policy document_departments_select on document_departments for select
  using (
    exists (
      select 1 from documents d
      where d.id = document_departments.document_id
        and d.company_id = (select company_id from profiles where id = auth.uid())
    )
  );
create policy document_departments_write_admin on document_departments for all
  using (
    (select role from profiles where id = auth.uid()) = 'ADMIN'
    and exists (
      select 1 from documents d
      where d.id = document_departments.document_id
        and d.company_id = (select company_id from profiles where id = auth.uid())
    )
  )
  with check (
    (select role from profiles where id = auth.uid()) = 'ADMIN'
  );

drop policy if exists user_departments_write_admin on user_departments;
create policy user_departments_write_admin on user_departments for all
  using ((select role from profiles where id = auth.uid()) = 'ADMIN')
  with check ((select role from profiles where id = auth.uid()) = 'ADMIN');

drop policy if exists document_chunks_select on document_chunks;
create policy document_chunks_write_admin on document_chunks for all
  using (
    company_id = (select company_id from profiles where id = auth.uid())
    and (select role from profiles where id = auth.uid()) = 'ADMIN'
  )
  with check (
    company_id = (select company_id from profiles where id = auth.uid())
    and (select role from profiles where id = auth.uid()) = 'ADMIN'
  );
create policy document_chunks_select on document_chunks for select
  using (
    company_id = (select company_id from profiles where id = auth.uid())
    and exists (
      select 1 from documents d
      where d.id = document_chunks.document_id
        and (
          (select role from profiles where id = auth.uid()) = 'ADMIN'
          or d.is_company_wide = true
          or exists (
            select 1
            from document_departments dd
            join user_departments ud on ud.department_id = dd.department_id
            where dd.document_id = d.id and ud.user_id = auth.uid()
          )
        )
    )
  );

drop policy if exists conversations_own on conversations;
create policy conversations_own on conversations for all
  using (user_id = auth.uid() and company_id = (select company_id from profiles where id = auth.uid()))
  with check (user_id = auth.uid() and company_id = (select company_id from profiles where id = auth.uid()));

drop policy if exists messages_own on messages;
create policy messages_own on messages for all
  using (
    company_id = (select company_id from profiles where id = auth.uid())
    and exists (
      select 1 from conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  )
  with check (
    company_id = (select company_id from profiles where id = auth.uid())
    and exists (
      select 1 from conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  );

drop policy if exists message_sources_own on message_sources;
create policy message_sources_own on message_sources for all
  using (
    exists (
      select 1 from messages m
      join conversations c on c.id = m.conversation_id
      where m.id = message_sources.message_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from messages m
      join conversations c on c.id = m.conversation_id
      where m.id = message_sources.message_id and c.user_id = auth.uid()
    )
  );

drop policy if exists audit_logs_admin on audit_logs;
create policy audit_logs_admin on audit_logs for select
  using (
    company_id = (select company_id from profiles where id = auth.uid())
    and (select role from profiles where id = auth.uid()) = 'ADMIN'
  );

drop policy if exists company_settings_select on company_settings;
create policy company_settings_select on company_settings for select
  using (company_id = (select company_id from profiles where id = auth.uid()));
create policy company_settings_admin on company_settings for all
  using (
    company_id = (select company_id from profiles where id = auth.uid())
    and (select role from profiles where id = auth.uid()) = 'ADMIN'
  )
  with check (
    company_id = (select company_id from profiles where id = auth.uid())
    and (select role from profiles where id = auth.uid()) = 'ADMIN'
  );

insert into storage.buckets (id, name, public)
values ('company-documents', 'company-documents', false)
on conflict (id) do nothing;

drop policy if exists company_documents_select on storage.objects;
create policy company_documents_select on storage.objects for select
  using (
    bucket_id = 'company-documents'
    and split_part(name, '/', 1) = (select company_id::text from profiles where id = auth.uid())
    and (
      (select role from profiles where id = auth.uid()) = 'ADMIN'
      or exists (
        select 1 from documents d
        where d.id::text = split_part(name, '/', 2)
          and d.company_id = (select company_id from profiles where id = auth.uid())
          and (
            d.is_company_wide
            or exists (
              select 1 from document_departments dd
              join user_departments ud on ud.department_id = dd.department_id
              where dd.document_id = d.id and ud.user_id = auth.uid()
            )
          )
      )
    )
  );

drop policy if exists company_documents_insert on storage.objects;
create policy company_documents_insert on storage.objects for insert
  with check (
    bucket_id = 'company-documents'
    and (select role from profiles where id = auth.uid()) = 'ADMIN'
    and split_part(name, '/', 1) = (select company_id::text from profiles where id = auth.uid())
  );

drop policy if exists company_documents_delete on storage.objects;
create policy company_documents_delete on storage.objects for delete
  using (
    bucket_id = 'company-documents'
    and (select role from profiles where id = auth.uid()) = 'ADMIN'
    and split_part(name, '/', 1) = (select company_id::text from profiles where id = auth.uid())
  );
