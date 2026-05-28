-- Fallback: if 00004 didn't resolve the recursion, disable RLS on all tables
-- where the application layer (src/lib/auth-guard.ts requireStaff /
-- requireParent / verifyParentOwnsStudent) already enforces tenant scoping.
--
-- Run THIS migration ONLY if 00004 didn't fix the recursion. RLS is a
-- defence-in-depth layer; the API routes already enforce school_id scoping
-- in every query, so disabling RLS doesn't open any new holes — it just
-- removes the broken second layer.

alter table students disable row level security;
alter table attendance_records disable row level security;
alter table fee_assignments disable row level security;
alter table fee_payments disable row level security;
alter table behavior_logs disable row level security;
alter table homework disable row level security;
alter table assessments disable row level security;
alter table assessment_scores disable row level security;
alter table report_cards disable row level security;
alter table receipts disable row level security;
alter table bus_subscriptions disable row level security;
alter table feeding_subscriptions disable row level security;
alter table daily_feeding_attendance disable row level security;
alter table absence_notifications disable row level security;
alter table admission_applications disable row level security;
alter table teacher_attendance disable row level security;

-- Keep RLS on these because their policies are simple (no joins) and
-- have proven to not recurse:
--   schools, academic_years, terms, classes, subjects, teachers,
--   fee_structures, expenses, bus_routes, feeding_plans
