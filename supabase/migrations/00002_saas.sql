-- ============================================
-- Skooly — SaaS Platform Schema
-- Super admin, subscriptions, billing
-- ============================================

-- Subscription plans (defined by super admin)
create table subscription_plans (
  id uuid primary key default uuid_generate_v4(),
  name text not null, -- Free, Basic, Premium, Enterprise
  code text unique not null, -- free, basic, premium, enterprise
  description text,
  price_monthly numeric(12,2) default 0,
  price_yearly numeric(12,2) default 0,
  max_students int default 0, -- 0 = unlimited
  max_teachers int default 0,
  features jsonb default '[]', -- array of feature strings
  is_active boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- School subscription (current + history)
create table school_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  plan_id uuid references subscription_plans(id),
  status text default 'active' check (status in ('active','trial','past_due','canceled','expired')),
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  auto_renew boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Invoice / billing history
create table invoices (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  subscription_id uuid references school_subscriptions(id),
  amount numeric(12,2) not null,
  currency text default 'GHS',
  status text default 'pending' check (status in ('pending','paid','overdue','failed','cancelled')),
  period_start date,
  period_end date,
  paid_at timestamptz,
  momo_reference text,
  invoice_number text unique,
  created_at timestamptz default now()
);

-- Super admin users
create table super_admins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid unique, -- FK to auth.users
  email text unique not null,
  name text not null,
  role text default 'admin' check (role in ('super_admin','support','finance')),
  created_at timestamptz default now()
);

-- Add status and approved fields to schools
alter table schools add column if not exists status text default 'active'
  check (status in ('active','suspended','pending_approval','disabled'));
alter table schools add column if not exists approved_at timestamptz;
alter table schools add column if not exists approved_by uuid;

-- Indexes
create index idx_school_subscriptions_school on school_subscriptions(school_id);
create index idx_school_subscriptions_plan on school_subscriptions(plan_id);
create index idx_invoices_school on invoices(school_id);
create index idx_invoices_status on invoices(status);

-- Enable RLS
alter table subscription_plans enable row level security;
alter table school_subscriptions enable row level security;
alter table invoices enable row level security;
alter table super_admins enable row level security;

-- Seed default subscription plans
insert into subscription_plans (name, code, description, price_monthly, price_yearly, max_students, max_teachers, features, sort_order)
values
  ('Free', 'free', 'For small schools getting started', 0, 0, 50, 10,
    '["Up to 50 students", "Up to 10 teachers", "Basic fee management", "Attendance tracking", "Parent portal - up to 50 students", "Email support"]'::jsonb, 1),
  ('Basic', 'basic', 'Essential tools for growing schools', 199, 1990, 200, 25,
    '["Up to 200 students", "Up to 25 teachers", "Full fee management + MoMo", "Bus & feeding management", "Academic tracking", "Report cards", "WhatsApp notifications", "Priority email support"]'::jsonb, 2),
  ('Premium', 'premium', 'Complete solution for established schools', 499, 4990, 1000, 50,
    '["Up to 1,000 students", "Up to 50 teachers", "Everything in Basic", "Admissions portal", "Advanced analytics", "Bulk SMS", "Custom branding", "Priority chat support"]'::jsonb, 3),
  ('Enterprise', 'enterprise', 'Custom solution for large schools', 999, 9990, 0, 0,
    '["Unlimited students", "Unlimited teachers", "Everything in Premium", "Dedicated account manager", "Custom integrations", "SLA guarantee", "On-premise option", "Phone support"]'::jsonb, 4);
