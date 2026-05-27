# Skooly — Private Basic School Management System (Ghana)
**Status:** Blueprint v1.0 · **Author:** Moishe, Number 1 · **Date:** 2026-05-26

---

## 1. Why This Exists

Private basic schools in Ghana run on trust and cash flow. Parents want to see where their money goes. Proprietors want to collect fees without chasing. Teachers want to do their jobs without admin overhead.

Current solutions are either:
- **Expensive** (international SaaS, priced in USD, no MoMo)
- **Paper-based** (receipts lost, grades in notebooks, attendance is a register book)
- **Fragmented** (one app for fees, another for grades, WhatsApp for everything else)

**Skooly** brings it all into one place — parent-first, mobile money-native, built for Ghana's realities.

---

## 2. Core Philosophy

| Principle | How It Shapes Decisions |
|-----------|------------------------|
| **Parent-first** | Every feature starts with: "can a parent use this on a smartphone with limited data?" |
| **Cash flow first** | Fee collection, bus/feeding billing, and arrears alerts pay the bills. Academics is retention. |
| **Works offline** | Teachers in remote areas must take attendance and enter grades without internet. |
| **Low-friction auth** | PIN or biometric for parents. No passwords to forget. |
| **Mobile money is not optional** | MTN MoMo, Vodafone Cash, AirtelTigo Money — auto-reconciliation. No manual bank checks. |
| **WhatsApp is the UI** | Parents check WhatsApp more than any app. Notifications, receipts, alerts — all via WhatsApp first. |

---

## 3. Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Framework** | Next.js 16 (App Router) | Proven with Dzibi. SSR for SEO (school websites), API routes for everything. |
| **UI** | Tailwind v4 + shadcn/ui | Fast to build, mobile-first, low bundle size. |
| **Database** | Supabase (PostgreSQL) | Row-level security for multi-school, real-time subscriptions, PostGIS not needed here. |
| **Auth** | Supabase Auth | Email/password for staff, PIN/biometric for parents. |
| **Mobile Money** | Hubtel / Paystack GH | Hubtel for MoMo direct; Paystack if card support needed later. |
| **WhatsApp** | WATI / Twilio WhatsApp API | Automated messages, receipt delivery, absence alerts. |
| **SMS Fallback** | Twilio / mNotify Ghana | When parent has no smartphone. |
| **File Storage** | Supabase Storage (S3-compatible) | Birth certs, photos, report cards. |
| **Offline Sync** | IndexedDB (via Dexie.js) + service worker for SWR | Teachers cache attendance/grade data, sync on connectivity. |
| **PDF Generation** | Puppeteer / jsPDF | Admission letters, report cards, digital receipts. |

---

## 4. Database Schema (All 41 Features Mapped)

### Core Entities

```
schools
  id, name, address, phone, email, logo_url, subscription_plan, created_at

academic_years
  id, school_id, name (e.g. "2025/2026"), start_date, end_date, is_current

terms
  id, academic_year_id, name (e.g. "1st Term"), start_date, end_date, is_current

classes
  id, school_id, name (e.g. "Class 4"), academic_year_id, teacher_id, fee_amount

subjects
  id, school_id, name (e.g. "Integrated Science"), code
```

### Admissions & Enrollment

```
admission_applications
  id, school_id, child_name, dob, birth_cert_url, passport_url,
  parent_name, parent_phone, parent_email, status (pending|accepted|rejected|waitlisted),
  applied_class_id, application_fee_paid, created_at

students
  id, school_id, user_id (parent), first_name, last_name, dob,
  class_id, admission_number, enrollment_date, status (active|transferred|graduated|withdrawn),
  medical_info (jsonb: allergies, blood_group, conditions, emergency_contacts)

transfers
  id, student_id, from_class_id, to_class_id, from_school_id, to_school_id,
  previous_report_url, reason, transfer_date
```

### Fee Management (Tuition, Bus, Feeding)

```
fee_structures
  id, school_id, class_id, name (e.g. "Tuition"), category (tuition|bus|feeding),
  amount, frequency (termly|monthly|custom), due_date,
  sibling_discount_pct, early_payment_discount_pct, is_active

fee_assignments
  id, student_id, fee_structure_id, academic_year_id, term_id,
  amount_after_discount, is_opted_in (for bus/feeding)

bus_routes
  id, school_id, name (e.g. "Madina Route"), zones (jsonb: zone_name, fee_amount),
  is_active

bus_stops
  id, bus_route_id, name, address, lat, lng

bus_subscriptions
  id, student_id, bus_route_id, stop_id, trip_type (one_way|round_trip),
  start_date, end_date, fee_amount, is_active

feeding_plans
  id, school_id, name, description, daily_rate, is_active

feeding_subscriptions
  id, student_id, feeding_plan_id, days_per_week,
  start_date, end_date, is_active

daily_feeding_attendance
  id, student_id, date, was_fed (boolean), recorded_by

fee_payments
  id, student_id, fee_assignment_id, amount_paid, balance_before,
  payment_method (momovc|momomtn|momoat|card|cash),
  transaction_id, momo_reference, receipt_number,
  payment_date, status (pending|confirmed|failed|refunded)

receipts
  id, payment_id, receipt_number, receipt_url (PDF), qr_code_data,
  generated_at, verified_at

sibling_groups
  id, parent_user_id, school_id, name (e.g. "Asare Family")
```

### Academics

```
schemes_of_work
  id, class_id, subject_id, term_id, teacher_id,
  title, week_number, topics_covered, objectives, created_at

lesson_notes
  id, scheme_of_work_id, teacher_id, date, topic,
  content (text or rich), attachments (jsonb urls)

assessments
  id, class_id, subject_id, term_id, teacher_id,
  name (e.g. "Quiz 1"), type (quiz|test|homework|project|exam),
  max_score, date, ca_weight_pct

assessment_scores
  id, assessment_id, student_id, score, remarks

report_cards
  id, student_id, term_id, generated_at, pdf_url,
  overall_position, teacher_comments, headteacher_remarks
```

### Teacher Management

```
teachers
  id, school_id, user_id, first_name, last_name, phone, email,
  employee_id, ntc_license_url, certificate_urls (jsonb), cv_url,
  contract_start, contract_end, status (active|suspended|terminated),
  clock_in_method (mobile|biometric)

teacher_attendance
  id, teacher_id, date, clock_in_time, clock_out_time,
  is_present, is_late, late_minutes

teacher_subject_assignments
  id, teacher_id, class_id, subject_id, periods_per_week

teacher_performance
  id, teacher_id, term_id, avg_pass_rate, ca_completion_rate,
  punctuality_score, parent_complaints
```

### Attendance & Absence

```
attendance_records
  id, student_id, class_id, date, status (present|absent|lates|
  permission_withdrawn|left_without_permission),
  recorded_by (teacher_id), recorded_at, synced (bool for offline)

absence_notifications
  id, attendance_record_id, student_id, class_id, date,
  parent1_notified_at, parent2_notified_at,
  notification_channel (whatsapp|sms|both),
  notification_status (sent|failed|pending)
```

### Engagement

```
homework
  id, class_id, subject_id, teacher_id, title, description,
  attachments (jsonb urls), due_date, created_at

homework_views (parent "seen" tracking)
  id, homework_id, parent_user_id, viewed_at

behavior_logs
  id, student_id, teacher_id, type (star|warning|incident),
  description, date, shared_with_parent (bool), shared_at

whatsapp_broadcasts
  id, school_id, sent_by, target (class|all_parents|specific),
  message_text, sent_at, status (sent|failed|partial)
```

### Proprietor Analytics

```
enrollment_sources
  id, school_id, student_id, source (referral|online_ad|signpost|walk_in|other),
  referred_by (optional), cost_per_lead

dropoff_logs
  id, school_id, student_id, withdrawal_date, reason,
  exit_interview_notes

bus_utilization
  (computed view: route_id, total_capacity, enrolled_students,
   revenue, fuel_cost, profit_margin)

fee_collection_stats
  (computed view: class_id, total_expected, collected, collection_rate,
   avg_days_overdue)
```

---

## 5. Phase 1 MVP — Fee + Bus/Feeding + Absence Alerts

### What Ships

| # | Feature | Scope |
|---|---------|-------|
| 6 | Flexible Fee Structures | Database + admin CRUD. No frontend installer yet — manual setup. |
| 7 | MoMo Integration | Hubtel API wrapper. Accept payment → webhook → auto-reconciliation. |
| 8 | Automated Fee Reminders | Cron job: check due dates, fire WhatsApp/SMS at D-7, D-3, D-1. |
| 14 | Bus Fee Management | Route/stop setup per school, student subscription, pro-rated billing. |
| 16 | Feeding Fee Management | Plan setup, opt-in/out, daily attendance, bill only for days fed. |
| 35 | Absence Notification System | Teacher marks absent → triggers parent WhatsApp/SMS immediately. |

### API Routes

```
// Schools
POST /api/schools                — create school
GET  /api/schools/:id            — get school

// Fee Management
POST /api/fee-structures         — create fee structure
GET  /api/fee-structures?class=  — list fee structures
POST /api/fee-assignments        — assign fee to student
GET  /api/fee-assignments/:student — get student's fees

// Payments
POST /api/payments/initiate      — initiate MoMo payment (returns checkout URL)
POST /api/payments/webhook       — Hubtel callback for payment confirmation
GET  /api/payments/:id/receipt   — get receipt PDF with QR
GET  /api/students/:id/ledger    — fee ledger with color-coded status

// Bus
POST /api/bus/routes             — create route
POST /api/bus/subscriptions      — subscribe student
GET  /api/bus/:student/statement — bus fee statement

// Feeding
POST /api/feeding/plans          — create plan
POST /api/feeding/subscribe      — subscribe student
POST /api/feeding/attendance     — daily feeding attendance
GET  /api/feeding/:student/bill  — feeding bill for period

// Absence
POST /api/attendance             — record attendance (supports batch)
POST /api/absence/notify         — trigger parent notification
GET  /api/absence/history/:student — absence history

// WhatsApp / SMS
POST /api/notifications/send     — send WhatsApp/SMS to parent
```

### Key Decision: Fee Pro-Ration

When a student joins mid-term or drops a bus route mid-month:

```
Pro-rated amount = (daily_rate) × (remaining_days)
Daily rate = monthly_fee / school_days_in_month
```

Store as `fee_assignments.amount_after_discount` (already includes pro-ration).

### Key Decision: MoMo Reconciliation Flow

```
1. Parent selects MoMo on payment page
2. System calls Hubtel API → sends payment request to parent's phone
3. Parent approves on phone
4. Hubtel sends webhook POST to /api/payments/webhook
5. System verifies HMAC signature
6. Updates fee_payments.status = confirmed
7. Generates receipt with QR code
8. Sends WhatsApp receipt to parent
```

**Failure handling:** If webhook times out, poll Hubtel status every 30s for 5 min, then flag as `pending` for manual review.

---

## 6. Auth Strategy

| Role | Auth Method | What They See |
|------|-------------|---------------|
| **Proprietor** | Email + password | Dashboard, all data, settings |
| **Admin** | Email + password | Students, fees, reports |
| **Teacher** | Email + password or PIN | Attendance, grades, homework, their classes |
| **Parent** | PIN (set during enrollment) or phone OTP | My children only — fees, results, attendance, homework |

**Parent auth flow:**
1. School imports parent phone number
2. Parent receives WhatsApp: "Welcome to Skooly. Your PIN is 1234."
3. Parent opens lite app/website, enters phone + PIN
4. Sees only their children's data (RLS enforced)

---

## 7. Offline Mode Approach

**Phase 1 does NOT include offline mode** — it ships later. But we design schema with sync in mind:

- Every write table has a `synced` boolean (default `true` for online, `false` for offline)
- `updated_at` timestamps on every table
- UUID primary keys (no auto-increment conflicts)

Offline implementation (Phase 4):
- Dexie.js for IndexedDB on the teacher's device
- Service worker intercepts non-critical GET requests
- Queue writes when offline, flush when online
- Conflict resolution: "last write wins" by `updated_at`

---

## 8. UI Component Tree (Phase 1)

```
Layout
├── Proprietor Dashboard
│   ├── Fee Collection Overview (chart)
│   ├── Collection Rate by Class
│   ├── Quick Actions (mark fee, send reminder)
│   └── Recent Payments Feed
├── Fee Management
│   ├── Fee Structure List
│   ├── Create/Edit Fee Structure
│   ├── Student Fee Assignments
│   ├── Payment Initiation (MoMo)
│   └── Payment Ledger (color-coded)
├── Bus Management
│   ├── Routes List
│   ├── Create/Edit Route
│   ├── Student Subscriptions
│   └── Bus Fee Statement
├── Feeding Management
│   ├── Plans List
│   ├── Create/Edit Plan
│   ├── Daily Feeding Attendance (quick toggle)
│   └── Feeding Bills
├── Attendance
│   └── Take Attendance (class select → student list → present/absent)
├── Absence Notifications
│   └── History Log
└── Parent Portal (Lite)
    ├── Fee Balance
    ├── Make Payment
    ├── Download Receipt
    ├── View Attendance
    └── View Homework
```

---

## 9. Open Decisions for Captain

| # | Decision | Options | My Recommendation |
|---|----------|---------|-------------------|
| 1 | **Name** | Skooly / EduTrack / something else | Skooly — Ghana-feel, short, memorable |
| 2 | **MoMo Provider** | Hubtel / Paystack GH / ExpressPay | Hubtel — de facto for Ghana schools |
| 3 | **WhatsApp Provider** | WATI / Twilio / direct WhatsApp Cloud API | WATI — built for African markets, multi-agent, template management |
| 4 | **SMS Provider** | Twilio / mNotify / Arkesel | mNotify — cheaper per SMS in Ghana |
| 5 | **Parent App** | PWA (progressive web app) / React Native / Flutter | PWA — no app store friction, works on any phone |
| 6 | **Report Card Template** | Built-in PDF / LaTeX / Canva embed | Built-in PDF via Puppeteer — fully automated |
| 7 | **Deployment** | Vercel / self-hosted on VPS / Railway | Vercel for now (like Dzibi) — move to VPS when data privacy requires it |

---

## 10. What's Not in Phase 1 (Future Phases)

- **Phase 2:** Academics (schemes, assessments, report cards, transcripts)
- **Phase 3:** Parent engagement (homework portal, behavior logs, WhatsApp broadcasts, medical info)
- **Phase 4:** Proprietor analytics (dashboard, marketing reports, drop-off analysis)
- **Phase 5:** Offline mode + USSD fallback
- **Phase 6:** Multi-school / SaaS subscription model

---

*Blueprint v1 complete. Ready for Captain's decisions before we start Phase 1 implementation.* 🫡
