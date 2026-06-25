(function () {
  let selectedMemberEmail = '';
  let members = [];
  let status = { configured: false, connected: false };
  let localAcademicEvents = [];

  function qs(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function qsa(selector, scope) {
    return Array.from((scope || document).querySelectorAll(selector));
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

  function formatDateTime(value) {
    if (window.BerkayUI && typeof window.BerkayUI.formatDateTime === 'function') {
      return window.BerkayUI.formatDateTime(value);
    }
    if (!value) return '-';
    return new Intl.DateTimeFormat('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  }

  function toast(message, type) {
    if (window.BerkayUI && typeof window.BerkayUI.toast === 'function') {
      window.BerkayUI.toast(message, type || 'info');
    }
  }

  function roleLabel(role) {
    const roles = (window.BerkayApi && window.BerkayApi.roles) || [];
    const found = roles.find(item => item.value === role);
    return found ? found.label : (role || 'Üye');
  }

  function memberInitials(name) {
    return String(name || '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('') || '?';
  }

  function getMemberFromHash() {
    const rawHash = String(window.location.hash || '').replace(/^#/, '');
    const params = new URLSearchParams(rawHash);
    return params.get('calendar') || '';
  }

  function setStatus(message, tone) {
    const node = qs('#googleCalendarStatus');
    if (!node) return;
    node.textContent = message;
    node.classList.toggle('ready', tone === 'ready');
    node.classList.toggle('warning', tone === 'warning');
  }

  function setAccountStatus(message, tone) {
    const node = qs('#googleCalendarAccount');
    if (!node) return;
    node.textContent = message;
    node.classList.toggle('ready', tone === 'ready');
    node.classList.toggle('warning', tone === 'warning');
  }

  function setConnectionBadge(text, tone) {
    const badge = qs('#googleCalendarConnectionBadge');
    if (!badge) return;
    badge.textContent = text;
    badge.classList.toggle('badge-user', tone === 'ready');
    badge.classList.toggle('badge-admin', tone === 'warning');
  }

  function getSelectedMember() {
    return members.find(member => sameEmail(member.email, selectedMemberEmail)) || members.find(member => member.currentUser) || members[0] || null;
  }

  function currentMember() {
    return members.find(member => member.currentUser) || null;
  }

  function canUseSelectedCalendar() {
    const selected = getSelectedMember();
    return Boolean(status.configured && selected && selected.currentUser && selected.connected);
  }

  function ensureSelectedMember() {
    if (!members.length) {
      selectedMemberEmail = '';
      return;
    }

    const hashMember = getMemberFromHash();
    const hashExists = members.some(member => sameEmail(member.email, hashMember));
    if (hashExists) {
      selectedMemberEmail = hashMember;
      return;
    }

    const selectedExists = members.some(member => sameEmail(member.email, selectedMemberEmail));
    if (!selectedExists) {
      const current = currentMember();
      selectedMemberEmail = current ? current.email : members[0].email;
    }
  }

  async function loadBackendState() {
    if (!window.BerkayApi) return;
    try {
      const [statusData, memberData] = await Promise.all([
        window.BerkayApi.getGoogleCalendarStatus(),
        window.BerkayApi.getGoogleCalendarMembers()
      ]);
      status = statusData || { configured: false, connected: false };
      members = (memberData || []).map(member => ({
        userId: member.userId,
        email: member.email,
        displayName: member.displayName || member.email,
        role: member.role || 'USER',
        currentUser: Boolean(member.currentUser),
        connected: Boolean(member.connected),
        googleAccountEmail: member.googleAccountEmail,
        connectedAt: member.connectedAt,
        lastSyncAt: member.lastSyncAt,
        lastError: member.lastError
      }));
      ensureSelectedMember();
    } catch (error) {
      members = [];
      status = { configured: false, connected: false, lastError: error.message || String(error) };
      setStatus(`Google Calendar durumu alınamadı: ${error.message || error}`, 'warning');
      setAccountStatus('Backend bağlantısı yok.', 'warning');
    }
  }

  function selectMember(email, updateHash) {
    selectedMemberEmail = email;
    if (updateHash !== false) {
      window.location.hash = `calendar=${encodeURIComponent(email)}`;
    }
    render();
  }

  function profileStateFor(member) {
    if (member.currentUser && member.connected) {
      return { label: 'Aktif', tone: 'status-pill' };
    }
    if (member.connected) {
      return { label: 'Bağlı', tone: 'status-pill warning' };
    }
    return { label: 'Bekliyor', tone: 'status-pill danger' };
  }

  function renderMemberGrid() {
    const grid = qs('#calendarMemberGrid');
    const owner = qs('#selectedCalendarOwner');
    if (!grid) return;

    if (!members.length) {
      grid.innerHTML = '<div class="calendar-empty">Kayıtlı üye bulunamadı.</div>';
      if (owner) owner.textContent = 'Üye yok';
      return;
    }

    const selected = getSelectedMember();
    if (owner) owner.textContent = selected ? `${selected.displayName} takvimi` : 'Üye seçilmedi';

    grid.innerHTML = members.map(member => {
      const active = selected && sameEmail(selected.email, member.email);
      const state = profileStateFor(member);
      return `
        <button class="calendar-member-card ${active ? 'active' : ''}" type="button" data-calendar-member="${escapeHtml(member.email)}">
          <span class="avatar">${escapeHtml(memberInitials(member.displayName))}</span>
          <span class="calendar-member-info">
            <span class="calendar-member-name">${escapeHtml(member.displayName)}</span>
            <span class="calendar-member-meta">${escapeHtml(member.email)}</span>
            <span class="calendar-member-meta">${escapeHtml(roleLabel(member.role))}</span>
            <span class="calendar-member-state ${state.tone}">${escapeHtml(state.label)}</span>
          </span>
        </button>
      `;
    }).join('');

    qsa('[data-calendar-member]', grid).forEach(button => {
      button.addEventListener('click', () => selectMember(button.dataset.calendarMember, true));
    });
  }

  function renderConnectionState() {
    const selected = getSelectedMember();

    if (!status.configured) {
      setConnectionBadge('Ayar eksik', 'warning');
      setStatus('Google Calendar backend ayarları eksik.', 'warning');
      setAccountStatus('GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET ve BERKAY_HUB_GOOGLE_TOKEN_SECRET gerekli.', 'warning');
      return;
    }

    if (!selected) {
      setConnectionBadge('Üye yok', 'warning');
      setStatus('Takvim sayfası için kayıtlı üye bulunamadı.', 'warning');
      setAccountStatus('Bağlanacak üye yok.', 'warning');
      return;
    }

    if (!selected.currentUser) {
      setConnectionBadge(selected.connected ? 'Bağlı' : 'Bekliyor', selected.connected ? 'ready' : 'warning');
      setStatus('Admin yalnızca üye bağlantı durumunu görür; takvim içeriği kullanıcı izni olmadan okunmaz.', 'warning');
      setAccountStatus(`${selected.displayName}: ${selected.connected ? 'Google Calendar bağlı.' : 'Google Calendar bağlı değil.'}`, selected.connected ? 'ready' : 'warning');
      return;
    }

    if (!selected.connected) {
      setConnectionBadge('Bağlantı yok', 'warning');
      setStatus('Google Calendar bağlantısı bekleniyor.', 'warning');
      setAccountStatus('Hesabın Google Calendar ile bağlı değil.', 'warning');
      return;
    }

    const account = selected.googleAccountEmail || status.googleAccountEmail || selected.email;
    setConnectionBadge('Bağlı', 'ready');
    setStatus('Google Calendar senkrona hazır.', 'ready');
    setAccountStatus(`Bağlı hesap: ${account}`, 'ready');
  }

  function updateControls() {
    const selected = getSelectedMember();
    const canConnect = Boolean(status.configured && selected && selected.currentUser);
    const canUseCalendar = canUseSelectedCalendar();

    const authorizeButton = qs('#authorizeGoogleCalendar');
    const createButton = qs('#googleCreateEventButton');
    const syncButton = qs('#syncAcademicEventsButton');
    const refreshButton = qs('#refreshGoogleCalendarEvents');
    const disconnectButton = qs('#disconnectGoogleCalendar');

    if (authorizeButton) {
      authorizeButton.disabled = !canConnect;
      authorizeButton.innerHTML = selected && selected.connected
        ? '<i class="fa-solid fa-rotate"></i> Yeniden Bağla'
        : '<i class="fa-solid fa-key"></i> Yetkilendir';
    }
    if (createButton) createButton.disabled = !canUseCalendar;
    if (syncButton) syncButton.disabled = !canUseCalendar;
    if (refreshButton) refreshButton.disabled = !canUseCalendar;
    if (disconnectButton) disconnectButton.disabled = !canUseCalendar;
  }

  async function renderLocalAcademicEvents() {
    const list = qs('#localAcademicEventsForSync');
    if (!list || !window.BerkayApi) return;

    try {
      localAcademicEvents = await window.BerkayApi.getAcademicEvents();
    } catch (error) {
      localAcademicEvents = [];
      list.innerHTML = `<div class="calendar-empty">Akademik etkinlikler alınamadı: ${escapeHtml(error.message || error)}</div>`;
      return;
    }

    const sorted = localAcademicEvents
      .slice()
      .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));

    if (!sorted.length) {
      list.innerHTML = '<div class="calendar-empty">Senkronlanacak akademik etkinlik yok.</div>';
      return;
    }

    const disabled = canUseSelectedCalendar() ? '' : 'disabled';
    list.innerHTML = sorted.map(event => `
      <div class="calendar-sync-item">
        <div class="min-w-0">
          <div class="calendar-event-title">${escapeHtml(event.title)}</div>
          <div class="calendar-event-meta">${escapeHtml(formatDateTime(event.startsAt))}</div>
        </div>
        <button class="btn-secondary" type="button" ${disabled} data-sync-academic-event="${escapeHtml(String(event.id))}">
          <i class="fa-solid fa-cloud-arrow-up"></i>
          Gönder
        </button>
      </div>
    `).join('');

    qsa('[data-sync-academic-event]', list).forEach(button => {
      button.addEventListener('click', () => syncSingleAcademicEvent(button.dataset.syncAcademicEvent));
    });
  }

  function renderGoogleEvents(events) {
    const list = qs('#googleCalendarEvents');
    if (!list) return;

    if (!events || !events.length) {
      list.innerHTML = '<div class="calendar-empty">Google takvimde yaklaşan etkinlik görünmüyor.</div>';
      return;
    }

    list.innerHTML = events.map(event => {
      const conflicts = Array.isArray(event.conflicts) ? event.conflicts : [];
      return `
        <article class="calendar-event-card">
          <div class="flex items-start justify-between gap-3">
            <div class="calendar-event-title">${escapeHtml(event.summary || 'Başlıksız etkinlik')}</div>
            <span class="badge">Google</span>
          </div>
          <div class="calendar-event-meta">${escapeHtml(formatDateTime(event.startsAt))} - ${escapeHtml(formatDateTime(event.endsAt))}</div>
          ${event.description ? `<p class="text-sm leading-6 text-slate-400">${escapeHtml(event.description)}</p>` : ''}
          ${conflicts.length ? `<p class="text-sm leading-6 text-amber-300">Çakışma: ${escapeHtml(conflicts.join(', '))}</p>` : ''}
        </article>
      `;
    }).join('');
  }

  async function loadGoogleCalendarEvents() {
    const list = qs('#googleCalendarEvents');
    if (!canUseSelectedCalendar()) {
      if (list) list.innerHTML = '<div class="calendar-empty">Bağlantı sonrası Google etkinlikleri burada görünür.</div>';
      updateControls();
      return;
    }

    if (list) list.innerHTML = '<div class="calendar-empty">Google etkinlikleri alınıyor.</div>';
    try {
      const events = await window.BerkayApi.getGoogleCalendarEvents();
      renderGoogleEvents(events || []);
      updateControls();
    } catch (error) {
      setStatus(`Google etkinlikleri alınamadı: ${error.message || error}`, 'warning');
      renderGoogleEvents([]);
    }
  }

  async function authorizeGoogleCalendar() {
    const selected = getSelectedMember();
    if (!selected || !selected.currentUser) {
      toast('Yalnızca kendi Google Calendar hesabını bağlayabilirsin.', 'error');
      return;
    }

    try {
      const response = await window.BerkayApi.startGoogleCalendarOAuth(window.location.href);
      if (response && response.authorizationUrl) {
        window.location.href = response.authorizationUrl;
      }
    } catch (error) {
      setStatus(`Yetkilendirme başlatılamadı: ${error.message || error}`, 'warning');
      toast('Google Calendar yetkilendirmesi başlatılamadı.', 'error');
    }
  }

  async function disconnectGoogleCalendar() {
    if (!canUseSelectedCalendar()) return;
    try {
      await window.BerkayApi.disconnectGoogleCalendar();
      toast('Google Calendar bağlantısı kesildi.');
      await render();
      await loadGoogleCalendarEvents();
    } catch (error) {
      setStatus(`Bağlantı kesilemedi: ${error.message || error}`, 'warning');
      toast('Google Calendar bağlantısı kesilemedi.', 'error');
    }
  }

  async function syncSingleAcademicEvent(eventId) {
    if (!canUseSelectedCalendar()) {
      toast('Önce Google Calendar yetkilendirmesi yap.', 'error');
      return;
    }
    if (!eventId) {
      toast('Akademik etkinlik bulunamadı.', 'error');
      return;
    }

    try {
      await window.BerkayApi.syncGoogleAcademicEvent(eventId);
      await loadGoogleCalendarEvents();
      toast('Akademik etkinlik Google takvime gönderildi.');
    } catch (error) {
      setStatus(`Senkron başarısız: ${error.message || error}`, 'warning');
      toast('Google Calendar senkronu başarısız.', 'error');
    }
  }

  async function syncAllAcademicEvents() {
    if (!canUseSelectedCalendar()) {
      toast('Önce Google Calendar yetkilendirmesi yap.', 'error');
      return;
    }
    if (!localAcademicEvents.length) {
      toast('Senkronlanacak akademik etkinlik yok.', 'error');
      return;
    }

    try {
      const events = await window.BerkayApi.syncGoogleAcademicEvents();
      await loadGoogleCalendarEvents();
      toast(`${(events || []).length} akademik etkinlik Google takvimle senkronlandı.`);
    } catch (error) {
      setStatus(`Senkron tamamlanamadı: ${error.message || error}`, 'warning');
      toast('Google Calendar senkronu tamamlanamadı.', 'error');
    }
  }

  async function createGoogleEvent(event) {
    event.preventDefault();
    if (!canUseSelectedCalendar()) {
      toast('Önce Google Calendar yetkilendirmesi yap.', 'error');
      return;
    }

    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const startsAt = String(form.get('startsAt') || '');
    const endsAt = String(form.get('endsAt') || '');
    if (!(new Date(startsAt) < new Date(endsAt))) {
      toast('Bitiş zamanı başlangıçtan sonra olmalı.', 'error');
      return;
    }

    try {
      await window.BerkayApi.createGoogleCalendarEvent({
        summary: String(form.get('summary') || '').trim(),
        description: String(form.get('description') || '').trim(),
        startsAt,
        endsAt
      });
      formEl.reset();
      fillDefaultTimes();
      await loadGoogleCalendarEvents();
      toast('Google takvim etkinliği oluşturuldu.');
    } catch (error) {
      setStatus(`Etkinlik oluşturulamadı: ${error.message || error}`, 'warning');
      toast('Google takvime etkinlik eklenemedi.', 'error');
    }
  }

  function toDatetimeLocalValue(date) {
    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return offsetDate.toISOString().slice(0, 16);
  }

  function fillDefaultTimes() {
    const form = qs('#googleCalendarEventForm');
    if (!form) return;
    const startsAt = qs('input[name="startsAt"]', form);
    const endsAt = qs('input[name="endsAt"]', form);
    if (!startsAt || !endsAt || startsAt.value || endsAt.value) return;

    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    const end = new Date(now.getTime() + 60 * 60 * 1000);
    startsAt.value = toDatetimeLocalValue(now);
    endsAt.value = toDatetimeLocalValue(end);
  }

  function handleOAuthReturn() {
    const params = new URLSearchParams(window.location.search || '');
    const result = params.get('googleCalendar');
    if (!result) return;

    const message = params.get('googleCalendarMessage');
    if (result === 'connected') {
      toast('Google Calendar bağlantısı kaydedildi.');
    } else if (message) {
      toast(message, 'error');
    } else {
      toast('Google Calendar bağlantısı tamamlanamadı.', 'error');
    }

    params.delete('googleCalendar');
    params.delete('googleCalendarMessage');
    const cleanSearch = params.toString();
    const cleanUrl = `${window.location.pathname}${cleanSearch ? '?' + cleanSearch : ''}${window.location.hash}`;
    window.history.replaceState(null, '', cleanUrl);
  }

  async function render() {
    if (!qs('#academic-tab-google-calendar')) return;
    await loadBackendState();
    renderMemberGrid();
    renderConnectionState();
    fillDefaultTimes();
    await renderLocalAcademicEvents();
    updateControls();
    await loadGoogleCalendarEvents();
  }

  function setupGoogleCalendar() {
    if (!qs('#academic-tab-google-calendar')) return;

    handleOAuthReturn();

    const authorizeButton = qs('#authorizeGoogleCalendar');
    if (authorizeButton) authorizeButton.addEventListener('click', authorizeGoogleCalendar);

    const disconnectButton = qs('#disconnectGoogleCalendar');
    if (disconnectButton) disconnectButton.addEventListener('click', disconnectGoogleCalendar);

    const refreshButton = qs('#refreshGoogleCalendarEvents');
    if (refreshButton) refreshButton.addEventListener('click', loadGoogleCalendarEvents);

    const syncButton = qs('#syncAcademicEventsButton');
    if (syncButton) syncButton.addEventListener('click', syncAllAcademicEvents);

    const eventForm = qs('#googleCalendarEventForm');
    if (eventForm) eventForm.addEventListener('submit', createGoogleEvent);

    window.addEventListener('hashchange', () => {
      const hashMember = getMemberFromHash();
      if (hashMember) selectMember(hashMember, false);
    });

    render();
  }

  function sameEmail(left, right) {
    return left != null && right != null && String(left).toLowerCase() === String(right).toLowerCase();
  }

  window.BerkayGoogleCalendar = {
    render,
    authorize: authorizeGoogleCalendar,
    disconnect: disconnectGoogleCalendar,
    refresh: loadGoogleCalendarEvents
  };

  document.addEventListener('DOMContentLoaded', setupGoogleCalendar);
})();
