function openApp(id) {
  currentApp = id;
  selectedNames.clear();
  updateExportBar();
  applyTheme();
  document.getElementById('view-home').classList.add('hidden');
  document.getElementById('view-detail').classList.remove('hidden');
  renderAccounts();
}

function goHome() {
  currentApp = null;
  selectedNames.clear();
  updateExportBar();
  document.getElementById('view-detail').classList.add('hidden');
  document.getElementById('view-home').classList.remove('hidden');
  renderCards();
}

async function saveCurrentSession() {
  const name = document.getElementById('account-name').value.trim();
  const appName = APPS[currentApp] ? APPS[currentApp].name : 'this app';
  if (!name) {
    await openModal({ title: 'Name Required', message: 'Enter an account name.' });
    return;
  }

  const cookies = await getSessionCookies();
  if (cookies.length === 0) {
    await openModal({ title: 'No Session Found', message: `No cookies found. Please login to ${appName} first.` });
    return;
  }

  // For Google-style apps, also remember which account index this session is
  // (read from the active tab's /u/N/ path segment — Gemini/NotebookLM use the
  // /u/N/ selector, where N is the Google multi-login index) so switchAccount
  // can point the tab back at that account via the URL instead of swapping
  // cookies (which would log other accounts out).
  let uIndex = undefined;
  if (APPS[currentApp].authuser) {
    const [active] = await new Promise(res => chrome.tabs.query({ active: true, currentWindow: true }, t => res(t || [])));
    if (active && active.url) uIndex = uIndexFromUrl(active.url);
  }

  const { accounts } = await getAccounts();
  accounts[name] = { cookies, savedAt: new Date().toISOString() };
  if (uIndex !== undefined) accounts[name].uIndex = uIndex;

  const { currentAccount } = await getAccounts();
  currentAccount[currentApp] = name;
  await saveAccounts(accounts, currentAccount);

  document.getElementById('account-name').value = '';
  renderAccounts();
}

function uIndexFromUrl(url) {
  try {
    const m = url.match(/\/u\/(\d+)\//);
    if (m) {
      const n = parseInt(m[1], 10);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    }
    return 0;
  } catch {
    return 0;
  }
}

// Rewrite the /u/N/ segment in a Google app URL to the target account index.
function withUIndex(url, n) {
  const u = new URL(url);
  if (/\/u\/\d+\//.test(u.pathname)) {
    u.pathname = u.pathname.replace(/\/u\/\d+\//, `/u/${n}/`);
  } else {
    u.pathname = `/u/${n}${u.pathname === '/' ? '' : u.pathname}`;
  }
  return u.toString();
}

async function switchAccount(name) {
  const { accounts } = await getAccounts();
  if (!accounts[name]) {
    await openModal({ title: 'Not Found', message: 'Account not found.' });
    return;
  }

  // Google-style apps (Gemini, NotebookLM): the real login tokens live in the
  // shared SSO cookies (.google.com / accounts.google.com), so swapping cookies
  // would log every Google account out, and swapping only the app subdomain
  // never changes the signed-in user. The logout-free way to pick an already
  // logged-in Google account is the /u/N/ path segment (N = multi-login index),
  // e.g. https://gemini.google.com/u/0/app -> /u/1/. Just point the open tabs
  // at the saved /u/N/, no cookie touched, so other accounts stay logged in.
  if (APPS[currentApp].authuser) {
    const target = accounts[name].uIndex ?? 0;
    const { currentAccount } = await getAccounts();
    currentAccount[currentApp] = name;
    await saveAccounts(accounts, currentAccount);

    chrome.tabs.query({ url: APPS[currentApp].tabs }, tabs => {
      if (!tabs || tabs.length === 0) {
        chrome.tabs.create({ url: withUIndex(`https://${APPS[currentApp].domains[0]}/`, target) });
        return;
      }
      tabs.forEach(tab => {
        try {
          chrome.tabs.update(tab.id, { url: withUIndex(tab.url || `https://${APPS[currentApp].domains[0]}/`, target) });
        } catch {
          chrome.tabs.update(tab.id, { url: withUIndex(`https://${APPS[currentApp].domains[0]}/`, target) });
        }
      });
    });

    renderAccounts();
    return;
  }

  // ---- Legacy cookie-swap path (non-Google apps) ----
  // Remove ALL cookies from ALL app domains (clean slate).
  // Must NOT filter by partitionKey:{} — that would skip the partitioned
  // (CHIPS) cookies that actually hold the auth session. Omitting the
  // key returns every cookie (partitioned ones included, each with its own
  // partitionKey we forward to remove/set so they land in the right bucket).
  const domains = APPS[currentApp].domains;
  for (const domain of domains) {
    const cookies = await chrome.cookies.getAll({ domain });
    for (const cookie of cookies) {
      try {
        await chrome.cookies.remove({ url: toCookieUrl(cookie), name: cookie.name, ...partitionOf(cookie) });
      } catch (e) { console.warn('Remove failed', cookie.name, e); }
    }
  }

  const toRestore = accounts[name].cookies;
  const failed = [];
  for (const cookie of toRestore) {
    const details = {
      url: toCookieUrl(cookie),
      name: cookie.name,
      value: cookie.value,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      ...partitionOf(cookie)
    };
    if (!cookie.hostOnly) details.domain = cookie.domain;
    if (cookie.sameSite && cookie.sameSite !== 'unspecified') details.sameSite = cookie.sameSite;
    if (cookie.expirationDate) details.expirationDate = cookie.expirationDate;
    try {
      await chrome.cookies.set(details);
    } catch (e) {
      console.warn('Set failed', cookie.name, e);
      failed.push(cookie.name);
    }
  }

  const { currentAccount } = await getAccounts();
  currentAccount[currentApp] = name;
  await saveAccounts(accounts, currentAccount);

  chrome.tabs.query({ url: APPS[currentApp].tabs }, tabs => {
    tabs.forEach(tab => chrome.tabs.reload(tab.id, { bypassCache: true }));
  });

  if (failed.length > 0) {
    await openModal({
      title: 'Partial Warning',
      message: `Failed to restore ${failed.length} cookie(s): ${failed.slice(0, 5).join(', ')}${failed.length > 5 ? '...' : ''}`
    });
  }

  renderAccounts();
}

async function renameAccount(oldName) {
  const newName = await openModal({
    title: 'Rename Account',
    input: true,
    value: oldName,
    placeholder: 'New name',
    confirmText: 'Rename'
  });

  if (newName === null || !newName || newName === oldName) return;

  const { accounts, currentAccount } = await getAccounts();
  if (accounts[newName]) {
    await openModal({ title: 'Name Taken', message: `"${newName}" already exists.` });
    return;
  }

  accounts[newName] = accounts[oldName];
  delete accounts[oldName];
  if (currentAccount[currentApp] === oldName) currentAccount[currentApp] = newName;
  await saveAccounts(accounts, currentAccount);
  renderAccounts();
}

async function deleteAccount(name) {
  const confirmed = await openModal({
    title: 'Delete Account',
    message: `Delete "${name}"? This cannot be undone.`,
    confirmText: 'Delete',
    danger: true
  });
  if (!confirmed) return;

  const { accounts, currentAccount } = await getAccounts();
  delete accounts[name];
  if (currentAccount[currentApp] === name) currentAccount[currentApp] = null;
  await saveAccounts(accounts, currentAccount);
  renderAccounts();
}

async function clearAllSessions() {
  const appName = APPS[currentApp] ? APPS[currentApp].name : 'this app';
  const confirmed = await openModal({
    title: 'Clear All',
    message: `Delete all ${appName} sessions? This cannot be undone.`,
    confirmText: 'Clear All',
    danger: true
  });
  if (!confirmed) return;

  const { currentAccount } = await getAccounts();
  currentAccount[currentApp] = null;
  await saveAccounts({}, currentAccount);
  renderAccounts();
}
