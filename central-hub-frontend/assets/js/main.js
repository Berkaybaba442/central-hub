function qs(selector, scope = document) {
  return scope.querySelector(selector);
}

function qsa(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function priorityBadge(priority) {
  const map = {
    HIGH: 'bg-red-500/10 text-red-200 border-red-500/20',
    MEDIUM: 'bg-yellow-500/10 text-yellow-100 border-yellow-500/20',
    LOW: 'bg-sky-500/10 text-sky-100 border-sky-500/20'
  };
  return map[priority] || map.MEDIUM;
}

function roleLabel(role) {
  const roles = (window.BerkayApi && window.BerkayApi.roles) || [];
  const found = roles.find(item => item.value === role);
  if (found) return found.label;
  if (role === 'USER') return 'Üye';
  return role || 'Üye';
}

function escapeHtml(value) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(value == null ? '' : value).replace(/[&<>"']/g, char => map[char]);
}

function eventMeta(type) {
  const map = {
    COURSE: { icon: 'fa-book-open', label: 'Ders', tone: 'purple' },
    STUDY: { icon: 'fa-pen-ruler', label: 'Çalışma', tone: 'green' },
    EXAM: { icon: 'fa-file-circle-check', label: 'Sınav', tone: 'yellow' },
    PROJECT: { icon: 'fa-diagram-project', label: 'Proje', tone: '' },
    EVENT: { icon: 'fa-calendar-day', label: 'Etkinlik', tone: '' }
  };
  return map[type] || map.EVENT;
}

function cameraStatusBadge(status) {
  if (status === 'ONLINE') return 'status-pill';
  if (status === 'MAINTENANCE') return 'status-pill warning';
  return 'status-pill danger';
}

function toast(message, type = 'info') {
  const old = qs('.toast');
  if (old) old.remove();
  const node = document.createElement('div');
  node.className = 'toast';
  node.innerHTML = `<strong class="block mb-1">${type === 'error' ? 'Hata' : 'Bilgi'}</strong><span></span>`;
  qs('span', node).textContent = message;
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 4200);
}

async function requireSession({ adminOnly = false } = {}) {
  const user = await window.BerkayApi.me();
  if (!user) {
    window.location.href = getRootPath() + 'index.html';
    return null;
  }
  if (adminOnly && user.role !== 'ADMIN') {
    const pageContent = qs('#page-content');
    const accessDenied = qs('#access-denied');
    if (pageContent) pageContent.classList.add('hidden');
    if (accessDenied) accessDenied.classList.remove('hidden');
    return null;
  }
  renderUserChip(user);
  applyRoleVisibility(user);
  return user;
}

function getRootPath() {
  return window.location.pathname.includes('/modules/') ? '../../' : './';
}

function renderUserChip(user) {
  qsa('[data-user-name]').forEach(el => el.textContent = user.displayName || user.email);
  qsa('[data-user-role]').forEach(el => {
    el.textContent = roleLabel(user.role);
    el.classList.toggle('badge-admin', user.role === 'ADMIN');
    el.classList.toggle('badge-user', user.role !== 'ADMIN');
  });
}

function applyRoleVisibility(user) {
  qsa('[data-role="ADMIN"]').forEach(el => {
    el.classList.toggle('hidden-by-role', !user || user.role !== 'ADMIN');
  });
}

function setupLogoutButtons() {
  qsa('[data-action="logout"]').forEach(button => {
    button.addEventListener('click', async () => {
      await window.BerkayApi.logout();
      window.location.href = getRootPath() + 'index.html';
    });
  });
}

function setupApiSettings() {
  const input = qs('#apiBaseUrl');
  const button = qs('#saveApiBaseUrl');
  if (!input || !button) return;
  input.value = window.BerkayApi.getApiBaseUrl();
  button.addEventListener('click', () => {
    window.BerkayApi.setApiBaseUrl(input.value);
    toast('API adresi kaydedildi.');
  });
}

function setupAuthTabs() {
  qsa('[data-auth-tab]').forEach(button => {
    button.addEventListener('click', () => {
      const tab = button.dataset.authTab;
      qsa('[data-auth-tab]').forEach(item => {
        item.classList.toggle('active', item.dataset.authTab === tab);
      });
      qsa('[data-auth-panel]').forEach(panel => {
        panel.classList.toggle('hidden', panel.dataset.authPanel !== tab);
      });
    });
  });
}

async function initDashboard() {
  setupApiSettings();
  setupLogoutButtons();
  setupAuthTabs();

  const storedUser = await window.BerkayApi.me();
  if (storedUser) {
    showDashboard(storedUser);
  } else {
    const loginScreen = qs('#login-screen');
    const dashboardScreen = qs('#dashboard-screen');
    if (loginScreen) loginScreen.classList.remove('hidden');
    if (dashboardScreen) dashboardScreen.classList.add('hidden');
  }

  const loginForm = qs('#loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      try {
        const user = await window.BerkayApi.login(form.get('email'), form.get('password'));
        showDashboard(user);
      } catch (error) {
        toast(error.message || 'Giriş yapılamadı.', 'error');
      }
    });
  }

  const signupForm = qs('#signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const password = String(form.get('password') || '');
      const passwordConfirm = String(form.get('passwordConfirm') || '');
      if (password !== passwordConfirm) {
        toast('Şifreler eşleşmiyor.', 'error');
        return;
      }

      try {
        const user = await window.BerkayApi.signup({
          displayName: form.get('displayName'),
          email: form.get('email'),
          password
        });
        event.currentTarget.reset();
        showDashboard(user);
      } catch (error) {
        toast(error.message || 'Kayıt oluşturulamadı.', 'error');
      }
    });
  }

  qsa('[data-demo-login]').forEach(button => {
    button.addEventListener('click', async () => {
      const user = await window.BerkayApi.demoLogin(button.dataset.demoLogin);
      showDashboard(user);
    });
  });
}

async function showDashboard(user) {
  const loginScreen = qs('#login-screen');
  const dashboardScreen = qs('#dashboard-screen');
  if (loginScreen) loginScreen.classList.add('hidden');
  if (dashboardScreen) dashboardScreen.classList.remove('hidden');
  renderUserChip(user);
  applyRoleVisibility(user);

  const [club, events, metrics] = await Promise.all([
    window.BerkayApi.getClubOverview(),
    window.BerkayApi.getAcademicEvents(),
    window.BerkayApi.getMetrics()
  ]);

  qs('#statReports').textContent = club.reportCount != null ? club.reportCount : ((club.reports || []).length || 0);
  qs('#statTasks').textContent = club.openTaskCount != null ? club.openTaskCount : ((club.tasks || []).filter(item => !item.completed).length || 0);
  qs('#statEvents').textContent = events.length;
  qs('#statMemory').textContent = `${metrics.freeMemoryMb}/${metrics.totalMemoryMb} MB`;

  const activity = qs('#activityList');
  if (activity) {
    const items = [
      ...(club.reports || []).slice(0, 2).map(item => ({ title: item.title, desc: item.summary, date: item.createdAt })),
      ...(events || []).slice(0, 2).map(item => ({ title: item.title, desc: item.description, date: item.startsAt }))
    ];
    activity.innerHTML = items.map(item => `
      <li class="data-card">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3">
            <span class="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-400">
              <i class="fa-solid fa-clock-rotate-left text-sm"></i>
            </span>
            <strong class="text-sm text-white">${escapeHtml(item.title)}</strong>
          </div>
          <span class="text-xs text-slate-400">${formatDateTime(item.date)}</span>
        </div>
        <p class="mt-3 text-sm leading-6 text-slate-400">${escapeHtml(item.desc || 'Açıklama yok.')}</p>
      </li>
    `).join('');
  }
}

const CLUB_TEAMS_STORAGE_KEY = 'berkayHubClubTeams';
let clubTeams = [];
let selectedClubMemberId = null;
let currentClubUser = null;

function createLocalId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function memberInitials(name) {
  return String(name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => String(part).charAt(0).toLocaleUpperCase('tr-TR'))
    .join('') || '?';
}

function buildClubTeamsFromAssignments(assignments = []) {
  const seed = assignments.length ? assignments : [
    { memberName: 'Berkay Kerem', teamName: 'Yazılım', responsibility: 'Dashboard ve API entegrasyonu' },
    { memberName: 'Emirhan', teamName: 'Mekanik', responsibility: 'Şase revizyonu' },
    { memberName: 'Koordinasyon Ekibi', teamName: 'Organizasyon', responsibility: 'Etkinlik ve sponsor takibi' }
  ];
  const teamMap = new Map();

  seed.forEach(item => {
    const teamName = item.teamName || 'Genel Takım';
    if (!teamMap.has(teamName)) {
      teamMap.set(teamName, {
        id: createLocalId('team'),
        name: teamName,
        description: `${teamName} ekibinin aktif görev ve sorumluluk bloğu.`,
        members: []
      });
    }

    const team = teamMap.get(teamName);
    if (!team.members.some(member => member.name === item.memberName)) {
      team.members.push({
        id: createLocalId('member'),
        name: item.memberName || 'İsimsiz Üye',
        role: item.responsibility || 'Takım üyesi',
        history: []
      });
    }
  });

  return Array.from(teamMap.values());
}

function loadClubTeams(assignments = []) {
  if (clubTeams.length) return clubTeams;
  try {
    const raw = localStorage.getItem(CLUB_TEAMS_STORAGE_KEY);
    const stored = raw ? JSON.parse(raw) : null;
    if (Array.isArray(stored)) {
      clubTeams = stored;
      return clubTeams;
    }
  } catch {
    // invalid storage falls back to API seed
  }
  clubTeams = buildClubTeamsFromAssignments(assignments);
  saveClubTeams();
  return clubTeams;
}

function saveClubTeams() {
  localStorage.setItem(CLUB_TEAMS_STORAGE_KEY, JSON.stringify(clubTeams));
}

function getClubMembers() {
  return clubTeams.flatMap(team => (team.members || []).map(member => ({ team, member })));
}

function findClubMember(memberId) {
  return getClubMembers().find(item => item.member.id === memberId) || null;
}

function syncSelectedClubMember() {
  const current = selectedClubMemberId ? findClubMember(selectedClubMemberId) : null;
  if (current) return current;
  const first = getClubMembers()[0] || null;
  selectedClubMemberId = first ? first.member.id : null;
  return first;
}

function setupClubTabs() {
  qsa('[data-club-tab]').forEach(button => {
    button.addEventListener('click', () => switchClubTab(button.dataset.clubTab));
  });
}

function switchClubTab(tab) {
  qsa('[data-club-tab]').forEach(button => {
    button.classList.toggle('active', button.dataset.clubTab === tab);
  });
  qsa('[data-club-panel]').forEach(panel => {
    panel.classList.toggle('hidden', panel.dataset.clubPanel !== tab);
  });
}

function renderTeamControls() {
  const options = clubTeams.map(team => `<option value="${escapeHtml(team.id)}">${escapeHtml(team.name)}</option>`).join('');
  const removeTeamSelect = qs('#removeTeamSelect');
  const roleTeamSelect = qs('#roleTeamSelect');
  if (removeTeamSelect) removeTeamSelect.innerHTML = options || '<option value="">Takım yok</option>';
  if (roleTeamSelect) roleTeamSelect.innerHTML = '<option value="">Takıma bağlama</option>' + options;

  const roleUserSelect = qs('#roleUserSelect');
  if (roleUserSelect && window.BerkayApi && window.BerkayApi.getRegisteredUsers) {
    const users = window.BerkayApi.getRegisteredUsers();
    roleUserSelect.innerHTML = users.map(user => `
      <option value="${escapeHtml(user.email)}">${escapeHtml(user.displayName || user.email)} - ${escapeHtml(roleLabel(user.role))}</option>
    `).join('');
  }

  const roleSelect = qs('#roleSelect');
  if (roleSelect && window.BerkayApi && window.BerkayApi.roles) {
    roleSelect.innerHTML = window.BerkayApi.roles.map(role => `
      <option value="${escapeHtml(role.value)}">${escapeHtml(role.label)}</option>
    `).join('');
  }
}

function renderRoleAssignmentAccess() {
  const form = qs('#roleAssignmentForm');
  const locked = qs('#roleAssignmentLocked');
  const isAdmin = currentClubUser && currentClubUser.role === 'ADMIN';
  if (form) form.classList.toggle('hidden', !isAdmin);
  if (locked) locked.classList.toggle('hidden', isAdmin);
}

function updateSelectedMemberInput() {
  const input = qs('#selectedMemberInput');
  if (!input) return;
  const selected = syncSelectedClubMember();
  input.value = selected ? `${selected.member.name} / ${selected.team.name}` : 'Önce bir üye seç';
}

function renderClubTeams(data) {
  const board = qs('#teamBoard');
  if (!board) return;

  if (!clubTeams.length) {
    board.innerHTML = `
      <div class="data-card text-sm text-slate-400 lg:col-span-2">
        Henüz takım bloğu yok. "Takım Ekle / Çıkar" sekmesinden yeni takım ekleyebilirsin.
      </div>
    `;
    return;
  }

  board.innerHTML = clubTeams.map(team => `
    <article class="team-card">
      <div class="team-card-header">
        <div>
          <h3 class="text-lg font-black text-white">${escapeHtml(team.name)}</h3>
          <p class="mt-1 text-sm leading-6 text-slate-400">${escapeHtml(team.description || 'Takım açıklaması yok.')}</p>
        </div>
        <span class="badge">${(team.members || []).length} üye</span>
      </div>
      <div class="member-grid">
        ${(team.members || []).map(member => {
          const taskCount = (data.tasks || []).filter(task => task.owner === member.name && !task.completed).length;
          return `
            <button class="member-card ${selectedClubMemberId === member.id ? 'active' : ''}" type="button" data-select-member="${escapeHtml(member.id)}">
              <span class="avatar">${escapeHtml(memberInitials(member.name))}</span>
              <span class="min-w-0">
                <span class="block truncate font-black text-white">${escapeHtml(member.name)}</span>
                <span class="mt-1 block truncate text-xs text-slate-400">${escapeHtml(member.role || 'Takım üyesi')}</span>
                <span class="mt-2 inline-flex text-xs font-bold text-blue-300">${taskCount} açık görev</span>
              </span>
            </button>
          `;
        }).join('') || '<div class="data-card text-sm text-slate-400">Bu takımda henüz üye yok.</div>'}
      </div>
    </article>
  `).join('');

  qsa('[data-select-member]').forEach(button => {
    button.addEventListener('click', () => {
      selectedClubMemberId = button.dataset.selectMember;
      renderClubTeams(data);
      renderMemberProfile(data);
      updateSelectedMemberInput();
    });
  });
}

function renderMemberProfile(data) {
  const profile = qs('#memberProfile');
  if (!profile) return;

  const selected = syncSelectedClubMember();
  if (!selected) {
    profile.innerHTML = `
      <div class="text-center">
        <span class="icon-box mx-auto"><i class="fa-solid fa-user"></i></span>
        <h2 class="mt-4 text-xl font-black text-white">Üye seçilmedi</h2>
        <p class="mt-2 text-sm text-slate-400">Takım bloğundan bir üyeye tıklayınca profil burada açılır.</p>
      </div>
    `;
    updateSelectedMemberInput();
    return;
  }

  const { team, member } = selected;
  const memberTasks = (data.tasks || []).filter(task => task.owner === member.name);
  const openTasks = memberTasks.filter(task => !task.completed);
  const memberReports = (data.reports || []).filter(report => {
    const haystack = `${report.title || ''} ${report.summary || ''}`;
    return haystack.includes(member.name) || haystack.includes(team.name);
  });

  profile.innerHTML = `
    <div class="flex items-start gap-4 border-b border-slate-700/70 pb-5">
      <span class="avatar h-14 w-14 text-lg">${escapeHtml(memberInitials(member.name))}</span>
      <div class="min-w-0">
        <h2 class="truncate text-2xl font-black text-white">${escapeHtml(member.name)}</h2>
        <p class="mt-1 text-sm text-slate-400">${escapeHtml(member.role || 'Takım üyesi')}</p>
        <span class="badge mt-3">${escapeHtml(team.name)}</span>
      </div>
    </div>

    <div class="mt-5 grid grid-cols-3 gap-3">
      <div class="profile-stat"><strong class="block text-xl text-white">${openTasks.length}</strong><span class="text-xs text-slate-400">Açık</span></div>
      <div class="profile-stat"><strong class="block text-xl text-white">${memberTasks.length}</strong><span class="text-xs text-slate-400">Toplam</span></div>
      <div class="profile-stat"><strong class="block text-xl text-white">${memberReports.length}</strong><span class="text-xs text-slate-400">Rapor</span></div>
    </div>

    <div class="mt-6">
      <h3 class="section-heading text-base"><i class="fa-solid fa-list-check text-blue-400"></i>Üye Görevleri</h3>
      <div class="mt-3 space-y-3">
        ${memberTasks.slice(0, 4).map(task => `
          <div class="data-card">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="font-bold text-white ${task.completed ? 'line-through text-slate-500' : ''}">${escapeHtml(task.title)}</p>
                <p class="mt-1 text-xs text-slate-400">${task.completed ? 'Tamamlandı' : 'Devam ediyor'}</p>
              </div>
              <span class="badge border ${priorityBadge(task.priority)}">${escapeHtml(task.priority || 'MEDIUM')}</span>
            </div>
          </div>
        `).join('') || '<div class="data-card text-sm text-slate-400">Bu üyeye atanmış görev yok.</div>'}
      </div>
    </div>

    <button class="btn-primary mt-6 w-full" type="button" data-open-work>
      <i class="fa-solid fa-paper-plane"></i>
      Bu üyeye görev ata
    </button>
  `;

  const openWork = qs('[data-open-work]', profile);
  if (openWork) {
    openWork.addEventListener('click', () => {
      switchClubTab('work');
      updateSelectedMemberInput();
      const taskTitleInput = qs('#memberWorkForm input[name="taskTitle"]');
      if (taskTitleInput) taskTitleInput.focus();
    });
  }
  updateSelectedMemberInput();
}

function renderClubWorkLists(data) {
  const taskList = qs('#taskList');
  if (taskList) {
    taskList.innerHTML = (data.tasks || []).map(task => `
      <li class="data-card">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3">
            <span class="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${task.completed ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-blue-500/20 bg-blue-500/10 text-blue-400'}">
              <i class="fa-solid ${task.completed ? 'fa-check' : 'fa-list-check'} text-sm"></i>
            </span>
            <div>
              <button class="text-left font-bold ${task.completed ? 'line-through text-slate-500' : 'text-slate-100'}" data-toggle-task="${task.id}">${escapeHtml(task.title)}</button>
              <p class="mt-1 text-sm text-slate-400">Sorumlu: ${escapeHtml(task.owner || '-')}</p>
            </div>
          </div>
          <span class="badge border ${priorityBadge(task.priority)}">${escapeHtml(task.priority || 'MEDIUM')}</span>
        </div>
      </li>
    `).join('');

    qsa('[data-toggle-task]').forEach(button => {
      button.addEventListener('click', async () => {
        await window.BerkayApi.toggleTask(button.dataset.toggleTask);
        await renderClub();
      });
    });
  }

  const reportList = qs('#reportList');
  if (reportList) {
    reportList.innerHTML = (data.reports || []).map(report => `
      <article class="data-card">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3">
            <span class="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-400">
              <i class="fa-solid fa-file-lines text-sm"></i>
            </span>
            <h3 class="font-bold text-white">${escapeHtml(report.title)}</h3>
          </div>
          <span class="text-xs text-slate-400">${formatDateTime(report.createdAt)}</span>
        </div>
        <p class="mt-3 text-sm leading-6 text-slate-400">${escapeHtml(report.summary)}</p>
      </article>
    `).join('');
  }
}

function setupClubForms() {
  const memberWorkForm = qs('#memberWorkForm');
  if (memberWorkForm) {
    memberWorkForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const selected = syncSelectedClubMember();
      if (!selected) {
        toast('Görev atamak için önce takım panosundan bir üye seç.', 'error');
        return;
      }

      const form = new FormData(event.currentTarget);
      const taskTitle = String(form.get('taskTitle') || '').trim();
      const reportTitle = String(form.get('reportTitle') || '').trim();
      const summary = String(form.get('summary') || '').trim();

      await window.BerkayApi.createTask({
        title: taskTitle,
        owner: selected.member.name,
        priority: form.get('priority')
      });
      await window.BerkayApi.createReport({
        title: `${selected.member.name} | ${reportTitle}`,
        summary: `[${selected.team.name}] ${summary}`
      });

      selected.member.history = selected.member.history || [];
      selected.member.history.unshift({ taskTitle, reportTitle, summary, createdAt: new Date().toISOString() });
      saveClubTeams();
      event.currentTarget.reset();
      toast('Görev atandı ve rapor kaydedildi.');
      await renderClub();
    });
  }

  const teamForm = qs('#teamForm');
  if (teamForm) {
    teamForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      clubTeams.push({
        id: createLocalId('team'),
        name: String(form.get('teamName') || '').trim(),
        description: String(form.get('teamDescription') || '').trim(),
        members: []
      });
      saveClubTeams();
      event.currentTarget.reset();
      toast('Takım bloğu eklendi.');
      await renderClub();
      switchClubTab('teams');
    });
  }

  const roleAssignmentForm = qs('#roleAssignmentForm');
  if (roleAssignmentForm) {
    roleAssignmentForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      if (!currentClubUser || currentClubUser.role !== 'ADMIN') {
        toast('Rol atamak için Admin rolü gerekiyor.', 'error');
        return;
      }

      const email = form.get('email');
      const role = form.get('role');
      const teamId = form.get('teamId');
      const user = window.BerkayApi.updateUserRole(email, role);

      if (teamId) {
        const team = clubTeams.find(item => item.id === teamId);
        if (team) {
          team.members = team.members || [];
          let member = team.members.find(item => item.email === user.email || item.name === user.displayName);
          if (!member) {
            member = {
              id: createLocalId('member'),
              email: user.email,
              name: user.displayName || user.email,
              role: roleLabel(user.role),
              history: []
            };
            team.members.push(member);
          } else {
            member.email = user.email;
            member.name = user.displayName || user.email;
            member.role = roleLabel(user.role);
          }
          selectedClubMemberId = member.id;
        }
      }

      saveClubTeams();
      event.currentTarget.reset();
      toast('Rol atandı.');
      await renderClub();
      switchClubTab('teams');
    });
  }

  const removeTeamForm = qs('#removeTeamForm');
  if (removeTeamForm) {
    removeTeamForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const teamId = form.get('teamId');
      const team = clubTeams.find(item => item.id === teamId);
      if (!team) return;
      clubTeams = clubTeams.filter(item => item.id !== teamId);
      if ((team.members || []).some(member => member.id === selectedClubMemberId)) selectedClubMemberId = null;
      saveClubTeams();
      toast(`${team.name} takımı çıkarıldı.`);
      await renderClub();
      switchClubTab('manage');
    });
  }
}

async function initClubModule() {
  setupLogoutButtons();
  setupClubTabs();
  setupClubForms();
  currentClubUser = await requireSession();
  if (!currentClubUser) return;
  await renderClub();
}

async function renderClub() {
  const data = await window.BerkayApi.getClubOverview();
  loadClubTeams(data.assignments || []);
  syncSelectedClubMember();

  const members = getClubMembers();
  qs('#teamCount').textContent = clubTeams.length;
  qs('#memberCount').textContent = members.length;
  qs('#reportCount').textContent = (data.reports || []).length || 0;
  qs('#openTaskCount').textContent = (data.tasks || []).filter(task => !task.completed).length || 0;

  renderTeamControls();
  renderRoleAssignmentAccess();
  renderClubTeams(data);
  renderMemberProfile(data);
  renderClubWorkLists(data);
}

function setupAcademicTabs() {
  qsa('[data-academic-tab]').forEach(button => {
    button.addEventListener('click', () => {
      const tab = button.dataset.academicTab;
      qsa('[data-academic-tab]').forEach(item => {
        item.classList.toggle('active', item.dataset.academicTab === tab);
      });
      qsa('[data-academic-panel]').forEach(panel => {
        panel.classList.toggle('hidden', panel.dataset.academicPanel !== tab);
      });
      if (tab === 'google-calendar' && window.BerkayGoogleCalendar) {
        window.BerkayGoogleCalendar.render();
      }
    });
  });
}

async function initAcademicModule() {
  setupLogoutButtons();
  setupAcademicTabs();
  await requireSession();
  await renderAcademicEvents();

  const academicForm = qs('#academicForm');
  if (academicForm) {
    academicForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      await window.BerkayApi.createAcademicEvent({
        title: form.get('title'),
        type: form.get('type'),
        startsAt: form.get('startsAt'),
        description: form.get('description')
      });
      event.currentTarget.reset();
      toast('Akademik etkinlik eklendi.');
      await renderAcademicEvents();
    });
  }
}

async function renderAcademicEvents() {
  const events = await window.BerkayApi.getAcademicEvents();
  const sorted = [...events].sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
  qs('#academicList').innerHTML = sorted.map(item => {
    const meta = eventMeta(item.type);
    return `
    <article class="calendar-day">
      <div class="flex items-center justify-between gap-3">
        <span class="icon-box ${meta.tone}"><i class="fa-solid ${meta.icon}"></i></span>
        <span class="text-xs text-slate-400">${formatDateTime(item.startsAt)}</span>
      </div>
      <div class="mt-4 flex items-center justify-between gap-3">
        <span class="badge">${meta.label}</span>
      </div>
      <h3 class="mt-4 text-lg font-black text-white">${escapeHtml(item.title)}</h3>
      <p class="mt-2 text-sm leading-6 text-slate-400">${escapeHtml(item.description || 'Açıklama yok.')}</p>
    </article>
  `;
  }).join('');
}

async function initSecurityModule() {
  setupLogoutButtons();
  const user = await requireSession({ adminOnly: true });
  if (!user) return;

  const [cameras, metrics] = await Promise.all([
    window.BerkayApi.getCameras(),
    window.BerkayApi.getMetrics()
  ]);

  qs('#metricCpu').textContent = String(metrics.cpuLoadAverage != null ? metrics.cpuLoadAverage : '-');
  qs('#metricMemory').textContent = `${metrics.freeMemoryMb}/${metrics.totalMemoryMb} MB`;
  qs('#metricNetwork').textContent = metrics.networkStatus || 'OK';

  qs('#cameraGrid').innerHTML = cameras.map(camera => `
    <article class="panel-card p-4">
      <div class="video-shell grid place-items-center">
        ${camera.streamUrl ? `<video src="${escapeHtml(camera.streamUrl)}" autoplay muted controls class="h-full w-full object-cover"></video>` : `<div class="text-center"><div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10 text-2xl text-blue-400"><i class="fa-solid fa-video"></i></div><p class="text-sm text-slate-400">Akış URL bekleniyor</p></div>`}
      </div>
      <div class="mt-4 flex items-start justify-between gap-3">
        <div>
          <h3 class="font-black text-white">${escapeHtml(camera.name)}</h3>
          <p class="mt-1 text-sm text-slate-400">${escapeHtml(camera.location)}</p>
        </div>
        <span class="${cameraStatusBadge(camera.status)}">${escapeHtml(camera.status)}</span>
      </div>
    </article>
  `).join('');
}

window.BerkayUI = {
  toast,
  formatDateTime,
  initDashboard,
  initClubModule,
  initAcademicModule,
  initSecurityModule
};

document.addEventListener('DOMContentLoaded', () => {
  const app = document.body.dataset.app;
  if (app === 'dashboard') initDashboard();
  if (app === 'club') initClubModule();
  if (app === 'academic') initAcademicModule();
  if (app === 'security') initSecurityModule();
});
