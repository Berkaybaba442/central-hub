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

function getRegisteredUsers() {
  let users = [];
  try {
    users = JSON.parse(localStorage.getItem(REGISTERED_USERS_STORAGE_KEY) || '[]');
  } catch {
    users = [];
  }

  const storedUser = getStoredUser();
  if (storedUser && !users.some(user => String(user.email).toLowerCase() === String(storedUser.email).toLowerCase())) {
    users.push(storedUser);
  }

  const cleanUsers = users
    .filter(user => user && user.email)
    .map(user => publicUser(user));
  localStorage.setItem(REGISTERED_USERS_STORAGE_KEY, JSON.stringify(cleanUsers));
  return cleanUsers;
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

    throw new Error('Backend bağlantısı kurulamadı. API adresini kontrol et veya backend servisini başlat.');
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

    throw new Error('Backend bağlantısı kurulamadı. Hesap oluşturmak için API servisi çalışmalı.');
  }
}

async function logout() {
  try { await fetchJson('/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
  clearSession();
}

async function me() {
  if (!getToken()) return null;
  try {
    const data = await fetchJson('/auth/me');
    setSession(getToken(), data.user);
    return data.user;
  } catch {
    clearSession();
    return null;
  }
}

const BerkayApi = {
  getApiBaseUrl,
  setApiBaseUrl,
  getToken,
  getStoredUser,
  getRegisteredUsers,
  clearSession,
  roles: APP_ROLES,
  login,
  signup,
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
    return fetchJson('/club/overview');
  },
  async createReport(payload) {
    return fetchJson('/club/reports', { method: 'POST', body: JSON.stringify(payload) });
  },
  async createTask(payload) {
    return fetchJson('/club/tasks', { method: 'POST', body: JSON.stringify(payload) });
  },
  async toggleTask(id) {
    return fetchJson(`/club/tasks/${id}/toggle`, { method: 'PUT' });
  },
  async createAssignment(payload) {
    return fetchJson('/club/assignments', { method: 'POST', body: JSON.stringify(payload) });
  },
  async getAcademicEvents() {
    return fetchJson('/academic/events');
  },
  async createAcademicEvent(payload) {
    return fetchJson('/academic/events', { method: 'POST', body: JSON.stringify(payload) });
  },
  async getCameras() {
    return fetchJson('/cameras');
  },
  async getMetrics() {
    return fetchJson('/system/metrics');
  }
};

window.BerkayApi = BerkayApi;
