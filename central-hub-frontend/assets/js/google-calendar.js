(function () {
  const CONFIG_STORAGE_KEY = 'berkayHubGoogleCalendarConfig';
  const PROFILES_STORAGE_KEY = 'berkayHubGoogleCalendarProfiles';
  const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
  const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

  let gapiClientLibraryReady = false;
  let gapiClientReady = false;
  let gisReady = false;
  let tokenClient = null;
  let tokenClientId = '';
  let activeToken = null;
  let selectedMemberEmail = '';
  let members = [];
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

  function getConfig() {
    try {
      return JSON.parse(localStorage.getItem(CONFIG_STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function saveConfig(config) {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({
      clientId: String(config.clientId || '').trim(),
      apiKey: String(config.apiKey || '').trim()
    }));
  }

  function getProfiles() {
    try {
      return JSON.parse(localStorage.getItem(PROFILES_STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function saveProfiles(profiles) {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
  }

  function getSelectedMember() {
    return members.find(member => String(member.email).toLowerCase() === String(selectedMemberEmail).toLowerCase()) || members[0] || null;
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

  function setConnectionBadge(text, tone) {
    const badge = qs('#googleCalendarConnectionBadge');
    if (!badge) return;
    badge.textContent = text;
    badge.classList.toggle('badge-user', tone === 'ready');
    badge.classList.toggle('badge-admin', tone === 'warning');
  }

  function configIsComplete(config) {
    return Boolean(config && config.clientId && config.apiKey);
  }

  function loadMembers() {
    if (!window.BerkayApi || typeof window.BerkayApi.getRegisteredUsers !== 'function') {
      members = [];
      return;
    }
    members = window.BerkayApi.getRegisteredUsers().map(user => ({
      id: user.id,
      email: user.email,
      displayName: user.displayName || user.email,
      role: user.role || 'UYE'
    }));
  }

  function ensureSelectedMember() {
    if (!members.length) {
      selectedMemberEmail = '';
      return;
    }

    const hashMember = getMemberFromHash();
    const hashExists = members.some(member => String(member.email).toLowerCase() === String(hashMember).toLowerCase());
    if (hashExists) {
      selectedMemberEmail = hashMember;
      return;
    }

    const selectedExists = members.some(member => String(member.email).toLowerCase() === String(selectedMemberEmail).toLowerCase());
    if (!selectedExists) selectedMemberEmail = members[0].email;
  }

  function selectMember(email, updateHash) {
    selectedMemberEmail = email;
    if (updateHash !== false) {
      window.location.hash = `calendar=${encodeURIComponent(email)}`;
    }
    render();
    if (activeToken) loadGoogleCalendarEvents();
  }

  async function initializeGapiClient() {
    const config = getConfig();
    if (!gapiClientLibraryReady || !window.gapi || !configIsComplete(config)) {
      updateControls();
      return false;
    }

    try {
      await window.gapi.client.init({
        apiKey: config.apiKey,
        discoveryDocs: [DISCOVERY_DOC]
      });
      gapiClientReady = true;
      updateControls();
      return true;
    } catch (error) {
      gapiClientReady = false;
      setStatus(`Google Calendar başlatılamadı: ${error.message || error}`, 'warning');
      updateControls();
      return false;
    }
  }

  function initializeTokenClient() {
    const config = getConfig();
    if (!gisReady || !window.google || !window.google.accounts || !configIsComplete(config)) {
      updateControls();
      return false;
    }

    if (tokenClient && tokenClientId === config.clientId) return true;
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: config.clientId,
      scope: SCOPES,
      callback: ''
    });
    tokenClientId = config.clientId;
    updateControls();
    return true;
  }

  function updateControls() {
    const config = getConfig();
    const selected = getSelectedMember();
    const hasConfig = configIsComplete(config);
    const canAuthorize = hasConfig && Boolean(selected) && gapiClientReady && gisReady;
    const canUseCalendar = canAuthorize && Boolean(activeToken);

    const authorizeButton = qs('#authorizeGoogleCalendar');
    const createButton = qs('#googleCreateEventButton');
    const syncButton = qs('#syncAcademicEventsButton');
    const refreshButton = qs('#refreshGoogleCalendarEvents');
    const disconnectButton = qs('#disconnectGoogleCalendar');

    if (authorizeButton) authorizeButton.disabled = !canAuthorize;
    if (createButton) createButton.disabled = !canUseCalendar;
    if (syncButton) syncButton.disabled = !canUseCalendar;
    if (refreshButton) refreshButton.disabled = !canUseCalendar;
    if (disconnectButton) disconnectButton.disabled = !activeToken && !selected;

    if (!hasConfig) {
      setConnectionBadge('Ayar bekliyor', 'warning');
      setStatus('Google Client ID ve API Key kaydedildiğinde yetkilendirme açılır.', 'warning');
      return;
    }

    if (!gapiClientReady || !gisReady) {
      setConnectionBadge('Google bekleniyor', 'warning');
      setStatus('Google Calendar kütüphaneleri yükleniyor.', 'warning');
      return;
    }

    if (!selected) {
      setConnectionBadge('Üye yok', 'warning');
      setStatus('Takvim sayfası için kayıtlı üye bulunamadı.', 'warning');
      return;
    }

    if (!activeToken) {
      setConnectionBadge('Yetki bekliyor', 'warning');
      setStatus(`${selected.displayName} için Google Calendar yetkisi bekleniyor.`, 'warning');
      return;
    }

    setConnectionBadge('Bağlı', 'ready');
    setStatus(`${selected.displayName} takvimi Google Calendar ile senkrona hazır.`, 'ready');
  }

  function renderConfigInputs() {
    const config = getConfig();
    const clientIdInput = qs('#googleCalendarClientId');
    const apiKeyInput = qs('#googleCalendarApiKey');
    if (clientIdInput && document.activeElement !== clientIdInput) clientIdInput.value = config.clientId || '';
    if (apiKeyInput && document.activeElement !== apiKeyInput) apiKeyInput.value = config.apiKey || '';
  }

  function profileStateFor(email) {
    if (activeToken && String(email).toLowerCase() === String(selectedMemberEmail).toLowerCase()) {
      return { label: 'Aktif', tone: 'status-pill' };
    }

    const profile = getProfiles()[email];
    if (profile && profile.authorizedAt) {
      return { label: 'Yetki kaydı', tone: 'status-pill warning' };
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
      const active = selected && String(selected.email).toLowerCase() === String(member.email).toLowerCase();
      const state = profileStateFor(member.email);
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

    list.innerHTML = sorted.map(event => `
      <div class="calendar-sync-item">
        <div class="min-w-0">
          <div class="calendar-event-title">${escapeHtml(event.title)}</div>
          <div class="calendar-event-meta">${escapeHtml(formatDateTime(event.startsAt))}</div>
        </div>
        <button class="btn-secondary" type="button" data-sync-academic-event="${escapeHtml(String(getLocalEventKey(event)))}">
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
      const start = event.start && (event.start.dateTime || event.start.date);
      const end = event.end && (event.end.dateTime || event.end.date);
      return `
        <article class="calendar-event-card">
          <div class="flex items-start justify-between gap-3">
            <div class="calendar-event-title">${escapeHtml(event.summary || 'Başlıksız etkinlik')}</div>
            <span class="badge">Google</span>
          </div>
          <div class="calendar-event-meta">${escapeHtml(formatDateTime(start))} - ${escapeHtml(formatDateTime(end))}</div>
          ${event.description ? `<p class="text-sm leading-6 text-slate-400">${escapeHtml(event.description)}</p>` : ''}
        </article>
      `;
    }).join('');
  }

  async function loadGoogleCalendarEvents() {
    if (!activeToken || !gapiClientReady || !window.gapi || !window.gapi.client.calendar) {
      renderGoogleEvents([]);
      updateControls();
      return;
    }

    try {
      const response = await window.gapi.client.calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        showDeleted: false,
        singleEvents: true,
        maxResults: 20,
        orderBy: 'startTime'
      });
      renderGoogleEvents((response.result && response.result.items) || []);
      updateControls();
    } catch (error) {
      setStatus(`Google etkinlikleri alınamadı: ${error.message || error}`, 'warning');
      renderGoogleEvents([]);
    }
  }

  async function authorizeGoogleCalendar() {
    const selected = getSelectedMember();
    if (!selected) {
      toast('Önce bir üye takvim sayfası seç.', 'error');
      return;
    }

    const initialized = gapiClientReady || await initializeGapiClient();
    const tokenReady = initializeTokenClient();
    if (!initialized || !tokenReady || !tokenClient) {
      updateControls();
      return;
    }

    tokenClient.callback = async (response) => {
      if (response.error) {
        setStatus(`Yetkilendirme iptal edildi: ${response.error}`, 'warning');
        return;
      }

      activeToken = response;
      const profiles = getProfiles();
      profiles[selected.email] = {
        authorizedAt: new Date().toISOString(),
        calendarId: 'primary'
      };
      saveProfiles(profiles);
      renderMemberGrid();
      updateControls();
      await loadGoogleCalendarEvents();
      toast(`${selected.displayName} için Google Calendar yetkisi kaydedildi.`);
    };

    const profiles = getProfiles();
    const prompt = profiles[selected.email] && profiles[selected.email].authorizedAt ? '' : 'consent';
    tokenClient.requestAccessToken({ prompt });
  }

  function disconnectGoogleCalendar() {
    const selected = getSelectedMember();
    const token = window.gapi && window.gapi.client ? window.gapi.client.getToken() : activeToken;
    if (token && token.access_token && window.google && window.google.accounts) {
      window.google.accounts.oauth2.revoke(token.access_token);
    }
    if (window.gapi && window.gapi.client) window.gapi.client.setToken('');
    activeToken = null;

    if (selected) {
      const profiles = getProfiles();
      delete profiles[selected.email];
      saveProfiles(profiles);
    }

    renderMemberGrid();
    renderGoogleEvents([]);
    updateControls();
    toast('Google Calendar bağlantısı kesildi.');
  }

  function getLocalEventKey(event) {
    if (event.id != null) return event.id;
    return `${event.title || 'event'}-${event.startsAt || ''}`;
  }

  function eventTypeLabel(type) {
    const map = {
      COURSE: 'Ders',
      STUDY: 'Çalışma',
      EXAM: 'Sınav',
      PROJECT: 'Proje',
      EVENT: 'Etkinlik'
    };
    return map[type] || 'Etkinlik';
  }

  function buildAcademicEventResource(event) {
    const start = new Date(event.startsAt);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const selected = getSelectedMember();
    return {
      summary: `[${eventTypeLabel(event.type)}] ${event.title || 'Akademik etkinlik'}`,
      description: `[Berkay Hub] ${event.description || ''}`.trim(),
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
      extendedProperties: {
        private: {
          berkayHubEventId: String(getLocalEventKey(event)),
          berkayHubMember: selected ? selected.email : ''
        }
      }
    };
  }

  async function upsertAcademicEvent(event) {
    const eventKey = String(getLocalEventKey(event));
    const existing = await window.gapi.client.calendar.events.list({
      calendarId: 'primary',
      privateExtendedProperty: `berkayHubEventId=${eventKey}`,
      showDeleted: false,
      singleEvents: true,
      maxResults: 1
    });
    const items = (existing.result && existing.result.items) || [];
    const resource = buildAcademicEventResource(event);

    if (items[0] && items[0].id) {
      return window.gapi.client.calendar.events.patch({
        calendarId: 'primary',
        eventId: items[0].id,
        resource
      });
    }

    return window.gapi.client.calendar.events.insert({
      calendarId: 'primary',
      resource
    });
  }

  async function ensureCalendarUsable() {
    if (!activeToken || !gapiClientReady) {
      toast('Önce Google Calendar yetkilendirmesi yap.', 'error');
      return false;
    }
    return true;
  }

  async function syncSingleAcademicEvent(eventKey) {
    if (!await ensureCalendarUsable()) return;
    const event = localAcademicEvents.find(item => String(getLocalEventKey(item)) === String(eventKey));
    if (!event) {
      toast('Akademik etkinlik bulunamadı.', 'error');
      return;
    }

    try {
      await upsertAcademicEvent(event);
      await loadGoogleCalendarEvents();
      toast('Akademik etkinlik Google takvime gönderildi.');
    } catch (error) {
      setStatus(`Senkron başarısız: ${error.message || error}`, 'warning');
      toast('Google Calendar senkronu başarısız.', 'error');
    }
  }

  async function syncAllAcademicEvents() {
    if (!await ensureCalendarUsable()) return;
    if (!localAcademicEvents.length) {
      toast('Senkronlanacak akademik etkinlik yok.', 'error');
      return;
    }

    let synced = 0;
    try {
      for (const event of localAcademicEvents) {
        await upsertAcademicEvent(event);
        synced += 1;
      }
      await loadGoogleCalendarEvents();
      toast(`${synced} akademik etkinlik Google takvimle senkronlandı.`);
    } catch (error) {
      setStatus(`Senkron ${synced}. kayıttan sonra durdu: ${error.message || error}`, 'warning');
      toast('Google Calendar senkronu tamamlanamadı.', 'error');
    }
  }

  async function createGoogleEvent(event) {
    event.preventDefault();
    if (!await ensureCalendarUsable()) return;

    const form = new FormData(event.currentTarget);
    const startsAt = new Date(form.get('startsAt'));
    const endsAt = new Date(form.get('endsAt'));
    if (!(startsAt < endsAt)) {
      toast('Bitiş zamanı başlangıçtan sonra olmalı.', 'error');
      return;
    }

    const selected = getSelectedMember();
    const description = String(form.get('description') || '').trim();
    const resource = {
      summary: String(form.get('summary') || '').trim(),
      description: `[Berkay Hub] ${selected ? selected.displayName : ''}${description ? '\n\n' + description : ''}`.trim(),
      start: { dateTime: startsAt.toISOString() },
      end: { dateTime: endsAt.toISOString() },
      extendedProperties: {
        private: {
          berkayHubMember: selected ? selected.email : ''
        }
      }
    };

    try {
      await window.gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource
      });
      event.currentTarget.reset();
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

  async function render() {
    if (!qs('#academic-tab-google-calendar')) return;
    loadMembers();
    ensureSelectedMember();
    renderConfigInputs();
    renderMemberGrid();
    fillDefaultTimes();
    if (!activeToken && qs('#googleCalendarEvents') && !qs('#googleCalendarEvents').innerHTML) {
      qs('#googleCalendarEvents').innerHTML = '<div class="calendar-empty">Yetkilendirme sonrası Google etkinlikleri burada görünür.</div>';
    }
    await renderLocalAcademicEvents();
    updateControls();
  }

  function setupGoogleCalendar() {
    if (!qs('#academic-tab-google-calendar')) return;

    const saveButton = qs('#saveGoogleCalendarConfig');
    if (saveButton) {
      saveButton.addEventListener('click', async () => {
        saveConfig({
          clientId: qs('#googleCalendarClientId') ? qs('#googleCalendarClientId').value : '',
          apiKey: qs('#googleCalendarApiKey') ? qs('#googleCalendarApiKey').value : ''
        });
        gapiClientReady = false;
        tokenClient = null;
        activeToken = null;
        await initializeGapiClient();
        initializeTokenClient();
        render();
        toast('Google Calendar ayarları kaydedildi.');
      });
    }

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

  window.gapiLoaded = function () {
    if (!window.gapi) return;
    window.gapi.load('client', async () => {
      gapiClientLibraryReady = true;
      await initializeGapiClient();
    });
  };

  window.gisLoaded = function () {
    gisReady = true;
    initializeTokenClient();
  };

  window.BerkayGoogleCalendar = {
    render,
    authorize: authorizeGoogleCalendar,
    disconnect: disconnectGoogleCalendar,
    refresh: loadGoogleCalendarEvents
  };

  document.addEventListener('DOMContentLoaded', setupGoogleCalendar);
})();
