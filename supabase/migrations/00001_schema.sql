-- ============================================
-- Skooly — Full Database Schema
-- Private Basic School Management System (Ghana)
-- ============================================

-- 0. EXTENSIONS
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 1. CORE ENTITIES

create table schools (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  short_code text unique,
  address text,
  phone text,
  email text,
  logo_url text,
  subscription_plan text default 'free',
  settings jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table academic_years (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  name text not null, -- e.g. "2025/2026"
  start_date date not null,
  end_date date not null,
  is_current boolean default false,
  created_at timestamptz default now()
);

create table terms (
  id uuid primary key default uuid_generate_v4(),
  academic_year_id uuid references academic_years(id) on delete cascade,
  name text not null, -- e.g. "1st Term"
  start_date date not null,
  end_date date not null,
  is_current boolean default false,
  created_at timestamptz default now()
);

create table classes (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  name text not null, -- e.g. "Class 4", "JHS 1"
  academic_year_id uuid references academic_years(id),
  teacher_id uuid, -- FK to teachers, added later
  sort_order int default 0,
  created_at timestamptz default now()
);

create table subjects (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  name text not null, -- e.g. "Integrated Science"
  code text,
  is_core boolean default true,
  created_at timestamptz default now()
);

-- 2. ADMISSIONS & ENROLLMENT

create table admission_applications (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  child_first_name text not null,
  child_last_name text not null,
  dob date,
  birth_cert_url text,
  passport_url text,
  parent_first_name text not null,
  parent_last_name text not null,
  parent_phone text not null,
  parent_secondary_phone text,
  parent_email text,
  applied_class_id uuid references classes(id),
  status text default 'pending' check (status in ('pending','accepted','rejected','waitlisted')),
  application_fee_paid boolean default false,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table students (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  dob date,
  admission_number text unique,
  class_id uuid references classes(id),
  parent_primary_phone text not null,
  parent_secondary_phone text,
  parent_email text,
  parent_user_id uuid, -- FK to auth.users
  enrollment_date date default current_date,
  status text default 'active' check (status in ('active','transferred','graduated','withdrawn')),
  medical_info jsonb default '{}', -- allergies, blood_group, conditions, emergency_contacts
  profile_photo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table transfers (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) on delete cascade,
  from_class_id uuid references classes(id),
  to_class_id uuid references classes(id),
  from_school_id uuid references schools(id),
  to_school_id uuid references schools(id),
  reason text,
  previous_report_url text,
  transfer_date date default current_date,
  created_at timestamptz default now()
);

-- 3. FEE MANAGEMENT

create table fee_structures (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  class_id uuid references classes(id),
  name text not null, -- e.g. "Tuition Fee", "Bus Fee", "Feeding Fee"
  category text not null check (category in ('tuition','bus','feeding','other')),
  amount numeric(12,2) not null,
  frequency text default 'termly' check (frequency in ('termly','monthly','custom')),
  due_date date,
  sibling_discount_pct numeric(5,2) default 0,
  early_payment_discount_pct numeric(5,2) default 0,
  late_fee_amount numeric(12,2) default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table fee_assignments (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) on delete cascade,
  fee_structure_id uuid references fee_structures(id) on delete cascade,
  term_id uuid references terms(id),
  amount_after_discount numeric(12,2),
  is_opted_in boolean default true, -- for bus/feeding opt-in
  pro_rated_days int, -- for mid-term enrollment
  created_at timestamptz default now(),
  unique(student_id, fee_structure_id, term_id)
);

create table fee_payments (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) on delete cascade,
  fee_assignment_id uuid references fee_assignments(id),
  amount_paid numeric(12,2) not null,
  balance_before numeric(12,2) default 0,
  payment_method text check (payment_method in ('momovc','momomtn','momo_at','card','cash','bank')),
  transaction_id text,
  momo_reference text,
  receipt_number text unique,
  payment_date timestamptz default now(),
  status text default 'pending' check (status in ('pending','confirmed','failed','refunded')),
  verified_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

create table receipts (
  id uuid primary key default uuid_generate_v4(),
  payment_id uuid references fee_payments(id) on delete cascade,
  receipt_number text unique,
  receipt_data text, -- JSON with receipt details for QR generation
  qr_code_data text,
  pdf_url text,
  generated_at timestamptz default now(),
  verified_at timestamptz
);

create table sibling_groups (
  id uuid primary key default uuid_generate_v4(),
  parent_phone text not null,
  school_id uuid references schools(id),
  name text,
  created_at timestamptz default now()
);

create table sibling_group_members (
  id uuid primary key default uuid_generate_v4(),
  sibling_group_id uuid references sibling_groups(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  unique(sibling_group_id, student_id)
);

-- 4. BUS MANAGEMENT

create table bus_routes (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  name text not null,
  zones jsonb default '[]', -- [{zone_name: "Madina", fee: 150}, ...]
  is_active boolean default true,
  created_at timestamptz default now()
);

create table bus_stops (
  id uuid primary key default uuid_generate_v4(),
  bus_route_id uuid references bus_routes(id) on delete cascade,
  name text not null,
  address text,
  lat numeric(10,7),
  lng numeric(10,7),
  sort_order int default 0,
  created_at timestamptz default now()
);

create table bus_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) on delete cascade,
  bus_route_id uuid references bus_routes(id),
  stop_id uuid references bus_stops(id),
  trip_type text default 'round_trip' check (trip_type in ('one_way','round_trip')),
  fee_amount numeric(12,2),
  start_date date not null,
  end_date date,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 5. FEEDING MANAGEMENT

create table feeding_plans (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  name text not null,
  description text,
  daily_rate numeric(12,2) not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table feeding_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) on delete cascade,
  feeding_plan_id uuid references feeding_plans(id),
  days_per_week int default 5,
  start_date date not null,
  end_date date,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table daily_feeding_attendance (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) on delete cascade,
  date date not null default current_date,
  was_fed boolean default true,
  recorded_by uuid, -- teacher user id
  created_at timestamptz default now(),
  unique(student_id, date)
);

-- 6. ACADEMICS

create table schemes_of_work (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid references classes(id) on delete cascade,
  subject_id uuid references subjects(id),
  term_id uuid references terms(id),
  teacher_id uuid,
  title text not null,
  week_number int,
  topics_covered text,
  objectives text,
  status text default 'draft' check (status in ('draft','published')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table lesson_notes (
  id uuid primary key default uuid_generate_v4(),
  scheme_of_work_id uuid references schemes_of_work(id) on delete cascade,
  teacher_id uuid,
  date date not null,
  topic text not null,
  content text,
  attachments jsonb default '[]',
  created_at timestamptz default now()
);

create table assessments (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid references classes(id) on delete cascade,
  subject_id uuid references subjects(id),
  term_id uuid references terms(id),
  teacher_id uuid,
  name text not null,
  type text check (type in ('quiz','test','homework','project','exam')),
  max_score numeric(6,2) not null,
  ca_weight_pct numeric(5,2) default 0,
  date date,
  created_at timestamptz default now()
);

create table assessment_scores (
  id uuid primary key default uuid_generate_v4(),
  assessment_id uuid references assessments(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  score numeric(6,2),
  remarks text,
  created_at timestamptz default now(),
  unique(assessment_id, student_id)
);

create table report_cards (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) on delete cascade,
  term_id uuid references terms(id),
  generated_at timestamptz default now(),
  pdf_url text,
  overall_position int,
  total_score numeric(8,2),
  average_score numeric(6,2),
  teacher_comments text,
  headteacher_remarks text,
  data jsonb, -- full snapshot of scores, grades, positions
  unique(student_id, term_id)
);

-- 7. TEACHER MANAGEMENT

create table teachers (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  user_id uuid, -- FK to auth.users
  first_name text not null,
  last_name text not null,
  phone text not null,
  email text,
  employee_id text,
  ntc_license_url text,
  certificates jsonb default '[]',
  cv_url text,
  contract_start date,
  contract_end date,
  status text default 'active' check (status in ('active','suspended','terminated')),
  clock_in_method text default 'mobile',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add FK from classes to teachers
alter table classes add constraint fk_teacher
  foreign key (teacher_id) references teachers(id);

create table teacher_attendance (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid references teachers(id) on delete cascade,
  date date not null default current_date,
  clock_in_time time,
  clock_out_time time,
  is_present boolean default false,
  is_late boolean default false,
  late_minutes int default 0,
  recorded_by uuid,
  created_at timestamptz default now(),
  unique(teacher_id, date)
);

create table teacher_subject_assignments (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid references teachers(id) on delete cascade,
  class_id uuid references classes(id),
  subject_id uuid references subjects(id),
  periods_per_week int default 0,
  unique(teacher_id, class_id, subject_id)
);

create table teacher_performance (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid references teachers(id) on delete cascade,
  term_id uuid references terms(id),
  avg_pass_rate numeric(5,2),
  ca_completion_rate numeric(5,2),
  punctuality_score numeric(5,2),
  parent_complaints int default 0,
  unique(teacher_id, term_id)
);

-- 8. ATTENDANCE & ABSENCE

create table attendance_records (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) on delete cascade,
  class_id uuid references classes(id),
  date date not null default current_date,
  status text check (status in ('present','absent','late','permission_withdrawn','left_without_permission')),
  recorded_by uuid,
  recorded_at timestamptz default now(),
  synced boolean default true,
  unique(student_id, date)
);

create table absence_notifications (
  id uuid primary key default uuid_generate_v4(),
  attendance_record_id uuid references attendance_records(id) on delete cascade,
  student_id uuid references students(id),
  class_id uuid references classes(id),
  date date,
  parent1_notified_at timestamptz,
  parent2_notified_at timestamptz,
  notification_channel text check (notification_channel in ('whatsapp','sms','both')),
  notification_status text default 'pending' check (notification_status in ('pending','sent','failed')),
  error_message text,
  created_at timestamptz default now()
);

-- 9. ENGAGEMENT

create table homework (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid references classes(id) on delete cascade,
  subject_id uuid references subjects(id),
  teacher_id uuid,
  title text not null,
  description text,
  attachments jsonb default '[]',
  due_date date,
  created_at timestamptz default now()
);

create table homework_views (
  id uuid primary key default uuid_generate_v4(),
  homework_id uuid references homework(id) on delete cascade,
  parent_phone text not null,
  viewed_at timestamptz default now(),
  unique(homework_id, parent_phone)
);

create table behavior_logs (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references students(id) on delete cascade,
  teacher_id uuid,
  type text check (type in ('star','warning','incident')),
  description text not null,
  date date not null default current_date,
  shared_with_parent boolean default false,
  shared_at timestamptz,
  created_at timestamptz default now()
);

create table whatsapp_broadcasts (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  sent_by uuid,
  target text, -- 'all_parents', class_id, specific
  message_text text not null,
  sent_count int default 0,
  failed_count int default 0,
  sent_at timestamptz default now(),
  status text default 'sent' check (status in ('sent','failed','partial'))
);

-- 10. ANALYTICS

create table enrollment_sources (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  student_id uuid references students(id),
  source text check (source in ('referral','online_ad','signpost','walk_in','social_media','other')),
  referred_by text,
  cost_per_lead numeric(10,2),
  created_at timestamptz default now()
);

create table dropoff_logs (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  student_id uuid references students(id),
  withdrawal_date date not null,
  reason text,
  exit_interview_notes text,
  created_at timestamptz default now()
);

-- 11. EXPENSE TRACKING

create table expenses (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  category text check (category in ('salary','supplies','utilities','maintenance','transport','other')),
  amount numeric(12,2) not null,
  description text,
  date date not null default current_date,
  receipt_url text,
  created_at timestamptz default now()
);

-- 12. DOCUMENT STORAGE (Teacher/Staff docs)

create table teacher_documents (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid references teachers(id) on delete cascade,
  document_type text not null,
  file_url text not null,
  expiry_date date,
  is_verified boolean default false,
  created_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================

create index idx_students_school on students(school_id);
create index idx_students_class on students(class_id);
create index idx_students_parent_phone on students(parent_primary_phone);
create index idx_fee_assignments_student on fee_assignments(student_id);
create index idx_fee_assignments_term on fee_assignments(term_id);
create index idx_fee_payments_student on fee_payments(student_id);
create index idx_fee_payments_status on fee_payments(status);
create index idx_attendance_date on attendance_records(date);
create index idx_attendance_student on attendance_records(student_id);
create index idx_absence_notifications_status on absence_notifications(notification_status);
create index idx_assessment_scores_student on assessment_scores(student_id);
create index idx_daily_feeding_date on daily_feeding_attendance(date);
create index idx_homework_class on homework(class_id);
create index idx_behavior_logs_student on behavior_logs(student_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table schools enable row level security;
alter table academic_years enable row level security;
alter table terms enable row level security;
alter table classes enable row level security;
alter table subjects enable row level security;
alter table admission_applications enable row level security;
alter table students enable row level security;
alter table transfers enable row level security;
alter table fee_structures enable row level security;
alter table fee_assignments enable row level security;
alter table fee_payments enable row level security;
alter table receipts enable row level security;
alter table sibling_groups enable row level security;
alter table sibling_group_members enable row level security;
alter table bus_routes enable row level security;
alter table bus_stops enable row level security;
alter table bus_subscriptions enable row level security;
alter table feeding_plans enable row level security;
alter table feeding_subscriptions enable row level security;
alter table daily_feeding_attendance enable row level security;
alter table schemes_of_work enable row level security;
alter table lesson_notes enable row level security;
alter table assessments enable row level security;
alter table assessment_scores enable row level security;
alter table report_cards enable row level security;
alter table teachers enable row level security;
alter table teacher_attendance enable row level security;
alter table teacher_subject_assignments enable row level security;
alter table teacher_performance enable row level security;
alter table attendance_records enable row level security;
alter table absence_notifications enable row level security;
alter table homework enable row level security;
alter table homework_views enable row level security;
alter table behavior_logs enable row level security;
alter table whatsapp_broadcasts enable row level security;
alter table enrollment_sources enable row level security;
alter table dropoff_logs enable row level security;
alter table expenses enable row level security;
alter table teacher_documents enable row level security;

-- RLS Policies: school-scoped access
create policy "Users can view their own school data"
  on schools for select
  using (true); -- Simplified; real app uses auth.uid() -> school mapping

create policy "School staff can read students"
  on students for select
  using (school_id = (select school_id from teachers where user_id = auth.uid())
         or exists (select 1 from students s2 where s2.parent_primary_phone = current_setting('app.parent_phone', true) and s2.id = students.id));

create policy "Parents can view their children only"
  on students for select
  using (parent_primary_phone = current_setting('app.parent_phone', true)
         or parent_secondary_phone = current_setting('app.parent_phone', true));

create policy "Parents can view payment for their children"
  on fee_payments for select
  using (student_id in (select id from students
                        where parent_primary_phone = current_setting('app.parent_phone', true)
                        or parent_secondary_phone = current_setting('app.parent_phone', true)));
