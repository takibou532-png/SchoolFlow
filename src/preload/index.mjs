import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // ─── STUDENT ────────────────────────────────────────

  
school: {
  get: () => ipcRenderer.invoke('school:get'),
  create: (data) => ipcRenderer.invoke('school:create', data),
  update: (id, data) => ipcRenderer.invoke('school:update',  id, data ),
  selectLogo: () => ipcRenderer.invoke('school:select-logo'),
  getLogo: (logoPath) => ipcRenderer.invoke('school:get-logo', logoPath),
  getDashboardStats: (options) => ipcRenderer.invoke('school:get-dashboard-stats', options),
    selectStamp: () => ipcRenderer.invoke('school:select-stamp'),
  getStamp: () => ipcRenderer.invoke('school:get-stamp'),
},
  student: {
    getAll: (options) => ipcRenderer.invoke('student:get-all', options),
    getById: (id) => ipcRenderer.invoke('student:get-by-id', id),
    getByModule: (moduleId, options) => ipcRenderer.invoke('student:get-by-module', { moduleId, options }),
    getWithUnpaidInvoices: () => ipcRenderer.invoke('student:get-with-unpaid-invoices'),
    createWithEnrollment: (studentData, moduleId, notes) => 
      ipcRenderer.invoke('student:create-with-enrollment', { studentData, moduleId, notes }),
    enrollToModule: (studentId, moduleId, notes) => 
      ipcRenderer.invoke('student:enroll-to-module', { studentId, moduleId, notes }),
    suspendFromModule: (studentId, moduleId, reason) => 
      ipcRenderer.invoke('student:suspend-from-module', { studentId, moduleId, reason }),
    update: (id, data) => ipcRenderer.invoke('student:update', { id, data }),
    getAttendance: (studentId) => ipcRenderer.invoke('student:get-attendance', studentId),
    getStats: (studentId) => ipcRenderer.invoke('student:get-stats', studentId),
    create: (data) => ipcRenderer.invoke('student:create', data),
  getEnrollments: (studentId) => ipcRenderer.invoke('student:get-enrollments', studentId),
    selectAvatar: () => ipcRenderer.invoke('student:select-avatar'),
  getAvatar: (studentId) => ipcRenderer.invoke('student:get-avatar', studentId),
  },

  // ─── MODULE ─────────────────────────────────────────
module: {
    getAll: (options) => ipcRenderer.invoke('module:get-all', options),
    getById: (id) => ipcRenderer.invoke('module:get-by-id', id),
    getWithDetails: (moduleId) => ipcRenderer.invoke('module:get-with-details', moduleId),
    createWithSessions: (dto) => ipcRenderer.invoke('module:create-with-sessions', dto),
    archive: (moduleId) => ipcRenderer.invoke('module:archive', moduleId),
    updateSchedule: (moduleId, slotUpdates) =>
      ipcRenderer.invoke('module:update-schedule', { moduleId, slotUpdates }),
    getStudents: (moduleId) => ipcRenderer.invoke('module:get-students', moduleId),
    getSessions: (moduleId) => ipcRenderer.invoke('module:get-sessions', moduleId),
    getRevenue: (moduleId) => ipcRenderer.invoke('module:get-revenue', moduleId),
    getScheduleSlots: (moduleId) => ipcRenderer.invoke('module:get-schedule-slots', moduleId),
    getAllSchedule: () => ipcRenderer.invoke('module:get-all-schedule'),
  },
  // In src/preload/index.js

employee: {
  getAll: (options) => ipcRenderer.invoke('employee:get-all', options),
  getById: (id) => ipcRenderer.invoke('employee:get-by-id', id),
  create: (data) => ipcRenderer.invoke('employee:create', data),
  update: (id, data) => ipcRenderer.invoke('employee:update', { id, data }),
  delete: (id) => ipcRenderer.invoke('employee:delete', id),
  restore: (id) => ipcRenderer.invoke('employee:restore', id),
},

jobApplication: {
  getAll: (options) => ipcRenderer.invoke('job-application:get-all', options),
  getById: (id) => ipcRenderer.invoke('job-application:get-by-id', id),
  create: (data) => ipcRenderer.invoke('job-application:create', data),
  update: (id, data) => ipcRenderer.invoke('job-application:update', { id, data }),
  delete: (id) => ipcRenderer.invoke('job-application:delete', id),
  selectCv: () => ipcRenderer.invoke('job-application:select-cv'),
  openCv: (id) => ipcRenderer.invoke('job-application:open-cv', id),
   getBySubject: (subjectId) => ipcRenderer.invoke('job-application:get-by-subject', subjectId),
},

employeePayment: {
  getAll: (options) => ipcRenderer.invoke('employee-payment:get-all', options),
  getByEmployee: (employeeId) => ipcRenderer.invoke('employee-payment:get-by-employee', employeeId),
  getById: (id) => ipcRenderer.invoke('employee-payment:get-by-id', id),
  create: (data) => ipcRenderer.invoke('employee-payment:create', data),
  update: (id, data) => ipcRenderer.invoke('employee-payment:update', { id, data }),
  markPaid: (id, paidAt) => ipcRenderer.invoke('employee-payment:mark-paid', { id, paidAt }),
  delete: (id) => ipcRenderer.invoke('employee-payment:delete', id),
},

  // ─── SESSION ────────────────────────────────────────
  session: {
    getById: (id) => ipcRenderer.invoke('session:get-by-id', id),
    createAdditional: (dto) => ipcRenderer.invoke('session:create-additional', dto),
    update: (sessionId, data) => ipcRenderer.invoke('session:update', { sessionId, data }),
    cancel: (sessionId) => ipcRenderer.invoke('session:cancel', sessionId),
    getByDay: (date, options) => ipcRenderer.invoke('session:get-by-day', { date, options }),
    getByWeek: (weekStart, options) => ipcRenderer.invoke('session:get-by-week', { weekStart, options })
  },

  // ─── ATTENDANCE ─────────────────────────────────────
  attendance: {
    getSheet: (sessionId) => ipcRenderer.invoke('attendance:get-sheet', sessionId),
    mark: (sessionId, attendanceList) => 
      ipcRenderer.invoke('attendance:mark', { sessionId, attendanceList }),
    getStudentByCycle: (studentId, moduleId, cycleNumber) => 
      ipcRenderer.invoke('attendance:get-student-by-cycle', { studentId, moduleId, cycleNumber }),
    teacherAutoUpdate: () => ipcRenderer.invoke('attendance:teacher-auto-update'),
    teacherGetByCycle: (teacherId, moduleId, cycleNumber) => 
      ipcRenderer.invoke('attendance:teacher-get-by-cycle', { teacherId, moduleId, cycleNumber }),
    teacherGetByDateRange: (teacherId, startDate, endDate) => 
      ipcRenderer.invoke('attendance:teacher-get-by-date-range', { teacherId, startDate, endDate })
  },

  // ─── INVOICE ────────────────────────────────────────
 invoice: {
    generate: (manual = true) => ipcRenderer.invoke('invoice:generate', manual),
    update: (invoiceId, newAmount, reason) =>
      ipcRenderer.invoke('invoice:update', { invoiceId, newAmount, reason }),
    cancel: (invoiceId, reason) => ipcRenderer.invoke('invoice:cancel', { invoiceId, reason }),
    getById: (invoiceId) => ipcRenderer.invoke('invoice:get-by-id', invoiceId),
    getByStudent: (studentId) => ipcRenderer.invoke('invoice:get-by-student', studentId),
    getByEnrollment: (enrollmentId) => ipcRenderer.invoke('invoice:get-by-enrollment', enrollmentId),
    getByStatus: (status, options) => ipcRenderer.invoke('invoice:get-by-status', { status, options }),
    markAsPaid: (invoiceId, paidAt) => ipcRenderer.invoke('invoice:mark-as-paid', { invoiceId, paidAt }),
      getAll: (options) => ipcRenderer.invoke('invoice:get-all', options),
  },

  // ─── PAYMENT ────────────────────────────────────────
  payment: {
    getTeacherHistory: (teacherId, options) => 
      ipcRenderer.invoke('payment:get-teacher-history', { teacherId, options }),
    getTeacherPending: (teacherId) => ipcRenderer.invoke('payment:get-teacher-pending', teacherId),
    markAsPaid: (paymentId, amountToPay, paidAt) => 
      ipcRenderer.invoke('payment:mark-as-paid', { paymentId, amountToPay, paidAt }),
    cancel: (paymentId) => ipcRenderer.invoke('payment:cancel', paymentId),
    getDetails: (paymentId) => ipcRenderer.invoke('payment:get-details', paymentId)
  },

  // ─── COURSE ─────────────────────────────────────────
  course: {
    getAll: (options) => ipcRenderer.invoke('course:get-all', options),
    getById: (id) => ipcRenderer.invoke('course:get-by-id', id),
    getWithSessions: (courseId) => ipcRenderer.invoke('course:get-with-sessions', courseId),
    createWithSessions: (dto) => ipcRenderer.invoke('course:create-with-sessions', dto),
    update: (courseId, data) => ipcRenderer.invoke('course:update', { courseId, data }),
    archive: (courseId) => ipcRenderer.invoke('course:archive', courseId),
    cancel: (courseId, reason) => ipcRenderer.invoke('course:cancel', { courseId, reason }),
      getSessions: (courseId) => ipcRenderer.invoke('course:get-sessions', courseId),
  },

  // ─── COURSE ENROLLMENT ─────────────────────────────
  courseEnrollment: {
    enrollStudent: (studentId, courseId, notes) => 
      ipcRenderer.invoke('course-enrollment:enroll-student', { studentId, courseId, notes }),
    createAndEnroll: (studentData, courseId, notes) => 
      ipcRenderer.invoke('course-enrollment:create-and-enroll', { studentData, courseId, notes }),
    suspend: (studentId, courseId, reason) => 
      ipcRenderer.invoke('course-enrollment:suspend', { studentId, courseId, reason }),
    updateInvoice: (invoiceId, newAmount, reason) => 
      ipcRenderer.invoke('course-enrollment:update-invoice', { invoiceId, newAmount, reason }),
    cancelInvoice: (invoiceId, reason) => 
      ipcRenderer.invoke('course-enrollment:cancel-invoice', { invoiceId, reason }),
    markInvoicePaid: (invoiceId, paidAt) => 
      ipcRenderer.invoke('course-enrollment:mark-invoice-paid', { invoiceId, paidAt }),
    getInvoiceDetails: (invoiceId) => 
      ipcRenderer.invoke('course-enrollment:get-invoice-details', invoiceId),
    getStudentInvoices: (studentId, courseId) => 
      ipcRenderer.invoke('course-enrollment:get-student-invoices', { studentId, courseId }),
    getCourseInvoices: (courseId) => 
      ipcRenderer.invoke('course-enrollment:get-course-invoices', courseId),
      getCourseEnrollments: (courseId) => ipcRenderer.invoke('course-enrollment:get-course-enrollments', courseId),
      
  },

  // ─── COURSE ATTENDANCE ─────────────────────────────
courseAttendance: {
  getSheet: (courseSessionId) => ipcRenderer.invoke('course-attendance:get-sheet', courseSessionId),
  mark: ({ courseSessionId, attendanceList }) =>
    ipcRenderer.invoke('course-attendance:mark', { courseSessionId, attendanceList }),
  getStudent: (studentId, courseId) =>
    ipcRenderer.invoke('course-attendance:get-student', { studentId, courseId }),
  getReport: (courseId) => ipcRenderer.invoke('course-attendance:get-report', courseId)
},

  // ─── COURSE PAYMENT ────────────────────────────────
  coursePayment: {
    getTeacherPayments: (teacherId, options) => 
      ipcRenderer.invoke('course-payment:get-teacher-payments', { teacherId, options }),
    getPending: (courseId, teacherId) => 
      ipcRenderer.invoke('course-payment:get-pending', { courseId, teacherId }),
    markAsPaid: (paymentId, amountToPay, paidAt) => 
      ipcRenderer.invoke('course-payment:mark-as-paid', { paymentId, amountToPay, paidAt }),
    cancel: (paymentId, reason) => 
      ipcRenderer.invoke('course-payment:cancel', { paymentId, reason }),
    getDetails: (paymentId) => ipcRenderer.invoke('course-payment:get-details', paymentId),
    getAllPending: () => ipcRenderer.invoke('course-payment:get-all-pending'),
    getCombined: (teacherId) => ipcRenderer.invoke('course-payment:get-combined', teacherId),
    cancelAll: (courseId, reason) => 
      ipcRenderer.invoke('course-payment:cancel-all', { courseId, reason }),
 getPaymentsByCourse: (courseId) => ipcRenderer.invoke('course-payment:get-payments-by-course', courseId),
  },

  // ─── SUBJECT ────────────────────────────────────────
  subject: {
    getAll: (options) => ipcRenderer.invoke('subject:get-all', options),
    getById: (id) => ipcRenderer.invoke('subject:get-by-id', id),
    create: (data) => ipcRenderer.invoke('subject:create', data),
    update: (id, data) => ipcRenderer.invoke('subject:update', { id, data }),
    delete: (id) => ipcRenderer.invoke('subject:delete', id),
    restore: (id) => ipcRenderer.invoke('subject:restore', id)
  },

  // ─── CLASSROOM ──────────────────────────────────────
  classroom: {
    getAll: (options) => ipcRenderer.invoke('classroom:get-all', options),
    getById: (id) => ipcRenderer.invoke('classroom:get-by-id', id),
    create: (data) => ipcRenderer.invoke('classroom:create', data),
    update: (id, data) => ipcRenderer.invoke('classroom:update', { id, data }),
    delete: (id) => ipcRenderer.invoke('classroom:delete', id),
    restore: (id) => ipcRenderer.invoke('classroom:restore', id)
  },

  // ─── TEACHER ────────────────────────────────────────
teacher: {
  getAll: (options) => ipcRenderer.invoke('teacher:get-all', options),
  getById: (id) => ipcRenderer.invoke('teacher:get-by-id', id),
  create: (data) => ipcRenderer.invoke('teacher:create', data),
  update: (id, data) => ipcRenderer.invoke('teacher:update', { id, data }),
  delete: (id) => ipcRenderer.invoke('teacher:delete', id),
  restore: (id) => ipcRenderer.invoke('teacher:restore', id),
    selectAvatar: () => ipcRenderer.invoke('teacher:select-avatar'),
  getAvatar: (teacherId) => ipcRenderer.invoke('teacher:get-avatar', teacherId),
},
expense: {
  getAll: (options) => ipcRenderer.invoke('expense:get-all', options),
  getById: (id) => ipcRenderer.invoke('expense:get-by-id', id),
  create: (data) => ipcRenderer.invoke('expense:create', data),
  update: (id, data) => ipcRenderer.invoke('expense:update', { id, data }),
  delete: (id) => ipcRenderer.invoke('expense:delete', id),
},
 printAPI : {
  // Opens the native OS print dialog with the given HTML content
  html: (html, options) => ipcRenderer.invoke('print:html', html, options),

  // Renders the HTML to a PDF buffer (e.g. for "Save as PDF" / emailing)
  toPDF: (html, options) => ipcRenderer.invoke('print:pdf', html, options),

    openPdf: (html, options) => ipcRenderer.invoke('print:open-pdf', html, options),
}
});