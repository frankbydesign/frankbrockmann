-- ============================================
-- MPS Kids Ride Hotline - Database Schema
-- ============================================

-- Volunteers table (links to Supabase Auth users)
create table volunteers (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  display_name text,
  is_online boolean default false,
  last_seen timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Conversations (one per phone number that texts in)
create table conversations (
  id uuid default gen_random_uuid() primary key,
  phone_number text unique not null,
  contact_name text,
  detected_language text default 'en',
  status text default 'new' check (status in ('new', 'active', 'resolved')),
  assigned_volunteer_id uuid references volunteers(id),
  last_reply_by uuid references volunteers(id),
  last_reply_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Messages
create table messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  original_text text not null,
  translated_text text,
  detected_language text,
  translation_error text,
  status text default 'sent' check (status in ('pending', 'sent', 'failed')),
  retry_count integer default 0,
  volunteer_id uuid references volunteers(id),
  volunteer_name text,
  twilio_sid text,
  error_message text,
  created_at timestamp with time zone default now()
);

-- Enable realtime for live updates
alter publication supabase_realtime add table conversations;
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table volunteers;

-- Indexes for faster lookups
create index idx_messages_conversation on messages(conversation_id);
create index idx_conversations_phone on conversations(phone_number);
create index idx_conversations_status on conversations(status);
create index idx_messages_status on messages(status);
create index idx_volunteers_online on volunteers(is_online);

-- Auto-update updated_at timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger conversations_updated_at
  before update on conversations
  for each row execute function update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
alter table volunteers enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;

-- Volunteers: users can read all volunteers, manage their own profile
create policy "Volunteers can view all volunteers"
  on volunteers for select
  to authenticated
  using (true);

create policy "Users can insert their own volunteer profile"
  on volunteers for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update their own volunteer profile"
  on volunteers for update
  to authenticated
  using (auth.uid() = id);

-- Conversations: authenticated users can do everything
create policy "Authenticated users can view conversations"
  on conversations for select
  to authenticated
  using (true);

create policy "Authenticated users can insert conversations"
  on conversations for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update conversations"
  on conversations for update
  to authenticated
  using (true);

-- Messages: authenticated users can do everything
create policy "Authenticated users can view messages"
  on messages for select
  to authenticated
  using (true);

create policy "Authenticated users can insert messages"
  on messages for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update messages"
  on messages for update
  to authenticated
  using (true);

-- ============================================
-- SERVICE ROLE POLICIES (for webhook)
-- ============================================
-- The webhook uses the service role key which bypasses RLS,
-- so it can insert conversations and messages from Twilio.

-- ============================================
-- AUTO-CREATE VOLUNTEER ON SIGNUP
-- ============================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.volunteers (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update volunteer's last_seen timestamp
create or replace function update_volunteer_presence(volunteer_uuid uuid, online boolean)
returns void as $$
begin
  update volunteers
  set is_online = online, last_seen = now()
  where id = volunteer_uuid;
end;
$$ language plpgsql security definer;
