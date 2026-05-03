// ============================================================
//  SAMS - Smart Academic Management System
//  Single-Page Application Controller
// ============================================================

const API_ORIGIN =
  window.SAMS_API_ORIGIN ||
  localStorage.getItem('sams_api_origin') ||
  `${window.location.protocol}//${window.location.hostname}:5005`;
const API_BASE = `${API_ORIGIN}/api`;
const UPLOADS_BASE = `${API_ORIGIN}/uploads`;

function freshApiUrl(endpoint) {
  const separator = endpoint.includes('?') ? '&' : '?';
  return `${API_BASE}${endpoint}${separator}_=${Date.now()}`;
}
const THEME_KEY = 'sams_theme';
const SCHOOL_CLASSES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const SCHOOL_SECTIONS = ['A', 'B', 'C'];

// ============================================================
//  STATE MANAGEMENT
// ============================================================
const state = {
  token: localStorage.getItem('sams_token') || null,
  user: JSON.parse(localStorage.getItem('sams_user') || 'null'),
  currentPage: 'login',
  chatMessages: [],
  timetable: [],
  announcements: [],
  materials: [],
  marks: [],
  attendance: [],
  attendanceRoster: [],
  studentMarksFilter: 'all',
  selectedAttendanceSubject: '',
  subjectsByClass: {},
  theme: localStorage.getItem(THEME_KEY) || 'light',
  editingTimetableId: null,
  editingMarkId: null,
  editingAttendanceId: null,
};

function renderClassOptions(selected = '') {
  return SCHOOL_CLASSES.map((cls) => `<option value="${cls}" ${selected === cls ? 'selected' : ''}>Class ${cls}</option>`).join('');
}

function renderSectionOptions(selected = '') {
  return SCHOOL_SECTIONS.map((section) => `<option value="${section}" ${selected === section ? 'selected' : ''}>Section ${section}</option>`).join('');
}

function getSubjectOptions(classLevel, selected = '') {
  const subjects = state.subjectsByClass?.[String(classLevel)] || [];
  if (!subjects.length) {
    return '<option value="">Select Subject</option>';
  }

  return subjects.map((subject) => `
    <option value="${subject}" ${selected === subject ? 'selected' : ''}>${subject}</option>
  `).join('');
}

function renderAudienceBadge(item) {
  if (!item?.classLevel || !item?.section) return '';
  return `<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-fixed/70 text-primary text-xs font-bold tracking-wide">Class ${item.classLevel} • Section ${item.section}</span>`;
}

function isDarkTheme() {
  return state.theme === 'dark';
}

function applyTheme() {
  const dark = isDarkTheme();
  document.documentElement.classList.toggle('dark', dark);
  document.body.classList.toggle('theme-dark', dark);
  document.body.classList.toggle('theme-light', !dark);
}

function toggleTheme() {
  state.theme = isDarkTheme() ? 'light' : 'dark';
  localStorage.setItem(THEME_KEY, state.theme);
  applyTheme();
  render();
}

function saveAuth(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem('sams_token', token);
  localStorage.setItem('sams_user', JSON.stringify(user));
}

function clearAuth() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('sams_token');
  localStorage.removeItem('sams_user');
}

function isLoggedIn() {
  return state.token && state.user;
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-auth-token': state.token,
  };
}

// ============================================================
//  TOAST NOTIFICATIONS
// ============================================================
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease-out reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ============================================================
//  ROUTER
// ============================================================
function navigate(page) {
  state.currentPage = page;
  window.location.hash = page;
  render();
}

function handleRoute() {
  const hash = window.location.hash.slice(1) || 'login';

  if (!isLoggedIn() && hash !== 'login' && hash !== 'signup') {
    navigate('login');
    return;
  }

  if (isLoggedIn() && (hash === 'login' || hash === 'signup')) {
    navigate(state.user.role === 'teacher' ? 'teacher-dashboard' : 'student-dashboard');
    return;
  }

  state.currentPage = hash;
  render();
}

window.addEventListener('hashchange', handleRoute);

// ============================================================
//  RENDER ENGINE
// ============================================================
function render() {
  applyTheme();
  const app = document.getElementById('app');
  app.style.animation = 'none';
  app.offsetHeight; // force reflow
  app.style.animation = 'fadeIn 0.3s ease-out';

  const routePage = state.currentPage.startsWith('attendance-subject/') ? 'attendance-subject' : state.currentPage;

  switch (routePage) {
    case 'login':
      app.innerHTML = renderLogin();
      bindLogin();
      break;
    case 'signup':
      app.innerHTML = renderSignup();
      bindSignup();
      break;
    case 'teacher-dashboard':
      app.innerHTML = renderTeacherDashboard();
      bindTeacherDashboard();
      loadTeacherData();
      break;
    case 'timetable':
      app.innerHTML = renderTimetable();
      bindTimetable();
      loadTimetableData();
      break;
    case 'announcements':
      app.innerHTML = renderAnnouncements();
      bindAnnouncements();
      loadAnnouncementData();
      break;
    case 'materials':
      app.innerHTML = renderMaterials();
      bindMaterials();
      loadMaterialsData();
      break;
    case 'marks':
      app.innerHTML = renderMarksPage();
      bindMarksPage();
      loadMarksData();
      break;
    case 'attendance':
      app.innerHTML = renderAttendancePage();
      bindAttendancePage();
      loadAttendanceData();
      break;
    case 'attendance-subject':
      app.innerHTML = renderStudentAttendanceSubjectPage();
      bindStudentAttendanceSubjectPage();
      loadAttendanceData();
      break;
    case 'profile':
      app.innerHTML = renderProfilePage();
      bindProfilePage();
      break;
    case 'student-dashboard':
      app.innerHTML = renderStudentDashboard();
      bindStudentDashboard();
      loadStudentData();
      break;
    case 'chatbot':
      app.innerHTML = renderChatbot();
      bindChatbot();
      break;
    case 'notifications':
      app.innerHTML = renderNotificationsPage();
      bindNotificationsPage();
      loadStudentData();
      break;
    default:
      if (isLoggedIn()) {
        navigate(state.user.role === 'teacher' ? 'teacher-dashboard' : 'student-dashboard');
      } else {
        navigate('login');
      }
  }
}

// ============================================================
//  SHARED COMPONENTS
// ============================================================
function teacherSidebar(active) {
  const items = [
    { icon: 'dashboard', label: 'Dashboard', page: 'teacher-dashboard' },
    { icon: 'calendar_today', label: 'Timetable', page: 'timetable' },
    { icon: 'campaign', label: 'Announcements', page: 'announcements' },
    { icon: 'description', label: 'Materials', page: 'materials' },
    { icon: 'checklist', label: 'Attendance', page: 'attendance' },
    { icon: 'bar_chart', label: 'Marks', page: 'marks' },
    { icon: 'account_circle', label: 'Profile', page: 'profile' },
  ];

  return `
    <aside class="hidden md:flex fixed left-0 top-0 h-full w-72 flex-col py-8 bg-slate-50 rounded-r-3xl z-40 shadow-2xl shadow-blue-900/5">
      <div class="px-8 mb-10">
        <h1 class="text-xl font-manrope font-bold text-blue-900">${state.user?.name || 'Academic Lead'}</h1>
        <p class="text-sm font-manrope text-slate-500">${state.user?.email || 'Faculty'}</p>
      </div>
      <nav class="flex-1 flex flex-col gap-2">
        ${items.map(item => `
          <a onclick="navigate('${item.page}')" class="${item.page === active
            ? 'bg-blue-100 text-blue-900'
            : 'text-slate-600 hover:bg-slate-200/50'
          } rounded-xl mx-2 px-6 py-3 flex items-center gap-4 font-manrope font-semibold tracking-wide transition-all duration-300 ease-in-out cursor-pointer">
            <span class="material-symbols-outlined">${item.icon}</span>
            ${item.label}
          </a>
        `).join('')}
      </nav>
      <div class="px-4 mt-auto">
        <button onclick="logout()" class="w-full flex items-center gap-4 px-6 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer font-manrope font-semibold">
          <span class="material-symbols-outlined">logout</span>
          Sign Out
        </button>
      </div>
    </aside>
  `;
}

function studentSidebar(active) {
  const items = [
    { icon: 'dashboard', label: 'Dashboard', page: 'student-dashboard' },
    { icon: 'calendar_today', label: 'Timetable', page: 'timetable' },
    { icon: 'campaign', label: 'Announcements', page: 'announcements' },
    { icon: 'description', label: 'Materials', page: 'materials' },
    { icon: 'checklist', label: 'Attendance', page: 'attendance' },
    { icon: 'notifications', label: 'Notifications Center', page: 'notifications' },
    { icon: 'bar_chart', label: 'Marks', page: 'marks' },
    { icon: 'smart_toy', label: 'AI Chat', page: 'chatbot' },
    { icon: 'account_circle', label: 'Profile', page: 'profile' },
  ];

  return `
    <aside class="hidden md:flex fixed left-0 top-0 h-full w-72 flex-col py-8 bg-slate-50 rounded-r-3xl z-40 shadow-2xl shadow-blue-900/5">
      <div class="px-8 mb-10">
        <h1 class="text-xl font-manrope font-bold text-blue-900">${state.user?.name || 'Student'}</h1>
        <p class="text-sm font-manrope text-slate-500">${state.user?.email || 'Learner'}</p>
      </div>
      <nav class="flex-1 flex flex-col gap-2">
        ${items.map(item => `
          <a onclick="navigate('${item.page}')" class="${item.page === active
            ? 'bg-blue-100 text-blue-900'
            : 'text-slate-600 hover:bg-slate-200/50'
          } rounded-xl mx-2 px-6 py-3 flex items-center gap-4 font-manrope font-semibold tracking-wide transition-all duration-300 ease-in-out cursor-pointer">
            <span class="material-symbols-outlined">${item.icon}</span>
            ${item.label}
          </a>
        `).join('')}
      </nav>
      <div class="px-4 mt-auto">
        <button onclick="logout()" class="w-full flex items-center gap-4 px-6 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer font-manrope font-semibold">
          <span class="material-symbols-outlined">logout</span>
          Sign Out
        </button>
      </div>
    </aside>
  `;
}

function topBar() {
  const headerClass = isDarkTheme()
    ? 'topbar-shell border-b border-white/10 bg-slate-950/80 text-slate-100 shadow-[0_18px_50px_rgba(2,6,23,0.45)]'
    : 'topbar-shell border-b border-slate-200/70 bg-slate-50/80 text-blue-900 shadow-[0_18px_50px_rgba(148,163,184,0.12)]';
  const titleClass = isDarkTheme() ? 'text-white' : 'text-blue-900';
  const nameClass = isDarkTheme()
    ? 'hidden sm:inline-flex items-center px-4 py-2 rounded-full bg-slate-900 text-slate-200 border border-white/10 text-sm font-semibold'
    : 'hidden sm:inline-flex items-center px-4 py-2 rounded-full bg-white text-slate-600 border border-slate-200/80 text-sm font-semibold';
  const avatarShellClass = isDarkTheme()
    ? 'w-10 h-10 rounded-full overflow-hidden bg-slate-900 text-slate-200 border border-white/10 hover:bg-slate-800 mt-0.5'
    : 'w-10 h-10 rounded-full overflow-hidden bg-white text-slate-500 border border-slate-200/80 hover:bg-slate-100 mt-0.5';
  const toggleClass = isDarkTheme()
    ? 'theme-toggle-btn bg-slate-900 text-amber-300 hover:bg-slate-800'
    : 'theme-toggle-btn bg-white text-slate-600 hover:bg-slate-100';
  const logoutClass = isDarkTheme()
    ? 'p-2 rounded-full hover:bg-red-500/10 transition-colors text-slate-400 hover:text-red-300'
    : 'p-2 rounded-full hover:bg-red-50 transition-colors text-slate-400 hover:text-red-500';
  const topBarProfilePicture = state.user?.profilePicture
    ? `${UPLOADS_BASE}/${state.user.profilePicture}`
    : '';
  return `
    <header class="${headerClass} backdrop-blur-xl fixed left-0 right-0 top-0 z-50">
      <div class="flex justify-between items-center w-full px-6 py-4">
        <div class="flex items-center gap-4">
          <div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <span class="material-symbols-outlined text-white">school</span>
          </div>
          <span class="text-2xl font-manrope font-extrabold tracking-tight ${titleClass}">Smart Student Dairy</span>
        </div>
        <div class="flex items-start gap-3">
          <button onclick="toggleTheme()" class="${toggleClass}" title="Toggle theme">
            <span class="material-symbols-outlined">${isDarkTheme() ? 'light_mode' : 'dark_mode'}</span>
          </button>
          <button onclick="navigate('profile')" class="${avatarShellClass} transition-colors flex items-center justify-center" title="Open profile">
            ${topBarProfilePicture
              ? `<img src="${topBarProfilePicture}" alt="Profile picture" class="w-full h-full object-cover"/>`
              : `<span class="material-symbols-outlined text-2xl">account_circle</span>`}
          </button>
          <span class="${nameClass}">${state.user?.name || ''}</span>
          <button onclick="logout()" class="${logoutClass}" title="Logout">
            <span class="material-symbols-outlined">logout</span>
          </button>
        </div>
      </div>
    </header>
  `;
}

function studentBottomNav(active) {
  const items = [
    { icon: 'home', label: 'Home', page: 'student-dashboard' },
    { icon: 'checklist', label: 'Attend', page: 'attendance' },
    { icon: 'bar_chart', label: 'Marks', page: 'marks' },
    { icon: 'notifications', label: 'Alerts', page: 'notifications' },
    { icon: 'account_circle', label: 'Profile', page: 'profile' },
    { icon: 'smart_toy', label: 'Chat', page: 'chatbot' },
  ];

  return `
    <nav class="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-3 bg-white/80 backdrop-blur-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.04)] rounded-t-[2.5rem]">
      ${items.map(item => `
        <a onclick="navigate('${item.page}')" class="flex flex-col items-center justify-center ${item.page === active
          ? 'bg-teal-100 text-teal-900 rounded-3xl px-6 py-2'
          : 'text-slate-400 hover:scale-110'
        } transition-transform cursor-pointer tap-highlight-none">
          <span class="material-symbols-outlined" ${item.page === active ? "style=\"font-variation-settings: 'FILL' 1;\"" : ''}>${item.icon}</span>
          <span class="font-inter text-[11px] font-medium tracking-tight mt-1">${item.label}</span>
        </a>
      `).join('')}
      <a onclick="logout()" class="flex flex-col items-center justify-center text-slate-400 hover:scale-110 transition-transform cursor-pointer tap-highlight-none">
        <span class="material-symbols-outlined">logout</span>
        <span class="font-inter text-[11px] font-medium tracking-tight mt-1">Logout</span>
      </a>
    </nav>
  `;
}

function mobileTeacherNav(active) {
  const items = [
    { icon: 'home', label: 'Home', page: 'teacher-dashboard' },
    { icon: 'calendar_today', label: 'Schedule', page: 'timetable' },
    { icon: 'checklist', label: 'Attend', page: 'attendance' },
    { icon: 'bar_chart', label: 'Marks', page: 'marks' },
    { icon: 'account_circle', label: 'Profile', page: 'profile' },
    { icon: 'description', label: 'Files', page: 'materials' },
  ];

  return `
    <nav class="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-3 bg-white/80 backdrop-blur-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.04)] rounded-t-[2.5rem]">
      ${items.map(item => `
        <a onclick="navigate('${item.page}')" class="flex flex-col items-center justify-center ${item.page === active
          ? 'bg-teal-100 text-teal-900 rounded-3xl px-6 py-2'
          : 'text-slate-400 hover:scale-110'
        } transition-transform cursor-pointer tap-highlight-none">
          <span class="material-symbols-outlined" ${item.page === active ? "style=\"font-variation-settings: 'FILL' 1;\"" : ''}>${item.icon}</span>
          <span class="font-inter text-[11px] font-medium tracking-tight">${item.label}</span>
        </a>
      `).join('')}
    </nav>
  `;
}

// ============================================================
//  LOGIN PAGE
// ============================================================
function renderLogin() {
  return `
  <div class="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
    <div class="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]"></div>
    <div class="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-secondary/5 rounded-full blur-[120px]"></div>
    <main class="w-full max-w-[1100px] grid md:grid-cols-2 bg-surface-container-lowest rounded-[2rem] overflow-hidden shadow-[0_20px_40px_rgba(13,28,46,0.06)] relative z-10">
      <!-- Left Side: Branding -->
      <div class="hidden md:flex flex-col justify-between p-12 bg-surface-container-low relative">
        <div class="z-10">
          <div class="flex items-center gap-3 mb-12">
            <div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <span class="material-symbols-outlined text-white">school</span>
            </div>
            <span class="text-2xl font-manrope font-extrabold tracking-tight text-primary">Smart Student Dairy</span>
          </div>
          <h1 class="text-4xl lg:text-5xl font-manrope font-bold text-on-surface leading-tight mb-6">
            Elevating the <span class="text-primary">Academic</span> Experience.
          </h1>
          <p class="text-on-surface-variant text-lg max-w-sm leading-relaxed">
            A curated digital studio where professional management meets pedagogical rigor.
          </p>
        </div>
        <div class="relative z-10">
          <div class="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/10 max-w-xs">
            <p class="italic text-on-surface-variant mb-4">"The interface feels less like software and more like a premium, custom-bound academic journal."</p>
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span class="material-symbols-outlined text-white text-sm">person</span>
              </div>
              <div>
                <p class="text-sm font-bold text-on-surface">Dr. Julian Vane</p>
                <p class="text-xs text-on-surface-variant">Faculty of Letters</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Side: Login Form -->
      <div class="p-8 md:p-16 flex flex-col justify-center">
        <div class="md:hidden flex items-center gap-3 mb-8">
          <div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span class="material-symbols-outlined text-white text-sm">school</span>
          </div>
          <span class="text-xl font-manrope font-extrabold tracking-tight text-primary">Smart Student Dairy</span>
        </div>
        <div class="mb-10">
          <h2 class="text-3xl font-manrope font-bold text-on-surface mb-2">Welcome Back</h2>
          <p class="text-on-surface-variant">Please select your role and enter your credentials.</p>
        </div>
        <form id="loginForm" class="space-y-6">
          <!-- Role Selection -->
          <div class="grid grid-cols-2 gap-4 p-1.5 bg-surface-container-low rounded-2xl">
            <button type="button" id="roleStudent" onclick="selectRole('student')" class="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-surface-container-lowest text-primary shadow-sm font-semibold transition-all">
              <span class="material-symbols-outlined text-xl">person</span>
              <span class="font-label text-sm">Student</span>
            </button>
            <button type="button" id="roleTeacher" onclick="selectRole('teacher')" class="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-all font-medium">
              <span class="material-symbols-outlined text-xl">history_edu</span>
              <span class="font-label text-sm">Teacher</span>
            </button>
          </div>
          <input type="hidden" id="loginRole" value="student"/>
          <!-- Input Fields -->
          <div class="space-y-4">
            <div class="space-y-2">
              <label class="block text-sm font-semibold text-on-surface px-1">Email or Username</label>
              <div class="relative">
                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant">mail</span>
                <input id="loginEmail" class="w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline-variant transition-all" placeholder="student email or username" type="text" required/>
              </div>
            </div>
            <div class="space-y-2">
              <div class="flex justify-between items-center px-1">
                <label class="block text-sm font-semibold text-on-surface">Password</label>
              </div>
              <div class="relative">
                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant">lock</span>
                <input id="loginPassword" class="w-full pl-12 pr-12 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline-variant transition-all" placeholder="••••••••" type="password" required/>
                <button type="button" onclick="togglePassword('loginPassword')" class="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant hover:text-on-surface">
                  <span class="material-symbols-outlined">visibility</span>
                </button>
              </div>
            </div>
          </div>
          <!-- Error message -->
          <div id="loginError" class="hidden text-red-600 text-sm font-semibold bg-red-50 px-4 py-3 rounded-xl"></div>
          <!-- Action Button -->
          <button id="loginBtn" type="submit" class="w-full py-4 bg-gradient-to-br from-primary to-primary-container text-white font-manrope font-bold text-lg rounded-[2rem] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
            Sign In
            <span class="material-symbols-outlined">arrow_forward</span>
          </button>
        </form>
        <div class="mt-12 text-center">
          <p class="text-sm text-on-surface-variant">
            New to the system? <a onclick="navigate('signup')" class="text-primary font-bold hover:underline cursor-pointer">Create Account</a>
          </p>
        </div>
      </div>
    </main>
  </div>`;
}

let selectedLoginRole = 'student';

function selectRole(role) {
  selectedLoginRole = role;
  document.getElementById('loginRole').value = role;
  const studentBtn = document.getElementById('roleStudent');
  const teacherBtn = document.getElementById('roleTeacher');

  if (role === 'student') {
    studentBtn.className = 'flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-surface-container-lowest text-primary shadow-sm font-semibold transition-all';
    teacherBtn.className = 'flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-all font-medium';
  } else {
    teacherBtn.className = 'flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-surface-container-lowest text-primary shadow-sm font-semibold transition-all';
    studentBtn.className = 'flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-all font-medium';
  }
}

function togglePassword(id) {
  const input = document.getElementById(id);
  input.type = input.type === 'password' ? 'text' : 'password';
}

function bindLogin() {
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const role = document.getElementById('loginRole').value;
    const errorEl = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');

    btn.innerHTML = '<div class="spinner" style="width:24px;height:24px;border-width:3px;"></div>';
    btn.disabled = true;
    errorEl.classList.add('hidden');

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      saveAuth(data.token, data.user);
      showToast(`Welcome back, ${data.user.name}!`, 'success');
      navigate(data.user.role === 'teacher' ? 'teacher-dashboard' : 'student-dashboard');
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
      btn.innerHTML = 'Sign In <span class="material-symbols-outlined">arrow_forward</span>';
      btn.disabled = false;
    }
  });
}

// ============================================================
//  SIGNUP PAGE
// ============================================================
function renderSignup() {
  return `
  <div class="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
    <div class="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]"></div>
    <div class="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-secondary/5 rounded-full blur-[120px]"></div>
    <main class="w-full max-w-[500px] bg-surface-container-lowest rounded-[2rem] overflow-hidden shadow-[0_20px_40px_rgba(13,28,46,0.06)] relative z-10 p-8 md:p-12">
      <div class="flex items-center gap-3 mb-8">
        <div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
          <span class="material-symbols-outlined text-white">school</span>
        </div>
        <span class="text-2xl font-manrope font-extrabold tracking-tight text-primary">Smart Student Dairy</span>
      </div>
      <div class="mb-8">
        <h2 class="text-3xl font-manrope font-bold text-on-surface mb-2">Create Account</h2>
        <p class="text-on-surface-variant">Join the academic management system.</p>
      </div>
      <form id="signupForm" class="space-y-5">
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-on-surface px-1">Full Name</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant">person</span>
            <input id="signupName" class="w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline-variant transition-all" placeholder="John Doe" type="text" required/>
          </div>
        </div>
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-on-surface px-1">Username</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant">alternate_email</span>
            <input id="signupUsername" class="w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline-variant transition-all" placeholder="e.g. reetik12a" type="text"/>
          </div>
        </div>
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-on-surface px-1">Email</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant">mail</span>
            <input id="signupEmail" class="w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline-variant transition-all" placeholder="name@university.edu" type="email" required/>
          </div>
        </div>
        <div class="space-y-2">
          <label class="block text-sm font-semibold text-on-surface px-1">Password</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant">lock</span>
            <input id="signupPassword" class="w-full pl-12 pr-12 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline-variant transition-all" placeholder="••••••••" type="password" required minlength="6"/>
            <button type="button" onclick="togglePassword('signupPassword')" class="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant hover:text-on-surface">
              <span class="material-symbols-outlined">visibility</span>
            </button>
          </div>
        </div>
        <!-- Role Selection -->
        <div class="grid grid-cols-2 gap-4 p-1.5 bg-surface-container-low rounded-2xl">
          <button type="button" id="signupRoleStudent" onclick="selectSignupRole('student')" class="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-surface-container-lowest text-primary shadow-sm font-semibold transition-all">
            <span class="material-symbols-outlined text-xl">person</span>
            <span class="font-label text-sm">Student</span>
          </button>
          <button type="button" id="signupRoleTeacher" onclick="selectSignupRole('teacher')" class="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-all font-medium">
            <span class="material-symbols-outlined text-xl">history_edu</span>
            <span class="font-label text-sm">Teacher</span>
          </button>
        </div>
        <input type="hidden" id="signupRole" value="student"/>
        <div id="studentSchoolFields" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="space-y-2">
              <label class="block text-sm font-semibold text-on-surface px-1">Class</label>
              <select id="signupClassLevel" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-4 text-on-surface focus:ring-2 focus:ring-primary/20 transition-all">
                ${SCHOOL_CLASSES.map(cls => `<option value="${cls}">Class ${cls}</option>`).join('')}
              </select>
            </div>
            <div class="space-y-2">
              <label class="block text-sm font-semibold text-on-surface px-1">Section</label>
              <select id="signupSection" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-4 text-on-surface focus:ring-2 focus:ring-primary/20 transition-all">
                ${SCHOOL_SECTIONS.map(section => `<option value="${section}">${section}</option>`).join('')}
              </select>
            </div>
            <div class="space-y-2">
              <label class="block text-sm font-semibold text-on-surface px-1">Roll Number</label>
              <input id="signupRollNumber" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-4 text-on-surface focus:ring-2 focus:ring-primary/20 transition-all" placeholder="e.g. 23" type="text"/>
            </div>
          </div>
        </div>
        <div id="signupError" class="hidden text-red-600 text-sm font-semibold bg-red-50 px-4 py-3 rounded-xl"></div>
        <button id="signupBtn" type="submit" class="w-full py-4 bg-gradient-to-br from-primary to-primary-container text-white font-manrope font-bold text-lg rounded-[2rem] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
          Create Account
          <span class="material-symbols-outlined">arrow_forward</span>
        </button>
      </form>
      <div class="mt-8 text-center">
        <p class="text-sm text-on-surface-variant">
          Already have an account? <a onclick="navigate('login')" class="text-primary font-bold hover:underline cursor-pointer">Sign In</a>
        </p>
      </div>
    </main>
  </div>`;
}

let selectedSignupRole = 'student';

function selectSignupRole(role) {
  selectedSignupRole = role;
  document.getElementById('signupRole').value = role;
  const studentBtn = document.getElementById('signupRoleStudent');
  const teacherBtn = document.getElementById('signupRoleTeacher');

  if (role === 'student') {
    studentBtn.className = 'flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-surface-container-lowest text-primary shadow-sm font-semibold transition-all';
    teacherBtn.className = 'flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-all font-medium';
  } else {
    teacherBtn.className = 'flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-surface-container-lowest text-primary shadow-sm font-semibold transition-all';
    studentBtn.className = 'flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-all font-medium';
  }

  const schoolFields = document.getElementById('studentSchoolFields');
  if (schoolFields) {
    schoolFields.style.display = role === 'student' ? 'block' : 'none';
  }
}

function bindSignup() {
  selectSignupRole(document.getElementById('signupRole')?.value || 'student');
  document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signupName').value;
    const username = document.getElementById('signupUsername').value.trim();
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const role = document.getElementById('signupRole').value;
    const classLevel = document.getElementById('signupClassLevel')?.value;
    const section = document.getElementById('signupSection')?.value;
    const rollNumber = document.getElementById('signupRollNumber')?.value.trim();
    const errorEl = document.getElementById('signupError');
    const btn = document.getElementById('signupBtn');

    btn.innerHTML = '<div class="spinner" style="width:24px;height:24px;border-width:3px;"></div>';
    btn.disabled = true;
    errorEl.classList.add('hidden');

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, email, password, role, classLevel, section, rollNumber }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      saveAuth(data.token, data.user);
      showToast(`Account created! Welcome, ${data.user.name}!`, 'success');
      navigate(data.user.role === 'teacher' ? 'teacher-dashboard' : 'student-dashboard');
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.remove('hidden');
      btn.innerHTML = 'Create Account <span class="material-symbols-outlined">arrow_forward</span>';
      btn.disabled = false;
    }
  });
}

function renderProfilePage() {
  const isTeacher = state.user?.role === 'teacher';
  const sidebar = isTeacher ? teacherSidebar('profile') : studentSidebar('profile');
  const mobileNav = isTeacher ? mobileTeacherNav('profile') : studentBottomNav('profile');
  const profilePicture = state.user?.profilePicture
    ? `${UPLOADS_BASE}/${state.user.profilePicture}`
    : '';
  const meta = [
    { label: 'Full Name', value: state.user?.name || 'N/A' },
    { label: 'Username', value: state.user?.username || 'Not set' },
    { label: 'Email', value: state.user?.email || 'N/A' },
    { label: 'Role', value: state.user?.role || 'N/A' },
    ...(!isTeacher
      ? [
          { label: 'Class', value: state.user?.classLevel || 'Not assigned' },
          { label: 'Section', value: state.user?.section || 'Not assigned' },
          { label: 'Roll Number', value: state.user?.rollNumber || 'Not assigned' },
        ]
      : []),
  ];

  return `
  ${topBar()}
  ${sidebar}
  <main class="max-w-7xl mx-auto px-6 pt-24 pb-32 md:ml-72">
    <section class="mb-10">
      <h2 class="text-3xl md:text-5xl font-manrope font-bold text-on-surface mb-2">My Profile</h2>
      <p class="text-on-surface-variant text-lg">Your role stays limited to only teacher and student, and all your account details appear here.</p>
    </section>
    <div class="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <div class="xl:col-span-4 bg-gradient-to-br from-primary to-primary-container text-white rounded-3xl p-8 shadow-xl shadow-primary/20">
        <div class="mb-6">
          ${profilePicture ? `
            <button type="button" id="profilePreviewBtn" class="block rounded-3xl overflow-hidden border border-white/20 shadow-lg hover:scale-105 transition-transform">
              <img src="${profilePicture}" alt="Profile picture" class="w-24 h-24 rounded-3xl object-cover"/>
            </button>
          ` : `
            <div class="w-24 h-24 rounded-3xl bg-white/15 flex items-center justify-center">
              <span class="material-symbols-outlined text-6xl">account_circle</span>
            </div>
          `}
        </div>
        <h3 class="text-3xl font-manrope font-bold">${state.user?.name || 'User'}</h3>
        <p class="text-on-primary-container/90 mt-2">${state.user?.role === 'teacher' ? 'Teacher Profile' : 'Student Profile'}</p>
        <div class="mt-6 flex flex-wrap gap-3">
          <label class="inline-flex items-center gap-2 px-5 py-3 rounded-[2rem] bg-white text-primary font-semibold cursor-pointer hover:scale-[1.02] transition-transform">
            <span class="material-symbols-outlined text-sm">upload</span>
            Upload Photo
            <input id="profilePhotoInput" type="file" accept="image/*" class="hidden" />
          </label>
          <button id="removeProfilePhotoBtn" class="inline-flex items-center gap-2 px-5 py-3 rounded-[2rem] bg-white/10 text-white font-semibold border border-white/20 hover:bg-white/15 transition-colors ${state.user?.profilePicture ? '' : 'opacity-50 cursor-not-allowed'}" ${state.user?.profilePicture ? '' : 'disabled'}>
            <span class="material-symbols-outlined text-sm">delete</span>
            Remove
          </button>
        </div>
        <div class="mt-8 space-y-3 text-sm text-white/90">
          <p>Email: ${state.user?.email || 'N/A'}</p>
          <p>Username: ${state.user?.username || 'Not set'}</p>
          ${state.user?.role === 'student' ? `
          <p>Class ${state.user?.classLevel || '--'} • Section ${state.user?.section || '--'}</p>
          <p>Roll No: ${state.user?.rollNumber || '--'}</p>
          ` : `
          <p>Access Level: Teacher</p>
          <p>Subjects/Class mapping can be added next.</p>
          `}
        </div>
      </div>
      <div class="xl:col-span-8 bg-surface-container-lowest rounded-3xl p-8 shadow-sm">
        <h3 class="text-2xl font-manrope font-bold text-on-surface mb-6">Account Details</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${meta.map(item => `
            <div class="rounded-2xl bg-surface-container-low p-5 border border-outline-variant/10">
              <p class="text-xs uppercase tracking-[0.2em] text-on-surface-variant font-bold mb-2">${item.label}</p>
              <p class="text-lg font-manrope font-bold text-on-surface">${item.value}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
    <div id="profilePhotoModal" class="fixed inset-0 z-[70] hidden bg-slate-950/70 backdrop-blur-sm p-6">
      <div class="w-full h-full flex items-center justify-center">
        <div class="relative max-w-3xl w-full flex items-center justify-center">
          <button type="button" id="profilePhotoClose" class="absolute top-4 right-4 z-10 w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg hover:bg-slate-800 transition-colors border border-white/10">
            <span class="material-symbols-outlined text-[22px]">close</span>
          </button>
          <div class="rounded-[2rem] overflow-hidden bg-white shadow-2xl max-h-[85vh]">
            ${profilePicture
              ? `<img src="${profilePicture}" alt="Profile preview" class="max-h-[85vh] w-auto object-contain" />`
              : `<div class="w-full min-h-[320px] px-12 py-16 flex flex-col items-center justify-center text-primary">
                  <span class="material-symbols-outlined text-[96px]">account_circle</span>
                  <p class="mt-4 text-lg font-semibold">No profile photo uploaded</p>
                </div>`}
          </div>
        </div>
      </div>
    </div>
  </main>
  ${mobileNav}
  `;
}

function bindProfilePage() {
  const input = document.getElementById('profilePhotoInput');
  const removeBtn = document.getElementById('removeProfilePhotoBtn');
  const previewBtn = document.getElementById('profilePreviewBtn');
  const modal = document.getElementById('profilePhotoModal');
  const closeBtn = document.getElementById('profilePhotoClose');

  if (input) {
    input.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('photo', file);

      try {
        const res = await fetch(`${API_BASE}/auth/profile/photo`, {
          method: 'POST',
          headers: { 'x-auth-token': state.token },
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to upload photo');

        saveAuth(state.token, data.user);
        showToast('Profile picture updated', 'success');
        render();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        input.value = '';
      }
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener('click', async () => {
      if (!state.user?.profilePicture) return;

      try {
        const res = await fetch(`${API_BASE}/auth/profile/photo`, {
          method: 'DELETE',
          headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to remove photo');

        saveAuth(state.token, data.user);
        showToast('Profile picture removed', 'info');
        render();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  if (previewBtn && modal) {
    previewBtn.addEventListener('click', () => {
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
      }
    });
  }
}

// ============================================================
//  TEACHER DASHBOARD
// ============================================================
function renderTeacherDashboard() {
  const profilePicture = state.user?.profilePicture
    ? `${UPLOADS_BASE}/${state.user.profilePicture}`
    : '';
  return `
  ${topBar()}
  ${teacherSidebar('teacher-dashboard')}
  <main class="md:ml-72 pt-24 pb-32 px-6 md:px-12 max-w-7xl mx-auto">
    <header class="mb-6 px-2">
      <h2 class="text-3xl md:text-5xl font-manrope font-extrabold text-on-surface tracking-tight">Welcome back, ${state.user?.name || 'Professor'}</h2>
    </header>
    <div class="space-y-6">
      <a onclick="navigate('profile')" class="block bg-surface-container-lowest rounded-[2rem] p-7 md:p-10 shadow-[0_20px_50px_rgba(148,163,184,0.14)] border border-white/70 cursor-pointer hover:scale-[1.01] transition-transform overflow-hidden relative">
        <div class="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary/5 blur-2xl"></div>
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative">
          <div class="flex items-center gap-6 md:gap-8">
            <button type="button" id="teacherDashboardPhotoBtn" class="w-28 h-28 md:w-36 md:h-36 rounded-[2rem] bg-primary-fixed flex items-center justify-center text-primary overflow-hidden shadow-lg shadow-primary/10 border border-white/70 hover:scale-105 transition-transform">
              ${profilePicture
                ? `<img src="${profilePicture}" alt="Profile picture" class="w-full h-full object-cover" />`
                : `<span class="material-symbols-outlined text-6xl">account_circle</span>`}
            </button>
            <div class="pt-1">
              <p class="text-xs uppercase tracking-[0.25em] text-on-surface-variant/60 font-semibold mb-2">Profile</p>
              <h3 class="text-4xl md:text-5xl font-manrope font-extrabold text-on-surface">${state.user?.name || 'Teacher'}</h3>
              <p class="text-lg text-on-surface-variant mt-3">${state.user?.email || 'No email found'}</p>
              <div class="flex flex-wrap gap-2 mt-5">
                <span class="inline-flex items-center px-4 py-2 rounded-full bg-primary-fixed text-primary font-semibold text-sm">Teacher Account</span>
                ${state.user?.username ? `<span class="inline-flex items-center px-4 py-2 rounded-full bg-surface-container-low text-on-surface-variant font-semibold text-sm">@${state.user.username}</span>` : ''}
              </div>
            </div>
          </div>
          <div class="text-left md:text-right">
            <p class="text-sm uppercase tracking-[0.25em] text-on-surface-variant/60 font-semibold mb-2">Profile Center</p>
            <p class="text-lg text-primary font-bold">Open Full Profile</p>
          </div>
        </div>
      </a>

      <section class="bg-surface-container-lowest rounded-3xl p-6 md:p-8 shadow-blue-900/5">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-3xl bg-secondary-container flex items-center justify-center text-on-secondary-container">
              <span class="material-symbols-outlined text-3xl">campaign</span>
            </div>
            <div>
              <h3 class="text-2xl font-manrope font-bold text-on-surface">Announcements</h3>
              <p class="text-sm text-on-surface-variant">Recent classroom notices and updates.</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <span id="annCount" class="inline-flex items-center justify-center min-w-[52px] px-4 py-2 rounded-[2rem] bg-secondary-container/70 text-secondary font-manrope font-bold">--</span>
            <button onclick="navigate('announcements')" class="bg-secondary bg-gradient-to-br from-secondary to-secondary-container px-5 py-2.5 rounded-[2rem] text-white font-bold flex items-center gap-2 shadow-lg shadow-secondary/20 hover:scale-105 transition-transform">
              <span class="material-symbols-outlined text-sm">add</span>
              Create New
            </button>
          </div>
        </div>
        <div id="dashAnnouncements" class="space-y-4">
          <div class="flex items-center justify-center py-8">
            <div class="spinner"></div>
          </div>
        </div>
      </section>

      <section class="bg-gradient-to-br from-surface-container-lowest via-sky-50/40 to-primary-fixed/30 rounded-[2rem] p-6 md:p-8 border border-primary/10 shadow-[0_18px_50px_rgba(59,130,246,0.10)]">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-[1.5rem] bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
              <span class="material-symbols-outlined text-3xl">cloud_upload</span>
            </div>
            <div>
              <h3 class="text-2xl font-manrope font-bold text-on-surface">Materials</h3>
              <p class="text-sm text-on-surface-variant">Study resources arranged in a cleaner classroom library view.</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <span id="teacherMaterialCount" class="inline-flex items-center justify-center min-w-[52px] px-4 py-2 rounded-[2rem] bg-primary-fixed text-primary font-manrope font-bold">--</span>
            <button onclick="navigate('materials')" class="bg-gradient-to-r from-primary to-primary-container text-white px-5 py-3 rounded-[2rem] font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform">Manage Materials</button>
          </div>
        </div>
        <div id="dashMaterials" class="space-y-3">
          <div class="flex items-center justify-center py-8">
            <div class="spinner"></div>
          </div>
        </div>
      </section>

      <section class="bg-surface-container-lowest rounded-3xl p-6 md:p-8 shadow-blue-900/5">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-3xl bg-primary-fixed flex items-center justify-center text-primary">
              <span class="material-symbols-outlined text-3xl">calendar_today</span>
            </div>
            <div>
              <h3 class="text-2xl font-manrope font-bold text-on-surface">Recent Timetable</h3>
              <p class="text-sm text-on-surface-variant">Latest scheduled classes and time slots.</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <span id="ttCount" class="inline-flex items-center justify-center min-w-[52px] px-4 py-2 rounded-[2rem] bg-primary-fixed text-primary font-manrope font-bold">--</span>
            <button onclick="navigate('timetable')" class="text-primary font-semibold hover:underline decoration-2 underline-offset-4">View Full Timetable</button>
          </div>
        </div>
        <div id="dashTimetable" class="space-y-4">
          <div class="flex items-center justify-center py-12">
            <div class="spinner"></div>
          </div>
        </div>
      </section>
    </div>
    <div id="teacherDashboardPhotoModal" class="fixed inset-0 z-[70] hidden bg-slate-950/70 backdrop-blur-sm p-6">
      <div class="w-full h-full flex items-center justify-center">
        <div class="relative max-w-3xl w-full flex items-center justify-center">
          <button type="button" id="teacherDashboardPhotoClose" class="absolute top-4 right-4 z-10 w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg hover:bg-slate-800 transition-colors border border-white/10">
            <span class="material-symbols-outlined text-[22px]">close</span>
          </button>
          <div class="rounded-[2rem] overflow-hidden bg-white shadow-2xl max-h-[85vh]">
            ${profilePicture
              ? `<img src="${profilePicture}" alt="Profile preview" class="max-h-[85vh] w-auto object-contain" />`
              : `<div class="w-full min-h-[320px] px-12 py-16 flex flex-col items-center justify-center text-primary">
                  <span class="material-symbols-outlined text-[96px]">account_circle</span>
                  <p class="mt-4 text-lg font-semibold">No profile photo uploaded</p>
                </div>`}
          </div>
        </div>
      </div>
    </div>
  </main>
  ${mobileTeacherNav('teacher-dashboard')}
  `;
}

function bindTeacherDashboard() {
  const photoBtn = document.getElementById('teacherDashboardPhotoBtn');
  const modal = document.getElementById('teacherDashboardPhotoModal');
  const closeBtn = document.getElementById('teacherDashboardPhotoClose');

  if (photoBtn && modal) {
    photoBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    });
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
      }
    });
  }
}

async function loadTeacherData() {
  try {
    const [ttRes, annRes, matRes] = await Promise.all([
      fetch(`${API_BASE}/teacher/timetable`, { headers: authHeaders() }),
      fetch(`${API_BASE}/teacher/announcements`, { headers: authHeaders() }),
      fetch(`${API_BASE}/teacher/materials`, { headers: authHeaders() }),
    ]);

    const timetable = ttRes.ok ? await ttRes.json() : [];
    const announcements = annRes.ok ? await annRes.json() : [];
    const materials = matRes.ok ? await matRes.json() : [];
    state.timetable = timetable;
    state.announcements = announcements;
    state.materials = materials;

    const ttCountEl = document.getElementById('ttCount');
    const annCountEl = document.getElementById('annCount');
    const materialCountEl = document.getElementById('teacherMaterialCount');
    if (ttCountEl) ttCountEl.textContent = String(timetable.length).padStart(2, '0');
    if (annCountEl) annCountEl.textContent = String(announcements.length).padStart(2, '0');
    if (materialCountEl) materialCountEl.textContent = String(materials.length).padStart(2, '0');

    const ttEl = document.getElementById('dashTimetable');
    if (timetable.length === 0) {
      ttEl.innerHTML = '<p class="text-on-surface-variant text-center py-8">No timetable entries yet. <a onclick="navigate(\'timetable\')" class="text-primary font-bold cursor-pointer">Create one</a></p>';
    } else {
      ttEl.innerHTML = timetable.slice(0, 3).map((t) => {
        const slotTime = t.startTime ? `${t.startTime} ${t.startPeriod || ''}` : (t.time || '--');
        const roomLabel = t.roomNumber || t.location || 'TBD';
        const teacherLabel = t.teacherName || t.instructor || '';
        return `
        <div class="flex flex-col md:flex-row gap-6 md:items-center p-5 rounded-3xl bg-surface-container-low border border-outline-variant/10">
          <div class="flex flex-col items-center justify-center min-w-[92px] rounded-2xl bg-surface-container-lowest border border-outline-variant/10 px-4 py-3">
            <span class="text-lg font-bold text-primary text-center">${slotTime}</span>
            <span class="text-xs text-on-surface-variant uppercase tracking-[0.2em] mt-1">${t.day || ''}</span>
          </div>
          <div class="flex-1">
            <h4 class="text-lg font-bold font-manrope text-on-surface">${t.subject || '--'}</h4>
            <p class="text-on-surface-variant text-sm mt-1 flex items-center gap-2">
              <span class="material-symbols-outlined text-[16px]">location_on</span>
              ${roomLabel}${teacherLabel ? ` ? ${teacherLabel}` : ''}
            </p>
            <p class="text-xs text-on-surface-variant mt-2">Class ${t.classLevel || '--'} ? Section ${t.section || '--'}</p>
          </div>
        </div>
      `;
      }).join('');
    }

    const annEl = document.getElementById('dashAnnouncements');
    if (announcements.length === 0) {
      annEl.innerHTML = '<p class="text-on-surface-variant text-center py-8">No announcements yet.</p>';
    } else {
      annEl.innerHTML = announcements.slice(0, 4).map((a) => `
        <div class="bg-surface-container-low p-5 rounded-3xl flex flex-col md:flex-row gap-4 md:items-center border border-outline-variant/10">
          <div class="w-12 h-12 ${a.urgency === 'high' ? 'bg-tertiary-fixed text-tertiary' : 'bg-primary-fixed text-primary'} rounded-2xl flex items-center justify-center">
            <span class="material-symbols-outlined">${a.urgency === 'high' ? 'priority_high' : 'info'}</span>
          </div>
          <div class="flex-1">
            <h5 class="font-bold text-on-surface">${a.title}</h5>
            <p class="text-sm text-on-surface-variant line-clamp-2 mt-1">${a.body || ''}</p>
          </div>
          <span class="text-xs font-semibold text-on-surface-variant opacity-40">${timeAgo(a.createdAt)}</span>
        </div>
      `).join('');
    }

    const matEl = document.getElementById('dashMaterials');
    if (materials.length === 0) {
      matEl.innerHTML = '<p class="text-on-surface-variant text-center py-8">No materials uploaded yet. <a onclick="navigate(\'materials\')" class="text-primary font-bold cursor-pointer">Upload one</a></p>';
    } else {
      matEl.innerHTML = materials.slice(0, 4).map((m) => {
        const courseName = m.course || 'General';
        const fileSize = m.size || 'N/A';
        return `
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white rounded-[1.75rem] border border-primary/15 shadow-[0_14px_34px_rgba(148,163,184,0.14)]">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 bg-gradient-to-br from-primary to-primary-container text-white rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-primary/20">
              <span class="material-symbols-outlined">description</span>
            </div>
            <div>
              <h4 class="font-bold text-on-surface text-lg">${m.title || m.filename}</h4>
              <p class="text-xs text-on-surface-variant mt-1">${courseName} ? Class ${m.classLevel || '--'} ? Section ${m.section || '--'}</p>
              <p class="text-xs text-on-surface-variant/70 mt-1">${fileSize} ? Ready to open</p>
            </div>
          </div>
          <a href="${UPLOADS_BASE}/${m.filepath}" target="_blank" class="inline-flex items-center justify-center px-5 py-3 rounded-[2rem] bg-primary-fixed text-primary font-bold hover:scale-105 transition-transform">Open Material</a>
        </div>
      `;
      }).join('');
    }
  } catch (err) {
    console.error('Failed to load teacher data:', err);
  }
}
// ============================================================
//  TIMETABLE PAGE
// ============================================================
function renderTimetable() {
  const isTeacher = state.user?.role === 'teacher';
  const studentAudience = !isTeacher && state.user?.classLevel && state.user?.section
    ? `Class ${state.user.classLevel} • Section ${state.user.section}`
    : 'your section';
  return `
  ${topBar()}
  ${isTeacher ? teacherSidebar('timetable') : ''}
  <main class="${isTeacher ? 'md:ml-72' : ''} pt-24 pb-32 px-6 md:px-12 max-w-7xl mx-auto">
    <header class="mb-10">
      <h2 class="text-4xl font-manrope font-bold text-on-surface tracking-tight mb-2">Smart Timetable ${isTeacher ? 'Generator' : 'Viewer'}</h2>
      <p class="text-on-surface-variant opacity-80">${isTeacher ? 'Create and manage class-wise academic schedules.' : `View the timetable assigned to ${studentAudience}.`}</p>
    </header>
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      ${isTeacher ? `
      <!-- Form Section -->
      <div class="lg:col-span-4 space-y-6">
        <div class="bg-surface-container-lowest p-8 rounded-2xl shadow-blue-900/5 shadow-2xl">
          <h3 id="timetableFormTitle" class="text-xl font-manrope font-bold text-primary mb-6">Add Timetable Entry</h3>
          <form id="timetableForm" class="space-y-5">
            <div class="space-y-1.5">
              <label class="text-sm font-label font-semibold text-on-surface-variant">Subject Name</label>
              <input id="ttSubject" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary focus:bg-white transition-all" placeholder="e.g. Advanced Quantum Mechanics" type="text" required/>
            </div>
            <div class="space-y-1.5">
              <label class="text-sm font-label font-semibold text-on-surface-variant">Teacher Name</label>
              <input id="ttTeacherName" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary focus:bg-white transition-all" placeholder="e.g. Deepti Mam" type="text" required/>
            </div>
            <div class="space-y-1.5">
              <label class="text-sm font-label font-semibold text-on-surface-variant">Room Number</label>
              <input id="ttRoomNumber" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary focus:bg-white transition-all" placeholder="e.g. 402" type="text"/>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="text-sm font-label font-semibold text-on-surface-variant">Class</label>
                <select id="ttClassLevel" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary focus:bg-white transition-all">
                  ${renderClassOptions()}
                </select>
              </div>
              <div class="space-y-1.5">
                <label class="text-sm font-label font-semibold text-on-surface-variant">Section</label>
                <select id="ttSection" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary focus:bg-white transition-all">
                  ${renderSectionOptions()}
                </select>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="text-sm font-label font-semibold text-on-surface-variant">Day</label>
                <select id="ttDay" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary focus:bg-white transition-all">
                  <option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option>
                </select>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="text-sm font-label font-semibold text-on-surface-variant">Start Time</label>
                <div class="grid grid-cols-[1fr_auto] gap-2">
                  <input id="ttStartTime" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary focus:bg-white transition-all" placeholder="09:00" type="text" required/>
                  <select id="ttStartPeriod" class="bg-surface-container-low border-none rounded-xl px-3 py-3 text-on-surface focus:ring-2 focus:ring-primary focus:bg-white transition-all">
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
              <div class="space-y-1.5">
                <label class="text-sm font-label font-semibold text-on-surface-variant">End Time</label>
                <div class="grid grid-cols-[1fr_auto] gap-2">
                  <input id="ttEndTime" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary focus:bg-white transition-all" placeholder="10:00" type="text" required/>
                  <select id="ttEndPeriod" class="bg-surface-container-low border-none rounded-xl px-3 py-3 text-on-surface focus:ring-2 focus:ring-primary focus:bg-white transition-all">
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="flex gap-3">
              <button id="timetableSubmitBtn" type="submit" class="flex-1 bg-gradient-to-br from-primary to-primary-container text-white font-manrope font-bold py-4 rounded-[2rem] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all mt-4 flex items-center justify-center gap-3">
                <span id="timetableSubmitIcon" class="material-symbols-outlined">add</span>
                <span id="timetableSubmitLabel">Add Entry</span>
              </button>
              <button id="timetableCancelEditBtn" type="button" class="hidden mt-4 px-5 py-4 rounded-[2rem] bg-surface-container-low text-on-surface font-bold border border-outline-variant/20 hover:bg-surface-container transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
      ` : ''}
      <!-- Timetable Grid -->
      <div class="${isTeacher ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-6">
        <div class="bg-surface-container-lowest p-8 rounded-2xl shadow-blue-900/5 shadow-2xl">
          <div class="flex justify-between items-end mb-8">
            <div>
              <h3 class="text-xl font-manrope font-bold text-on-surface mb-1">Schedule Entries</h3>
            </div>
          </div>
          <div id="timetableList" class="space-y-4">
            <div class="flex items-center justify-center py-12">
              <div class="spinner"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
  ${isTeacher ? mobileTeacherNav('timetable') : studentBottomNav('student-dashboard')}
  `;
}

function bindTimetable() {
  const form = document.getElementById('timetableForm');
  if (form) {
    const cancelBtn = document.getElementById('timetableCancelEditBtn');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        subject: document.getElementById('ttSubject').value,
        teacherName: document.getElementById('ttTeacherName').value,
        roomNumber: document.getElementById('ttRoomNumber').value,
        classLevel: document.getElementById('ttClassLevel').value,
        section: document.getElementById('ttSection').value,
        day: document.getElementById('ttDay').value,
        startTime: document.getElementById('ttStartTime').value,
        startPeriod: document.getElementById('ttStartPeriod').value,
        endTime: document.getElementById('ttEndTime').value,
        endPeriod: document.getElementById('ttEndPeriod').value,
      };

      try {
        const isEditing = Boolean(state.editingTimetableId);
        const res = await fetch(
          `${API_BASE}/teacher/timetable${isEditing ? `/${state.editingTimetableId}` : ''}`,
          {
          method: isEditing ? 'PUT' : 'POST',
          headers: authHeaders(),
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(isEditing ? 'Failed to update entry' : 'Failed to create entry');
        showToast(isEditing ? 'Timetable entry updated!' : 'Timetable entry created!', 'success');
        resetTimetableForm();
        await loadTimetableData();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        resetTimetableForm();
      });
    }
  }
}

function populateTimetableForm(entryId) {
  const entry = state.timetable.find((item) => item._id === entryId);
  if (!entry) return;

  state.editingTimetableId = entryId;
  document.getElementById('ttSubject').value = entry.subject || '';
  document.getElementById('ttTeacherName').value = entry.teacherName || entry.instructor || '';
  document.getElementById('ttRoomNumber').value = entry.roomNumber || entry.location || '';
  document.getElementById('ttClassLevel').value = entry.classLevel || '1';
  document.getElementById('ttSection').value = entry.section || 'A';
  document.getElementById('ttDay').value = entry.day || 'Monday';
  document.getElementById('ttStartTime').value = entry.startTime || '';
  document.getElementById('ttStartPeriod').value = entry.startPeriod || 'AM';
  document.getElementById('ttEndTime').value = entry.endTime || '';
  document.getElementById('ttEndPeriod').value = entry.endPeriod || 'AM';

  const title = document.getElementById('timetableFormTitle');
  const submitLabel = document.getElementById('timetableSubmitLabel');
  const submitIcon = document.getElementById('timetableSubmitIcon');
  const cancelBtn = document.getElementById('timetableCancelEditBtn');
  if (title) title.textContent = 'Edit Timetable Entry';
  if (submitLabel) submitLabel.textContent = 'Update Entry';
  if (submitIcon) submitIcon.textContent = 'edit';
  if (cancelBtn) cancelBtn.classList.remove('hidden');

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetTimetableForm() {
  state.editingTimetableId = null;
  const form = document.getElementById('timetableForm');
  const title = document.getElementById('timetableFormTitle');
  const submitLabel = document.getElementById('timetableSubmitLabel');
  const submitIcon = document.getElementById('timetableSubmitIcon');
  const cancelBtn = document.getElementById('timetableCancelEditBtn');

  if (form) form.reset();
  if (title) title.textContent = 'Add Timetable Entry';
  if (submitLabel) submitLabel.textContent = 'Add Entry';
  if (submitIcon) submitIcon.textContent = 'add';
  if (cancelBtn) cancelBtn.classList.add('hidden');

  const classLevel = document.getElementById('ttClassLevel');
  const section = document.getElementById('ttSection');
  const day = document.getElementById('ttDay');
  const startPeriod = document.getElementById('ttStartPeriod');
  const endPeriod = document.getElementById('ttEndPeriod');
  if (classLevel) classLevel.value = '1';
  if (section) section.value = 'A';
  if (day) day.value = 'Monday';
  if (startPeriod) startPeriod.value = 'AM';
  if (endPeriod) endPeriod.value = 'AM';
}

async function loadTimetableData() {
  try {
    const endpoint = state.user?.role === 'teacher' ? '/teacher/timetable' : '/student/timetable';
    const res = await fetch(freshApiUrl(endpoint), { headers: authHeaders(), cache: 'no-store' });
    const data = res.ok ? await res.json() : [];
    state.timetable = data;

    const el = document.getElementById('timetableList');
    if (data.length === 0) {
      el.innerHTML = '<p class="text-on-surface-variant text-center py-12">No timetable entries yet.</p>';
    } else {
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const colors = ['primary', 'secondary', 'tertiary', 'primary', 'secondary'];

      el.innerHTML = days.map((day, i) => {
        const dayEntries = data.filter(t => t.day === day);
        if (dayEntries.length === 0) return '';
        const renderDayEntries = dayEntries.map(t => {
          if (state.user?.role === 'teacher') {
            return `
              <div class="flex items-center gap-4 p-4 bg-surface-container-low rounded-2xl border-l-4 border-${colors[i]}">
                <div class="min-w-[60px] text-center">
                  <span class="text-sm font-bold text-${colors[i]}">${t.startTime ? `${t.startTime} ${t.startPeriod || ''}` : (t.time || '--')}</span>
                  <p class="text-[10px] text-on-surface-variant">${t.endTime ? `${t.endTime} ${t.endPeriod || ''}` : `${t.duration || 60} min`}</p>
                </div>
                <div class="flex-1">
                  <h5 class="font-bold text-on-surface">${t.subject}</h5>
                  <div class="mt-2">${renderAudienceBadge(t)}</div>
                  <p class="text-xs text-on-surface-variant">${t.roomNumber || t.location || 'TBD'} ? ${t.teacherName || t.instructor || ''}</p>
                </div>
                <button onclick="populateTimetableForm('${t._id}')" class="p-2 rounded-full hover:bg-primary/10 text-slate-400 hover:text-primary transition-colors" title="Edit entry">
                  <span class="material-symbols-outlined text-sm">edit</span>
                </button>
                <button onclick="deleteTimetable('${t._id}')" class="p-2 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" title="Delete entry">
                  <span class="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            `;
          }

          return `
            <div class="flex flex-col xl:flex-row xl:items-center gap-5 p-5 bg-surface-container-low rounded-[1.75rem] border border-outline-variant/10 border-l-[5px] border-${colors[i]}">
              <div class="flex-1 grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
                <div class="bg-surface-container-lowest rounded-2xl px-4 py-3 border border-outline-variant/10">
                  <p class="text-base md:text-lg font-bold text-${colors[i]}">${t.startTime ? `${t.startTime} ${t.startPeriod || ''}` : (t.time || '--')}</p>
                  <p class="text-[11px] uppercase tracking-[0.2em] text-on-surface-variant mt-2">Start Time</p>
                </div>
                <div class="bg-surface-container-lowest rounded-2xl px-4 py-3 border border-outline-variant/10">
                  <p class="text-base md:text-lg font-bold text-on-surface">${t.endTime ? `${t.endTime} ${t.endPeriod || ''}` : `${t.duration || 60} min`}</p>
                  <p class="text-[11px] uppercase tracking-[0.2em] text-on-surface-variant mt-2">End Time</p>
                </div>
                <div class="bg-surface-container-lowest rounded-2xl px-4 py-3 border border-outline-variant/10">
                  <p class="text-base md:text-lg font-bold text-on-surface break-words">${t.subject || '--'}</p>
                  <p class="text-[11px] uppercase tracking-[0.2em] text-on-surface-variant mt-2">Subject</p>
                </div>
                <div class="bg-surface-container-lowest rounded-2xl px-4 py-3 border border-outline-variant/10">
                  <p class="text-base md:text-lg font-bold text-on-surface">${t.classLevel || '--'}</p>
                  <p class="text-[11px] uppercase tracking-[0.2em] text-on-surface-variant mt-2">Class</p>
                </div>
                <div class="bg-surface-container-lowest rounded-2xl px-4 py-3 border border-outline-variant/10">
                  <p class="text-base md:text-lg font-bold text-on-surface">${t.section || '--'}</p>
                  <p class="text-[11px] uppercase tracking-[0.2em] text-on-surface-variant mt-2">Section</p>
                </div>
                <div class="bg-surface-container-lowest rounded-2xl px-4 py-3 border border-outline-variant/10">
                  <p class="text-base md:text-lg font-bold text-on-surface break-words">${t.teacherName || t.instructor || '--'}</p>
                  <p class="text-[11px] uppercase tracking-[0.2em] text-on-surface-variant mt-2">Teacher Name</p>
                </div>
                <div class="bg-surface-container-lowest rounded-2xl px-4 py-3 border border-outline-variant/10">
                  <p class="text-base md:text-lg font-bold text-on-surface">${t.roomNumber || t.location || 'TBD'}</p>
                  <p class="text-[11px] uppercase tracking-[0.2em] text-on-surface-variant mt-2">Room No.</p>
                </div>
              </div>
            </div>
          `;
        }).join('');

        return `
          <div class="mb-6">
            <h4 class="text-sm font-bold font-manrope uppercase tracking-widest text-on-surface-variant mb-3">${day}</h4>
            ${renderDayEntries}
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Failed to load timetable:', err);
  }
}

async function deleteTimetable(id) {
  if (!confirm('Delete this timetable entry?')) return;
  try {
    await fetch(`${API_BASE}/teacher/timetable/${id}`, { method: 'DELETE', headers: authHeaders() });
    showToast('Entry deleted', 'info');
    await loadTimetableData();
  } catch (err) {
    showToast('Failed to delete', 'error');
  }
}

// ============================================================
//  ANNOUNCEMENTS PAGE
// ============================================================
function renderAnnouncements() {
  const isTeacher = state.user?.role === 'teacher';
  const studentAudience = !isTeacher && state.user?.classLevel && state.user?.section
    ? `Class ${state.user.classLevel} • Section ${state.user.section}`
    : 'your class';
  return `
  ${topBar()}
  ${isTeacher ? teacherSidebar('announcements') : ''}
  <main class="${isTeacher ? 'md:ml-72' : ''} pt-24 pb-32 px-6 md:px-12 max-w-7xl mx-auto">
    <header class="mb-10">
      <h2 class="text-4xl font-manrope font-bold text-on-surface tracking-tight mb-2">Announcements</h2>
      <p class="text-on-surface-variant opacity-80">${isTeacher ? 'Create and manage class and section announcements.' : `Stay updated with the latest news for ${studentAudience}.`}</p>
    </header>
    ${isTeacher ? `
    <div class="bg-surface-container-lowest p-8 rounded-2xl shadow-2xl shadow-blue-900/5 mb-8">
      <h3 class="text-xl font-manrope font-bold text-primary mb-6">Create Announcement</h3>
      <form id="annForm" class="space-y-5">
        <div class="space-y-1.5">
          <label class="text-sm font-label font-semibold text-on-surface-variant">Title</label>
          <input id="annTitle" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary focus:bg-white transition-all" placeholder="Announcement title" required/>
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-label font-semibold text-on-surface-variant">Body</label>
          <textarea id="annBody" rows="3" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary focus:bg-white transition-all resize-none" placeholder="Announcement details..."></textarea>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="text-sm font-label font-semibold text-on-surface-variant">Class</label>
            <select id="annClassLevel" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary focus:bg-white transition-all">
              ${renderClassOptions()}
            </select>
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-label font-semibold text-on-surface-variant">Section</label>
            <select id="annSection" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary focus:bg-white transition-all">
              ${renderSectionOptions()}
            </select>
          </div>
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-label font-semibold text-on-surface-variant">Urgency</label>
          <select id="annUrgency" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary focus:bg-white transition-all">
            <option value="normal">Normal</option>
            <option value="high">High Priority</option>
          </select>
        </div>
        <button type="submit" class="bg-secondary bg-gradient-to-br from-secondary to-secondary-container px-8 py-3 rounded-[2rem] text-white font-bold flex items-center gap-2 shadow-lg shadow-secondary/20 hover:scale-105 transition-transform">
          <span class="material-symbols-outlined">send</span>
          Publish
        </button>
      </form>
    </div>
    ` : ''}
    <div id="annList" class="space-y-4">
      <div class="flex items-center justify-center py-12">
        <div class="spinner"></div>
      </div>
    </div>
  </main>
  ${isTeacher ? mobileTeacherNav('announcements') : studentBottomNav('student-dashboard')}
  `;
}

function bindAnnouncements() {
  const form = document.getElementById('annForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const res = await fetch(`${API_BASE}/teacher/announcements`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            title: document.getElementById('annTitle').value,
            body: document.getElementById('annBody').value,
            classLevel: document.getElementById('annClassLevel').value,
            section: document.getElementById('annSection').value,
            urgency: document.getElementById('annUrgency').value,
          }),
        });
        if (!res.ok) throw new Error('Failed to create announcement');
        showToast('Announcement published!', 'success');
        form.reset();
        await loadAnnouncementData();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
}

async function loadAnnouncementData() {
  try {
    const endpoint = state.user?.role === 'teacher' ? '/teacher/announcements' : '/student/announcements';
    const res = await fetch(freshApiUrl(endpoint), { headers: authHeaders(), cache: 'no-store' });
    const data = res.ok ? await res.json() : [];
    state.announcements = data;

    const el = document.getElementById('annList');
    if (data.length === 0) {
      el.innerHTML = '<p class="text-on-surface-variant text-center py-12">No announcements yet.</p>';
    } else {
      el.innerHTML = data.map(a => `
        <div class="bg-surface-container-lowest p-6 rounded-2xl flex gap-4 items-start shadow-sm">
          <div class="w-12 h-12 ${a.urgency === 'high' ? 'bg-tertiary-fixed text-tertiary' : 'bg-primary-fixed text-primary'} rounded-full flex items-center justify-center flex-shrink-0">
            <span class="material-symbols-outlined">${a.urgency === 'high' ? 'priority_high' : 'info'}</span>
          </div>
          <div class="flex-1">
            <div class="flex items-start justify-between gap-4">
              <div>
                <h5 class="font-bold text-on-surface text-lg">${a.title}</h5>
                <p class="text-sm text-on-surface-variant mt-1">${a.body || ''}</p>
                <div class="mt-3">${renderAudienceBadge(a)}</div>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <span class="text-xs font-semibold text-on-surface-variant opacity-40">${timeAgo(a.createdAt)}</span>
                ${state.user?.role === 'teacher' ? `
                <button onclick="deleteAnnouncement('${a._id}')" class="p-1 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                  <span class="material-symbols-outlined text-sm">delete</span>
                </button>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Failed to load announcements:', err);
  }
}

async function deleteAnnouncement(id) {
  if (!confirm('Delete this announcement?')) return;
  try {
    await fetch(`${API_BASE}/teacher/announcements/${id}`, { method: 'DELETE', headers: authHeaders() });
    showToast('Announcement deleted', 'info');
    await loadAnnouncementData();
  } catch (err) {
    showToast('Failed to delete', 'error');
  }
}

// ============================================================
//  MATERIALS PAGE
// ============================================================
function renderMaterials() {
  const isTeacher = state.user?.role === 'teacher';
  const studentAudience = !isTeacher && state.user?.classLevel && state.user?.section
    ? `Class ${state.user.classLevel} • Section ${state.user.section}`
    : 'your class';
  return `
  ${topBar()}
  ${isTeacher ? teacherSidebar('materials') : ''}
  <main class="${isTeacher ? 'md:ml-72' : ''} pt-24 pb-32 px-6 md:px-12 max-w-7xl mx-auto">
    <header class="mb-10">
      <h2 class="text-4xl font-manrope font-bold text-on-surface tracking-tight mb-2">Study Materials</h2>
      <p class="text-on-surface-variant opacity-80">${isTeacher ? 'Upload and manage class-wise study materials (PDFs).' : `Access and download shared study resources for ${studentAudience}.`}</p>
    </header>
    ${isTeacher ? `
    <div class="bg-surface-container-lowest p-8 rounded-2xl shadow-2xl shadow-blue-900/5 mb-8">
      <h3 class="text-xl font-manrope font-bold text-primary mb-6">Upload Material</h3>
      <form id="matForm" class="space-y-5" enctype="multipart/form-data">
        <div class="space-y-1.5">
          <label class="text-sm font-label font-semibold text-on-surface-variant">Title</label>
          <input id="matTitle" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary focus:bg-white transition-all" placeholder="Material title"/>
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-label font-semibold text-on-surface-variant">Course</label>
          <input id="matCourse" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary focus:bg-white transition-all" placeholder="e.g. Applied Mathematics"/>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="text-sm font-label font-semibold text-on-surface-variant">Class</label>
            <select id="matClassLevel" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary focus:bg-white transition-all">
              ${renderClassOptions()}
            </select>
          </div>
          <div class="space-y-1.5">
            <label class="text-sm font-label font-semibold text-on-surface-variant">Section</label>
            <select id="matSection" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary focus:bg-white transition-all">
              ${renderSectionOptions()}
            </select>
          </div>
        </div>
        <div class="space-y-1.5">
          <label class="text-sm font-label font-semibold text-on-surface-variant">PDF File</label>
          <input id="matFile" type="file" accept=".pdf" required class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:font-bold file:bg-primary file:text-white hover:file:bg-primary-container transition-all"/>
        </div>
        <button type="submit" class="bg-gradient-to-br from-primary to-primary-container px-8 py-3 rounded-[2rem] text-white font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
          <span class="material-symbols-outlined">cloud_upload</span>
          Upload
        </button>
      </form>
    </div>
    ` : ''}
    <div id="matList" class="space-y-3">
      <div class="flex items-center justify-center py-12">
        <div class="spinner"></div>
      </div>
    </div>
  </main>
  ${isTeacher ? mobileTeacherNav('materials') : studentBottomNav('materials')}
  `;
}

function bindMaterials() {
  const form = document.getElementById('matForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData();
      formData.append('title', document.getElementById('matTitle').value);
      formData.append('course', document.getElementById('matCourse').value);
      formData.append('classLevel', document.getElementById('matClassLevel').value);
      formData.append('section', document.getElementById('matSection').value);
      formData.append('pdf', document.getElementById('matFile').files[0]);

      try {
        const res = await fetch(`${API_BASE}/teacher/materials`, {
          method: 'POST',
          headers: { 'x-auth-token': state.token },
          body: formData,
        });
        if (!res.ok) throw new Error('Failed to upload');
        showToast('Material uploaded!', 'success');
        form.reset();
        await loadMaterialsData();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
}

async function loadMaterialsData() {
  try {
    const endpoint = state.user?.role === 'teacher' ? '/teacher/materials' : '/student/materials';
    const res = await fetch(freshApiUrl(endpoint), { headers: authHeaders(), cache: 'no-store' });
    const data = res.ok ? await res.json() : [];
    state.materials = data;

    const el = document.getElementById('matList');
    if (data.length === 0) {
      el.innerHTML = '<p class="text-on-surface-variant text-center py-12">No materials uploaded yet.</p>';
    } else {
      el.innerHTML = data.map(m => `
        <div class="flex items-center justify-between p-4 bg-surface-container-lowest rounded-2xl group hover:bg-blue-50/50 transition-colors">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
              <span class="material-symbols-outlined">description</span>
            </div>
            <div>
              <h4 class="font-bold text-on-surface">${m.title || m.filename}</h4>
              <div class="mt-2">${renderAudienceBadge(m)}</div>
              <p class="text-xs text-on-surface-variant">${m.course || 'General'} • ${m.size || 'N/A'}</p>
            </div>
          </div>
          <div class="flex gap-2">
            <a href="${UPLOADS_BASE}/${m.filepath}" target="_blank" class="p-2 rounded-full hover:bg-primary/10 text-primary transition-colors">
              <span class="material-symbols-outlined">download</span>
            </a>
            ${state.user?.role === 'teacher' ? `
            <button onclick="deleteMaterial('${m._id}')" class="p-2 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
              <span class="material-symbols-outlined text-sm">delete</span>
            </button>
            ` : ''}
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Failed to load materials:', err);
  }
}

async function deleteMaterial(id) {
  if (!confirm('Delete this material?')) return;
  try {
    await fetch(`${API_BASE}/teacher/materials/${id}`, { method: 'DELETE', headers: authHeaders() });
    showToast('Material deleted', 'info');
    await loadMaterialsData();
  } catch (err) {
    showToast('Failed to delete', 'error');
  }
}

// ============================================================
//  STUDENT DASHBOARD
// ============================================================
function renderStudentDashboard() {
  const profilePicture = state.user?.profilePicture
    ? `${UPLOADS_BASE}/${state.user.profilePicture}`
    : '';

  return `
  ${topBar()}
  ${studentSidebar('student-dashboard')}
  <main class="max-w-7xl mx-auto px-6 pt-24 pb-32 md:ml-72">
    <section class="mb-10">
      <h2 class="text-4xl font-manrope font-extrabold text-on-surface tracking-tight">Welcome back, ${state.user?.name || 'Student'}</h2>
      <p class="text-on-surface-variant mt-2 opacity-70">Your academic journey is on track and your classroom updates are ready.</p>
    </section>
    <div class="space-y-6">
      <a onclick="navigate('profile')" class="block bg-surface-container-lowest rounded-3xl p-6 md:p-8 shadow-blue-900/5 cursor-pointer hover:scale-[1.01] transition-transform">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div class="flex flex-col items-start gap-4 md:flex-row md:items-start md:gap-5">
            ${profilePicture ? `
              <img src="${profilePicture}" alt="Profile picture" class="w-16 h-16 md:w-20 md:h-20 rounded-[1.4rem] object-cover shadow-lg shadow-primary/10 border border-primary/10"/>
            ` : `
              <div class="w-16 h-16 md:w-20 md:h-20 rounded-[1.4rem] bg-primary-fixed flex items-center justify-center text-primary shadow-lg shadow-primary/10">
                <span class="material-symbols-outlined text-4xl md:text-5xl">account_circle</span>
              </div>
            `}
            <div class="pt-1">
              <p class="text-xs uppercase tracking-[0.25em] text-on-surface-variant/60 font-semibold mb-2">Profile</p>
              <h3 class="text-2xl md:text-3xl font-manrope font-bold text-on-surface">${state.user?.name || 'Student'}</h3>
              <p class="text-sm text-on-surface-variant mt-2">${state.user?.email || 'No email found'}</p>
              <p class="text-sm text-on-surface-variant mt-1">Class ${state.user?.classLevel || '--'} • Section ${state.user?.section || '--'}</p>
              <div class="mt-4">
                <span class="inline-flex items-center px-5 py-2 rounded-[1.25rem] bg-primary-fixed text-primary font-semibold">Student Account</span>
              </div>
            </div>
          </div>
          <div class="text-left md:text-right">
            <p class="text-xs uppercase tracking-[0.25em] text-on-surface-variant/60 font-semibold mb-3">Profile Center</p>
            <p class="text-sm text-primary font-semibold">Open Full Profile</p>
          </div>
        </div>
      </a>


      <section class="bg-surface-container-lowest rounded-3xl p-6 md:p-8 shadow-blue-900/5">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-3xl bg-secondary-container flex items-center justify-center text-on-secondary-container">
              <span class="material-symbols-outlined text-3xl">campaign</span>
            </div>
            <div>
              <h3 class="text-2xl font-manrope font-bold text-on-surface">Announcements</h3>
              <p class="text-sm text-on-surface-variant">Recent classroom notices and updates.</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <span id="studentAnnouncementCount" class="inline-flex items-center justify-center min-w-[52px] px-4 py-2 rounded-[2rem] bg-secondary-container/70 text-secondary font-manrope font-bold">00</span>
            <button onclick="navigate('announcements')" class="bg-secondary bg-gradient-to-br from-secondary to-secondary-container px-5 py-2.5 rounded-[2rem] text-white font-bold flex items-center gap-2 shadow-lg shadow-secondary/20 hover:scale-105 transition-transform">
              <span class="material-symbols-outlined text-sm">visibility</span>
              View All
            </button>
          </div>
        </div>
        <div id="studentAnnouncements" class="space-y-4">
          <div class="flex items-center justify-center py-8 w-full">
            <div class="spinner"></div>
          </div>
        </div>
      </section>

      <section class="bg-surface-container-lowest rounded-3xl p-6 md:p-8 border border-primary/10 shadow-[0_18px_50px_rgba(59,130,246,0.08)]">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-3xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
              <span class="material-symbols-outlined text-3xl">description</span>
            </div>
            <div>
              <h3 class="text-2xl font-manrope font-bold text-on-surface">Materials</h3>
              <p class="text-sm text-on-surface-variant">Study resources arranged in a cleaner classroom library view.</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <span id="studentMaterialCount" class="inline-flex items-center justify-center min-w-[52px] px-4 py-2 rounded-[2rem] bg-primary-fixed text-primary font-manrope font-bold">00</span>
            <button onclick="navigate('materials')" class="bg-primary bg-gradient-to-br from-primary to-primary-container px-5 py-2.5 rounded-[2rem] text-white font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
              <span class="material-symbols-outlined text-sm">folder_open</span>
              Manage Materials
            </button>
          </div>
        </div>
        <div class="rounded-[2rem] border border-primary/10 bg-primary-fixed/20 p-4 md:p-5">
          <div id="studentMaterials" class="space-y-3">
            <div class="flex items-center justify-center py-8">
              <div class="spinner"></div>
            </div>
          </div>
        </div>
      </section>

      <section class="bg-surface-container-lowest rounded-3xl p-6 md:p-8 shadow-blue-900/5">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-3xl bg-primary-fixed flex items-center justify-center text-primary">
              <span class="material-symbols-outlined text-3xl">calendar_today</span>
            </div>
            <div>
              <h3 class="text-2xl font-manrope font-bold text-on-surface">Recent Timetable</h3>
              <p class="text-sm text-on-surface-variant">Latest scheduled classes and time slots.</p>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <span id="studentScheduleCount" class="inline-flex items-center justify-center min-w-[52px] px-4 py-2 rounded-[2rem] bg-primary-fixed text-primary font-manrope font-bold">00</span>
            <button onclick="navigate('timetable')" class="text-primary font-semibold hover:underline decoration-2 underline-offset-4">View Full Timetable</button>
          </div>
        </div>
        <div id="studentSchedule" class="space-y-4 min-h-[240px] flex flex-col justify-center">
          <div class="flex items-center justify-center py-8">
            <div class="spinner"></div>
          </div>
        </div>
      </section>
    </div>
  </main>
  ${studentBottomNav('student-dashboard')}
  `;
}

function bindStudentDashboard() {}

function renderNotificationsPage() {
  return `
  ${topBar()}
  
  <main class="max-w-7xl mx-auto px-6 pt-24 pb-32 md:ml-72">
    <section class="mb-10">
      <h2 class="text-4xl font-manrope font-extrabold text-on-surface tracking-tight">Notifications Center</h2>
      <p class="text-on-surface-variant mt-2 opacity-70">New announcement, material upload, and class change alerts in one place.</p>
    </section>
    <section class="bg-surface-container-lowest rounded-3xl p-6 md:p-8 border border-secondary-container/20 shadow-[0_18px_50px_rgba(16,185,129,0.08)]">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-3xl bg-secondary text-white flex items-center justify-center shadow-lg shadow-secondary/20">
            <span class="material-symbols-outlined text-3xl">notifications_active</span>
          </div>
          <div>
            <h3 class="text-2xl font-manrope font-bold text-on-surface">Latest Notifications</h3>
            <p class="text-sm text-on-surface-variant">Announcements, study material uploads, and class schedule changes.</p>
          </div>
        </div>
        <span id="studentNotificationCount" class="inline-flex items-center justify-center min-w-[52px] px-4 py-2 rounded-[2rem] bg-secondary-container/70 text-secondary font-manrope font-bold">00</span>
      </div>
      <div id="studentNotifications" class="space-y-3">
        <div class="flex items-center justify-center py-8 w-full">
          <div class="spinner"></div>
        </div>
      </div>
    </section>
  </main>
  
  `;
}

function bindNotificationsPage() {}

function summarizeMarks(marks) {
  if (!marks.length) {
    return {
      average: 0,
      highest: 0,
      exams: 0,
      bestSubject: 'N/A',
      subjects: [],
    };
  }

  const enriched = marks.map(mark => ({
    ...mark,
    percentage: Math.round((Number(mark.score) / Number(mark.maxScore || 100)) * 100),
  }));

  const average = Math.round(
    enriched.reduce((sum, mark) => sum + mark.percentage, 0) / enriched.length
  );
  const highest = Math.max(...enriched.map(mark => mark.percentage));

  const subjectMap = new Map();
  enriched.forEach(mark => {
    if (!subjectMap.has(mark.subject)) subjectMap.set(mark.subject, []);
    subjectMap.get(mark.subject).push(mark.percentage);
  });

  const subjects = [...subjectMap.entries()]
    .map(([subject, values]) => ({
      subject,
      average: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
      attempts: values.length,
    }))
    .sort((a, b) => b.average - a.average);

  return {
    average,
    highest,
    exams: enriched.length,
    bestSubject: subjects[0]?.subject || 'N/A',
    subjects,
  };
}

function summarizeAttendance(attendance) {
  if (!attendance.length) {
    return { total: 0, present: 0, absent: 0, late: 0, rate: 0 };
  }

  const present = attendance.filter((entry) => entry.status === 'present').length;
  const absent = attendance.filter((entry) => entry.status === 'absent').length;
  const late = attendance.filter((entry) => entry.status === 'late').length;
  const effectivePresent = present + (late * 0.5);
  const rate = Math.round((effectivePresent / attendance.length) * 100);

  return {
    total: attendance.length,
    present,
    absent,
    late,
    rate,
  };
}

function groupAttendanceBySubject(attendance) {
  const grouped = attendance.reduce((acc, entry) => {
    const subject = entry.subject || 'General';
    if (!acc[subject]) acc[subject] = [];
    acc[subject].push(entry);
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([subject, records]) => ({
      subject,
      records: records.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
      summary: summarizeAttendance(records),
    }))
    .sort((a, b) => a.subject.localeCompare(b.subject));
}

function navigateStudentAttendanceSubject(encodedSubject) {
  const subject = decodeURIComponent(encodedSubject || 'General');
  state.selectedAttendanceSubject = subject;
  navigate(`attendance-subject/${encodeURIComponent(subject)}`);
}

function getSelectedAttendanceSubject() {
  const routeSubject = state.currentPage.startsWith('attendance-subject/')
    ? state.currentPage.slice('attendance-subject/'.length)
    : '';
  return routeSubject ? decodeURIComponent(routeSubject) : (state.selectedAttendanceSubject || 'General');
}

function renderMarksPage() {
  const isTeacher = state.user?.role === 'teacher';
  const marks = state.marks || [];
  const summary = summarizeMarks(marks);
  const activeMarksFilter = state.studentMarksFilter || 'all';

  if (isTeacher) {
    return `
    ${topBar()}
    ${teacherSidebar('marks')}
    <main class="max-w-7xl mx-auto px-6 pt-24 pb-32 md:ml-72">
      <section class="mb-10">
        <h2 class="text-3xl md:text-5xl font-manrope font-bold text-on-surface mb-2">Marks Management</h2>
        <p class="text-on-surface-variant text-lg">Add quiz, test, and exam scores for students.</p>
      </section>
      <div class="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div class="xl:col-span-5 bg-surface-container-lowest rounded-3xl p-8 shadow-sm">
          <div class="flex items-center justify-between gap-4 mb-6">
            <h3 id="markFormTitle" class="text-2xl font-manrope font-bold text-on-surface">Add New Mark</h3>
            <button id="markCancelEditBtn" type="button" class="hidden px-4 py-2 rounded-full bg-surface-container-low text-on-surface-variant font-semibold hover:bg-surface-container-high transition-colors">Cancel</button>
          </div>
          <form id="markForm" class="space-y-4">
            <input id="markStudentName" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary transition-all" placeholder="Student name" required />
            <input id="markStudentEmail" type="email" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary transition-all" placeholder="Student email" required />
            <div class="grid grid-cols-2 gap-4">
              <select id="markClassLevel" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary transition-all">
                ${renderClassOptions()}
              </select>
              <select id="markSection" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary transition-all">
                ${renderSectionOptions()}
              </select>
            </div>
            <input id="markSubject" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary transition-all" placeholder="Subject" required />
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <select id="markExamType" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary transition-all">
                <option value="quiz">Quiz</option>
                <option value="test">Test</option>
                <option value="exam">Exam</option>
              </select>
              <input id="markScore" type="number" min="0" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary transition-all" placeholder="Score" required />
              <input id="markMaxScore" type="number" min="1" value="100" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary transition-all" placeholder="Max score" required />
            </div>
            <textarea id="markRemarks" rows="3" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary transition-all resize-none" placeholder="Remarks (optional)"></textarea>
            <button id="markSubmitBtn" type="submit" class="bg-gradient-to-br from-primary to-primary-container px-8 py-3 rounded-[2rem] text-white font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
              <span id="markSubmitIcon" class="material-symbols-outlined">add_task</span>
              <span id="markSubmitLabel">Save Mark</span>
            </button>
          </form>
        </div>
        <div class="xl:col-span-7 bg-surface-container-lowest rounded-3xl p-8 shadow-sm">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-2xl font-manrope font-bold text-on-surface">Recent Marks</h3>
          <p id="teacherMarksCount" class="text-sm text-on-surface-variant">${marks.length} entries</p>
        </div>
          <div id="teacherMarksList" class="space-y-3">
            <div class="flex items-center justify-center py-8">
              <div class="spinner"></div>
            </div>
          </div>
        </div>
      </div>
    </main>
    ${mobileTeacherNav('marks')}
    `;
  }

  return `
  ${topBar()}
  ${studentSidebar('marks')}
  <main class="max-w-7xl mx-auto px-6 pt-24 pb-32 md:ml-72">
    <section class="mb-10">
      <h2 class="text-3xl md:text-5xl font-manrope font-bold text-on-surface mb-2">Marks & Progress</h2>
      <p class="text-on-surface-variant text-lg">Track your quiz, test, and exam performance in one place.</p>
      <div class="flex flex-wrap gap-3 mt-6">
        ${[
          { key: 'all', label: 'All' },
          { key: 'quiz', label: 'Quiz' },
          { key: 'test', label: 'Test' },
          { key: 'exam', label: 'Exam' },
        ].map((item) => `
          <button
            type="button"
            class="student-marks-filter-btn px-5 py-2.5 rounded-[2rem] font-semibold transition-all ${activeMarksFilter === item.key
              ? 'bg-primary text-white shadow-lg shadow-primary/20'
              : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high'}"
            data-filter="${item.key}"
          >
            ${item.label}
          </button>
        `).join('')}
      </div>
    </section>
    <div class="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <div class="xl:col-span-12 bg-surface-container-low rounded-3xl p-8">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-2xl font-manrope font-bold text-on-surface">Recent Results</h3>
          <span class="text-sm text-on-surface-variant">Latest quiz, test, and exam scores</span>
        </div>
        <div id="studentMarksList" class="space-y-3">
          <div class="flex items-center justify-center py-8">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
      <div class="xl:col-span-4 space-y-6">
        <div class="bg-surface-container-lowest rounded-3xl p-8 shadow-sm">
          <p class="text-xs font-bold tracking-[0.2em] uppercase text-on-surface-variant">Average Score</p>
          <p id="marksAverage" class="text-5xl font-manrope font-extrabold text-primary mt-3">${summary.average}%</p>
        </div>
        <div class="bg-surface-container-lowest rounded-3xl p-8 shadow-sm">
          <p class="text-xs font-bold tracking-[0.2em] uppercase text-on-surface-variant">Best Score</p>
          <p id="marksHighest" class="text-5xl font-manrope font-extrabold text-secondary mt-3">${summary.highest}%</p>
        </div>
        <div class="bg-gradient-to-br from-primary to-primary-container text-white rounded-3xl p-8 shadow-xl shadow-primary/20">
          <p class="text-xs font-bold tracking-[0.2em] uppercase text-white/70">Best Subject</p>
          <h3 id="marksBestSubject" class="text-3xl font-manrope font-bold mt-4">${summary.bestSubject}</h3>
          <p class="mt-3 text-on-primary-container/90 text-sm">Total assessments: <span id="marksExamCount">${summary.exams}</span></p>
        </div>
      </div>
      <div class="xl:col-span-8 bg-surface-container-lowest rounded-3xl p-8 shadow-sm">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-2xl font-manrope font-bold text-on-surface">Subject Progress</h3>
          <span class="text-sm text-on-surface-variant">Performance chart</span>
        </div>
        <div id="marksSubjectChart" class="space-y-5">
          <div class="flex items-center justify-center py-8">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    </div>
  </main>
  ${studentBottomNav('marks')}
  `;
}

function bindMarksPage() {
  if (state.user?.role !== 'teacher') {
    document.querySelectorAll('.student-marks-filter-btn').forEach((button) => {
      button.addEventListener('click', () => {
        state.studentMarksFilter = button.dataset.filter || 'all';
        render();
        loadMarksData();
      });
    });
    return;
  }

  const form = document.getElementById('markForm');
  const cancelBtn = document.getElementById('markCancelEditBtn');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      studentName: document.getElementById('markStudentName').value.trim(),
      studentEmail: document.getElementById('markStudentEmail').value.trim().toLowerCase(),
      classLevel: document.getElementById('markClassLevel').value,
      section: document.getElementById('markSection').value,
      subject: document.getElementById('markSubject').value.trim(),
      examType: document.getElementById('markExamType').value,
      score: Number(document.getElementById('markScore').value),
      maxScore: Number(document.getElementById('markMaxScore').value),
      remarks: document.getElementById('markRemarks').value.trim(),
    };

    try {
      const editing = state.editingMarkId;
      const res = await fetch(`${API_BASE}/teacher/marks${editing ? `/${editing}` : ''}`, {
        method: editing ? 'PUT' : 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${editing ? 'update' : 'save'} mark`);

      showToast(`Mark ${editing ? 'updated' : 'saved'} successfully`, 'success');
      resetMarkForm();
      loadMarksData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  if (cancelBtn) {
    cancelBtn.addEventListener('click', resetMarkForm);
  }
}

async function loadMarksData() {
  const endpoint = state.user?.role === 'teacher' ? '/teacher/marks' : '/student/marks';

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { headers: authHeaders() });
    const marks = res.ok ? await res.json() : [];
    state.marks = marks;

    if (state.user?.role === 'teacher') {
      const teacherList = document.getElementById('teacherMarksList');
      const teacherCount = document.getElementById('teacherMarksCount');
      if (!teacherList) return;
      if (teacherCount) teacherCount.textContent = `${marks.length} entries`;

      if (!marks.length) {
        teacherList.innerHTML = '<p class="text-on-surface-variant text-center py-10">No marks added yet.</p>';
        return;
      }

      teacherList.innerHTML = marks.map(mark => {
        const percentage = Math.round((Number(mark.score) / Number(mark.maxScore || 100)) * 100);
        return `
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-surface-container-low border border-outline-variant/10">
            <div>
              <h4 class="font-manrope font-bold text-on-surface">${mark.studentName} <span class="text-on-surface-variant font-normal">• ${mark.subject}</span></h4>
              <p class="text-sm text-on-surface-variant mt-1">${mark.studentEmail}</p>
              <div class="mt-2">${renderAudienceBadge(mark)}</div>
              <p class="text-xs uppercase tracking-[0.2em] text-primary mt-2">${mark.examType}</p>
            </div>
            <div class="flex items-center gap-4 sm:gap-5">
              <div class="text-right">
                <p class="text-2xl font-manrope font-extrabold text-primary">${mark.score}/${mark.maxScore}</p>
                <p class="text-sm text-on-surface-variant">${percentage}%</p>
              </div>
              <button onclick="populateMarkForm('${mark._id}')" class="p-2 rounded-full hover:bg-primary/10 text-slate-400 hover:text-primary transition-colors" title="Edit mark">
                <span class="material-symbols-outlined text-sm">edit</span>
              </button>
              <button onclick="deleteMark('${mark._id}')" class="p-2 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" title="Delete mark">
                <span class="material-symbols-outlined text-sm">delete</span>
              </button>
            </div>
          </div>
        `;
      }).join('');
      return;
    }

    const summary = summarizeMarks(marks);
    const averageEl = document.getElementById('marksAverage');
    const highestEl = document.getElementById('marksHighest');
    const bestSubjectEl = document.getElementById('marksBestSubject');
    const examCountEl = document.getElementById('marksExamCount');
    if (averageEl) averageEl.textContent = `${summary.average}%`;
    if (highestEl) highestEl.textContent = `${summary.highest}%`;
    if (bestSubjectEl) bestSubjectEl.textContent = summary.bestSubject;
    if (examCountEl) examCountEl.textContent = summary.exams;

    const chartEl = document.getElementById('marksSubjectChart');
    if (chartEl) {
      if (!summary.subjects.length) {
        chartEl.innerHTML = '<p class="text-on-surface-variant text-center py-10">No marks available yet.</p>';
      } else {
        chartEl.innerHTML = summary.subjects.map(subject => `
          <div>
            <div class="flex justify-between items-center mb-2">
              <div>
                <h4 class="font-bold text-on-surface">${subject.subject}</h4>
                <p class="text-xs text-on-surface-variant">${subject.attempts} assessment${subject.attempts > 1 ? 's' : ''}</p>
              </div>
              <span class="text-sm font-bold text-primary">${subject.average}%</span>
            </div>
            <div class="h-4 rounded-full bg-surface-container-low overflow-hidden">
              <div class="h-full rounded-full bg-gradient-to-r from-secondary to-primary" style="width:${subject.average}%"></div>
            </div>
          </div>
        `).join('');
      }
    }

    const studentList = document.getElementById('studentMarksList');
    if (!studentList) return;
    const activeFilter = state.studentMarksFilter || 'all';
    const filteredMarks = marks.filter((mark) => activeFilter === 'all' || mark.examType === activeFilter);

    if (!filteredMarks.length) {
      studentList.innerHTML = `<p class="text-on-surface-variant text-center py-10">No ${activeFilter === 'all' ? '' : `${activeFilter} `}marks uploaded yet.</p>`;
      return;
    }

    studentList.innerHTML = filteredMarks.map(mark => {
      const percentage = Math.round((Number(mark.score) / Number(mark.maxScore || 100)) * 100);
      const pillClass = percentage >= 75
        ? 'bg-green-50 text-green-700'
        : percentage >= 50
          ? 'bg-amber-50 text-amber-700'
          : 'bg-red-50 text-red-700';

      return `
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/10">
          <div>
            <div class="flex items-center gap-3 mb-2">
              <h4 class="font-manrope font-bold text-on-surface">${mark.subject}</h4>
              <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${pillClass}">${mark.examType}</span>
            </div>
            <div class="mb-2">${renderAudienceBadge(mark)}</div>
            <p class="text-sm text-on-surface-variant">${mark.remarks || 'Keep pushing forward. Every assessment is a step toward progress.'}</p>
          </div>
          <div class="md:text-right">
            <p class="text-2xl font-manrope font-extrabold text-primary">${mark.score}/${mark.maxScore}</p>
            <p class="text-sm text-on-surface-variant">${percentage}%</p>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load marks:', err);
  }
}

async function deleteMark(id) {
  if (!confirm('Delete this mark entry?')) return;
  try {
    const res = await fetch(`${API_BASE}/teacher/marks/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete mark');
    showToast('Mark deleted', 'info');
    loadMarksData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function populateMarkForm(id) {
  const mark = (state.marks || []).find((item) => item._id === id);
  if (!mark) return;

  state.editingMarkId = id;
  document.getElementById('markStudentName').value = mark.studentName || '';
  document.getElementById('markStudentEmail').value = mark.studentEmail || '';
  document.getElementById('markClassLevel').value = mark.classLevel || '1';
  document.getElementById('markSection').value = mark.section || 'A';
  document.getElementById('markSubject').value = mark.subject || '';
  document.getElementById('markExamType').value = mark.examType || 'quiz';
  document.getElementById('markScore').value = mark.score ?? '';
  document.getElementById('markMaxScore').value = mark.maxScore ?? 100;
  document.getElementById('markRemarks').value = mark.remarks || '';
  document.getElementById('markFormTitle').textContent = 'Edit Mark';
  document.getElementById('markSubmitIcon').textContent = 'edit_note';
  document.getElementById('markSubmitLabel').textContent = 'Update Mark';
  document.getElementById('markCancelEditBtn').classList.remove('hidden');
}

function resetMarkForm() {
  const form = document.getElementById('markForm');
  if (!form) return;
  state.editingMarkId = null;
  form.reset();
  document.getElementById('markClassLevel').value = '1';
  document.getElementById('markSection').value = 'A';
  document.getElementById('markExamType').value = 'quiz';
  document.getElementById('markMaxScore').value = 100;
  document.getElementById('markFormTitle').textContent = 'Add New Mark';
  document.getElementById('markSubmitIcon').textContent = 'add_task';
  document.getElementById('markSubmitLabel').textContent = 'Save Mark';
  document.getElementById('markCancelEditBtn').classList.add('hidden');
}

function renderAttendancePage() {
  const isTeacher = state.user?.role === 'teacher';
  const attendance = state.attendance || [];
  const summary = summarizeAttendance(attendance);
  const teacherHistorySubjects = [...new Set(attendance.map((entry) => entry.subject).filter(Boolean))].sort();

  if (isTeacher) {
    return `
    ${topBar()}
    ${teacherSidebar('attendance')}
    <main class="max-w-7xl mx-auto px-6 pt-24 pb-32 md:ml-72">
      <section class="mb-10">
        <h2 class="text-3xl md:text-5xl font-manrope font-bold text-on-surface mb-2">Attendance Management</h2>
        <p class="text-on-surface-variant text-lg">Record daily attendance for each class and section.</p>
      </section>
      <div class="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div class="xl:col-span-5 bg-surface-container-lowest rounded-3xl p-8 shadow-sm">
          <div class="mb-6">
            <h3 id="attendanceFormTitle" class="text-2xl font-manrope font-bold text-on-surface">Add Attendance</h3>
            <p class="text-sm text-on-surface-variant mt-2">Select class, section, and date. Then search students and mark everyone present or absent.</p>
          </div>
          <form id="attendanceSearchForm" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <select id="attendanceClassLevel" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary transition-all">
                ${renderClassOptions()}
              </select>
              <select id="attendanceSection" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary transition-all">
                ${renderSectionOptions()}
              </select>
            </div>
            <div class="grid grid-cols-1 gap-4">
              <select id="attendanceSubject" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary transition-all">
                ${getSubjectOptions('1')}
              </select>
            </div>
            <div class="grid grid-cols-1 gap-4">
              <input id="attendanceDate" type="date" class="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary transition-all" required />
            </div>
            <button id="attendanceSearchBtn" type="submit" class="bg-gradient-to-br from-primary to-primary-container px-8 py-3 rounded-[2rem] text-white font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
              <span class="material-symbols-outlined">search</span>
              <span>Search Students</span>
            </button>
          </form>
          <div id="attendanceRosterShell" class="mt-8 hidden">
            <div class="flex items-center justify-between gap-4 mb-4">
              <h4 class="text-lg font-manrope font-bold text-on-surface">Student List</h4>
              <p id="attendanceRosterCount" class="text-sm text-on-surface-variant">0 students</p>
            </div>
            <form id="attendanceBulkForm" class="space-y-4">
              <div id="attendanceRosterList" class="space-y-3"></div>
              <button id="attendanceBulkSubmitBtn" type="submit" class="bg-gradient-to-br from-primary to-primary-container px-8 py-3 rounded-[2rem] text-white font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                <span class="material-symbols-outlined">fact_check</span>
                <span>Submit Attendance</span>
              </button>
            </form>
          </div>
        </div>
        <div class="xl:col-span-7 bg-surface-container-lowest rounded-3xl p-8 shadow-sm">
          <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
            <h3 class="text-2xl font-manrope font-bold text-on-surface">Attendance History</h3>
            <div class="flex flex-col sm:flex-row sm:items-center gap-3">
              <input id="teacherAttendanceDateFilter" type="date" class="bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary transition-all" />
              <select id="teacherAttendanceSubjectFilter" class="bg-surface-container-low border-none rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary transition-all">
                <option value="all">All Subjects</option>
                ${teacherHistorySubjects.map((subject) => `<option value="${subject}">${subject}</option>`).join('')}
              </select>
              <p id="teacherAttendanceCount" class="text-sm text-on-surface-variant whitespace-nowrap">${attendance.length} entries</p>
            </div>
          </div>
          <div id="teacherAttendanceList" class="space-y-3">
            <div class="flex items-center justify-center py-8"><div class="spinner"></div></div>
          </div>
        </div>
      </div>
    </main>
    ${mobileTeacherNav('attendance')}
    `;
  }

  return `
  ${topBar()}
  ${studentSidebar('attendance')}
  <main class="max-w-7xl mx-auto px-6 pt-24 pb-32 md:ml-72">
    <section class="mb-10">
      <h2 class="text-3xl md:text-5xl font-manrope font-bold text-on-surface mb-2">Attendance Overview</h2>
      <p class="text-on-surface-variant text-lg">Track your attendance percentage and daily record.</p>
    </section>
    <div class="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <div class="xl:col-span-4 space-y-6">
        <div class="bg-surface-container-lowest rounded-3xl p-8 shadow-sm">
          <p class="text-xs font-bold tracking-[0.2em] uppercase text-on-surface-variant">Attendance Rate</p>
          <p class="text-5xl font-manrope font-extrabold text-primary mt-3">${summary.rate}%</p>
          <p class="mt-3 text-sm text-on-surface-variant">Total records: ${summary.total}</p>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-surface-container-lowest rounded-3xl p-6 shadow-sm">
            <p class="text-xs font-bold tracking-[0.2em] uppercase text-on-surface-variant">Present</p>
            <p class="text-4xl font-manrope font-extrabold text-secondary mt-3">${summary.present}</p>
          </div>
          <div class="bg-surface-container-lowest rounded-3xl p-6 shadow-sm">
            <p class="text-xs font-bold tracking-[0.2em] uppercase text-on-surface-variant">Absent</p>
            <p class="text-4xl font-manrope font-extrabold text-tertiary mt-3">${summary.absent}</p>
          </div>
        </div>
      </div>
      <div class="xl:col-span-8 bg-surface-container-lowest rounded-3xl p-8 shadow-sm">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-2xl font-manrope font-bold text-on-surface">Subject Attendance</h3>
        </div>
        <div id="studentAttendanceList" class="space-y-3">
          <div class="flex items-center justify-center py-8"><div class="spinner"></div></div>
        </div>
      </div>
    </div>
  </main>
  ${studentBottomNav('attendance')}
  `;
}

function bindAttendancePage() {
  if (state.user?.role === 'teacher') {
    const searchForm = document.getElementById('attendanceSearchForm');
    const bulkForm = document.getElementById('attendanceBulkForm');
    const classLevelSelect = document.getElementById('attendanceClassLevel');
    const teacherSubjectFilter = document.getElementById('teacherAttendanceSubjectFilter');
    const teacherDateFilter = document.getElementById('teacherAttendanceDateFilter');
    if (!searchForm) return;

    document.getElementById('attendanceDate').value = getTodayLocalDate();
    loadSubjectsByClass().then(() => syncAttendanceSubjectOptions());

    if (classLevelSelect) {
      classLevelSelect.addEventListener('change', syncAttendanceSubjectOptions);
    }

    searchForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await searchAttendanceStudents();
    });

    if (bulkForm) {
      bulkForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitBulkAttendance();
      });
    }

    if (teacherSubjectFilter) {
      teacherSubjectFilter.addEventListener('change', renderTeacherAttendanceHistory);
    }
    if (teacherDateFilter) {
      teacherDateFilter.addEventListener('change', renderTeacherAttendanceHistory);
    }
    return;
  }

  renderStudentAttendanceHistory();
}

async function searchAttendanceStudents() {
  const classLevel = document.getElementById('attendanceClassLevel')?.value;
  const section = document.getElementById('attendanceSection')?.value;
  const subject = document.getElementById('attendanceSubject')?.value;
  const date = document.getElementById('attendanceDate')?.value;
  const rosterShell = document.getElementById('attendanceRosterShell');
  const rosterList = document.getElementById('attendanceRosterList');
  const rosterCount = document.getElementById('attendanceRosterCount');

  if (!classLevel || !section || !subject || !date) {
    showToast('Please select class, section, subject, and date first', 'error');
    return;
  }

  if (rosterShell) rosterShell.classList.remove('hidden');
  if (rosterList) {
    rosterList.innerHTML = '<div class="flex items-center justify-center py-6"><div class="spinner"></div></div>';
  }

  try {
    const [studentsRes, attendanceRes] = await Promise.all([
      fetch(`${API_BASE}/teacher/attendance/students?classLevel=${encodeURIComponent(classLevel)}&section=${encodeURIComponent(section)}`, {
        headers: authHeaders(),
      }),
      fetch(`${API_BASE}/teacher/attendance`, { headers: authHeaders() }),
    ]);

    const students = studentsRes.ok ? await studentsRes.json() : [];
    const attendance = attendanceRes.ok ? await attendanceRes.json() : [];
    if (!studentsRes.ok) throw new Error('Failed to load student list');

    const selectedDate = formatDateInput(date);
    state.attendanceRoster = students.map((student) => {
      const existing = attendance.find((entry) =>
        entry.studentEmail?.toLowerCase() === student.email?.toLowerCase() &&
        String(entry.classLevel) === String(classLevel) &&
        String(entry.section) === String(section) &&
        String(entry.subject || '') === String(subject) &&
        formatDateInput(entry.date) === selectedDate
      );

      return {
        studentName: student.name,
        studentEmail: student.email,
        classLevel,
        section,
        subject,
        rollNumber: student.rollNumber || '',
        profilePicture: student.profilePicture || '',
        status: existing?.status === 'absent' ? 'absent' : 'present',
      };
    });

    renderAttendanceRoster();
    if (rosterCount) {
      rosterCount.textContent = `${state.attendanceRoster.length} student${state.attendanceRoster.length === 1 ? '' : 's'}`;
    }
  } catch (err) {
    if (rosterList) {
      rosterList.innerHTML = `<p class="text-on-surface-variant text-center py-6">${escapeHtml(err.message)}</p>`;
    }
    showToast(err.message, 'error');
  }
}

function renderAttendanceRoster() {
  const rosterList = document.getElementById('attendanceRosterList');
  if (!rosterList) return;

  if (!state.attendanceRoster.length) {
    rosterList.innerHTML = '<p class="text-on-surface-variant text-center py-6">No students found for this class and section.</p>';
    return;
  }

  rosterList.innerHTML = state.attendanceRoster.map((student, index) => `
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/10">
      <div>
        <h4 class="font-manrope font-bold text-on-surface">${escapeHtml(student.studentName || 'Student')}</h4>
        <p class="text-sm text-on-surface-variant mt-1">${escapeHtml(student.studentEmail || '')}</p>
        <p class="text-xs text-on-surface-variant mt-2">Roll Number: ${escapeHtml(student.rollNumber || '--')}</p>
      </div>
      <select data-attendance-index="${index}" class="attendance-status-select w-full md:w-[180px] bg-surface-container-lowest border border-outline-variant/10 rounded-xl px-4 py-3 text-on-surface focus:ring-2 focus:ring-primary transition-all">
        <option value="present" ${student.status === 'present' ? 'selected' : ''}>Present</option>
        <option value="absent" ${student.status === 'absent' ? 'selected' : ''}>Absent</option>
      </select>
    </div>
  `).join('');

  rosterList.querySelectorAll('.attendance-status-select').forEach((select) => {
    select.addEventListener('change', (event) => {
      const index = Number(event.target.dataset.attendanceIndex);
      if (Number.isNaN(index) || !state.attendanceRoster[index]) return;
      state.attendanceRoster[index].status = event.target.value === 'absent' ? 'absent' : 'present';
    });
  });
}

async function submitBulkAttendance() {
  const classLevel = document.getElementById('attendanceClassLevel')?.value;
  const section = document.getElementById('attendanceSection')?.value;
  const subject = document.getElementById('attendanceSubject')?.value;
  const date = document.getElementById('attendanceDate')?.value;

  if (!classLevel || !section || !subject || !date) {
    showToast('Please select class, section, subject, and date', 'error');
    return;
  }

  if (!state.attendanceRoster.length) {
    showToast('Please search students first', 'error');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/teacher/attendance/bulk`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        classLevel,
        section,
        subject,
        date,
        records: state.attendanceRoster.map((student) => ({
          studentName: student.studentName,
          studentEmail: student.studentEmail,
          status: student.status === 'absent' ? 'absent' : 'present',
        })),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to submit attendance');

    showToast('Attendance submitted successfully', 'success');
    loadAttendanceData();
    await searchAttendanceStudents();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadAttendanceData() {
  const endpoint = state.user?.role === 'teacher' ? '/teacher/attendance' : '/student/attendance';

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, { headers: authHeaders() });
    const attendance = res.ok ? await res.json() : [];
    state.attendance = attendance;

    if (state.user?.role === 'teacher') {
      const count = document.getElementById('teacherAttendanceCount');
      if (count) count.textContent = `${attendance.length} entries`;
      renderTeacherAttendanceHistory();
      return;
    }

    if (state.currentPage.startsWith('attendance-subject/')) {
      renderStudentAttendanceSubjectDetail();
    } else {
      renderStudentAttendanceHistory();
    }
  } catch (err) {
    console.error('Failed to load attendance:', err);
  }
}

function renderTeacherAttendanceHistory() {
  const list = document.getElementById('teacherAttendanceList');
  const count = document.getElementById('teacherAttendanceCount');
  const subjectFilterEl = document.getElementById('teacherAttendanceSubjectFilter');
  const dateFilterEl = document.getElementById('teacherAttendanceDateFilter');
  const previousSubjectFilter = subjectFilterEl?.value || 'all';
  const previousDateFilter = dateFilterEl?.value || '';
  if (!list) return;

  const subjects = [...new Set((state.attendance || []).map((entry) => entry.subject).filter(Boolean))].sort();
  if (subjectFilterEl) {
    subjectFilterEl.innerHTML = `
      <option value="all">All Subjects</option>
      ${subjects.map((subject) => `<option value="${subject}">${subject}</option>`).join('')}
    `;
    subjectFilterEl.value = subjects.includes(previousSubjectFilter) || previousSubjectFilter === 'all' ? previousSubjectFilter : 'all';
  }
  if (dateFilterEl) {
    dateFilterEl.value = previousDateFilter;
  }

  const subjectFilter = subjectFilterEl?.value || 'all';
  const dateFilter = dateFilterEl?.value || '';
  const attendance = (state.attendance || []).filter((entry) => (
    (subjectFilter === 'all' || (entry.subject || '') === subjectFilter) &&
    (!dateFilter || formatDateInput(entry.date) === dateFilter)
  ));

  if (count) count.textContent = `${attendance.length} entries`;

  if (!attendance.length) {
    list.innerHTML = '<p class="text-on-surface-variant text-center py-10">No attendance records found for this filter.</p>';
    return;
  }

  list.innerHTML = attendance.map((entry) => `
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-surface-container-low border border-outline-variant/10">
      <div>
        <h4 class="font-manrope font-bold text-on-surface">${entry.studentName}</h4>
        <p class="text-sm text-on-surface-variant mt-1">${entry.studentEmail}</p>
        <div class="mt-2">${renderAudienceBadge(entry)}</div>
        <p class="text-sm font-semibold text-primary mt-2">${entry.subject || 'General'}</p>
        <p class="text-xs text-on-surface-variant mt-2">${formatDate(entry.date)}</p>
      </div>
      <div class="flex items-center gap-4">
        <span class="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-[0.2em] ${attendanceStatusClass(entry.status)}">${entry.status}</span>
        <button onclick="editAttendanceHistory('${entry._id}')" class="p-2 rounded-full hover:bg-primary/10 text-slate-400 hover:text-primary transition-colors" title="Edit attendance">
          <span class="material-symbols-outlined text-sm">edit</span>
        </button>
        <button onclick="deleteAttendance('${entry._id}')" class="p-2 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" title="Delete attendance">
          <span class="material-symbols-outlined text-sm">delete</span>
        </button>
      </div>
    </div>
  `).join('');
}

function renderStudentAttendanceHistory() {
  const list = document.getElementById('studentAttendanceList');
  if (!list) return;

  const attendance = state.attendance || [];
  const subjectGroups = groupAttendanceBySubject(attendance);

  if (!subjectGroups.length) {
    list.innerHTML = '<p class="text-on-surface-variant text-center py-10">No attendance records found yet.</p>';
    return;
  }

  list.innerHTML = subjectGroups.map(({ subject, summary }) => `
    <button type="button" onclick="navigateStudentAttendanceSubject('${encodeURIComponent(subject)}')" class="w-full text-left rounded-2xl bg-surface-container-low border border-outline-variant/10 p-5 hover:bg-primary/5 hover:border-primary/20 transition-colors">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div class="flex items-center gap-4 min-w-0">
          <span class="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined">menu_book</span>
          </span>
          <div class="min-w-0">
            <h4 class="font-manrope font-bold text-on-surface text-lg truncate">${escapeHtml(subject)}</h4>
            <p class="text-sm text-on-surface-variant mt-1">${summary.total} attendance record${summary.total === 1 ? '' : 's'}</p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <span class="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-[0.16em]">${summary.rate}%</span>
          <span class="text-sm font-semibold text-secondary">P: ${summary.present}</span>
          <span class="text-sm font-semibold text-tertiary">A: ${summary.absent}</span>
          ${summary.late ? `<span class="text-sm font-semibold text-amber-700">L: ${summary.late}</span>` : ''}
          <span class="material-symbols-outlined text-on-surface-variant">chevron_right</span>
        </div>
      </div>
    </button>
  `).join('');
}

function renderStudentAttendanceSubjectPage() {
  const subject = getSelectedAttendanceSubject();
  const subjectRecords = (state.attendance || []).filter((entry) => (entry.subject || 'General') === subject);
  const summary = summarizeAttendance(subjectRecords);

  return `
  ${topBar()}
  ${studentSidebar('attendance')}
  <main class="max-w-7xl mx-auto px-6 pt-24 pb-32 md:ml-72">
    <section class="mb-8">
      <button type="button" onclick="navigate('attendance')" class="mb-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-low text-on-surface-variant font-semibold hover:bg-surface-container-high transition-colors">
        <span class="material-symbols-outlined text-base">arrow_back</span>
        <span>Back</span>
      </button>
      <h2 class="text-3xl md:text-5xl font-manrope font-bold text-on-surface mb-2">${escapeHtml(subject)}</h2>
      <p class="text-on-surface-variant text-lg">All attendance records for this subject.</p>
    </section>
    <div class="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <div class="xl:col-span-4 space-y-6">
        <div class="bg-surface-container-lowest rounded-3xl p-8 shadow-sm">
          <p class="text-xs font-bold tracking-[0.2em] uppercase text-on-surface-variant">Subject Rate</p>
          <p id="studentSubjectRate" class="text-5xl font-manrope font-extrabold text-primary mt-3">${summary.rate}%</p>
          <p id="studentSubjectTotal" class="mt-3 text-sm text-on-surface-variant">Total records: ${summary.total}</p>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-surface-container-lowest rounded-3xl p-6 shadow-sm">
            <p class="text-xs font-bold tracking-[0.2em] uppercase text-on-surface-variant">Present</p>
            <p id="studentSubjectPresent" class="text-4xl font-manrope font-extrabold text-secondary mt-3">${summary.present}</p>
          </div>
          <div class="bg-surface-container-lowest rounded-3xl p-6 shadow-sm">
            <p class="text-xs font-bold tracking-[0.2em] uppercase text-on-surface-variant">Absent</p>
            <p id="studentSubjectAbsent" class="text-4xl font-manrope font-extrabold text-tertiary mt-3">${summary.absent}</p>
          </div>
        </div>
      </div>
      <div class="xl:col-span-8 bg-surface-container-lowest rounded-3xl p-8 shadow-sm">
        <div class="flex items-center justify-between gap-4 mb-6">
          <h3 class="text-2xl font-manrope font-bold text-on-surface">Attendance Lines</h3>
          <p id="studentSubjectEntryCount" class="text-sm text-on-surface-variant">${summary.total} entries</p>
        </div>
        <div id="studentSubjectAttendanceList" class="space-y-3">
          <div class="flex items-center justify-center py-8"><div class="spinner"></div></div>
        </div>
      </div>
    </div>
  </main>
  ${studentBottomNav('attendance')}
  `;
}

function bindStudentAttendanceSubjectPage() {
  state.selectedAttendanceSubject = getSelectedAttendanceSubject();
  renderStudentAttendanceSubjectDetail();
}

function renderStudentAttendanceSubjectDetail() {
  const list = document.getElementById('studentSubjectAttendanceList');
  if (!list) return;

  const subject = getSelectedAttendanceSubject();
  const records = (state.attendance || [])
    .filter((entry) => (entry.subject || 'General') === subject)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  const summary = summarizeAttendance(records);
  const rateEl = document.getElementById('studentSubjectRate');
  const totalEl = document.getElementById('studentSubjectTotal');
  const presentEl = document.getElementById('studentSubjectPresent');
  const absentEl = document.getElementById('studentSubjectAbsent');
  const countEl = document.getElementById('studentSubjectEntryCount');
  if (rateEl) rateEl.textContent = `${summary.rate}%`;
  if (totalEl) totalEl.textContent = `Total records: ${summary.total}`;
  if (presentEl) presentEl.textContent = summary.present;
  if (absentEl) absentEl.textContent = summary.absent;
  if (countEl) countEl.textContent = `${summary.total} entries`;

  if (!records.length) {
    list.innerHTML = '<p class="text-on-surface-variant text-center py-10">No attendance records found for this subject.</p>';
    return;
  }

  list.innerHTML = records.map((entry) => `
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-5 rounded-2xl bg-surface-container-low border border-outline-variant/10">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
        <div>
          <p class="text-[11px] font-bold tracking-[0.16em] uppercase text-on-surface-variant">Date</p>
          <p class="font-manrope font-bold text-on-surface mt-1">${formatDate(entry.date)}</p>
        </div>
        <div>
          <p class="text-[11px] font-bold tracking-[0.16em] uppercase text-on-surface-variant">Class And Section</p>
          <p class="font-semibold text-on-surface mt-1">Class ${escapeHtml(entry.classLevel || '--')} - Section ${escapeHtml(entry.section || '--')}</p>
        </div>
        <div class="sm:col-span-2">
          <p class="text-[11px] font-bold tracking-[0.16em] uppercase text-on-surface-variant">Remark</p>
          <p class="text-sm text-on-surface-variant mt-1">${escapeHtml(entry.remarks || 'Attendance recorded for this day.')}</p>
        </div>
      </div>
      <div class="flex items-center gap-3 md:justify-end">
        <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-[0.16em] ${attendanceStatusClass(entry.status)}">${escapeHtml(entry.status || 'recorded')}</span>
        <span class="material-symbols-outlined ${entry.status === 'present' ? 'text-green-600' : entry.status === 'absent' ? 'text-red-500' : 'text-amber-600'}">${entry.status === 'present' ? 'check_circle' : entry.status === 'absent' ? 'cancel' : 'schedule'}</span>
      </div>
    </div>
  `).join('');
}

async function editAttendanceHistory(id) {
  const entry = (state.attendance || []).find((item) => item._id === id);
  if (!entry) return;

  document.getElementById('attendanceClassLevel').value = entry.classLevel || '1';
  document.getElementById('attendanceSection').value = entry.section || 'A';
  await loadSubjectsByClass();
  syncAttendanceSubjectOptions();
  document.getElementById('attendanceSubject').value = entry.subject || '';
  document.getElementById('attendanceDate').value = formatDateInput(entry.date);
  await searchAttendanceStudents();
  document.getElementById('attendanceRosterShell')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function loadSubjectsByClass() {
  if (Object.keys(state.subjectsByClass || {}).length) return state.subjectsByClass;

  try {
    const endpoint = state.user?.role === 'teacher' ? '/teacher/subjects' : '/student/subjects';
    const res = await fetch(`${API_BASE}${endpoint}`, { headers: authHeaders() });
    const data = res.ok ? await res.json() : {};
    state.subjectsByClass = data || {};
  } catch (err) {
    console.error('Failed to load subjects:', err);
  }

  return state.subjectsByClass;
}

function syncAttendanceSubjectOptions() {
  const classLevel = document.getElementById('attendanceClassLevel')?.value || '1';
  const subjectSelect = document.getElementById('attendanceSubject');
  if (!subjectSelect) return;

  const previousValue = subjectSelect.value;
  subjectSelect.innerHTML = getSubjectOptions(classLevel, previousValue);
  if (!subjectSelect.value) {
    const firstOption = subjectSelect.querySelector('option');
    if (firstOption) subjectSelect.value = firstOption.value;
  }
}

async function deleteAttendance(id) {
  if (!confirm('Delete this attendance record?')) return;
  try {
    const res = await fetch(`${API_BASE}/teacher/attendance/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete attendance');
    showToast('Attendance deleted', 'info');
    loadAttendanceData();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadStudentData() {
  try {
    const [ttRes, annRes, matRes] = await Promise.all([
      fetch(freshApiUrl('/student/timetable'), { headers: authHeaders(), cache: 'no-store' }),
      fetch(freshApiUrl('/student/announcements'), { headers: authHeaders(), cache: 'no-store' }),
      fetch(freshApiUrl('/student/materials'), { headers: authHeaders(), cache: 'no-store' }),
    ]);

    const timetable = ttRes.ok ? await ttRes.json() : [];
    const announcements = annRes.ok ? await annRes.json() : [];
    const materials = matRes.ok ? await matRes.json() : [];

    const scheduleCountEl = document.getElementById('studentScheduleCount');
    const announcementCountEl = document.getElementById('studentAnnouncementCount');
    const materialCountEl = document.getElementById('studentMaterialCount');
    const notificationCountEl = document.getElementById('studentNotificationCount');
    if (scheduleCountEl) scheduleCountEl.textContent = String(timetable.length).padStart(2, '0');
    if (announcementCountEl) announcementCountEl.textContent = String(announcements.length).padStart(2, '0');
    if (materialCountEl) materialCountEl.textContent = String(materials.length).padStart(2, '0');

    const notifications = [];
    if (announcements.length) {
      const latestAnnouncement = announcements[0];
      notifications.push({
        icon: 'campaign',
        shellClass: 'bg-secondary-container text-secondary',
        title: 'New announcement',
        detail: latestAnnouncement.title || 'A new classroom update is available.',
        meta: timeAgo(latestAnnouncement.createdAt),
      });
    }
    if (materials.length) {
      const latestMaterial = materials[0];
      notifications.push({
        icon: 'description',
        shellClass: 'bg-primary-fixed text-primary',
        title: 'Material upload',
        detail: latestMaterial.title || latestMaterial.filename || 'New material ready to open.',
        meta: `${latestMaterial.course || 'General'} ? ${timeAgo(latestMaterial.createdAt)}`,
      });
    }
    if (timetable.length) {
      const latestSchedule = timetable[0];
      const startLabel = latestSchedule.startTime ? `${latestSchedule.startTime} ${latestSchedule.startPeriod || ''}`.trim() : (latestSchedule.time || '--');
      notifications.push({
        icon: 'event_upcoming',
        shellClass: 'bg-tertiary-fixed text-tertiary',
        title: 'Class change alert',
        detail: `${latestSchedule.subject || 'Class'} on ${latestSchedule.day || '--'} at ${startLabel}`,
        meta: `Room ${latestSchedule.roomNumber || latestSchedule.location || 'TBD'} ? ${latestSchedule.teacherName || latestSchedule.instructor || 'Teacher update'}`,
      });
    }

    const notificationsEl = document.getElementById('studentNotifications');
    if (notificationCountEl) notificationCountEl.textContent = String(notifications.length).padStart(2, '0');
    if (notificationsEl) {
      if (!notifications.length) {
        notificationsEl.innerHTML = '<p class="text-on-surface-variant text-center py-6">No new notifications right now.</p>';
      } else {
        notificationsEl.innerHTML = notifications.map((item) => `
          <div class="flex flex-col md:flex-row md:items-center gap-4 p-4 rounded-[1.5rem] bg-surface-container-low border border-outline-variant/10">
            <div class="w-12 h-12 rounded-2xl flex items-center justify-center ${item.shellClass}">
              <span class="material-symbols-outlined">${item.icon}</span>
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <h4 class="font-manrope font-bold text-on-surface">${item.title}</h4>
              </div>
              <p class="text-sm text-on-surface-variant">${item.detail}</p>
            </div>
            <p class="text-xs text-on-surface-variant opacity-70">${item.meta}</p>
          </div>
        `).join('');
      }
    }

    // Schedule
    const schedEl = document.getElementById('studentSchedule');
    if (timetable.length === 0) {
      schedEl.innerHTML = '<p class="text-on-surface-variant text-center">No schedule entries yet.</p>';
    } else {
      schedEl.innerHTML = timetable.slice(0, 4).map(t => `
        <div class="flex flex-col md:flex-row md:items-center gap-6 p-5 rounded-3xl bg-surface-container-low border border-outline-variant/10">
          <div class="w-20 h-20 bg-surface-container-lowest rounded-2xl flex flex-col items-center justify-center border border-outline-variant/10">
            <span class="text-lg font-bold text-primary text-center">${t.startTime ? `${t.startTime} ${t.startPeriod || ''}` : (t.time || '--')}</span>
            <span class="text-[10px] font-bold text-on-surface-variant tracking-[0.2em] uppercase">${t.day?.slice(0,3) || ''}</span>
          </div>
          <div class="flex-1">
            <h4 class="text-lg font-manrope font-extrabold text-on-surface">${t.subject}</h4>
            <p class="text-on-surface-variant flex items-center gap-1 mt-1 text-sm">
              <span class="material-symbols-outlined text-sm">location_on</span>
              ${t.roomNumber || t.location || 'TBD'} • ${t.teacherName || t.instructor || ''}
            </p>
            <p class="text-xs text-on-surface-variant mt-2">Class ${t.classLevel || '--'} • Section ${t.section || '--'}</p>
          </div>
        </div>
      `).join('');
    }

    // Announcements
    const annEl = document.getElementById('studentAnnouncements');
    if (announcements.length === 0) {
      annEl.innerHTML = '<p class="text-on-surface-variant text-center w-full">No announcements yet.</p>';
    } else {
      annEl.innerHTML = announcements.slice(0, 4).map(a => `
        <div class="${a.urgency === 'high' ? 'bg-secondary-container/30 border-secondary-container/20' : 'bg-surface-container-low border-outline-variant/10'} border rounded-3xl p-5 flex flex-col md:flex-row gap-4 md:items-center">
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center ${a.urgency === 'high' ? 'bg-secondary-container text-secondary' : 'bg-primary-fixed text-primary'}">
            <span class="material-symbols-outlined">${a.urgency === 'high' ? 'campaign' : 'info'}</span>
          </div>
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-[10px] font-bold uppercase ${a.urgency === 'high' ? 'text-secondary' : 'text-primary-container'}">${a.urgency === 'high' ? 'Urgent' : 'Info'}</span>
            </div>
            <h4 class="font-manrope font-bold text-on-surface mb-2">${a.title}</h4>
            <p class="text-sm text-on-surface-variant line-clamp-2">${a.body || ''}</p>
          </div>
          <p class="text-xs text-on-surface-variant opacity-70">${timeAgo(a.createdAt)}</p>
        </div>
      `).join('');
    }

    // Materials
    const matEl = document.getElementById('studentMaterials');
    if (materials.length === 0) {
      matEl.innerHTML = '<p class="text-on-surface-variant text-center">No materials uploaded yet.</p>';
    } else {
      matEl.innerHTML = materials.slice(0, 4).map((m) => {
        const courseName = m.course || 'General';
        const fileSize = m.size || 'N/A';
        return `
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white rounded-[1.75rem] border border-primary/15 shadow-[0_14px_34px_rgba(148,163,184,0.14)]">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 bg-gradient-to-br from-red-50 to-red-100 text-red-600 rounded-[1.25rem] flex items-center justify-center shadow-sm">
              <span class="material-symbols-outlined">description</span>
            </div>
            <div>
              <h4 class="font-bold text-on-surface text-lg">${m.title || m.filename}</h4>
              <p class="text-xs text-on-surface-variant mt-1">${courseName} ? ${fileSize}</p>
              <p class="text-xs text-on-surface-variant/70 mt-1">Material ready to open</p>
            </div>
          </div>
          <a href="${UPLOADS_BASE}/${m.filepath}" target="_blank" class="inline-flex items-center justify-center px-5 py-3 rounded-[2rem] bg-primary-fixed text-primary font-bold hover:scale-105 transition-transform">
            Open Material
          </a>
        </div>
      `;
      }).join('');
    }
  } catch (err) {
    console.error('Failed to load student data:', err);
  }
}

// ============================================================
//  AI CHATBOT
// ============================================================
function renderChatbot() {
  return `
  ${topBar()}
  <main class="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-32">
    <section class="chat-shell flex flex-col h-[calc(100vh-150px)] min-h-[680px] rounded-[2rem] p-3 sm:p-4">
      <!-- Chat Header -->
      <div class="chat-header-panel bg-secondary-container rounded-t-[1.6rem] px-8 py-6 flex items-center justify-between shadow-sm">
        <div class="flex items-center gap-4">
          <div class="p-2 bg-on-secondary rounded-full">
            <span class="material-symbols-outlined text-secondary text-3xl" style="font-variation-settings: 'FILL' 1;">smart_toy</span>
          </div>
          <div>
            <h2 class="font-headline text-xl font-bold text-on-secondary-container">AI Study Assistant</h2>
            <p class="text-sm text-on-secondary-container/70">Powered by Gemini AI</p>
          </div>
        </div>
        <button onclick="navigate('student-dashboard')" class="p-2 hover:bg-white/20 rounded-full transition-colors">
          <span class="material-symbols-outlined text-on-secondary-container">arrow_back</span>
        </button>
      </div>
      <!-- Messages Area -->
      <div id="chatMessages" class="chat-messages-panel flex-1 bg-surface-container-lowest overflow-y-auto p-8 space-y-8 chat-container">
        <!-- Welcome message -->
        <div class="flex flex-col items-start gap-2 max-w-[85%]">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs font-bold font-headline text-secondary uppercase tracking-wider">Assistant</span>
          </div>
          <div class="assistant-bubble bg-secondary-container/30 text-on-surface rounded-r-3xl rounded-bl-3xl p-6 shadow-sm border border-secondary-container/20">
            <p class="leading-relaxed">Welcome to the Smart Student Dairy Study Assistant! ??</p>
            <p class="leading-relaxed mt-2">I can help you with your academic questions, explain concepts, solve problems, and provide study guidance. What would you like to learn today?</p>
          </div>
        </div>
      </div>
      <!-- Input Area -->
      <div class="chat-input-panel bg-surface-container-low p-6 rounded-b-[1.6rem]">
        <!-- Suggested Chips -->
        <div class="flex gap-3 mb-4 overflow-x-auto pb-2 no-scrollbar">
          <button onclick="sendSuggestedMessage('Summarize the key concepts of thermodynamics')" class="chat-chip whitespace-nowrap px-5 py-2.5 bg-surface-container-lowest text-secondary border border-secondary-container/50 rounded-[2rem] font-label text-sm font-semibold hover:bg-secondary-container hover:text-on-secondary-container transition-all">
            Summarize thermodynamics
          </button>
          <button onclick="sendSuggestedMessage('Explain quantum entanglement in simple terms')" class="chat-chip whitespace-nowrap px-5 py-2.5 bg-surface-container-lowest text-secondary border border-secondary-container/50 rounded-[2rem] font-label text-sm font-semibold hover:bg-secondary-container hover:text-on-secondary-container transition-all">
            Explain quantum entanglement
          </button>
          <button onclick="sendSuggestedMessage('Help me solve a calculus integration problem')" class="chat-chip whitespace-nowrap px-5 py-2.5 bg-surface-container-lowest text-secondary border border-secondary-container/50 rounded-[2rem] font-label text-sm font-semibold hover:bg-secondary-container hover:text-on-secondary-container transition-all">
            Solve calculus problem
          </button>
        </div>
        <!-- Main Input -->
        <form id="chatForm" class="chat-input-wrap flex items-center gap-4 bg-surface-container-lowest rounded-[2rem] p-2 shadow-2xl shadow-blue-900/5">
          <input id="chatInput" class="chat-input-field flex-1 bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-slate-400 px-4" placeholder="Ask your study assistant anything..." type="text" autocomplete="off"/>
          <button type="submit" id="chatSendBtn" class="bg-primary text-on-primary rounded-[2rem] px-8 py-3 font-headline font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20">
            Send
            <span class="material-symbols-outlined text-sm" style="font-variation-settings: 'FILL' 1;">send</span>
          </button>
        </form>
      </div>
    </section>
  </main>
  ${studentBottomNav('chatbot')}
  `;
}

function bindChatbot() {
  document.getElementById('chatForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;
    input.value = '';
    sendChatMessage(message);
  });
}

function sendSuggestedMessage(msg) {
  sendChatMessage(msg);
}

async function sendChatMessage(message) {
  const container = document.getElementById('chatMessages');

  // Add user message
  container.innerHTML += `
    <div class="flex flex-col items-end gap-2 max-w-[88%] ml-auto">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-xs font-bold font-headline text-primary uppercase tracking-wider">You</span>
      </div>
      <div class="user-bubble bg-primary text-on-primary rounded-l-3xl rounded-br-3xl p-6 shadow-xl shadow-primary/10">
        <p class="leading-relaxed">${escapeHtml(message)}</p>
      </div>
    </div>
  `;

  // Add typing indicator
  const typingId = 'typing-' + Date.now();
  container.innerHTML += `
    <div id="${typingId}" class="flex flex-col items-start gap-2 max-w-[88%]">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-xs font-bold font-headline text-secondary uppercase tracking-wider">Assistant</span>
      </div>
      <div class="assistant-bubble bg-secondary-container/30 text-on-surface rounded-r-3xl rounded-bl-3xl p-6 shadow-sm border border-secondary-container/20">
        <div class="typing-dots"><span></span><span></span><span></span></div>
      </div>
    </div>
  `;
  container.scrollTop = container.scrollHeight;

  try {
    const res = await fetch(`${API_BASE}/student/chat`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    const reply = data.reply || data.error || 'Sorry, I couldn\'t process that.';

    // Remove typing indicator and add response
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();

    container.innerHTML += `
      <div class="flex flex-col items-start gap-2 max-w-[92%]">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs font-bold font-headline text-secondary uppercase tracking-wider">Assistant</span>
        </div>
        <div class="assistant-bubble bg-secondary-container/30 text-on-surface rounded-r-3xl rounded-bl-3xl p-6 shadow-sm border border-secondary-container/20">
          <div class="leading-relaxed whitespace-pre-wrap">${formatChatResponse(reply)}</div>
        </div>
      </div>
    `;
  } catch (err) {
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();

    container.innerHTML += `
      <div class="flex flex-col items-start gap-2 max-w-[85%]">
        <div class="bg-error-container text-on-error-container rounded-r-3xl rounded-bl-3xl p-6">
          <p class="leading-relaxed">Sorry, there was an error connecting to the AI service. Make sure the backend is running.</p>
        </div>
      </div>
    `;
  }

  container.scrollTop = container.scrollHeight;
}

// ============================================================
//  UTILITY FUNCTIONS
// ============================================================
function logout() {
  clearAuth();
  showToast('Signed out successfully', 'info');
  navigate('login');
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getTodayLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(dateValue) {
  if (!dateValue) return '';
  const normalized = typeof dateValue === 'string' ? dateValue.slice(0, 10) : formatDateInput(dateValue);
  if (!normalized) return '';
  const [year, month, day] = normalized.split('-').map(Number);
  if (!year || !month || !day) return '';
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateInput(dateValue) {
  if (!dateValue) return '';
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateValue)) {
    return dateValue.slice(0, 10);
  }
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return String(dateValue).slice(0, 10);
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function attendanceStatusClass(status) {
  if (status === 'present') return 'bg-green-50 text-green-700';
  if (status === 'absent') return 'bg-red-50 text-red-700';
  return 'bg-amber-50 text-amber-700';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatChatResponse(text) {
  // Basic markdown-like formatting
  return text
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.*?)\*/g, '<i>$1</i>')
    .replace(/`(.*?)`/g, '<code class="bg-surface-container-high px-2 py-0.5 rounded text-sm">$1</code>')
    .replace(/\n/g, '<br>');
}

// ============================================================
//  INITIALIZATION
// ============================================================
handleRoute();



