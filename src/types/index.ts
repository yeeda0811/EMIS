// ============================================================
// EMIS 資料型別定義
// 依照「資料庫最終設定.pdf」規格書定義
// ============================================================

export interface Teacher {
  id: string
  name: string
  title: string
  phone: string
  email: string
  username: string
  password: string
  type: 'homeroom' | 'extracurricular' | 'admin'
  class_id?: string
}

export interface Student {
  id: string
  name: string
  birthday: string
  student_no: string
  class_name: string
  seat_no: string
  parent: string
  parent_phone: string
  parent_email: string
}

export interface ClassRoom {
  id: string
  name: string
  is_extracurricular: boolean
}

export interface Location {
  id: string
  name: string
}

export interface CourseSlot {
  day: string
  period: string
}

export interface Course {
  id: string
  name: string
  description: string
  teacher_id: string
  slots: CourseSlot[]
  class_name: string
  location: string
}

export interface LeaveRecord {
  id: string
  student_id: string
  leave_type: string
  start_date: string
  end_date: string
  periods: string
  reason: string
  parent_name: string
  parent_phone: string
  parent_email: string
  status: 'pending' | 'approved' | 'rejected'
  source: string
  notified_teachers: string[]
  created_at: string
}

export interface ScheduleCell {
  day: number
  period: number
  subject: string
}

export interface ScheduleRecord {
  id: string
  class_name: string
  cells: ScheduleCell[]
}

export type SystemRole = 'admin' | 'teacher' | null
export type AppRoute = 'login' | 'parent_form' | 'admin_dashboard' | 'teacher_dashboard'
export type AdminTab = 'dashboard' | 'leaves' | 'students' | 'teachers' | 'classes' | 'locations' | 'courses' | 'schedule' | 'my_class'
export type ToastType = 'success' | 'error' | 'info'

export interface ToastState {
  show: boolean
  message: string
  type: ToastType
}
