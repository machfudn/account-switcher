function validateAccountData(data) {
  if (!data || typeof data !== 'object' || !data.accounts || typeof data.accounts !== 'object') return null;
  const clean = {};
  for (const [name, entry] of Object.entries(data.accounts)) {
    if (!name || !entry || !Array.isArray(entry.cookies)) return null;
    const cookies = entry.cookies.filter(c => c && typeof c.name === 'string' && typeof c.value === 'string' && typeof c.domain === 'string' && typeof c.path === 'string');
    if (cookies.length === 0) return null;
    clean[name] = { cookies, savedAt: entry.savedAt || null };
  }
  return Object.keys(clean).length > 0 ? clean : null;
}

function downloadExport(accounts) {
  const data = { app: 'account-switcher', version: 2, exportedAt: new Date().toISOString(), accounts };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${APPS[currentApp].name.toLowerCase()}-sessions-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportSessions() {
  const { accounts } = await getAccounts();
  const count = Object.keys(accounts).length;
  if (count === 0) {
    await openModal({ title: 'Nothing to Export', message: 'No saved accounts.' });
    return;
  }
  const confirmed = await openModal({
    title: 'Export All',
    message: `Export ${count} session(s)? The file contains login tokens — keep it safe.`,
    confirmText: 'Export'
  });
  if (confirmed) downloadExport(accounts);
}

async function exportSelected() {
  if (selectedNames.size === 0) return;
  const { accounts } = await getAccounts();
  const picked = {};
  for (const name of selectedNames) {
    if (accounts[name]) picked[name] = accounts[name];
  }
  const count = Object.keys(picked).length;
  if (count === 0) return;
  const confirmed = await openModal({
    title: 'Export Selected',
    message: `Export ${count} selected session(s)?`,
    confirmText: 'Export'
  });
  if (!confirmed) return;
  selectedNames.clear();
  updateExportBar();
  downloadExport(picked);
}

async function importSessions(file) {
  let incoming;
  try {
    incoming = validateAccountData(JSON.parse(await file.text()));
  } catch { incoming = null; }

  if (!incoming) {
    await openModal({ title: 'Import Failed', message: 'Invalid file. Use a JSON exported by this extension.' });
    return;
  }

  const count = Object.keys(incoming).length;
  const confirmed = await openModal({
    title: 'Import Sessions',
    message: `Import ${count} account(s)? Same-name accounts will be overwritten.`,
    confirmText: 'Import'
  });
  if (!confirmed) return;

  const { accounts } = await getAccounts();
  Object.assign(accounts, incoming);
  await saveAccounts(accounts);
  await renderAccounts();
  await openModal({ title: 'Done', message: `${count} account(s) imported.` });
}
