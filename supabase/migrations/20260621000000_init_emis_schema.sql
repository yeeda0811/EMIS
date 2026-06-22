-- ============================================================
-- EMIS 校務管理系統 - 資料庫建立腳本
-- 依照「EMIS 校務管理系統規格書_資料庫最終設定.pdf」規格
-- ============================================================

-- 啟用 UUID 擴充套件 (已由 Supabase 預設啟用)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. 教師表 (teachers)
-- ============================================================
CREATE TABLE IF NOT EXISTS teachers (
  id          TEXT PRIMARY KEY,             -- 例：TEA_001
  name        TEXT NOT NULL,
  title       TEXT,
  phone       TEXT,
  email       TEXT,
  username    TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'homeroom', -- homeroom | extracurricular | admin
  class_id    TEXT,                         -- 導師對應班級名稱
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. 班級表 (classes)
-- ============================================================
CREATE TABLE IF NOT EXISTS classes (
  id                 TEXT PRIMARY KEY,      -- 例：CLASS_001
  name               TEXT NOT NULL UNIQUE,
  is_extracurricular BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. 學生表 (students)
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
  id            TEXT PRIMARY KEY,           -- 例：STU_001
  name          TEXT NOT NULL,
  birthday      TEXT,                       -- 7碼民國年，如：1150101
  student_no    TEXT UNIQUE,
  class_name    TEXT,                       -- 關聯 classes.name（彈性外鍵，允許空值）
  seat_no       TEXT,
  parent        TEXT,
  parent_phone  TEXT,
  parent_email  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. 地點表 (locations)
-- ============================================================
CREATE TABLE IF NOT EXISTS locations (
  id         TEXT PRIMARY KEY,             -- 例：RM_001
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. 課程表 (courses)
-- 授課時段 slots 以 JSONB 儲存：[{"day":"1","period":"4"}, ...]
-- ============================================================
CREATE TABLE IF NOT EXISTS courses (
  id          TEXT PRIMARY KEY,            -- 例：CRS_001
  name        TEXT NOT NULL,
  description TEXT,
  teacher_id  TEXT REFERENCES teachers(id) ON DELETE SET NULL,
  slots       JSONB NOT NULL DEFAULT '[]',
  class_name  TEXT,                        -- 關聯 classes.name（可為空，表示跨班社團）
  location    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. 請假紀錄表 (leave_records)
-- notified_teachers 以 JSONB 陣列儲存教師 id 清單
-- ============================================================
CREATE TABLE IF NOT EXISTS leave_records (
  id                TEXT PRIMARY KEY DEFAULT ('LV_' || EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT),
  student_id        TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  leave_type        TEXT NOT NULL,         -- 事假 | 病假 | 公假 | 喪假
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  periods           TEXT,                  -- 如：上課時段: 全天\n課後時段: 無
  reason            TEXT,
  parent_name       TEXT,
  parent_phone      TEXT,
  parent_email      TEXT,
  status            TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  source            TEXT DEFAULT 'parent_portal',
  notified_teachers JSONB NOT NULL DEFAULT '[]',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. 課表資料表 (schedules)
-- cells 以 JSONB 儲存：[{"day":1,"period":1,"subject":"流行街舞社"}, ...]
-- ============================================================
CREATE TABLE IF NOT EXISTS schedules (
  id         TEXT PRIMARY KEY,             -- 班級名稱，如：301
  class_name TEXT NOT NULL,
  cells      JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 索引 (Indexes)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_students_class_name   ON students(class_name);
CREATE INDEX IF NOT EXISTS idx_leave_records_student ON leave_records(student_id);
CREATE INDEX IF NOT EXISTS idx_leave_records_status  ON leave_records(status);
CREATE INDEX IF NOT EXISTS idx_leave_records_date    ON leave_records(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_courses_teacher       ON courses(teacher_id);

-- ============================================================
-- Row Level Security (RLS) 基本設定
-- 目前設定為允許所有操作（公開讀寫，部署後請依需求收緊）
-- ============================================================
ALTER TABLE teachers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE students      ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules     ENABLE ROW LEVEL SECURITY;

-- 暫時允許所有匿名使用者存取（使用前請設定更嚴格的 RLS 策略）
CREATE POLICY "Allow all access" ON teachers      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON students      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON classes       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON locations     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON courses       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON leave_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON schedules     FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 初始種子資料 (Seed Data)
-- 對應前端的 DEFAULT_* 常數
-- ============================================================
INSERT INTO classes (id, name, is_extracurricular) VALUES
  ('CLASS_001',     '101',      FALSE),
  ('CLASS_002',     '301',      FALSE),
  ('CLASS_EXT_001', '流行街舞社', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO teachers (id, name, title, phone, email, username, password, type, class_id) VALUES
  ('TEA_001', '吳佳曄', '101導師',     '0911-001001', 't001@snps.tn.edu.tw', 'a001', '0000', 'homeroom',        '101'),
  ('TEA_003', '陳美雲', '301導師',     '0911-003003', 't003@snps.tn.edu.tw', 'a003', '0002', 'homeroom',        '301'),
  ('TEA_008', '林大秀', '外聘街舞老師', '0911-008008', 'dance@snps.tn.edu.tw','a007', '0006', 'extracurricular', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO locations (id, name) VALUES
  ('RM_001', '活動中心 2F'),
  ('RM_002', '電腦教室(一)')
ON CONFLICT (id) DO NOTHING;

INSERT INTO students (id, name, birthday, student_no, class_name, seat_no, parent, parent_phone, parent_email) VALUES
  ('STU_001', '林志明', '1150101', '114001', '301', '1', '林大華', '0912-111222', 'parent1@gmail.com'),
  ('STU_002', '陳美玲', '1150202', '114002', '301', '2', '陳健國', '0923-222333', 'parent2@gmail.com'),
  ('STU_003', '張宇軒', '1150303', '114003', '301', '3', '張文生', '0934-333444', 'parent3@gmail.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO courses (id, name, description, teacher_id, slots, class_name, location) VALUES
  ('CRS_001', '流行街舞社', '培養學生肢體協調與節奏感',           'TEA_008', '[{"day":"1","period":"4"},{"day":"1","period":"5"}]', '301', '活動中心 2F'),
  ('CRS_002', '創意機器人', '基礎 Python 與 Spike 樂高積木程式編寫', 'TEA_003', '[{"day":"3","period":"5"}]',                         '301', '電腦教室(一)')
ON CONFLICT (id) DO NOTHING;
