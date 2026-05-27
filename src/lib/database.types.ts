// ============================================
// Skooly — Supabase Database Types
// Auto-generated from 00001_schema.sql
// ============================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ──────────────────────────────────────────
// Enum / Union Types (from CHECK constraints)
// ──────────────────────────────────────────

export type AdmissionStatus = 'pending' | 'accepted' | 'rejected' | 'waitlisted';
export type StudentStatus = 'active' | 'transferred' | 'graduated' | 'withdrawn';
export type FeeCategory = 'tuition' | 'bus' | 'feeding' | 'other';
export type FeeFrequency = 'termly' | 'monthly' | 'custom';
export type PaymentMethod = 'momovc' | 'momomtn' | 'momo_at' | 'card' | 'cash' | 'bank';
export type PaymentStatus = 'pending' | 'confirmed' | 'failed' | 'refunded';
export type TripType = 'one_way' | 'round_trip';
export type SchemeStatus = 'draft' | 'published';
export type AssessmentType = 'quiz' | 'test' | 'homework' | 'project' | 'exam';
export type TeacherStatus = 'active' | 'suspended' | 'terminated';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'permission_withdrawn' | 'left_without_permission';
export type NotificationChannel = 'whatsapp' | 'sms' | 'both';
export type NotificationStatus = 'pending' | 'sent' | 'failed';
export type BehaviorType = 'star' | 'warning' | 'incident';
export type BroadcastStatus = 'sent' | 'failed' | 'partial';
export type EnrollmentSource = 'referral' | 'online_ad' | 'signpost' | 'walk_in' | 'social_media' | 'other';
export type ExpenseCategory = 'salary' | 'supplies' | 'utilities' | 'maintenance' | 'transport' | 'other';

// ──────────────────────────────────────────
// Table Interfaces
// ──────────────────────────────────────────

export interface Schools {
  id: string;
  name: string;
  short_code: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  subscription_plan: string | null;
  settings: Json | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AcademicYears {
  id: string;
  school_id: string | null;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean | null;
  created_at: string | null;
}

export interface Terms {
  id: string;
  academic_year_id: string | null;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean | null;
  created_at: string | null;
}

export interface Classes {
  id: string;
  school_id: string | null;
  name: string;
  academic_year_id: string | null;
  teacher_id: string | null;
  sort_order: number | null;
  created_at: string | null;
}

export interface Subjects {
  id: string;
  school_id: string | null;
  name: string;
  code: string | null;
  is_core: boolean | null;
  created_at: string | null;
}

export interface AdmissionApplications {
  id: string;
  school_id: string | null;
  child_first_name: string;
  child_last_name: string;
  dob: string | null;
  birth_cert_url: string | null;
  passport_url: string | null;
  parent_first_name: string;
  parent_last_name: string;
  parent_phone: string;
  parent_secondary_phone: string | null;
  parent_email: string | null;
  applied_class_id: string | null;
  status: string | null;
  application_fee_paid: boolean | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Students {
  id: string;
  school_id: string | null;
  first_name: string;
  last_name: string;
  dob: string | null;
  admission_number: string | null;
  class_id: string | null;
  parent_primary_phone: string;
  parent_secondary_phone: string | null;
  parent_email: string | null;
  parent_user_id: string | null;
  enrollment_date: string | null;
  status: string | null;
  medical_info: Json | null;
  profile_photo_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Transfers {
  id: string;
  student_id: string | null;
  from_class_id: string | null;
  to_class_id: string | null;
  from_school_id: string | null;
  to_school_id: string | null;
  reason: string | null;
  previous_report_url: string | null;
  transfer_date: string | null;
  created_at: string | null;
}

export interface FeeStructures {
  id: string;
  school_id: string | null;
  class_id: string | null;
  name: string;
  category: string;
  amount: number;
  frequency: string | null;
  due_date: string | null;
  sibling_discount_pct: number | null;
  early_payment_discount_pct: number | null;
  late_fee_amount: number | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface FeeAssignments {
  id: string;
  student_id: string | null;
  fee_structure_id: string | null;
  term_id: string | null;
  amount_after_discount: number | null;
  is_opted_in: boolean | null;
  pro_rated_days: number | null;
  created_at: string | null;
}

export interface FeePayments {
  id: string;
  student_id: string | null;
  fee_assignment_id: string | null;
  amount_paid: number;
  balance_before: number | null;
  payment_method: string | null;
  transaction_id: string | null;
  momo_reference: string | null;
  receipt_number: string | null;
  payment_date: string | null;
  status: string | null;
  verified_at: string | null;
  notes: string | null;
  created_at: string | null;
}

export interface Receipts {
  id: string;
  payment_id: string | null;
  receipt_number: string | null;
  receipt_data: string | null;
  qr_code_data: string | null;
  pdf_url: string | null;
  generated_at: string | null;
  verified_at: string | null;
}

export interface SiblingGroups {
  id: string;
  parent_phone: string;
  school_id: string | null;
  name: string | null;
  created_at: string | null;
}

export interface SiblingGroupMembers {
  id: string;
  sibling_group_id: string | null;
  student_id: string | null;
}

export interface BusRoutes {
  id: string;
  school_id: string | null;
  name: string;
  zones: Json | null;
  is_active: boolean | null;
  created_at: string | null;
}

export interface BusStops {
  id: string;
  bus_route_id: string | null;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  sort_order: number | null;
  created_at: string | null;
}

export interface BusSubscriptions {
  id: string;
  student_id: string | null;
  bus_route_id: string | null;
  stop_id: string | null;
  trip_type: string | null;
  fee_amount: number | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

export interface FeedingPlans {
  id: string;
  school_id: string | null;
  name: string;
  description: string | null;
  daily_rate: number;
  is_active: boolean | null;
  created_at: string | null;
}

export interface FeedingSubscriptions {
  id: string;
  student_id: string | null;
  feeding_plan_id: string | null;
  days_per_week: number | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

export interface DailyFeedingAttendance {
  id: string;
  student_id: string | null;
  date: string | null;
  was_fed: boolean | null;
  recorded_by: string | null;
  created_at: string | null;
}

export interface SchemesOfWork {
  id: string;
  class_id: string | null;
  subject_id: string | null;
  term_id: string | null;
  teacher_id: string | null;
  title: string;
  week_number: number | null;
  topics_covered: string | null;
  objectives: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface LessonNotes {
  id: string;
  scheme_of_work_id: string | null;
  teacher_id: string | null;
  date: string;
  topic: string;
  content: string | null;
  attachments: Json | null;
  created_at: string | null;
}

export interface Assessments {
  id: string;
  class_id: string | null;
  subject_id: string | null;
  term_id: string | null;
  teacher_id: string | null;
  name: string;
  type: string | null;
  max_score: number;
  ca_weight_pct: number | null;
  date: string | null;
  created_at: string | null;
}

export interface AssessmentScores {
  id: string;
  assessment_id: string | null;
  student_id: string | null;
  score: number | null;
  remarks: string | null;
  created_at: string | null;
}

export interface ReportCards {
  id: string;
  student_id: string | null;
  term_id: string | null;
  generated_at: string | null;
  pdf_url: string | null;
  overall_position: number | null;
  total_score: number | null;
  average_score: number | null;
  teacher_comments: string | null;
  headteacher_remarks: string | null;
  data: Json | null;
}

export interface Teachers {
  id: string;
  school_id: string | null;
  user_id: string | null;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  employee_id: string | null;
  ntc_license_url: string | null;
  certificates: Json | null;
  cv_url: string | null;
  contract_start: string | null;
  contract_end: string | null;
  status: string | null;
  clock_in_method: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TeacherAttendance {
  id: string;
  teacher_id: string | null;
  date: string | null;
  clock_in_time: string | null;
  clock_out_time: string | null;
  is_present: boolean | null;
  is_late: boolean | null;
  late_minutes: number | null;
  recorded_by: string | null;
  created_at: string | null;
}

export interface TeacherSubjectAssignments {
  id: string;
  teacher_id: string | null;
  class_id: string | null;
  subject_id: string | null;
  periods_per_week: number | null;
}

export interface TeacherPerformance {
  id: string;
  teacher_id: string | null;
  term_id: string | null;
  avg_pass_rate: number | null;
  ca_completion_rate: number | null;
  punctuality_score: number | null;
  parent_complaints: number | null;
}

export interface AttendanceRecords {
  id: string;
  student_id: string | null;
  class_id: string | null;
  date: string | null;
  status: string | null;
  recorded_by: string | null;
  recorded_at: string | null;
  synced: boolean | null;
}

export interface AbsenceNotifications {
  id: string;
  attendance_record_id: string | null;
  student_id: string | null;
  class_id: string | null;
  date: string | null;
  parent1_notified_at: string | null;
  parent2_notified_at: string | null;
  notification_channel: string | null;
  notification_status: string | null;
  error_message: string | null;
  created_at: string | null;
}

export interface Homework {
  id: string;
  class_id: string | null;
  subject_id: string | null;
  teacher_id: string | null;
  title: string;
  description: string | null;
  attachments: Json | null;
  due_date: string | null;
  created_at: string | null;
}

export interface HomeworkViews {
  id: string;
  homework_id: string | null;
  parent_phone: string;
  viewed_at: string | null;
}

export interface BehaviorLogs {
  id: string;
  student_id: string | null;
  teacher_id: string | null;
  type: string | null;
  description: string;
  date: string | null;
  shared_with_parent: boolean | null;
  shared_at: string | null;
  created_at: string | null;
}

export interface WhatsappBroadcasts {
  id: string;
  school_id: string | null;
  sent_by: string | null;
  target: string | null;
  message_text: string;
  sent_count: number | null;
  failed_count: number | null;
  sent_at: string | null;
  status: string | null;
}

export interface EnrollmentSources {
  id: string;
  school_id: string | null;
  student_id: string | null;
  source: string | null;
  referred_by: string | null;
  cost_per_lead: number | null;
  created_at: string | null;
}

export interface DropoffLogs {
  id: string;
  school_id: string | null;
  student_id: string | null;
  withdrawal_date: string;
  reason: string | null;
  exit_interview_notes: string | null;
  created_at: string | null;
}

export interface Expenses {
  id: string;
  school_id: string | null;
  category: string | null;
  amount: number;
  description: string | null;
  date: string | null;
  receipt_url: string | null;
  created_at: string | null;
}

export interface TeacherDocuments {
  id: string;
  teacher_id: string | null;
  document_type: string;
  file_url: string;
  expiry_date: string | null;
  is_verified: boolean | null;
  created_at: string | null;
}

// ──────────────────────────────────────────
// Type Helpers
// ──────────────────────────────────────────

type InsertFields<T> = Omit<
  T,
  'id' | 'created_at' | 'updated_at' | 'generated_at' | 'recorded_at' | 'viewed_at' | 'verified_at'
>;

// ──────────────────────────────────────────
// Database Wrapper Interface
// ──────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      schools: {
        Row: Schools;
        Insert: InsertFields<Schools>;
        Update: Partial<InsertFields<Schools>>;
      };
      academic_years: {
        Row: AcademicYears;
        Insert: InsertFields<AcademicYears>;
        Update: Partial<InsertFields<AcademicYears>>;
      };
      terms: {
        Row: Terms;
        Insert: InsertFields<Terms>;
        Update: Partial<InsertFields<Terms>>;
      };
      classes: {
        Row: Classes;
        Insert: InsertFields<Classes>;
        Update: Partial<InsertFields<Classes>>;
      };
      subjects: {
        Row: Subjects;
        Insert: InsertFields<Subjects>;
        Update: Partial<InsertFields<Subjects>>;
      };
      admission_applications: {
        Row: AdmissionApplications;
        Insert: InsertFields<AdmissionApplications>;
        Update: Partial<InsertFields<AdmissionApplications>>;
      };
      students: {
        Row: Students;
        Insert: InsertFields<Students>;
        Update: Partial<InsertFields<Students>>;
      };
      transfers: {
        Row: Transfers;
        Insert: InsertFields<Transfers>;
        Update: Partial<InsertFields<Transfers>>;
      };
      fee_structures: {
        Row: FeeStructures;
        Insert: InsertFields<FeeStructures>;
        Update: Partial<InsertFields<FeeStructures>>;
      };
      fee_assignments: {
        Row: FeeAssignments;
        Insert: InsertFields<FeeAssignments>;
        Update: Partial<InsertFields<FeeAssignments>>;
      };
      fee_payments: {
        Row: FeePayments;
        Insert: InsertFields<FeePayments>;
        Update: Partial<InsertFields<FeePayments>>;
      };
      receipts: {
        Row: Receipts;
        Insert: InsertFields<Receipts>;
        Update: Partial<InsertFields<Receipts>>;
      };
      sibling_groups: {
        Row: SiblingGroups;
        Insert: InsertFields<SiblingGroups>;
        Update: Partial<InsertFields<SiblingGroups>>;
      };
      sibling_group_members: {
        Row: SiblingGroupMembers;
        Insert: InsertFields<SiblingGroupMembers>;
        Update: Partial<InsertFields<SiblingGroupMembers>>;
      };
      bus_routes: {
        Row: BusRoutes;
        Insert: InsertFields<BusRoutes>;
        Update: Partial<InsertFields<BusRoutes>>;
      };
      bus_stops: {
        Row: BusStops;
        Insert: InsertFields<BusStops>;
        Update: Partial<InsertFields<BusStops>>;
      };
      bus_subscriptions: {
        Row: BusSubscriptions;
        Insert: InsertFields<BusSubscriptions>;
        Update: Partial<InsertFields<BusSubscriptions>>;
      };
      feeding_plans: {
        Row: FeedingPlans;
        Insert: InsertFields<FeedingPlans>;
        Update: Partial<InsertFields<FeedingPlans>>;
      };
      feeding_subscriptions: {
        Row: FeedingSubscriptions;
        Insert: InsertFields<FeedingSubscriptions>;
        Update: Partial<InsertFields<FeedingSubscriptions>>;
      };
      daily_feeding_attendance: {
        Row: DailyFeedingAttendance;
        Insert: InsertFields<DailyFeedingAttendance>;
        Update: Partial<InsertFields<DailyFeedingAttendance>>;
      };
      schemes_of_work: {
        Row: SchemesOfWork;
        Insert: InsertFields<SchemesOfWork>;
        Update: Partial<InsertFields<SchemesOfWork>>;
      };
      lesson_notes: {
        Row: LessonNotes;
        Insert: InsertFields<LessonNotes>;
        Update: Partial<InsertFields<LessonNotes>>;
      };
      assessments: {
        Row: Assessments;
        Insert: InsertFields<Assessments>;
        Update: Partial<InsertFields<Assessments>>;
      };
      assessment_scores: {
        Row: AssessmentScores;
        Insert: InsertFields<AssessmentScores>;
        Update: Partial<InsertFields<AssessmentScores>>;
      };
      report_cards: {
        Row: ReportCards;
        Insert: InsertFields<ReportCards>;
        Update: Partial<InsertFields<ReportCards>>;
      };
      teachers: {
        Row: Teachers;
        Insert: InsertFields<Teachers>;
        Update: Partial<InsertFields<Teachers>>;
      };
      teacher_attendance: {
        Row: TeacherAttendance;
        Insert: InsertFields<TeacherAttendance>;
        Update: Partial<InsertFields<TeacherAttendance>>;
      };
      teacher_subject_assignments: {
        Row: TeacherSubjectAssignments;
        Insert: InsertFields<TeacherSubjectAssignments>;
        Update: Partial<InsertFields<TeacherSubjectAssignments>>;
      };
      teacher_performance: {
        Row: TeacherPerformance;
        Insert: InsertFields<TeacherPerformance>;
        Update: Partial<InsertFields<TeacherPerformance>>;
      };
      attendance_records: {
        Row: AttendanceRecords;
        Insert: InsertFields<AttendanceRecords>;
        Update: Partial<InsertFields<AttendanceRecords>>;
      };
      absence_notifications: {
        Row: AbsenceNotifications;
        Insert: InsertFields<AbsenceNotifications>;
        Update: Partial<InsertFields<AbsenceNotifications>>;
      };
      homework: {
        Row: Homework;
        Insert: InsertFields<Homework>;
        Update: Partial<InsertFields<Homework>>;
      };
      homework_views: {
        Row: HomeworkViews;
        Insert: InsertFields<HomeworkViews>;
        Update: Partial<InsertFields<HomeworkViews>>;
      };
      behavior_logs: {
        Row: BehaviorLogs;
        Insert: InsertFields<BehaviorLogs>;
        Update: Partial<InsertFields<BehaviorLogs>>;
      };
      whatsapp_broadcasts: {
        Row: WhatsappBroadcasts;
        Insert: InsertFields<WhatsappBroadcasts>;
        Update: Partial<InsertFields<WhatsappBroadcasts>>;
      };
      enrollment_sources: {
        Row: EnrollmentSources;
        Insert: InsertFields<EnrollmentSources>;
        Update: Partial<InsertFields<EnrollmentSources>>;
      };
      dropoff_logs: {
        Row: DropoffLogs;
        Insert: InsertFields<DropoffLogs>;
        Update: Partial<InsertFields<DropoffLogs>>;
      };
      expenses: {
        Row: Expenses;
        Insert: InsertFields<Expenses>;
        Update: Partial<InsertFields<Expenses>>;
      };
      teacher_documents: {
        Row: TeacherDocuments;
        Insert: InsertFields<TeacherDocuments>;
        Update: Partial<InsertFields<TeacherDocuments>>;
      };
    };
    Enums: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// ──────────────────────────────────────────
// Generic Type Helpers for Supabase
// ──────────────────────────────────────────

export type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type TableInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type TableUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
