// ============================================================
// EMIS Supabase Data Access Layer
// 所有 Supabase CRUD 操作均封裝於此模組
// ============================================================
import { supabase } from '../lib/supabase'
import type {
  Teacher, Student, ClassRoom, Location,
  Course, LeaveRecord, ScheduleRecord
} from '../types'

// --------- Teachers ---------
export async function fetchTeachers(): Promise<Teacher[]> {
  const { data, error } = await supabase.from('teachers').select('*').order('id')
  if (error) throw error
  return (data || []) as Teacher[]
}

export async function upsertTeacher(teacher: Partial<Teacher> & { id: string }) {
  const { error } = await supabase.from('teachers').upsert(teacher)
  if (error) throw error
}

export async function deleteTeacher(id: string) {
  const { error } = await supabase.from('teachers').delete().eq('id', id)
  if (error) throw error
}

// --------- Students ---------
export async function fetchStudents(): Promise<Student[]> {
  const { data, error } = await supabase.from('students').select('*').order('student_no')
  if (error) throw error
  return (data || []) as Student[]
}

export async function upsertStudent(student: Partial<Student> & { id: string }) {
  const { error } = await supabase.from('students').upsert(student)
  if (error) throw error
}

export async function deleteStudent(id: string) {
  const { error } = await supabase.from('students').delete().eq('id', id)
  if (error) throw error
}

// --------- Classes ---------
export async function fetchClasses(): Promise<ClassRoom[]> {
  const { data, error } = await supabase.from('classes').select('*').order('name')
  if (error) throw error
  return (data || []) as ClassRoom[]
}

export async function upsertClass(cls: Partial<ClassRoom> & { id: string }) {
  const { error } = await supabase.from('classes').upsert(cls)
  if (error) throw error
}

export async function deleteClass(id: string) {
  const { error } = await supabase.from('classes').delete().eq('id', id)
  if (error) throw error
}

// --------- Locations ---------
export async function fetchLocations(): Promise<Location[]> {
  const { data, error } = await supabase.from('locations').select('*').order('name')
  if (error) throw error
  return (data || []) as Location[]
}

export async function upsertLocation(loc: Partial<Location> & { id: string }) {
  const { error } = await supabase.from('locations').upsert(loc)
  if (error) throw error
}

export async function deleteLocation(id: string) {
  const { error } = await supabase.from('locations').delete().eq('id', id)
  if (error) throw error
}

// --------- Courses ---------
export async function fetchCourses(): Promise<Course[]> {
  const { data, error } = await supabase.from('courses').select('*').order('id')
  if (error) throw error
  return (data || []) as Course[]
}

export async function upsertCourse(course: Partial<Course> & { id: string }) {
  const { error } = await supabase.from('courses').upsert(course)
  if (error) throw error
}

export async function deleteCourse(id: string) {
  const { error } = await supabase.from('courses').delete().eq('id', id)
  if (error) throw error
}

// --------- Leave Records ---------
export async function fetchLeaves(): Promise<LeaveRecord[]> {
  const { data, error } = await supabase
    .from('leave_records')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as LeaveRecord[]
}

export async function insertLeave(leave: Omit<LeaveRecord, 'id' | 'created_at'>) {
  const { error } = await supabase.from('leave_records').insert(leave)
  if (error) throw error
}

export async function updateLeaveStatus(id: string, status: 'approved' | 'rejected') {
  const { error } = await supabase
    .from('leave_records')
    .update({ status })
    .eq('id', id)
  if (error) throw error
}

// --------- Schedules ---------
export async function fetchSchedules(): Promise<ScheduleRecord[]> {
  const { data, error } = await supabase.from('schedules').select('*')
  if (error) throw error
  return (data || []) as ScheduleRecord[]
}

export async function upsertSchedule(schedule: { id: string; class_name: string; cells: object[] }) {
  const { error } = await supabase.from('schedules').upsert(schedule, { onConflict: 'id' })
  if (error) throw error
}

// --------- ID Generator Utility ---------
export function getNextId(list: { id: string }[], prefix: string): string {
  if (!list || list.length === 0) return `${prefix}_001`
  const numericParts = list.map(item => {
    const part = (item.id || '').split('_')[1]
    const parsed = parseInt(part, 10)
    return isNaN(parsed) ? 0 : parsed
  })
  const maxId = Math.max(...numericParts, 0)
  return `${prefix}_${String(maxId + 1).padStart(3, '0')}`
}
