function getAppIcon(app, prefix) {
  if (!app || !app.icon) return '';
  const p = prefix || 'icon_' + Math.random().toString(36).substring(2, 7);
  return app.icon
    .replace(/id="([^"]+)"/g, `id="${p}_$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${p}_$1)`);
}

let appFilter = '';

function appMatchesQuery(id, app, q) {
  if (!q) return true;
  const needle = q.toLowerCase();
  if (app.name.toLowerCase().includes(needle)) return true;
  if (id.toLowerCase().includes(needle)) return true;
  if ((app.domains || []).some(d => d.toLowerCase().includes(needle))) return true;
  return false;
}

function setAppFilter(value) {
  appFilter = value;
  renderCards();
}

function applyTheme() {
  const app = APPS[currentApp];
  const root = document.documentElement;
  root.style.setProperty('--primary', app.color);
  root.style.setProperty('--primary-hover', app.colorHover);
  root.style.setProperty('--primary-light', app.colorLight);
  root.style.setProperty('--primary-ring', app.color);
  // card icon uses brand iconBg (separate from --primary so banner/Save stay green)
  root.style.setProperty('--card-icon-bg', (app.iconBg) || 'var(--ghost)');
}

function updateExportBar() {
  const count = selectedNames.size;
  document.getElementById('export-bar').classList.toggle('hidden', count === 0);
  document.getElementById('selection-count').textContent = `${count} selected`;
}

function toggleSelection(name, checked) {
  checked ? selectedNames.add(name) : selectedNames.delete(name);
  updateExportBar();
}

async function getAccountCount(appId) {
  const key = `accounts_${appId}`;
  const data = await chrome.storage.local.get(key);
  return Object.keys(data[key] || {}).length;
}

async function renderCards() {
  const container = document.getElementById('app-cards');
  container.innerHTML = '';

  const entries = Object.entries(APPS).filter(([id, app]) => appMatchesQuery(id, app, appFilter));
  if (entries.length === 0) {
    container.innerHTML = `<div class="empty-state">No apps match "${appFilter}".</div>`;
    return;
  }

  for (const [id, app] of entries) {
    const count = await getAccountCount(id);

    const card = document.createElement('div');
    card.className = 'app-card';
    card.innerHTML = `
      <div class="app-card-icon" ${app.iconBg ? `style="background:${app.iconBg}"` : ''}>${getAppIcon(app, 'card_' + id)}</div>
      <span class="app-card-name">${app.name}</span>
      <span class="app-card-count">${count} account${count !== 1 ? 's' : ''}</span>
    `;
    card.addEventListener('click', () => openApp(id));
    container.appendChild(card);
  }
}

async function renderAccounts() {
  const appId = currentApp;
  const app = APPS[appId];
  if (!appId || !app) return;
  const { accounts, currentAccount } = await getAccounts();
  const activeName = currentAccount[appId];
  const names = Object.keys(accounts);

  document.getElementById('current-name').textContent = activeName || 'No account loaded';
  document.getElementById('account-count').textContent = names.length || '';

  const list = document.getElementById('accounts-list');
  if (names.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon" style="background:var(--card-icon-bg)">${getAppIcon(app, 'detail_' + appId)}</div>
      No saved accounts.<br>Login to ${app.name} and save your session.
    </div>`;
    return;
  }

  list.innerHTML = '';
  for (const name of names) {
    const item = document.createElement('div');
    item.className = 'account-item';

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'account-check';
    check.title = 'Select for export';
    check.checked = selectedNames.has(name);
    check.addEventListener('change', () => toggleSelection(name, check.checked));

    const nameEl = document.createElement('span');
    nameEl.className = 'account-name';
    nameEl.textContent = name;
    if (name === activeName) nameEl.style.color = 'var(--primary)';

    const actions = document.createElement('div');
    actions.className = 'account-actions';

    const switchBtn = document.createElement('button');
    switchBtn.className = 'btn-icon btn-switch';
    switchBtn.textContent = 'Switch';
    switchBtn.addEventListener('click', () => switchAccount(name));

    const renameBtn = document.createElement('button');
    renameBtn.className = 'btn-icon btn-rename';
    renameBtn.textContent = 'Rename';
    renameBtn.addEventListener('click', () => renameAccount(name));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-icon btn-delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => deleteAccount(name));

    actions.append(switchBtn, renameBtn, deleteBtn);
    item.append(check, nameEl, actions);
    list.appendChild(item);
  }
}
