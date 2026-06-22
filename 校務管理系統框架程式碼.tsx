import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, addDoc, deleteDoc, query, serverTimestamp } from 'firebase/firestore';
import { ShieldCheck, LogOut, Users, FileText, UserCheck, AlertCircle, Database, Calendar, RefreshCw, Upload, Plus, Trash2, Edit, X, Eye, Phone, Mail, MapPin, Layers, CheckCircle, ArrowUpDown, ChevronLeft, ChevronRight, BookOpen, Save, FileJson, Search, Send, Clock, Home, Map, Info, ChevronDown } from 'lucide-react';

// ==========================================
// 1. Firebase 基礎設定與環境變數
// ==========================================
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// ==========================================
// 2. 輔助與轉換函數
// ==========================================
const getDayChinese = (dayStr) => {
  const map = { '1': '星期一', '2': '星期二', '3': '星期三', '4': '星期四', '5': '星期五', '6': '星期六', '7': '星期日' };
  return map[dayStr] || dayStr;
};

const getNextId = (list, prefix) => {
  if (!list || list.length === 0) return `${prefix}_001`;
  const numericParts = list.map(item => {
    const part = (item.id || '').split('_')[1];
    const parsed = parseInt(part, 10);
    return isNaN(parsed) ? 0 : parsed;
  });
  const maxId = Math.max(...numericParts, 0);
  return `${prefix}_${String(maxId + 1).padStart(3, '0')}`;
};

const handleBackdropClick = (e, closeAction) => {
  if (e.target === e.currentTarget) closeAction();
};

const renderCourseSlots = (slots) => {
  if (!slots || slots.length === 0) return '-';
  const slotsByDay = slots.reduce((acc, slot) => {
    if (!acc[slot.day]) acc[slot.day] = [];
    acc[slot.day].push(slot.period);
    return acc;
  }, {});
  return Object.keys(slotsByDay).sort().map(d => (
    <div key={d} className="text-[11px] whitespace-nowrap mb-1 last:mb-0">
      <span className="font-bold text-slate-600">{getDayChinese(d)}:</span> <span className="text-slate-500 font-bold">第 {slotsByDay[d].sort().join(', ')} 節</span>
    </div>
  ));
};

const renderTeacherRoles = (titleStr) => {
  if (!titleStr) return '-';
  return titleStr.split(', ').map(role => (
    <span key={role} className="px-2 py-0.5 rounded-lg text-xs font-bold border border-slate-200 bg-slate-100 text-slate-700 m-0.5 inline-block">
      {role}
    </span>
  ));
};

// ==========================================
// 3. 初始預設靜態資料 (新增生日欄位)
// ==========================================
const DEFAULT_TEACHERS = [
  { id: 'TEA_001', name: '吳佳曄', title: '101導師', phone: '0911-001001', email: 't001@snps.tn.edu.tw', username: 'a001', password: '0000', type: 'homeroom', classId: '101' },
  { id: 'TEA_003', name: '陳美雲', title: '301導師', phone: '0911-003003', email: 't003@snps.tn.edu.tw', username: 'a003', password: '0002', type: 'homeroom', classId: '301' },
  { id: 'TEA_008', name: '林大秀', title: '外聘街舞老師', phone: '0911-008008', email: 'dance@snps.tn.edu.tw', username: 'a007', password: '0006', type: 'extracurricular' },
];

const DEFAULT_STUDENTS = [
  { id: 'STU_001', name: '林志明', birthday: '1150101', studentNo: '114001', class: '301', seatNo: '1', parent: '林大華', parentPhone: '0912-111222', parentEmail: 'parent1@gmail.com' },
  { id: 'STU_002', name: '陳美玲', birthday: '1150202', studentNo: '114002', class: '301', seatNo: '2', parent: '陳健國', parentPhone: '0923-222333', parentEmail: 'parent2@gmail.com' },
  { id: 'STU_003', name: '張宇軒', birthday: '1150303', studentNo: '114003', class: '301', seatNo: '3', parent: '張文生', parentPhone: '0934-333444', parentEmail: 'parent3@gmail.com' },
];

const DEFAULT_CLASSES = [
  { id: 'CLASS_001', name: '101' },
  { id: 'CLASS_002', name: '301' },
  { id: 'CLASS_EXT_001', name: '流行街舞社', isExtracurricular: true },
];

const DEFAULT_LOCATIONS = [
  { id: 'RM_001', name: '活動中心 2F' },
  { id: 'RM_002', name: '電腦教室(一)' },
];

const DEFAULT_COURSES = [
  { id: 'CRS_001', name: '流行街舞社', description: '培養學生肢體協調與節奏感', teacherId: 'TEA_008', slots: [{day: '1', period: '4'}, {day: '1', period: '5'}], class: '301', location: '活動中心 2F' },
  { id: 'CRS_002', name: '創意機器人', description: '基礎 Python 與 Spike 樂高積木程式編寫', teacherId: 'TEA_003', slots: [{day: '3', period: '5'}], class: '301', location: '電腦教室(一)' },
];

const MOCK_SCHEDULES = {
  'TEA_001': [
    { day: 1, period: 1, subject: '流行街舞社', location: '活動中心 2F' }, { day: 1, period: 4, subject: '創意機器人', location: '電腦教室(一)' },
  ]
};

const CSV_SPECS = {
  students: { headers: ["學號", "學校班級", "座號", "姓名", "生日", "聯絡人姓名", "聯絡人電話", "聯絡人Email"], example: "114001,301,1,林志明,1150101,林大華,0912-111222,parent@test.com" },
  teachers: { headers: ["姓名", "職稱", "聯絡電話", "Email", "系統帳號", "系統密碼"], example: "吳佳曄,導師,0911-001001,t001@test.com,a001,0000" },
  classes: { headers: ["班級名稱", "授課老師ID", "班級類別"], example: "301,TEA_001,normal" },
  locations: { headers: ["地點名稱"], example: "活動中心 2F" },
  courses: { headers: ["課程名稱", "授課老師ID", "上課地點", "簡介"], example: "流行街舞社,TEA_008,活動中心 2F,培養肢體協調" }
};

// ==========================================
// 獨立元件：多選下拉選單 (MultiSelectDropdown)
// ==========================================
const MultiSelectDropdown = ({ options, selected, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative w-full text-left">
      <div 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full p-3 border border-slate-300 rounded-xl bg-[#FDFBF7] cursor-pointer flex justify-between items-center focus:ring-2 focus:ring-[#3A5A40] transition-colors"
      >
        <span className="truncate text-sm text-[#2F3E46] font-bold text-center w-full">{selected.length > 0 ? selected.join(', ') : placeholder}</span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform absolute right-3 ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto">
            {options.map(opt => (
              <label key={opt} className="flex items-center px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors">
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={(e) => {
                    if (e.target.checked) onChange([...selected, opt]);
                    else onChange(selected.filter(item => item !== opt));
                  }}
                  className="rounded border-slate-300 text-[#3A5A40] focus:ring-[#3A5A40] w-4 h-4"
                />
                <span className="ml-3 text-sm font-bold text-[#2F3E46]">{opt}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ==========================================
// 獨立元件：家長請假表單 (Parent Portal)
// ==========================================
function ParentLeaveForm({ studentsList, coursesList, onSubmit, onCancel, showToast }) {
  const [inputClass, setInputClass] = useState('');
  const [inputSeat, setInputSeat] = useState('');
  
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [birthdayInput, setBirthdayInput] = useState('');
  const [pendingStudent, setPendingStudent] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [birthdayErrorCenter, setBirthdayErrorCenter] = useState('');
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leaveType, setLeaveType] = useState('事假');
  
  const [classPeriods, setClassPeriods] = useState([]);
  const [afterSchoolCourses, setAfterSchoolCourses] = useState([]); 
  
  const [reason, setReason] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const schoolPeriodsList = ["早自修", "第一節", "第二節", "第三節", "第四節", "第五節", "第六節", "第七節"];

  const handleKeyDownEnter = (e, callback) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (callback) callback();
    }
  };

  const handleStartVerification = () => {
    if (!inputClass.trim() || !inputSeat.trim()) {
      return showToast('請輸入學校班級與座號！', 'error');
    }
    const found = studentsList.find(s => s.class === inputClass.trim() && String(s.seatNo) === String(inputSeat.trim()));
    if (found) {
      setPendingStudent(found);
      setShowBirthdayModal(true);
    } else {
      showToast('找不到對應的學童，請確認班級與座號！', 'error');
    }
  };

  const verifyBirthday = () => {
    if (!birthdayInput) return showToast('請輸入生日', 'info');
    if (pendingStudent.birthday === birthdayInput) {
      setStudentData(pendingStudent);
      setShowBirthdayModal(false);
      setPendingStudent(null);
      setBirthdayInput('');
      setParentName('');
      setParentPhone('');
      setParentEmail('');
      showToast('身分驗證成功！');
    } else {
      setBirthdayErrorCenter('生日驗證失敗，請確認格式（如：1150101）');
      setBirthdayInput('');
      setTimeout(() => setBirthdayErrorCenter(''), 3000);
    }
  };

  const handleSchoolPeriodsChange = (newSelected) => {
    const hadAllDay = classPeriods.includes('全天');
    const hasAllDay = newSelected.includes('全天');

    if (!hadAllDay && hasAllDay) {
      setClassPeriods(['全天']);
    } else if (hadAllDay && !hasAllDay) {
      setClassPeriods([]);
    } else if (hadAllDay && newSelected.length > 1) {
      setClassPeriods(newSelected.filter(p => p !== '全天'));
    } else {
      setClassPeriods(newSelected);
    }
  };

  const coveredWeekdays = useMemo(() => {
    if (!startDate || !endDate) return [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];
    
    const weekdays = new Set();
    let current = new Date(start);
    let safetyLimit = 0;
    while (current <= end && safetyLimit < 31) {
      let day = current.getDay();
      let mappedDay = day === 0 ? '7' : String(day); 
      weekdays.add(mappedDay);
      current.setDate(current.getDate() + 1);
      safetyLimit++;
    }
    return Array.from(weekdays);
  }, [startDate, endDate]);

  const availableAfterSchoolOptions = useMemo(() => {
    const options = ['無'];
    if (coveredWeekdays.length > 0) {
      const matched = coursesList.filter(course => 
        course.slots && course.slots.some(slot => coveredWeekdays.includes(slot.day))
      );
      matched.forEach(c => {
        if (!options.includes(c.name)) options.push(c.name);
      });
    }
    return options;
  }, [coveredWeekdays, coursesList]);

  useEffect(() => {
    if (afterSchoolCourses.length > 0) {
      const valid = afterSchoolCourses.filter(c => availableAfterSchoolOptions.includes(c));
      if (valid.length !== afterSchoolCourses.length) {
        setAfterSchoolCourses(valid);
      }
    }
  }, [availableAfterSchoolOptions, afterSchoolCourses]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!studentData) return showToast('請先完成學童驗證', 'error');
    if (!startDate || !endDate || !reason || !parentName || !parentPhone) {
      return showToast('請填寫所有必填欄位', 'error');
    }

    setSubmitting(true);
    try {
      const schoolStr = classPeriods.includes('全天') ? '全天' : classPeriods.join(', ');
      const afterStr = afterSchoolCourses.join(', ');
      const periodsStr = `上課時段: ${schoolStr || '無'}\n課後時段: ${afterStr || '無'}`;

      const payload = {
        studentId: studentData.id,
        leaveType,
        startDate: startDate,
        endDate: endDate,
        periods: periodsStr,
        reason,
        parentName,
        parentPhone,
        parentEmail,
        status: 'pending',
        source: 'parent_portal',
        selectedAfterSchoolCourses: afterSchoolCourses
      };
      await onSubmit(payload);
    } catch (err) {
      showToast('送出失敗：' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden animate-fadeIn border border-slate-100">
      <div className="bg-[#3A5A40] p-8 text-white text-center">
        <h2 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
          <BookOpen size={32} />
          小新國小 學生請假系統
        </h2>
        <p className="text-[#FDFBF7]/80 text-sm font-semibold">提供家長為學童辦理線上請假手續</p>
      </div>

      <div className="p-8">
        {!studentData ? (
          <div className="space-y-6">
            <div className="bg-orange-50 text-[#E07A5F] p-4 rounded-2xl text-sm border border-orange-100 flex gap-3 font-semibold">
              <ShieldCheck className="shrink-0" size={20} />
              <p>為確保學生安全與隱私，請輸入學童的<strong className="font-extrabold mx-1">班級與座號</strong>進行身分查驗。</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-[#2F3E46] mb-2 text-center">學校班級</label>
                <input 
                  type="text"
                  value={inputClass}
                  onChange={e => setInputClass(e.target.value)}
                  onKeyDown={(e) => handleKeyDownEnter(e, handleStartVerification)}
                  placeholder="例如: 301"
                  className="w-full p-4 bg-[#FDFBF7] border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#3A5A40] outline-none transition-all text-center text-lg font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#2F3E46] mb-2 text-center">座號</label>
                <input 
                  type="number"
                  value={inputSeat}
                  onChange={e => setInputSeat(e.target.value)}
                  onKeyDown={(e) => handleKeyDownEnter(e, handleStartVerification)}
                  placeholder="例如: 1"
                  className="w-full p-4 bg-[#FDFBF7] border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#3A5A40] outline-none transition-all text-center text-lg font-bold font-mono"
                />
              </div>
            </div>
            
            <div className="flex gap-4 pt-4 border-t border-slate-100">
              <button onClick={onCancel} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors">
                返回首頁
              </button>
              <button onClick={handleStartVerification} className="flex-1 py-4 bg-[#E07A5F] text-white rounded-2xl font-bold hover:bg-[#d66a4f] transition-colors shadow-md shadow-[#E07A5F]/20">
                開始驗證
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 animate-fadeIn">
            <div className="bg-[#FDFBF7] p-5 rounded-2xl border border-[#3A5A40]/10 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-12 h-12 bg-[#3A5A40]/10 rounded-full flex items-center justify-center text-[#3A5A40] shrink-0">
                <UserCheck size={24} />
              </div>
              <div className="w-full text-center sm:text-left">
                <p className="text-sm font-bold text-slate-500 mb-1">驗證成功，目前辦理學生：</p>
                <p className="text-lg font-extrabold text-[#2F3E46]">{studentData.class}班 {studentData.seatNo}號 {studentData.name}</p>
              </div>
              <button type="button" onClick={() => { setStudentData(null); setInputSeat(''); setInputClass(''); }} className="shrink-0 text-sm text-[#E07A5F] hover:text-[#d66a4f] font-bold underline bg-white px-3 py-1.5 rounded-lg border border-orange-100">重新驗證</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-[#2F3E46] mb-2 text-center">開始日期 <span className="text-red-500">*</span></label>
                <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-3 border border-slate-200 bg-[#FDFBF7] rounded-xl focus:ring-2 focus:ring-[#3A5A40] outline-none text-center font-bold text-[#2F3E46]" />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#2F3E46] mb-2 text-center">結束日期 <span className="text-red-500">*</span></label>
                <input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-3 border border-slate-200 bg-[#FDFBF7] rounded-xl focus:ring-2 focus:ring-[#3A5A40] outline-none text-center font-bold text-[#2F3E46]" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-[#2F3E46] mb-2 text-center">請假類別 <span className="text-red-500">*</span></label>
                <select value={leaveType} onChange={e => setLeaveType(e.target.value)} className="w-full p-3 border border-slate-200 bg-[#FDFBF7] rounded-xl focus:ring-2 focus:ring-[#3A5A40] outline-none text-center font-bold text-[#2F3E46]">
                  <option value="事假">事假</option><option value="病假">病假</option><option value="公假">公假</option><option value="喪假">喪假</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
              <h4 className="text-sm font-extrabold text-[#2F3E46] flex items-center gap-1 justify-center"><Clock size={16} className="text-[#3A5A40]"/> 請假時段設定</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 text-center">上課時段 (多選選單)</label>
                  <MultiSelectDropdown 
                    options={['全天', ...schoolPeriodsList]} 
                    selected={classPeriods} 
                    onChange={handleSchoolPeriodsChange} 
                    placeholder="點擊選擇上課時段" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 text-center">課後時段 (多選選單)</label>
                  <MultiSelectDropdown 
                    options={availableAfterSchoolOptions} 
                    selected={afterSchoolCourses} 
                    onChange={setAfterSchoolCourses} 
                    placeholder={startDate ? "點擊選擇課後社團" : "請先選擇日期"} 
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#2F3E46] mb-2 text-center">請假事由 <span className="text-red-500">*</span></label>
              <textarea required value={reason} onChange={e => setReason(e.target.value)} rows="3" placeholder="請簡述請假原因（例如：感冒發燒就醫）" className="w-full p-3 border border-slate-200 bg-[#FDFBF7] rounded-xl focus:ring-2 focus:ring-[#3A5A40] outline-none text-center"></textarea>
            </div>

            <div className="bg-[#3A5A40]/5 p-6 rounded-3xl border border-[#3A5A40]/10">
              <h4 className="text-sm font-extrabold text-[#3A5A40] flex items-center gap-1 justify-center mb-4"><Phone size={16}/> 聯絡人資訊手動填寫</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 text-center">聯絡人姓名 <span className="text-red-500">*</span></label>
                  <input type="text" required value={parentName} onKeyDown={(e) => handleKeyDownEnter(e, null)} onChange={e => setParentName(e.target.value)} placeholder="請輸入姓名" className="w-full p-3 border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-[#3A5A40] outline-none text-center font-bold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 text-center">聯絡人電話 <span className="text-red-500">*</span></label>
                  <input type="tel" required value={parentPhone} onKeyDown={(e) => handleKeyDownEnter(e, null)} onChange={e => setParentPhone(e.target.value)} placeholder="09XX-XXXXXX" className="w-full p-3 border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-[#3A5A40] outline-none text-center font-bold font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 text-center">聯絡人郵件</label>
                  <input type="email" value={parentEmail} onKeyDown={(e) => handleKeyDownEnter(e, null)} onChange={e => setParentEmail(e.target.value)} placeholder="供後續通知使用" className="w-full p-3 border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-[#3A5A40] outline-none text-center font-bold font-mono" />
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-4 border-t border-slate-100">
               <button type="button" onClick={onCancel} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors">取消返回</button>
               <button type="submit" disabled={submitting} className={`flex-1 py-4 text-white rounded-2xl font-bold transition-colors shadow-md ${submitting ? 'bg-slate-400' : 'bg-[#E07A5F] hover:bg-[#d66a4f] shadow-[#E07A5F]/20'} flex justify-center items-center gap-2`}>
                 {submitting ? <RefreshCw className="animate-spin" size={20} /> : <Send size={20} />}
                 {submitting ? '處理中...' : '確認送出請假單'}
               </button>
            </div>
          </form>
        )}

        {/* 生日驗證失敗 Modal (最上層正中央) */}
        {birthdayErrorCenter && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white px-8 py-6 rounded-2xl shadow-2xl z-[9999] font-extrabold text-lg flex items-center gap-3 animate-fadeIn w-max max-w-sm text-center">
            <AlertCircle size={32} className="shrink-0" />
            <span>{birthdayErrorCenter}</span>
          </div>
        )}

        {showBirthdayModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" onMouseDown={(e) => handleBackdropClick(e, () => { setShowBirthdayModal(false); setBirthdayInput(''); })}>
            <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl border border-gray-200 text-center relative">
              <button onClick={() => { setShowBirthdayModal(false); setBirthdayInput(''); }} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20}/></button>
              <div className="w-16 h-16 bg-[#3A5A40]/10 text-[#3A5A40] rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={32} />
              </div>
              <h3 className="text-xl font-extrabold mb-2 text-[#2F3E46]">生日身分驗證</h3>
              <p className="text-sm text-slate-500 mb-6 font-semibold">請輸入學童出生年月日 (7碼)<br/><span className="text-xs">例如：1150101、0990101</span></p>
              <input
                type="text"
                value={birthdayInput}
                onChange={e => setBirthdayInput(e.target.value)}
                onKeyDown={(e) => handleKeyDownEnter(e, verifyBirthday)}
                placeholder="請輸入 7 碼數字"
                maxLength={7}
                className="w-full p-4 mb-6 bg-[#FDFBF7] border border-gray-200 rounded-2xl text-center font-mono text-xl font-bold text-[#2A443B] tracking-widest focus:ring-2 focus:ring-[#3A5A40] outline-none"
              />
              <button onClick={verifyBirthday} className="w-full py-4 bg-[#3A5A40] text-white rounded-2xl font-bold hover:bg-[#2A443B] transition-colors shadow-lg shadow-[#3A5A40]/20">驗證身份</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// 獨立元件：班級課表查詢系統 (Schedule View)
// ==========================================
function ScheduleView({ systemRole, currentUserProfile, classesList, coursesList, teachersList, db, appId, showToast }) {
  const [selectedClassId, setSelectedClassId] = useState(
    systemRole === 'teacher' && currentUserProfile?.classId ? currentUserProfile.classId : (classesList[0]?.name || '301')
  );
  const [schedulesMap, setSchedulesMap] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState([]);
  const [jsonInput, setJsonInput] = useState('');
  const [showJsonModal, setShowJsonModal] = useState(false);

  useEffect(() => {
    if (systemRole === 'teacher' && currentUserProfile?.classId) setSelectedClassId(currentUserProfile.classId);
  }, [systemRole, currentUserProfile]);

  useEffect(() => {
    const schedRef = collection(db, 'artifacts', appId, 'public', 'data', 'schedules');
    const unsub = onSnapshot(query(schedRef), (snapshot) => {
      const newMap = {};
      snapshot.docs.forEach(doc => {
        newMap[doc.id] = doc.data().classes || [];
      });
      setSchedulesMap(newMap);
    });
    return () => unsub();
  }, [db, appId]);

  const scheduleData = schedulesMap[selectedClassId] || [];
  const days = ['一', '二', '三', '四', '五', '六'];
  const periods = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const handleEditToggle = () => {
    if (isEditing) setIsEditing(false);
    else { setEditData([...scheduleData]); setIsEditing(true); }
  };

  const handleCellChange = (dayNum, periodNum, value) => {
    const newData = [...editData];
    const existingIdx = newData.findIndex(s => s.day === dayNum && s.period === periodNum);
    if (existingIdx > -1) {
      if (!value) newData.splice(existingIdx, 1);
      else newData[existingIdx].subject = value;
    } else if (value.trim()) {
      newData.push({ day: dayNum, period: periodNum, subject: value });
    }
    setEditData(newData);
  };

  const handleSaveSchedule = async () => {
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'schedules', selectedClassId);
      await setDoc(docRef, { classes: editData });
      setIsEditing(false);
      showToast('課表儲存成功！');
    } catch (err) { showToast('儲存失敗：' + err.message, 'error'); }
  };

  const handleImportJson = async () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) throw new Error('JSON 格式必須為陣列');
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'schedules', selectedClassId);
      await setDoc(docRef, { classes: parsed });
      setShowJsonModal(false); setJsonInput(''); showToast('JSON 課表匯入成功！');
    } catch (err) { showToast('JSON 解析錯誤：' + err.message, 'error'); }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 animate-fadeIn text-[#2F3E46]">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800">
          <Calendar className="text-[#3A5A40]" /> 學校班級課表查詢與編輯
        </h3>
        
        <div className="flex gap-3 items-center">
          {systemRole === 'admin' && !isEditing && (
            <select 
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="p-2 border border-slate-200 rounded-xl bg-[#FDFBF7] text-sm font-bold outline-none focus:ring-2 focus:ring-[#3A5A40] text-center"
            >
              <option value="">- 選擇學校班級 -</option>
              {classesList.map(c => <option key={c.id} value={c.name}>{c.name}班</option>)}
            </select>
          )}

          {systemRole === 'admin' && (
            isEditing ? (
              <>
                <button onClick={handleSaveSchedule} className="flex items-center gap-1 bg-[#3A5A40] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#2A443B] transition-colors shadow-md">
                  <Save size={16} /> 儲存課表
                </button>
                <button onClick={() => setShowJsonModal(true)} className="flex items-center gap-1 bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-900 transition-colors">
                  <FileJson size={16} /> 匯入 JSON
                </button>
                <button onClick={handleEditToggle} className="flex items-center gap-1 bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">
                  取消
                </button>
              </>
            ) : (
              <button onClick={handleEditToggle} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-100 border border-blue-200 transition-colors">
                <Edit size={16} /> 編輯模式
              </button>
            )
          )}
        </div>
      </div>

      <div className="overflow-x-auto whitespace-nowrap scrollbar-thin rounded-2xl border border-slate-200">
        <table className="w-full text-center border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-[#FDFBF7]">
              <th className="border-b border-r border-slate-200 p-3 text-slate-600 font-bold w-16 text-center whitespace-nowrap">節次</th>
              {days.map(day => (
                <th key={day} className="border-b border-r last:border-r-0 border-slate-200 p-3 text-[#2F3E46] font-bold w-[15%] text-center whitespace-nowrap">星期{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((period) => (
              <tr key={period} className="hover:bg-slate-50 transition-colors">
                <td className="border-b border-r border-slate-200 p-3 font-bold text-slate-500 bg-slate-50 text-center whitespace-nowrap">第 {period} 節</td>
                {days.map((_, dayIndex) => {
                  const dayNum = dayIndex + 1;
                  const targetData = isEditing ? editData : scheduleData;
                  const classInfo = targetData.find(s => s.day === dayNum && s.period === period);
                  
                  const matchedCourse = coursesList.find(c => c.name === classInfo?.subject);
                  const matchedTeacher = teachersList.find(t => t.id === matchedCourse?.teacherId);

                  return (
                    <td key={dayNum} className="border-b border-r last:border-r-0 border-slate-200 p-2 align-middle h-24 text-center whitespace-nowrap">
                      {isEditing ? (
                        <select
                          value={classInfo?.subject || ''}
                          onChange={(e) => handleCellChange(dayNum, period, e.target.value)}
                          className="p-2 border border-slate-300 bg-white rounded-xl text-xs font-bold text-center w-full focus:ring-2 focus:ring-[#3A5A40] outline-none"
                        >
                          <option value="">- 選擇課程 -</option>
                          {coursesList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                      ) : (
                        classInfo ? (
                          <div className="bg-[#FDFBF7] border border-[#E07A5F]/30 p-2 rounded-xl flex flex-col justify-center h-full items-center shadow-sm">
                            <span className="font-bold text-[#3A5A40] block text-sm">{classInfo.subject}</span>
                            <span className="text-xs text-[#E07A5F] mt-1 font-bold flex items-center gap-1 justify-center"><UserCheck size={10}/> {matchedTeacher?.name || '未指派'}</span>
                          </div>
                        ) : <span className="text-slate-200">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showJsonModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
           <div className="bg-white rounded-3xl w-full max-w-lg p-6 text-center shadow-2xl border border-gray-200">
             <h3 className="text-lg font-bold mb-4 text-[#2F3E46]">貼上 JSON 課表格式</h3>
             <textarea 
               value={jsonInput}
               onChange={e => setJsonInput(e.target.value)}
               placeholder='[{"day": 1, "period": 1, "subject": "流行街舞社"}]'
               className="w-full h-40 p-3 border border-gray-200 rounded-xl text-xs font-mono mb-4 text-center outline-none focus:ring-2 focus:ring-[#3A5A40]"
             />
             <div className="flex justify-center gap-2">
               <button onClick={() => setShowJsonModal(false)} className="px-5 py-2 bg-slate-100 rounded-xl text-sm font-bold text-slate-600">取消</button>
               <button onClick={handleImportJson} className="px-5 py-2 bg-[#2A443B] rounded-xl text-sm font-bold text-white shadow-md hover:bg-[#1E312A] transition-colors">匯入並覆寫</button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 4. 主應用程式 Component App
// ==========================================
export default function App() {
  const [user, setUser] = useState(null);
  const [systemRole, setSystemRole] = useState(null); 
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentRoute, setCurrentRoute] = useState('login'); 
  
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  const [loginType, setLoginType] = useState('teacher'); 
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [leaves, setLeaves] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [locations, setLocations] = useState([]);
  const [courses, setCourses] = useState([]); 

  const [adminTab, setAdminTab] = useState('teachers'); 
  const [editTarget, setEditTarget] = useState(null); 
  const [isAddOpen, setIsAddOpen] = useState(false); 
  const [formData, setFormData] = useState({});

  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [csvInputText, setCsvInputText] = useState('');
  const [selectedDetailLeave, setSelectedDetailLeave] = useState(null);
  
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, type: '', id: '' });

  const [viewingClassStudents, setViewingClassStudents] = useState(null); 
  const [showAddClassStudentModal, setShowAddClassStudentModal] = useState(false);
  const [sourceClassForImport, setSourceClassForImport] = useState('');
  const [selectedStudentToImport, setSelectedStudentToImport] = useState('');

  const [tempCourseSlots, setTempCourseSlots] = useState([]);
  const [newSlotDay, setNewSlotDay] = useState('1');
  const [newSlotPeriod, setNewSlotPeriod] = useState('1');

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('id'); 
  const [sortOrder, setSortOrder] = useState('asc'); 
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); 
  const [customPageSize, setCustomPageSize] = useState('');
  const [leaveDateFilter, setLeaveDateFilter] = useState('');

  useEffect(() => { 
    setCurrentPage(1); 
    setCsvInputText(''); 
  }, [adminTab, searchTerm, selectedClassFilter, leaveDateFilter, sortBy, sortOrder, pageSize]);

  useEffect(() => {
    if (editTarget) setFormData(editTarget);
    else setFormData({ title: '', slots: [] });
  }, [editTarget, isAddOpen]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 4000);
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { setError('認證初始化失敗: ' + err.message); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => { setUser(currentUser); setLoading(false); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return; 
    const lRef = collection(db, 'artifacts', appId, 'public', 'data', 'leaves');
    const tRef = collection(db, 'artifacts', appId, 'public', 'data', 'teachers');
    const sRef = collection(db, 'artifacts', appId, 'public', 'data', 'students');
    const cRef = collection(db, 'artifacts', appId, 'public', 'data', 'classes');
    const rRef = collection(db, 'artifacts', appId, 'public', 'data', 'locations');
    const crsRef = collection(db, 'artifacts', appId, 'public', 'data', 'courses');

    const unsubs = [
      onSnapshot(query(lRef), (snap) => setLeaves(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(tRef), (snap) => setTeachers(snap.empty ? DEFAULT_TEACHERS : snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(sRef), (snap) => setStudents(snap.empty ? DEFAULT_STUDENTS : snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(cRef), (snap) => setClasses(snap.empty ? DEFAULT_CLASSES : snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(rRef), (snap) => setLocations(snap.empty ? DEFAULT_LOCATIONS : snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(crsRef), (snap) => setCourses(snap.empty ? DEFAULT_COURSES : snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    ];
    return () => unsubs.forEach(u => u());
  }, [user]);

  const handleSortClick = (field) => {
    if (sortBy === field) {
      if (sortOrder === 'asc') setSortOrder('desc');
      else { setSortBy('id'); setSortOrder('asc'); } 
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (field) => {
    if (sortBy !== field) return <ArrowUpDown size={12} className="inline ml-1 text-slate-300" />;
    return sortOrder === 'asc' ? <span className="inline ml-1 text-[#3A5A40] font-bold">↑</span> : <span className="inline ml-1 text-[#3A5A40] font-bold">↓</span>;
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setError(null);
    if (loginType === 'admin') {
      if (loginUsername === 'admin' && loginPassword === '0000') {
        setSystemRole('admin'); setAdminTab('dashboard'); setCurrentRoute('admin_dashboard'); showToast('管理員，登入成功！');
      } else { setError('管理員帳號或密碼錯誤！登入失敗。'); }
    } else {
      const teacher = teachers.find(t => t.name === loginUsername || t.username === loginUsername);
      if (teacher) {
        if (teacher.password === loginPassword) { 
          setCurrentUserProfile(teacher); setSystemRole('teacher'); setCurrentRoute('teacher_dashboard'); showToast(`${teacher.name} 老師，登入成功！`);
        } else { setError('密碼錯誤！不予進入。'); }
      } else { setError(`帳號檢驗失敗：找不到此教師名稱/帳號。`); }
    }
  };

  const handleLogout = () => {
    setSystemRole(null); setCurrentUserProfile(null); setCurrentRoute('login');
    setLoginUsername(''); setLoginPassword(''); showToast('已登出系統');
  };

  const handleInputKeyDown = (e, callback) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (callback) callback();
    }
  };

  const handleFormChange = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  const handleSaveEntity = async () => {
    if(!user) return;
    try {
      const type = adminTab;
      const targetList = type === 'teachers' ? teachers : type === 'students' ? students : type === 'courses' ? courses : type === 'classes' ? classes : locations;
      const docId = formData.id || getNextId(targetList, type.substring(0,3).toUpperCase());
      const payload = { ...formData, id: docId };
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', type, docId), payload);
      setEditTarget(null); setIsAddOpen(false); showToast(`資料儲存成功！`);
    } catch (err) { showToast('儲存失敗：' + err.message, 'error'); }
  };

  const handleDeleteEntity = async (type, id) => {
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', type, id)); showToast(`已移除項目！`);
    } catch (err) { showToast('刪除失敗：' + err.message, 'error'); }
  };

  const [showCsvModal, setShowCsvModal] = useState(false);
  const handleCSVBatchImport = async (type) => {
    if (!user || !csvInputText.trim()) return showToast('請先貼入 CSV 資料', 'info');
    const lines = csvInputText.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) return showToast('CSV 格式不正確', 'error');
    
    const expectedHeaders = CSV_SPECS[type].headers;
    const firstLineCols = lines[0].split(',').map(h => h.trim());
    const hasHeaders = expectedHeaders.some(h => firstLineCols.includes(h));
    const startIndex = hasHeaders ? 1 : 0;

    let importCount = 0;
    try {
      for (let i = startIndex; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row = {}; expectedHeaders.forEach((h, idx) => row[h] = values[idx] || '');

        const targetList = type === 'teachers' ? teachers : type === 'students' ? students : type === 'courses' ? courses : type === 'classes' ? classes : locations;
        const baseId = getNextId(targetList, type.substring(0,3).toUpperCase());
        const docId = baseId.replace(/(\d+)$/, v => String(parseInt(v) + importCount).padStart(3, '0'));
        let payload = { id: docId };

        if (type === 'students') {
          if(!row['學號']) continue;
          payload = { ...payload, studentNo: row['學號'], class: row['學校班級'], seatNo: row['座號'], name: row['姓名'], birthday: row['生日'], parent: row['聯絡人姓名'], parentPhone: row['聯絡人電話'], parentEmail: row['聯絡人Email'] };
        } else if (type === 'teachers') {
          if(!row['姓名']) continue;
          payload = { ...payload, name: row['姓名'], title: row['職稱'], phone: row['聯絡電話'], email: row['Email'], username: row['系統帳號'], password: row['系統密碼'] };
        } else if (type === 'classes') {
          if(!row['班級名稱']) continue;
          payload = { ...payload, name: row['班級名稱'], teacherId: row['授課老師ID'], isExtracurricular: row['班級類別'] === 'extra' };
        } else if (type === 'locations') {
          if(!row['地點名稱']) continue;
          payload = { ...payload, name: row['地點名稱'] };
        } else if (type === 'courses') {
          if(!row['課程名稱']) continue;
          payload = { ...payload, name: row['課程名稱'], teacherId: row['授課老師ID'], location: row['上課地點'], description: row['簡介'], slots: [] };
        }

        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', type, docId), payload);
        importCount++;
      }
      setCsvInputText(''); setShowCsvModal(false);
      showToast(`CSV 批次處理完成，成功新增 ${importCount} 筆`);
    } catch (err) { showToast('CSV 寫入失敗：' + err.message, 'error'); }
  };

  const handleParentSubmitLeave = async (payload) => {
    if(!user) return;
    const relatedTeachers = [];
    const studentInfo = students.find(s => s.id === payload.studentId);
    
    if(studentInfo?.class) {
       const homeroomT = teachers.find(t => t.classId === studentInfo.class);
       if(homeroomT) relatedTeachers.push(homeroomT.id);
    }
    
    if(payload.selectedAfterSchoolCourses && payload.selectedAfterSchoolCourses.length > 0) {
       payload.selectedAfterSchoolCourses.forEach(courseName => {
         if (courseName !== '無') {
           const c = courses.find(crs => crs.name === courseName);
           if(c?.teacherId && !relatedTeachers.includes(c.teacherId)) relatedTeachers.push(c.teacherId);
         }
       });
    }

    const docId = `LV_${Date.now()}`;
    const finalPayload = {
      ...payload,
      id: docId,
      notifiedTeachers: relatedTeachers,
      createdAt: serverTimestamp()
    };
    delete finalPayload.selectedAfterSchoolCourses;

    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leaves', docId), finalPayload);
    showToast('請假單已成功送出！系統已自動通知相關教師。');
    setCurrentRoute('login');
  };

  const handleUpdateLeaveStatus = async (leaveId, status) => {
    if(!user) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leaves', leaveId), { status }, { merge: true });
      showToast(`假單狀態已更新為：${status === 'approved' ? '核准' : '審核不通過'}`);
      setSelectedDetailLeave(null);
    } catch(err) { showToast('更新失敗', 'error'); }
  };

  const sortedAndFilteredData = useMemo(() => {
    let result = [];
    if (currentRoute === 'teacher_dashboard' || currentRoute === 'dashboard') {
       if (adminTab === 'dashboard' || adminTab === 'leaves') {
         result = leaves;
         if (systemRole === 'teacher' && currentUserProfile) {
           result = result.filter(l => l.notifiedTeachers && l.notifiedTeachers.includes(currentUserProfile.id));
         }
         if (leaveDateFilter) result = result.filter(l => l.startDate === leaveDateFilter || l.endDate === leaveDateFilter);
       } else if (adminTab === 'my_class') {
         result = students.filter(s => s.class === currentUserProfile?.classId);
       }
    } else if (currentRoute === 'admin_dashboard') {
      if (adminTab === 'dashboard' || adminTab === 'leaves') result = leaves;
      else if (adminTab === 'teachers') result = [...teachers];
      else if (adminTab === 'students') result = students.filter(s => selectedClassFilter === 'ALL' ? true : s.class === selectedClassFilter);
      else if (adminTab === 'classes') result = [...classes];
      else if (adminTab === 'locations') result = [...locations];
      else if (adminTab === 'courses') result = [...courses];
    }

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.name?.toLowerCase().includes(term) || item.id?.toLowerCase().includes(term) || item.title?.toLowerCase().includes(term) || 
        item.studentNo?.toLowerCase().includes(term) || item.reason?.toLowerCase().includes(term) || item.description?.toLowerCase().includes(term) || item.location?.toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      if (sortBy === 'id') {
        aVal = parseInt((a.id || '').split('_')[1] || '0', 10);
        bVal = parseInt((b.id || '').split('_')[1] || '0', 10);
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal, 'zh-Hant') : bVal.localeCompare(aVal, 'zh-Hant');
      }
      return 0;
    });

    return result;
  }, [currentRoute, adminTab, leaves, teachers, students, classes, locations, courses, selectedClassFilter, searchTerm, leaveDateFilter, sortBy, sortOrder, currentUserProfile, systemRole]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedAndFilteredData.slice(startIndex, startIndex + pageSize);
  }, [sortedAndFilteredData, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedAndFilteredData.length / pageSize) || 1;

  // 渲染頂部控制列
  const renderTopControls = () => (
    <div className="bg-[#FDFBF7] p-4 rounded-t-2xl border border-b-0 border-gray-200 flex gap-4 text-xs font-semibold text-[#2F3E46] flex-wrap justify-between items-center text-center">
      <div className="flex items-center gap-2 flex-1 min-w-[200px] justify-center md:justify-start">
        <span className="shrink-0 text-[#2F3E46]/60"><Search size={14} className="inline mr-1"/>搜尋：</span>
        <input 
          type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={['dashboard', 'leaves'].includes(adminTab) ? "搜尋學生姓名或事由..." : "搜尋關鍵字..."}
          className="w-full max-w-xs p-2 border border-gray-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3A5A40] text-center"
        />
      </div>
      {['dashboard', 'leaves'].includes(adminTab) && (
        <div className="flex items-center gap-2 justify-center">
          <span className="shrink-0 text-[#2F3E46]/60">日期篩選：</span>
          <input type="date" value={leaveDateFilter} onChange={(e) => setLeaveDateFilter(e.target.value)} className="p-2 border border-gray-200 bg-white rounded-xl text-center outline-none focus:ring-2 focus:ring-[#3A5A40]"/>
        </div>
      )}
      <div className="flex items-center gap-1.5 justify-center">
        <span className="text-[#2F3E46]/60">每頁：</span>
        <select 
          value={[5, 10, 20, 50, 100].includes(pageSize) ? pageSize : 'custom'} 
          onChange={(e) => { 
             const val = e.target.value;
             if (val !== 'custom') {
                 setPageSize(Number(val));
                 setCustomPageSize('');
             }
             setCurrentPage(1); 
          }} 
          className="p-1.5 border border-gray-200 bg-white rounded-lg outline-none text-center focus:ring-2 focus:ring-[#3A5A40]"
        >
          <option value={5}>5 筆</option>
          <option value={10}>10 筆</option>
          <option value={20}>20 筆</option>
          <option value={50}>50 筆</option>
          <option value={100}>100 筆</option>
          <option value="custom" className="hidden">自訂</option>
        </select>
        <input
          type="number"
          min="1"
          placeholder="自訂"
          value={customPageSize}
          onChange={(e) => {
            setCustomPageSize(e.target.value);
            const val = Number(e.target.value);
            if (val > 0) setPageSize(val);
            setCurrentPage(1);
          }}
          className="p-1.5 w-16 border border-gray-200 bg-white rounded-lg outline-none text-center focus:ring-2 focus:ring-[#3A5A40]"
        />
      </div>
    </div>
  );

  // 渲染底部分頁列
  const renderBottomPagination = () => (
    <div className="bg-[#FDFBF7] p-3 rounded-b-2xl border border-t-0 border-gray-200 flex justify-center items-center gap-4 text-xs font-semibold text-slate-600 relative">
      <span className="absolute left-4 hidden md:inline text-[#2F3E46]/60">總計 {sortedAndFilteredData.length} 筆</span>
      <div className="flex items-center gap-4 justify-center">
        <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="p-1.5 bg-white border border-gray-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-opacity"><ChevronLeft size={14} /></button>
        <span className="text-center font-bold text-[#2F3E46]">第 {currentPage} 頁 / 共 {totalPages} 頁</span>
        <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="p-1.5 bg-white border border-gray-200 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-opacity"><ChevronRight size={14} /></button>
      </div>
    </div>
  );

  // 班級移撥邏輯
  const viewingClassStudentListSorted = useMemo(() => {
    if (!viewingClassStudents) return [];
    return students
      .filter(s => s.class === viewingClassStudents.name)
      .sort((a, b) => (parseInt(a.seatNo, 10) || 0) - (parseInt(b.seatNo, 10) || 0));
  }, [students, viewingClassStudents]);

  const studentsInSourceClass = useMemo(() => {
    if (!sourceClassForImport) return [];
    return students.filter(s => s.class === sourceClassForImport);
  }, [students, sourceClassForImport]);

  const handleRemoveStudentFromClass = async (studentId) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    if (confirm(`確定要將學童 ${student.name} 從 ${student.class} 班移除嗎？`)) {
      try {
        const updatedStudent = { ...student, class: '' };
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', student.id), updatedStudent);
        showToast(`已解除 ${student.name} 班級關聯！`);
      } catch (err) { showToast('移除失敗：' + err.message, 'error'); }
    }
  };

  const handleImportStudentToClass = async () => {
    if (!selectedStudentToImport) return showToast('請選擇要移撥的學童！', 'info');
    const student = students.find(s => s.id === selectedStudentToImport);
    if (!student) return;
    try {
      const nextSeatNo = viewingClassStudentListSorted.length > 0 
        ? String(Math.max(...viewingClassStudentListSorted.map(s => parseInt(s.seatNo, 10) || 0)) + 1) : '1';
      const updatedStudent = { ...student, class: viewingClassStudents.name, seatNo: nextSeatNo };
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', student.id), updatedStudent);
      setShowAddClassStudentModal(false); setSelectedStudentToImport(''); setSourceClassForImport('');
      showToast(`已將 ${student.name} 移入至 ${viewingClassStudents.name} 班！`);
    } catch (err) { showToast('移撥失敗：' + err.message, 'error'); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]"><RefreshCw className="animate-spin text-[#3A5A40]" size={40} /></div>;

  if (currentRoute === 'login') {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-4">
        {toast.show && (
          <div className={`fixed bottom-6 right-6 p-4 rounded-2xl shadow-lg font-bold text-white z-50 flex items-center gap-2 animate-fadeIn ${toast.type === 'error' ? 'bg-red-500' : 'bg-[#3A5A40]'}`}>
            {toast.type === 'error' ? <AlertCircle /> : <CheckCircle />} {toast.message}
          </div>
        )}
        <div className="mb-8 text-center animate-fadeIn">
           <div className="w-20 h-20 bg-[#3A5A40] text-white rounded-3xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-[#3A5A40]/20">
             <BookOpen size={40} />
           </div>
           <h1 className="text-3xl font-extrabold text-[#2F3E46] tracking-tight">小新國小</h1>
           <p className="text-[#E07A5F] font-bold mt-2">校務行政與課後社團管理系統</p>
        </div>
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-100 animate-fadeIn">
          <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-2xl">
             <button onClick={() => setLoginType('teacher')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${loginType === 'teacher' ? 'bg-white text-[#3A5A40] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>教職員登入</button>
             <button onClick={() => setLoginType('admin')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${loginType === 'admin' ? 'bg-white text-[#E07A5F] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>行政管理員</button>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            {error && <div className="bg-red-50 text-red-600 p-3 rounded-2xl text-sm border border-red-100 flex items-center gap-2"><AlertCircle size={16}/>{error}</div>}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1 text-center">帳號 / 姓名</label>
              <input type="text" value={loginUsername} onKeyDown={(e) => handleInputKeyDown(e, null)} onChange={e => setLoginUsername(e.target.value)} className="w-full p-4 bg-[#FDFBF7] border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#3A5A40] outline-none text-center font-bold" placeholder={loginType === 'admin' ? '輸入 admin' : '輸入姓名或帳號'} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1 text-center">密碼</label>
              <input type="password" value={loginPassword} onKeyDown={(e) => handleInputKeyDown(e, null)} onChange={e => setLoginPassword(e.target.value)} className="w-full p-4 bg-[#FDFBF7] border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#3A5A40] outline-none text-center font-bold font-mono" placeholder="請輸入密碼" />
            </div>
            <button type="submit" className="w-full py-4 bg-[#3A5A40] text-white rounded-2xl font-bold hover:bg-[#2A443B] transition-colors shadow-lg shadow-[#3A5A40]/20 flex justify-center items-center gap-2 mt-4">
              <LogOut size={18} className="rotate-180" /> 安全登入系統
            </button>
          </form>
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
             <button onClick={() => setCurrentRoute('parent_form')} className="w-full py-4 bg-white border-2 border-[#E07A5F] text-[#E07A5F] rounded-2xl font-bold hover:bg-[#E07A5F] hover:text-white transition-all flex justify-center items-center gap-2">
                <ShieldCheck size={18} /> 家長專用請假入口 (免密碼)
             </button>
          </div>
        </div>
      </div>
    );
  }

  if (currentRoute === 'parent_form') {
    return (
      <div className="min-h-screen bg-[#FDFBF7] p-4 md:p-8">
        {toast.show && (
          <div className={`fixed bottom-6 right-6 p-4 rounded-2xl shadow-lg font-bold text-white z-50 flex items-center gap-2 animate-fadeIn ${toast.type === 'error' ? 'bg-red-500' : 'bg-[#3A5A40]'}`}>
            {toast.type === 'error' ? <AlertCircle /> : <CheckCircle />} {toast.message}
          </div>
        )}
        <ParentLeaveForm 
           studentsList={students} 
           coursesList={courses}
           onSubmit={handleParentSubmitLeave}
           onCancel={() => setCurrentRoute('login')}
           showToast={showToast}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2F3E46] flex flex-col md:flex-row">
      {toast.show && (
        <div className={`fixed bottom-6 right-6 p-4 rounded-xl shadow-lg font-bold text-white z-50 flex items-center gap-2 animate-fadeIn ${toast.type === 'error' ? 'bg-red-500' : 'bg-[#3A5A40]'}`}>
          {toast.type === 'error' ? <AlertCircle /> : <CheckCircle />} {toast.message}
        </div>
      )}

      {/* Sidebar */}
      <div className="w-full md:w-64 bg-[#2A443B] text-white flex flex-col shadow-xl z-10 shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-[#E07A5F]"><BookOpen size={24} /></div>
          <div><h1 className="font-bold text-lg leading-tight tracking-wide">小新國小</h1><p className="text-xs text-white/60">校務管理系統 V2</p></div>
        </div>
        <div className="px-4 pb-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3">
             <div className="w-10 h-10 bg-[#E07A5F] rounded-full flex items-center justify-center shadow-inner"><UserCheck size={20} className="text-white" /></div>
             <div><p className="text-sm font-bold">{systemRole === 'admin' ? '系統管理員' : currentUserProfile?.name}</p><p className="text-xs text-[#E07A5F]">{systemRole === 'admin' ? 'Admin' : currentUserProfile?.title}</p></div>
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto scrollbar-thin">
          {systemRole === 'admin' ? (
            <>
              <p className="px-2 pt-4 pb-2 text-xs font-bold text-white/40 uppercase tracking-wider">數據儀表板</p>
              <button onClick={() => setAdminTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${adminTab === 'dashboard' ? 'bg-[#E07A5F] text-white shadow-md' : 'text-white/70 hover:bg-white/10'}`}><Home size={18}/> 總覽首頁</button>
              <button onClick={() => setAdminTab('leaves')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${adminTab === 'leaves' ? 'bg-[#E07A5F] text-white shadow-md' : 'text-white/70 hover:bg-white/10'}`}><FileText size={18}/> 請假單管理 ({leaves.filter(l=>l.status==='pending').length})</button>
              
              <p className="px-2 pt-6 pb-2 text-xs font-bold text-white/40 uppercase tracking-wider">資料主檔維護</p>
              <button onClick={() => setAdminTab('students')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${adminTab === 'students' ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'}`}><Users size={18}/> 學生管理</button>
              <button onClick={() => setAdminTab('teachers')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${adminTab === 'teachers' ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'}`}><UserCheck size={18}/> 教職員工管理</button>
              <button onClick={() => setAdminTab('classes')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${adminTab === 'classes' ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'}`}><Users size={18}/> 班級管理</button>
              <button onClick={() => setAdminTab('courses')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${adminTab === 'courses' ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'}`}><Layers size={18}/> 課程管理</button>
              <button onClick={() => setAdminTab('locations')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${adminTab === 'locations' ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'}`}><Map size={18}/> 地點管理</button>
              
              <p className="px-2 pt-6 pb-2 text-xs font-bold text-white/40 uppercase tracking-wider">排程與設定</p>
              <button onClick={() => setAdminTab('schedule')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${adminTab === 'schedule' ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'}`}><Calendar size={18}/> 課表查詢與編輯</button>
            </>
          ) : (
            <>
              <p className="px-2 pt-4 pb-2 text-xs font-bold text-white/40 uppercase tracking-wider">導師專區</p>
              <button onClick={() => setAdminTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${adminTab === 'dashboard' ? 'bg-[#E07A5F] text-white shadow-md' : 'text-white/70 hover:bg-white/10'}`}><Home size={18}/> 儀表板首頁</button>
              <button onClick={() => setAdminTab('leaves')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${adminTab === 'leaves' ? 'bg-[#E07A5F] text-white shadow-md' : 'text-white/70 hover:bg-white/10'}`}><FileText size={18}/> 審核學生假單</button>
              <button onClick={() => setAdminTab('schedule')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${adminTab === 'schedule' ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'}`}><Calendar size={18}/> 班級課表查詢</button>
            </>
          )}
        </nav>
        <div className="p-4 mt-auto border-t border-white/10">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-[#E07A5F] rounded-xl text-sm font-bold transition-colors">
            <LogOut size={18} /> 登出系統
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 h-screen overflow-y-auto flex flex-col">
         <header className="bg-white p-6 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-100 shrink-0">
            <div className="flex flex-col gap-1 text-center md:text-left">
              <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center justify-center md:justify-start gap-2">
                 {adminTab === 'dashboard' && <><Home className="text-[#E07A5F]"/> 總覽首頁</>}
                 {adminTab === 'leaves' && <><FileText className="text-[#E07A5F]"/> 請假單管理</>}
                 {adminTab === 'students' && <><Users className="text-[#3A5A40]"/> 全校學生名冊</>}
                 {adminTab === 'teachers' && <><UserCheck className="text-[#3A5A40]"/> 教職員工管理</>}
                 {adminTab === 'classes' && <><Users className="text-[#3A5A40]"/> 班級管理</>}
                 {adminTab === 'courses' && <><Layers className="text-[#3A5A40]"/> 課程管理</>}
                 {adminTab === 'locations' && <><Map className="text-[#3A5A40]"/> 地點管理</>}
                 {adminTab === 'schedule' && <><Calendar className="text-[#3A5A40]"/> 班級課表管理</>}
              </h2>
            </div>
            
            {(['leaves', 'students', 'teachers', 'courses', 'classes', 'locations'].includes(adminTab)) && (
              <div className="flex gap-3 w-full md:w-auto">
                {adminTab === 'students' && (
                   <select value={selectedClassFilter} onChange={e => setSelectedClassFilter(e.target.value)} className="py-2 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#3A5A40] outline-none font-bold text-center">
                     <option value="ALL">全校所有班級</option>
                     {classes.filter(c => !c.isExtracurricular).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                   </select>
                )}
                {systemRole === 'admin' && adminTab !== 'leaves' && (
                  <button onClick={() => setIsAddOpen(true)} className="bg-[#3A5A40] text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-[#2A443B] transition-colors shadow-sm w-full md:w-auto justify-center">
                     <Plus size={16}/> 新增{adminTab === 'classes' ? '班級' : '資料'}
                  </button>
                )}
              </div>
            )}
         </header>

         <main className="p-6 flex-1 bg-[#FDFBF7]">
            {adminTab === 'dashboard' && (
              <div className="space-y-6 animate-fadeIn">
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                      <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center"><Clock size={28}/></div>
                      <div><p className="text-sm text-slate-500 font-bold">待審核假單</p><p className="text-3xl font-extrabold text-[#2F3E46]">{leaves.filter(l=>l.status==='pending').length}</p></div>
                    </div>
                    {systemRole === 'admin' && (
                      <>
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                          <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center"><Users size={28}/></div>
                          <div><p className="text-sm text-slate-500 font-bold">全校學生數</p><p className="text-3xl font-extrabold text-[#2F3E46]">{students.length}</p></div>
                        </div>
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                          <div className="w-14 h-14 bg-green-100 text-[#3A5A40] rounded-2xl flex items-center justify-center"><UserCheck size={28}/></div>
                          <div><p className="text-sm text-slate-500 font-bold">教職員工數</p><p className="text-3xl font-extrabold text-[#2F3E46]">{teachers.length}</p></div>
                        </div>
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                          <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center"><Layers size={28}/></div>
                          <div><p className="text-sm text-slate-500 font-bold">進行中課程</p><p className="text-3xl font-extrabold text-[#2F3E46]">{courses.length}</p></div>
                        </div>
                      </>
                    )}
                 </div>

                 <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
                    <h3 className="text-lg font-bold text-[#2F3E46] mb-6 flex items-center gap-2"><AlertCircle className="text-[#E07A5F]"/> 最新請假動態</h3>
                    <div className="space-y-4">
                       {leaves.slice(0, 5).map(leave => {
                          const stu = students.find(s => s.id === leave.studentId);
                          return (
                            <div key={leave.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-[#3A5A40]/30 transition-colors cursor-pointer" onClick={() => { setSelectedDetailLeave(leave); setAdminTab('leaves'); }}>
                               <div className="flex items-center gap-4">
                                  <div className={`w-2 h-12 rounded-full ${leave.status === 'pending' ? 'bg-[#E07A5F]' : leave.status === 'approved' ? 'bg-[#3A5A40]' : 'bg-slate-300'}`}></div>
                                  <div>
                                     <p className="font-bold text-[#2F3E46]">{stu?.class}班 {stu?.name} <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded ml-2">{leave.leaveType}</span></p>
                                     <p className="text-sm text-slate-500 mt-1 font-bold">日期: {leave.startDate} | 時段: {leave.periods.replace(/\n/g, ' ')}</p>
                                  </div>
                               </div>
                               <div className="text-right hidden md:block">
                                  <p className="text-sm font-medium text-slate-700 max-w-[200px] truncate">{leave.reason}</p>
                                  <p className="text-xs text-slate-400 mt-1 font-mono">{leave.createdAt ? new Date(leave.createdAt.seconds * 1000).toLocaleString() : ''}</p>
                               </div>
                            </div>
                          );
                       })}
                       {leaves.length === 0 && <p className="text-center text-slate-400 py-8 font-bold">目前無任何請假紀錄</p>}
                    </div>
                 </div>
              </div>
            )}

            {adminTab === 'schedule' && (
              <ScheduleView 
                 systemRole={systemRole}
                 currentUserProfile={currentUserProfile}
                 classesList={classes.filter(c => !c.isExtracurricular)}
                 coursesList={courses}
                 teachersList={teachers}
                 db={db}
                 appId={appId}
                 showToast={showToast}
              />
            )}

            {(['students', 'teachers', 'courses', 'classes', 'locations', 'leaves'].includes(adminTab)) && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden animate-fadeIn flex flex-col">
                 
                 {renderTopControls()}

                 <div className="overflow-x-auto whitespace-nowrap scrollbar-thin border-y border-gray-200">
                    <table className="w-full text-center border-collapse">
                       <thead>
                          <tr className="bg-[#F4A261]/10 text-xs border-b border-gray-200">
                             {adminTab === 'leaves' && (
                                <>
                                  <th className="p-4 font-bold text-[#2F3E46] border-r border-slate-100 text-center cursor-pointer" onClick={() => handleSortClick('status')}>狀態 {renderSortIcon('status')}</th>
                                  <th onClick={() => handleSortClick('studentId')} className="p-4 font-bold text-[#2F3E46] border-r border-slate-100 cursor-pointer hover:bg-gray-100 text-center">學生姓名{renderSortIcon('studentId')}</th>
                                  <th className="p-4 font-bold text-[#2F3E46] border-r border-slate-100 text-center">班級</th>
                                  <th className="p-4 font-bold text-[#2F3E46] border-r border-slate-100 text-center cursor-pointer" onClick={() => handleSortClick('leaveType')}>假別 {renderSortIcon('leaveType')}</th>
                                  <th onClick={() => handleSortClick('startDate')} className="p-4 font-bold text-[#2F3E46] border-r border-slate-100 cursor-pointer hover:bg-gray-100 text-center">開始日期{renderSortIcon('startDate')}</th>
                                  <th onClick={() => handleSortClick('endDate')} className="p-4 font-bold text-[#2F3E46] border-r border-slate-100 cursor-pointer hover:bg-gray-100 text-center">結束日期{renderSortIcon('endDate')}</th>
                                  <th className="p-4 font-bold text-[#2F3E46] border-r border-slate-100 text-center">請假時段</th>
                                  <th className="p-4 font-bold text-[#2F3E46] border-r border-slate-100 text-center">事由</th>
                                  <th className="p-4 font-bold text-[#2F3E46] text-center">詳細資料</th>
                                </>
                             )}
                             {adminTab === 'students' && (
                                <>
                                  <th className="p-4 font-bold border-r border-slate-100 text-center cursor-pointer" onClick={() => handleSortClick('studentNo')}>學號 {renderSortIcon('studentNo')}</th>
                                  <th className="p-4 font-bold border-r border-slate-100 text-center cursor-pointer" onClick={() => handleSortClick('class')}>學校班級 {renderSortIcon('class')}</th>
                                  <th className="p-4 font-bold border-r border-slate-100 text-center cursor-pointer" onClick={() => handleSortClick('seatNo')}>座號 {renderSortIcon('seatNo')}</th>
                                  <th className="p-4 font-bold border-r border-slate-100 text-center cursor-pointer" onClick={() => handleSortClick('name')}>姓名 {renderSortIcon('name')}</th>
                                  <th className="p-4 font-bold border-r border-slate-100 text-center cursor-pointer" onClick={() => handleSortClick('birthday')}>生日 {renderSortIcon('birthday')}</th>
                                  <th className="p-4 font-bold border-r border-slate-100 text-center cursor-pointer" onClick={() => handleSortClick('parent')}>聯絡人姓名 {renderSortIcon('parent')}</th>
                                  <th className="p-4 font-bold border-r border-slate-100 text-center">聯絡人電話</th>
                                  <th className="p-4 font-bold border-r border-slate-100 text-center">聯絡人郵件</th>
                                  {systemRole === 'admin' && <th className="p-4 font-bold text-center">操作</th>}
                                </>
                             )}
                             {adminTab === 'teachers' && (
                                <>
                                  <th className="p-4 font-bold border-r border-slate-100 text-center cursor-pointer" onClick={() => handleSortClick('id')}>教師工號 {renderSortIcon('id')}</th>
                                  <th className="p-4 font-bold border-r border-slate-100 text-center cursor-pointer" onClick={() => handleSortClick('name')}>姓名 {renderSortIcon('name')}</th>
                                  <th className="p-4 font-bold border-r border-slate-100 text-center cursor-pointer" onClick={() => handleSortClick('title')}>職稱 {renderSortIcon('title')}</th>
                                  <th className="p-4 font-bold border-r border-slate-100 text-center">聯絡電話</th>
                                  <th className="p-4 font-bold border-r border-slate-100 text-center">電子信箱</th>
                                  <th className="p-4 font-bold border-r border-slate-100 text-center">系統帳號</th>
                                  <th className="p-4 font-bold border-r border-slate-100 text-center">系統密碼</th>
                                  {systemRole === 'admin' && <th className="p-4 font-bold text-center">操作</th>}
                                </>
                             )}
                             {adminTab === 'classes' && (
                                <>
                                  <th className="p-4 font-bold border-r border-slate-100 text-center cursor-pointer" onClick={() => handleSortClick('id')}>班級ID {renderSortIcon('id')}</th>
                                  <th className="p-4 font-bold border-r border-slate-100 text-center cursor-pointer" onClick={() => handleSortClick('name')}>班級名稱 {renderSortIcon('name')}</th>
                                  <th className="p-4 font-bold border-r border-slate-100 text-center">學生名單 (座號排序)</th>
                                  {systemRole === 'admin' && <th className="p-4 font-bold text-center">操作</th>}
                                </>
                             )}
                             {adminTab === 'locations' && (
                                <>
                                  <th className="p-4 font-bold border-r border-slate-100 text-center cursor-pointer" onClick={() => handleSortClick('id')}>地點ID {renderSortIcon('id')}</th>
                                  <th className="p-4 font-bold border-r border-slate-100 text-center cursor-pointer" onClick={() => handleSortClick('name')}>地點名稱 {renderSortIcon('name')}</th>
                                  {systemRole === 'admin' && <th className="p-4 font-bold text-center">操作</th>}
                                </>
                             )}
                             {adminTab === 'courses' && (
                                <>
                                  <th className="p-4 font-bold border-r border-slate-100 text-center cursor-pointer" onClick={() => handleSortClick('id')}>課程ID {renderSortIcon('id')}</th>
                                  <th className="p-4 font-bold border-r border-slate-100 text-center cursor-pointer" onClick={() => handleSortClick('name')}>課程名稱 {renderSortIcon('name')}</th>
                                  <th className="p-4 font-bold border-r border-slate-100 text-center">授課時段 (星期與節次)</th>
                                  <th className="p-4 font-bold border-r border-slate-100 text-center">授課班級</th>
                                  <th className="p-4 font-bold border-r border-slate-100 text-center">上課地點</th>
                                  <th className="p-4 font-bold border-r border-slate-100 text-center cursor-pointer" onClick={() => handleSortClick('teacherId')}>授課老師 {renderSortIcon('teacherId')}</th>
                                  <th className="p-4 font-bold border-r border-slate-100 text-center">簡介</th>
                                  {systemRole === 'admin' && <th className="p-4 font-bold text-center">操作</th>}
                                </>
                             )}
                          </tr>
                       </thead>
                       <tbody>
                          {paginatedData.length === 0 ? (
                            <tr><td colSpan="12" className="p-12 text-center text-slate-400">目前沒有符合篩選條件的資料</td></tr>
                          ) : (
                            paginatedData.map((item, idx) => (
                             <tr key={item.id || idx} className="hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 text-xs">
                                {adminTab === 'leaves' && (
                                   <>
                                     <td className="p-4 text-center whitespace-nowrap">
                                        <span className={`px-3 py-1 rounded-xl text-xs font-bold ${item.status === 'pending' ? 'bg-[#F4A261]/20 text-[#E07A5F]' : item.status === 'approved' ? 'bg-[#3A5A40]/10 text-[#3A5A40]' : 'bg-red-100 text-red-700'}`}>
                                          {item.status === 'pending' ? '待審核' : item.status === 'approved' ? '已核准' : '審核不通過'}
                                        </span>
                                     </td>
                                     <td className="p-4 font-bold text-[#2F3E46] text-center">{students.find(s => s.id === item.studentId)?.name || item.studentId}</td>
                                     <td className="p-4 text-slate-600 text-center">{students.find(s => s.id === item.studentId)?.class ? `${students.find(s => s.id === item.studentId)?.class}班` : '-'}</td>
                                     <td className="p-4 text-center whitespace-nowrap"><span className="text-xs bg-slate-200 px-2 py-1 rounded-lg font-bold">{item.leaveType}</span></td>
                                     <td className="p-4 text-slate-600 text-xs text-center">{item.startDate}</td>
                                     <td className="p-4 text-slate-600 text-xs text-center">{item.endDate}</td>
                                     <td className="p-4 text-indigo-700 font-bold text-center whitespace-pre-wrap max-w-[200px] leading-relaxed">{item.periods}</td>
                                     <td className="p-4 text-slate-500 max-w-[200px] truncate text-center">{item.reason}</td>
                                     <td className="p-4 text-center"><button onClick={() => setSelectedDetailLeave(item)} className="bg-slate-100 hover:bg-emerald-50 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-bold transition-all mx-auto border border-gray-100">查看</button></td>
                                   </>
                                )}
                                {adminTab === 'students' && (
                                   <>
                                      <td className="p-4 font-mono font-bold text-slate-500 text-center whitespace-nowrap">{item.studentNo}</td>
                                      <td className="p-4 font-bold text-slate-800 text-center whitespace-nowrap">{item.class}</td>
                                      <td className="p-4 text-center whitespace-nowrap font-bold">{item.seatNo}</td>
                                      <td className="p-4 font-extrabold text-[#3A5A40] text-center whitespace-nowrap">{item.name}</td>
                                      <td className="p-4 font-mono font-bold text-slate-600 text-center whitespace-nowrap">{item.birthday || '-'}</td>
                                      <td className="p-4 text-sm text-slate-600 text-center font-bold whitespace-nowrap">{item.parent || '-'}</td>
                                      <td className="p-4 text-sm text-slate-600 text-center whitespace-nowrap font-mono">{item.parentPhone || '-'}</td>
                                      <td className="p-4 text-sm text-slate-600 text-center whitespace-nowrap font-mono">{item.parentEmail || '-'}</td>
                                      {systemRole === 'admin' && (
                                        <td className="p-4 text-center space-x-2 whitespace-nowrap">
                                          <button onClick={() => setEditTarget(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Edit size={16}/></button>
                                          <button onClick={() => handleDeleteClick('students', item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={16}/></button>
                                        </td>
                                      )}
                                   </>
                                )}
                                {adminTab === 'teachers' && (
                                   <>
                                      <td className="p-4 font-mono font-bold text-slate-500 text-center whitespace-nowrap">{item.id}</td>
                                      <td className="p-4 font-extrabold text-[#3A5A40] text-center whitespace-nowrap">{item.name}</td>
                                      <td className="p-4 text-center whitespace-nowrap">
                                        <div className="flex flex-wrap gap-1 justify-center max-w-[150px] mx-auto">
                                          {renderTeacherRoles(item.title)}
                                        </div>
                                      </td>
                                      <td className="p-4 text-sm text-slate-600 text-center whitespace-nowrap font-mono">{item.phone || '-'}</td>
                                      <td className="p-4 text-sm text-slate-600 text-center whitespace-nowrap font-mono">{item.email || '-'}</td>
                                      <td className="p-4 font-mono text-center"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg font-bold">{item.username}</span></td>
                                      <td className="p-4 font-mono text-center"><span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg">{item.password}</span></td>
                                      {systemRole === 'admin' && (
                                        <td className="p-4 text-center space-x-2 whitespace-nowrap">
                                          <button onClick={() => setEditTarget(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Edit size={16}/></button>
                                          <button onClick={() => handleDeleteClick('teachers', item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={16}/></button>
                                        </td>
                                      )}
                                   </>
                                )}
                                {adminTab === 'classes' && (
                                   <>
                                      <td className="p-4 font-mono font-bold text-slate-500 text-center whitespace-nowrap">{item.id}</td>
                                      <td className="p-4 font-extrabold text-[#3A5A40] text-center whitespace-nowrap">{item.name}</td>
                                      <td className="p-4 text-center">
                                        <button 
                                          onClick={() => setViewingClassStudents(item)}
                                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-3 py-1.5 rounded-xl text-xs inline-flex items-center justify-center gap-1 transition-colors border border-blue-100 shadow-sm mx-auto"
                                        >
                                          <Eye size={12}/> 載入學生名單 (共 {students.filter(s => s.class === item.name).length} 人)
                                        </button>
                                      </td>
                                      {systemRole === 'admin' && (
                                        <td className="p-4 text-center space-x-2 whitespace-nowrap">
                                          <button onClick={() => setEditTarget(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Edit size={16}/></button>
                                          <button onClick={() => handleDeleteClick('classes', item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={16}/></button>
                                        </td>
                                      )}
                                   </>
                                )}
                                {adminTab === 'locations' && (
                                   <>
                                      <td className="p-4 font-mono font-bold text-slate-500 text-center whitespace-nowrap">{item.id}</td>
                                      <td className="p-4 font-extrabold text-[#3A5A40] text-center whitespace-nowrap">{item.name}</td>
                                      {systemRole === 'admin' && (
                                        <td className="p-4 text-center space-x-2 whitespace-nowrap">
                                          <button onClick={() => setEditTarget(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Edit size={16}/></button>
                                          <button onClick={() => handleDeleteClick('locations', item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={16}/></button>
                                        </td>
                                      )}
                                   </>
                                )}
                                {adminTab === 'courses' && (
                                   <>
                                      <td className="p-4 font-mono font-bold text-slate-500 text-center whitespace-nowrap">{item.id}</td>
                                      <td className="p-4 font-extrabold text-[#3A5A40] text-center whitespace-nowrap">{item.name}</td>
                                      <td className="p-4 text-center">
                                        <div className="flex flex-col gap-1 w-40 mx-auto text-center">
                                          {renderCourseSlots(item.slots)}
                                        </div>
                                      </td>
                                      <td className="p-4 text-indigo-700 font-bold text-center">{item.class || '未設定'}</td>
                                      <td className="p-4 text-emerald-700 font-bold text-center">{item.location || '未設定'}</td>
                                      <td className="p-4 text-center whitespace-nowrap font-bold text-[#E07A5F]">{teachers.find(t=>t.id === item.teacherId)?.name || '-'}</td>
                                      <td className="p-4 text-xs text-slate-600 max-w-[200px] truncate text-center mx-auto font-medium">{item.description || '-'}</td>
                                      {systemRole === 'admin' && (
                                        <td className="p-4 text-center space-x-2 whitespace-nowrap">
                                          <button onClick={() => setEditTarget(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Edit size={16}/></button>
                                          <button onClick={() => handleDeleteClick('courses', item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={16}/></button>
                                        </td>
                                      )}
                                   </>
                                )}
                             </tr>
                            ))
                          )}
                       </tbody>
                    </table>
                 </div>
                 {renderBottomPagination()}
              </div>
            )}
         </main>
      </div>

      {/* CSV 批次新增 Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" onMouseDown={(e) => handleBackdropClick(e, () => setShowCsvModal(false))}>
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-200">
            <div className="bg-[#2A443B] text-white p-5 flex justify-between items-center">
              <h3 className="font-bold text-base flex items-center gap-2"><Upload size={18} /> 批次新增資料 ({adminTab})</h3>
              <button onClick={() => setShowCsvModal(false)} className="text-slate-200 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-6">
              <div className="mb-4 bg-[#F4A261]/10 p-4 rounded-2xl border border-orange-100 text-xs text-[#2F3E46]">
                <p className="mb-1"><span className="font-bold">欄位順序：</span>{CSV_SPECS[adminTab].headers.join(', ')}</p>
                <p className="text-slate-500 font-mono mt-2"><span className="font-bold text-[#2A443B]">免標題直接貼上範例：</span><br/><span className="text-slate-600 whitespace-pre-wrap leading-tight block mt-1">{CSV_SPECS[adminTab].example}</span></p>
              </div>
              <textarea 
                value={csvInputText} 
                onChange={e => setCsvInputText(e.target.value)} 
                placeholder="請貼上符合上述格式的文字 (無需貼標題列)..."
                className="w-full h-32 p-3 border border-gray-200 rounded-xl text-xs font-mono mb-4 outline-none focus:ring-2 focus:ring-[#2A443B] whitespace-pre text-center"
              />
              <div className="flex justify-center gap-2">
                <button onClick={() => setShowCsvModal(false)} className="px-5 py-2 bg-slate-100 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">取消</button>
                <button onClick={() => handleCSVBatchImport(adminTab)} className="w-full max-w-[150px] py-2 bg-[#2A443B] text-white text-sm font-bold rounded-xl hover:bg-[#1E312A] transition-colors shadow-md">執行批次匯入</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CRUD Modal */}
      {isAddOpen && editTarget && (() => {
        const { type, data } = editTarget;
        
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" onMouseDown={(e) => handleBackdropClick(e, () => { setIsAddOpen(false); setEditTarget(null); setFormData({}); })}>
            <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-200">
              <div className="bg-[#2A443B] text-white p-5 flex justify-between items-center">
                <h3 className="font-bold text-base flex items-center gap-2"><Database size={18} /> 編輯資料項目</h3>
                <button onClick={() => { setIsAddOpen(false); setTempCourseSlots([]); }} className="text-slate-200 hover:text-white"><X size={18} /></button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formDataParams = new FormData(e.target);
                const updated = { ...data }; 
                formDataParams.forEach((v, k) => updated[k] = v);
                
                if (type === 'courses') {
                  updated.slots = tempCourseSlots;
                }

                handleSaveEntity(type, updated);
                setTempCourseSlots([]);
              }} className="p-6 space-y-4 max-h-[75vh] overflow-auto">
                <input type="hidden" name="id" defaultValue={data.id} />
                
                {type === 'teachers' && (
                  <><div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-slate-500 mb-1 text-center">姓名</label><input type="text" name="name" defaultValue={data.name} required className="w-full p-2.5 border border-gray-200 rounded-xl text-xs text-center focus:ring-2 focus:ring-[#2A443B] outline-none" /></div>
                    <div><label className="block text-xs font-bold text-slate-500 mb-1 text-center">職稱</label><input type="text" name="title" defaultValue={data.title} className="w-full p-2.5 border border-gray-200 rounded-xl text-xs text-center focus:ring-2 focus:ring-[#2A443B] outline-none" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-gray-200">
                    <div><label className="block text-xs font-bold text-slate-500 mb-1 text-center">聯絡電話</label><input type="text" name="phone" defaultValue={data.phone} className="w-full p-2.5 border border-gray-200 rounded-xl text-xs text-center font-mono focus:ring-2 focus:ring-[#2A443B] outline-none" /></div>
                    <div><label className="block text-xs font-bold text-slate-500 mb-1 text-center">電子信箱</label><input type="email" name="email" defaultValue={data.email} className="w-full p-2.5 border border-gray-200 rounded-xl text-xs text-center font-mono focus:ring-2 focus:ring-[#2A443B] outline-none" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-slate-500 mb-1 text-center">系統帳號</label><input type="text" name="username" defaultValue={data.username} required className="w-full p-2.5 border border-gray-200 rounded-xl text-xs font-mono text-center focus:ring-2 focus:ring-[#2A443B] outline-none" /></div>
                    <div><label className="block text-xs font-bold text-slate-500 mb-1 text-center">系統密碼</label><input type="text" name="password" defaultValue={data.password} required className="w-full p-2.5 border border-gray-200 rounded-xl text-xs font-mono text-center focus:ring-2 focus:ring-[#2A443B] outline-none" /></div>
                  </div></>
                )}
                
                {type === 'students' && (
                  <><div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1"><label className="block text-xs font-bold text-slate-500 mb-1 text-center">姓名</label><input type="text" name="name" defaultValue={data.name} required className="w-full p-2.5 border border-gray-200 rounded-xl text-xs text-center focus:ring-2 focus:ring-[#2A443B] outline-none" /></div>
                    <div className="col-span-1"><label className="block text-xs font-bold text-slate-500 mb-1 text-center">座號</label><input type="number" name="seatNo" defaultValue={data.seatNo || '1'} required className="w-full p-2.5 border border-gray-200 rounded-xl text-xs text-center font-mono focus:ring-2 focus:ring-[#2A443B] outline-none" /></div>
                    <div className="col-span-1"><label className="block text-xs font-bold text-slate-500 mb-1 text-center">學號</label><input type="text" name="studentNo" defaultValue={data.studentNo} required className="w-full p-2.5 border border-gray-200 rounded-xl text-xs font-mono text-center focus:ring-2 focus:ring-[#2A443B] outline-none" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 text-center">常規班級</label>
                      <select name="class" defaultValue={data.class} className="w-full p-2.5 border border-gray-200 rounded-xl text-xs text-center focus:ring-2 focus:ring-[#2A443B] outline-none">
                        <option value="">-- 無班級 --</option>
                        {classes.filter(c => !c.isExtracurricular).map(c => <option key={c.id} value={c.name}>{c.name}班</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 text-center">生日(7碼)</label>
                      <input type="text" name="birthday" defaultValue={data.birthday} placeholder="例如: 1150101" maxLength={7} required className="w-full p-2.5 border border-gray-200 rounded-xl text-xs text-center font-mono focus:ring-2 focus:ring-[#2A443B] outline-none" />
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-gray-200 space-y-3">
                    <span className="text-xs font-bold text-slate-600 block text-center">家長聯絡人</span>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-[10px] font-bold text-slate-500 mb-1 text-center">家長姓名</label><input type="text" name="parent" defaultValue={data.parent} className="w-full p-2 border border-gray-200 rounded-xl text-xs text-center focus:ring-2 focus:ring-[#2A443B] outline-none" /></div>
                      <div><label className="block text-[10px] font-bold text-slate-500 mb-1 text-center">家長電話</label><input type="text" name="parentPhone" defaultValue={data.parentPhone} className="w-full p-2 border border-gray-200 rounded-xl text-xs text-center font-mono focus:ring-2 focus:ring-[#2A443B] outline-none" /></div>
                    </div>
                    <div><label className="block text-[10px] font-bold text-slate-500 mb-1 text-center">家長Email</label><input type="email" name="parentEmail" defaultValue={data.parentEmail} className="w-full p-2 border border-gray-200 rounded-xl text-xs text-center font-mono focus:ring-2 focus:ring-[#2A443B] outline-none" /></div>
                  </div></>
                )}
                
                {type === 'courses' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 text-center">課程名稱</label>
                        <input type="text" name="name" defaultValue={data.name} required className="w-full p-2.5 border border-gray-200 rounded-xl text-xs text-center focus:ring-2 focus:ring-[#2A443B] outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 text-center">指定授課老師</label>
                        <select name="teacherId" defaultValue={data.teacherId || ''} required className="w-full p-2.5 border border-gray-200 rounded-xl text-xs text-center focus:ring-2 focus:ring-[#2A443B] outline-none">
                          <option value="">-- 指派老師 --</option>
                          {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-gray-200 space-y-3">
                      <span className="text-xs font-bold text-slate-700 block text-center">授課時間排課 (多時段選擇)</span>
                      <div className="grid grid-cols-3 gap-2 items-end">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1 text-center">選擇星期</label>
                          <select value={newSlotDay} onChange={e => setNewSlotDay(e.target.value)} className="w-full p-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#2A443B] outline-none text-center">
                            <option value="1">星期一</option><option value="2">星期二</option><option value="3">星期三</option>
                            <option value="4">星期四</option><option value="5">星期五</option><option value="6">星期六</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1 text-center">選擇節次</label>
                          <select value={newSlotPeriod} onChange={e => setNewSlotPeriod(e.target.value)} className="w-full p-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#2A443B] outline-none text-center">
                            <option value="1">第 1 節</option><option value="2">第 2 節</option><option value="3">第 3 節</option>
                            <option value="4">第 4 節</option><option value="5">第 5 節</option><option value="6">第 6 節</option>
                            <option value="7">第 7 節</option><option value="8">第 8 節</option><option value="9">第 9 節</option>
                          </select>
                        </div>
                        <button 
                          type="button"
                          onClick={() => {
                            const isDup = tempCourseSlots.some(s => s.day === newSlotDay && s.period === newSlotPeriod);
                            if (isDup) return showToast('此課表時段已被選擇過！', 'info');
                            setTempCourseSlots(prev => [...prev, { day: newSlotDay, period: newSlotPeriod }]);
                          }}
                          className="w-full bg-[#2A443B] hover:bg-[#1E312A] text-white text-xs font-bold py-2 rounded-xl shadow transition-colors"
                        >
                          新增時段
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-2 justify-center">
                        {tempCourseSlots.map((s, idx) => (
                          <span key={idx} className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-1 rounded-full border border-indigo-200 flex items-center gap-1">
                            {getDayChinese(s.day)}第{s.period}節
                            <button type="button" onClick={() => setTempCourseSlots(prev => prev.filter((_, i) => i !== idx))} className="text-indigo-400 hover:text-red-500"><X size={10} /></button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 text-center">指派常規班級</label>
                        <select name="class" defaultValue={data.class || ''} className="w-full p-2.5 border border-gray-200 rounded-xl text-xs text-center focus:ring-2 focus:ring-[#2A443B] outline-none">
                          <option value="">-- 無 (跨班社團) --</option>
                          {classes.filter(c => !c.isExtracurricular).map(c => <option key={c.id} value={c.name}>{c.name}班</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1 text-center">指派教室地點</label>
                        <select name="location" defaultValue={data.location || ''} required className="w-full p-2.5 border border-gray-200 rounded-xl text-xs text-center focus:ring-2 focus:ring-[#2A443B] outline-none">
                          <option value="">-- 指派地點 --</option>
                          {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 text-center">課程簡介</label>
                      <textarea name="description" defaultValue={data.description} className="w-full p-2.5 border border-gray-200 rounded-xl text-xs h-20 text-center focus:ring-2 focus:ring-[#2A443B] outline-none" />
                    </div>
                  </>
                )}

                {(type === 'classes' || type === 'locations') && (
                  <div><label className="block text-xs font-bold text-slate-500 mb-1 text-center">名稱</label><input type="text" name="name" defaultValue={data.name} required className="w-full p-2.5 border border-gray-200 rounded-xl text-xs font-bold text-center focus:ring-2 focus:ring-[#2A443B] outline-none" /></div>
                )}
                <div className="flex justify-center gap-2 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => { setIsAddOpen(false); setTempCourseSlots([]); }} className="bg-slate-100 px-6 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">取消</button>
                  <button type="submit" className="bg-[#2A443B] text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-[#1E312A] transition-colors shadow-md">儲存</button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* 假單詳情 Modal */}
      {selectedDetailLeave && (() => {
        const student = students.find(s => s.id === selectedDetailLeave.studentId) || {};
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" onMouseDown={(e) => handleBackdropClick(e, () => setSelectedDetailLeave(null))}>
            <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-200">
              <div className="bg-[#2A443B] text-white p-5 flex justify-between items-center">
                <h3 className="font-bold text-base flex items-center gap-2"><FileText size={18} className="text-[#F4A261]" /> 假單詳細與審核</h3>
                <button onClick={() => setSelectedDetailLeave(null)} className="text-slate-200 hover:text-white"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-[#FDFBF7] p-4 rounded-xl border border-gray-100 flex gap-4 text-sm"><div className="flex-1"><span className="text-xs text-slate-400 block mb-1 text-center">學生</span><span className="font-bold block text-center text-[#2F3E46]">{student.name} ({student.class}班)</span></div><div className="flex-1"><span className="text-xs text-slate-400 block mb-1 text-center">假別</span><span className="font-bold text-red-600 block text-center">{selectedDetailLeave.leaveType}</span></div></div>
                <div className="bg-[#FDFBF7] p-4 rounded-xl border border-gray-100 text-sm"><span className="text-xs text-slate-400 block mb-1 text-center">時間區間</span><span className="font-bold text-[#2F3E46] block text-center">{selectedDetailLeave.startDate} ~ {selectedDetailLeave.endDate} <br/><span className="text-indigo-600 text-xs mt-1 block whitespace-pre-wrap">{selectedDetailLeave.periods}</span></span></div>
                <div className="bg-[#FDFBF7] p-4 rounded-xl border border-gray-100 text-sm"><span className="text-xs text-slate-400 block mb-1 text-center">請假事由</span><p className="whitespace-pre-wrap text-center text-[#2F3E46] font-bold">{selectedDetailLeave.reason}</p></div>
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 text-sm text-center">
                   <span className="text-xs text-[#2A443B] block mb-1 font-bold">家長聯絡資訊</span>
                   <p className="font-bold mb-1 text-[#2A443B]">{selectedDetailLeave.parentName || student.parent}</p>
                   <p className="text-slate-600 font-mono font-bold mb-1">{selectedDetailLeave.parentPhone || student.parentPhone}</p>
                   <p className="text-slate-500 font-mono text-xs">{selectedDetailLeave.parentEmail || student.parentEmail}</p>
                </div>
                {selectedDetailLeave.status === 'pending' ? (
                  <div className="flex gap-4 pt-4 border-t border-gray-100">
                    <button onClick={() => handleUpdateLeaveStatus(selectedDetailLeave.id, 'rejected')} className="flex-1 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors border border-red-200">審核不通過</button>
                    <button onClick={() => handleUpdateLeaveStatus(selectedDetailLeave.id, 'approved')} className="flex-1 py-3 bg-[#3A5A40] text-white font-bold rounded-xl hover:bg-[#2A443B] transition-colors shadow-md flex justify-center items-center gap-2"><CheckCircle size={18}/> 審核通過</button>
                  </div>
                ) : (
                  <div className={`w-full py-3 text-center rounded-xl font-bold border mt-4 ${selectedDetailLeave.status === 'approved' ? 'bg-[#3A5A40]/10 text-[#3A5A40] border-[#3A5A40]/20' : 'bg-red-50 text-red-600 border-red-200'}`}>
                     審核狀態：{selectedDetailLeave.status === 'approved' ? '已核准' : '審核不通過'}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 班級學生名冊 Modal */}
      {viewingClassStudents && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-40 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-gray-200">
            <div className="bg-[#2A443B] text-white p-5 flex justify-between items-center">
              <h3 className="font-bold text-base flex items-center gap-2"><Users size={18} className="text-[#F4A261]" /> {viewingClassStudents.name} 班級名冊</h3>
              <div className="flex gap-2">
                <button onClick={() => setShowAddClassStudentModal(true)} className="bg-[#2A443B] hover:bg-[#1E312A] text-white text-xs px-3 py-1.5 rounded-xl font-bold shadow transition-colors border border-emerald-800">新增學生至本班級</button>
                <button onClick={() => setViewingClassStudents(null)} className="text-slate-200 hover:text-white"><X size={20}/></button>
              </div>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto bg-[#FDFBF7]">
              <p className="text-xs text-slate-500 mb-3 text-center">名單已依據「座號」從小到大排序</p>
              <div className="overflow-x-auto border border-gray-200 rounded-2xl whitespace-nowrap bg-white">
                <table className="w-full text-center border-collapse">
                  <thead>
                    <tr className="bg-[#F4A261]/10 border-b text-xs border-gray-200">
                      <th className="p-3 font-semibold text-[#2F3E46] text-center">座號</th>
                      <th className="p-3 font-semibold text-[#2F3E46] text-center">姓名</th>
                      <th className="p-3 font-semibold text-[#2F3E46] text-center">學號</th>
                      <th className="p-3 font-semibold text-[#2F3E46] text-center">生日</th>
                      <th className="p-3 font-semibold text-[#2F3E46] text-center">家長姓名</th>
                      <th className="p-3 font-semibold text-[#2F3E46] text-center">家長電話</th>
                      <th className="p-3 font-semibold text-[#2F3E46] text-center">移撥操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewingClassStudentListSorted.length === 0 ? (
                      <tr><td colSpan="7" className="p-8 text-center text-slate-400 text-xs font-bold">本班級尚無學生</td></tr>
                    ) : (
                      viewingClassStudentListSorted.map(s => (
                        <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 text-xs transition-colors">
                          <td className="p-3 font-mono text-center font-bold text-blue-600">{s.seatNo || '1'} 號</td>
                          <td className="p-3 font-bold text-slate-800 text-center">{s.name}</td>
                          <td className="p-3 text-slate-600 font-mono text-center">{s.studentNo}</td>
                          <td className="p-3 text-slate-600 font-mono text-center">{s.birthday || '-'}</td>
                          <td className="p-3 text-slate-700 text-center font-bold">{s.parent || '-'}</td>
                          <td className="p-3 text-slate-600 font-mono text-center">{s.parentPhone || '-'}</td>
                          <td className="p-3 text-center">
                            <button onClick={() => handleRemoveStudentFromClass(s.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-xl transition-colors"><Trash2 size={14}/></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 班級學生新增子面板 */}
      {showAddClassStudentModal && viewingClassStudents && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 border border-gray-200 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-base text-slate-800">移入學生至 {viewingClassStudents.name} 班</h4>
              <button onClick={() => { setShowAddClassStudentModal(false); setSelectedStudentToImport(''); setSourceClassForImport(''); }} className="text-slate-400 hover:text-white"><X size={18}/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 text-center">步驟 1：選擇來源班級</label>
                <select value={sourceClassForImport} onChange={e => { setSourceClassForImport(e.target.value); setSelectedStudentToImport(''); }} className="w-full p-2.5 border border-gray-200 rounded-xl text-xs text-center font-bold outline-none focus:ring-2 focus:ring-[#2A443B]">
                  <option value="">-- 選擇班級 --</option>
                  {classes.filter(c => c.name !== viewingClassStudents.name && !c.isExtracurricular).map(c => <option key={c.id} value={c.name}>{c.name} 班</option>)}
                </select>
              </div>
              {sourceClassForImport && (
                <div className="animate-fadeIn">
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 text-center">步驟 2：選擇調班學生</label>
                  <select value={selectedStudentToImport} onChange={e => setSelectedStudentToImport(e.target.value)} className="w-full p-2.5 border border-gray-200 rounded-xl text-xs text-center outline-none focus:ring-2 focus:ring-[#2A443B] font-bold">
                    <option value="">-- 點選姓名 --</option>
                    {studentsInSourceClass.sort((a,b) => (parseInt(a.seatNo, 10)||0) - (parseInt(b.seatNo, 10)||0)).map(s => <option key={s.id} value={s.id}>({s.seatNo || '1'}號) {s.name} [學號: {s.studentNo}]</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-center gap-2 mt-6 pt-4 border-t border-gray-100">
              <button onClick={() => { setShowAddClassStudentModal(false); setSelectedStudentToImport(''); setSourceClassForImport(''); }} className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200">取消</button>
              <button onClick={handleImportStudentToClass} disabled={!selectedStudentToImport} className="px-5 py-2 bg-[#2A443B] text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50 hover:bg-[#1E312A]">確定調入此班</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}