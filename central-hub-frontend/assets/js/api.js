const API_STORAGE_KEY = 'berkayHubApiBaseUrl';
const TOKEN_STORAGE_KEY = 'berkayHubToken';
const USER_STORAGE_KEY = 'berkayHubUser';
const REGISTERED_USERS_STORAGE_KEY = 'berkayHubRegisteredUsers';
const DEFAULT_API_BASE_URL = isLocalDevelopmentHost() ? 'http://localhost:8080/api' : '/api';

const APP_ROLES = [
  { value: 'UYE', label: 'Üye' },
  { value: 'TAKIM_UYESI', label: 'Takım Üyesi' },
  { value: 'TAKIM_KAPTANI', label: 'Takım Kaptanı' },
  { value: 'DEPARTMAN_BASKAN_YARDIMCISI', label: 'Departman Başkan Yardımcısı' },
  { value: 'DEPARTMAN_BASKANI', label: 'Departman Başkanı' },
  { value: 'YONETIM_KURULU_UYESI', label: 'Yönetim Kurulu Üyesi' },
  { value: 'KULUP_BASKAN_YARDIMCISI', label: 'Kulüp Başkan Yardımcısı' },
  { value: 'KULUP_BASKANI', label: 'Kulüp Başkanı' },
  { value: 'DENETIM_KURULU_UYESI', label: 'Denetim Kurulu Üyesi' },
  { value: 'ADMIN', label: 'Admin' }
];

const demoState = {
  club: {
    reports: [
      { id: 1, title: 'Haftalık Robolig Çalışma Raporu', summary: 'Mekanik şase revizyonu, motor sürücü testleri ve görev dağılımı tamamlandı.', createdAt: new Date().toISOString() },
      { id: 2, title: 'Sektör Sohbetleri Planı', summary: 'Konuşmacı listesi ve duyuru takvimi hazırlandı.', createdAt: new Date(Date.now() - 86400000).toISOString() }
    ],
    tasks: [
      { id: 1, title: 'Teknofest görev listesini güncelle', priority: 'HIGH', completed: false, owner: 'Berkay' },
      { id: 2, title: 'Atölye sponsor ihtiyaç listesini toparla', priority: 'MEDIUM', completed: false, owner: 'Koordinasyon' },
      { id: 3, title: 'Haftalık toplantı notlarını yayınla', priority: 'LOW', completed: true, owner: 'Sekreterya' }
    ],
    assignments: [
      { id: 1, memberName: 'Berkay Kerem', teamName: 'Yazılım', responsibility: 'Dashboard ve API entegrasyonu' },
      { id: 2, memberName: 'Emirhan', teamName: 'Mekanik', responsibility: 'Şase revizyonu' }
    ]
  },
  academicEvents: [
    { id: 1, title: 'Mikrodenetleyici Laboratuvarı', type: 'COURSE', startsAt: new Date(Date.now() + 86400000).toISOString(), description: 'Timer, ADC ve CCP tekrar' },
    { id: 2, title: 'Sayısal Analiz Çalışması', type: 'STUDY', startsAt: new Date(Date.now() + 172800000).toISOString(), description: 'Newton, Simpson, Gauss-Seidel' }
  ],
  cameras: [
    { id: 1, name: 'Laboratuvar Ana Kamera', location: 'Atölye Giriş', status: 'ONLINE', streamUrl: '' },
    { id: 2, name: 'Elektronik Masa', location: 'Masa 2', status: 'MAINTENANCE', streamUrl: '' }
  ]
};

function getApiBaseUrl() {
  const stored = localStorage.getItem(API_STORAGE_KEY);
  if (stored && !isLocalDevelopmentHost() && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/api\/?$/i.test(stored)) {
    localStorage.setItem(API_STORAGE_KEY, DEFAULT_API_BASE_URL);
    return DEFAULT_API_BASE_URL;
  }
  return stored || DEFAULT_API_BASE_URL;
}

function isLocalDevelopmentHost() {
  const hostname = window.location.hostname;
  return !hostname || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function isDevelopmentFallbackEnabled() {
  return isLocalDevelopmentHost() && localStorage.getItem('berkayHubDevAuth') === 'enabled';
}

function markApiError(error, status) {
  error.isApiError = true;
  error.status = status;
  return error;
}

function isApiError(error) {
  return Boolean(error && error.isApiError);
}

function setApiBaseUrl(url) {
  const clean = String(url || '').trim().replace(/\/$/, '');
  localStorage.setItem(API_STORAGE_KEY, clean || DEFAULT_API_BASE_URL);
}

function setSession(token, user) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

function getToken() {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_STORAGE_KEY) || 'null');
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

function defaultRegisteredUsers() {
  return [
    {
      id: 'seed-admin',
      email: 'admin@berkayhub.local',
      password: 'admin123',
      displayName: 'Berkay Hub Admin',
      role: 'ADMIN'
    },
    {
      id: 'seed-user',
      email: 'user@berkayhub.local',
      password: 'user123',
      displayName: 'Berkay Hub Kullanıcı',
      role: 'UYE'
    }
  ];
}

function getRegisteredUsers() {
  let users = [];
  try {
    users = JSON.parse(localStorage.getItem(REGISTERED_USERS_STORAGE_KEY) || '[]');
  } catch {
    users = [];
  }

  const defaults = defaultRegisteredUsers();
  defaults.forEach(defaultUser => {
    const existing = users.find(user => String(user.email).toLowerCase() === defaultUser.email.toLowerCase());
    if (!existing) {
      users.push(defaultUser);
    } else if (defaultUser.role === 'ADMIN') {
      existing.role = 'ADMIN';
      existing.password = existing.password || defaultUser.password;
      existing.displayName = existing.displayName || defaultUser.displayName;
    }
  });
  localStorage.setItem(REGISTERED_USERS_STORAGE_KEY, JSON.stringify(users));
  return users;
}

function saveRegisteredUsers(users) {
  localStorage.setItem(REGISTERED_USERS_STORAGE_KEY, JSON.stringify(users));
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role || 'UYE'
  };
}

async function fetchJson(path, options = {}) {
  const token = getToken();
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    let message = `API hatası: ${response.status}`;
    try {
      const error = await response.json();
      message = error.message || error.error || message;
    } catch {
      // ignore json parse fail
    }
    throw markApiError(new Error(message), response.status);
  }

  if (response.status === 204) return null;
  return response.json();
}

function isDemoToken() {
  return String(getToken() || '').startsWith('demo-');
}

function isLocalToken() {
  return String(getToken() || '').startsWith('local-');
}

function isOfflineToken() {
  return isDemoToken() || isLocalToken();
}

function createDemoUser(role) {
  const normalizedRole = role === 'ADMIN' ? 'ADMIN' : 'USER';
  return {
    email: normalizedRole === 'ADMIN' ? 'admin@berkayhub.local' : 'user@berkayhub.local',
    displayName: normalizedRole === 'ADMIN' ? 'Berkay Hub Admin' : 'Berkay Hub Kullanıcı',
    role: normalizedRole === 'ADMIN' ? 'ADMIN' : 'UYE'
  };
}

async function login(email, password) {
  try {
    const data = await fetchJson('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setSession(data.token, data.user);
    return data.user;
  } catch (error) {
    if (isApiError(error)) {
      throw error;
    }

    if (!isDevelopmentFallbackEnabled()) {
      throw new Error('Backend bağlantısı kurulamadı. API adresini kontrol et veya backend servisini başlat.');
    }

    const localUser = getRegisteredUsers().find(user =>
      String(user.email).toLowerCase() === String(email).toLowerCase() &&
      String(user.password) === String(password)
    );
    if (localUser) {
      const user = publicUser(localUser);
      setSession(`local-${user.role.toLowerCase()}-${Date.now()}`, user);
      return user;
    }

    throw new Error('E-posta veya şifre hatalı.');
  }
}

async function signup(payload) {
  try {
    const data = await fetchJson('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    setSession(data.token, data.user);
    return data.user;
  } catch (error) {
    if (isApiError(error)) {
      throw error;
    }

    if (!isDevelopmentFallbackEnabled()) {
      throw new Error('Backend bağlantısı kurulamadı. Hesap oluşturmak için API servisi çalışmalı.');
    }

    const users = getRegisteredUsers();
    const email = String(payload.email || '').trim().toLowerCase();
    if (users.some(user => String(user.email).toLowerCase() === email)) {
      throw new Error('Bu e-posta ile kayıtlı bir kullanıcı var.');
    }

    const localUser = {
      id: `local-user-${Date.now()}`,
      email,
      password: String(payload.password || ''),
      displayName: String(payload.displayName || email).trim(),
      role: 'UYE'
    };
    users.push(localUser);
    saveRegisteredUsers(users);
    const user = publicUser(localUser);
    setSession(`local-uye-${Date.now()}`, user);
    return user;
  }
}

async function demoLogin(role = 'ADMIN') {
  if (!isDevelopmentFallbackEnabled()) {
    throw new Error('Demo giriş production ortamında kapalı.');
  }
  const user = createDemoUser(role);
  setSession(`demo-${user.role.toLowerCase()}-${Date.now()}`, user);
  return user;
}

async function logout() {
  if (!isOfflineToken()) {
    try { await fetchJson('/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
  }
  clearSession();
}

async function me() {
  const storedUser = getStoredUser();
  if (!getToken()) return null;
  if (isOfflineToken()) {
    if (!isDevelopmentFallbackEnabled()) {
      clearSession();
      return null;
    }
    return storedUser;
  }
  try {
    const data = await fetchJson('/auth/me');
    setSession(getToken(), data.user);
    return data.user;
  } catch {
    clearSession();
    return null;
  }
}

function withDemoFallback(promiseFactory, demoFactory) {
  if (isDemoToken()) return Promise.resolve(demoFactory());
  return promiseFactory().catch(() => demoFactory());
}

function nextId(list) {
  return Math.max(0, ...list.map(item => Number(item.id) || 0)) + 1;
}

const BerkayApi = {
  getApiBaseUrl,
  setApiBaseUrl,
  getToken,
  getStoredUser,
  getRegisteredUsers,
  isDevelopmentFallbackEnabled,
  clearSession,
  roles: APP_ROLES,
  login,
  signup,
  demoLogin,
  logout,
  me,
  updateUserRole(email, role) {
    if (String(email).toLowerCase() === 'admin@berkayhub.local' && role !== 'ADMIN') {
      throw new Error('Varsayılan admin hesabının Admin rolü kaldırılamaz.');
    }

    const users = getRegisteredUsers();
    const user = users.find(item => String(item.email).toLowerCase() === String(email).toLowerCase());
    if (!user) throw new Error('Kullanıcı bulunamadı.');
    user.role = role;
    saveRegisteredUsers(users);

    const stored = getStoredUser();
    if (stored && String(stored.email).toLowerCase() === String(email).toLowerCase()) {
      setSession(getToken(), publicUser(user));
    }
    return publicUser(user);
  },
  async getClubOverview() {
    return withDemoFallback(
      () => fetchJson('/club/overview'),
      () => ({
        reportCount: demoState.club.reports.length,
        openTaskCount: demoState.club.tasks.filter(task => !task.completed).length,
        memberCount: demoState.club.assignments.length,
        reports: demoState.club.reports,
        tasks: demoState.club.tasks,
        assignments: demoState.club.assignments
      })
    );
  },
  async createReport(payload) {
    if (isDemoToken()) {
      const item = { id: nextId(demoState.club.reports), createdAt: new Date().toISOString(), ...payload };
      demoState.club.reports.unshift(item);
      return item;
    }
    return fetchJson('/club/reports', { method: 'POST', body: JSON.stringify(payload) });
  },
  async createTask(payload) {
    if (isDemoToken()) {
      const item = { id: nextId(demoState.club.tasks), completed: false, ...payload };
      demoState.club.tasks.unshift(item);
      return item;
    }
    return fetchJson('/club/tasks', { method: 'POST', body: JSON.stringify(payload) });
  },
  async toggleTask(id) {
    if (isDemoToken()) {
      const task = demoState.club.tasks.find(item => Number(item.id) === Number(id));
      if (task) task.completed = !task.completed;
      return task;
    }
    return fetchJson(`/club/tasks/${id}/toggle`, { method: 'PUT' });
  },
  async createAssignment(payload) {
    if (isDemoToken()) {
      const item = { id: nextId(demoState.club.assignments), ...payload };
      demoState.club.assignments.unshift(item);
      return item;
    }
    return fetchJson('/club/assignments', { method: 'POST', body: JSON.stringify(payload) });
  },
  async getAcademicEvents() {
    return withDemoFallback(
      () => fetchJson('/academic/events'),
      () => demoState.academicEvents
    );
  },
  async createAcademicEvent(payload) {
    if (isDemoToken()) {
      const item = { id: nextId(demoState.academicEvents), ...payload };
      demoState.academicEvents.unshift(item);
      return item;
    }
    return fetchJson('/academic/events', { method: 'POST', body: JSON.stringify(payload) });
  },
  async getCameras() {
    return withDemoFallback(
      () => fetchJson('/cameras'),
      () => demoState.cameras
    );
  },
  async getMetrics() {
    return withDemoFallback(
      () => fetchJson('/system/metrics'),
      () => ({
        cpuLoadAverage: 'demo',
        freeMemoryMb: 512,
        totalMemoryMb: 1024,
        activeUsers: 2,
        networkStatus: 'Cloudflare Tunnel hazır değil / demo'
      })
    );
  }
};

window.BerkayApi = BerkayApi;
