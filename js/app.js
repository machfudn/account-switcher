const IN_WINDOW_CTX = new URLSearchParams(location.search).has('ctx');

document.getElementById('back-btn').addEventListener('click', goHome);
document.getElementById('app-search').addEventListener('input', e => setAppFilter(e.target.value));
document.getElementById('app-sort').addEventListener('change', e => { sortMode = e.target.value; renderCards(); });
document.getElementById('save-btn').addEventListener('click', saveCurrentSession);
document.getElementById('clear-all-btn').addEventListener('click', clearAllSessions);
document.getElementById('export-btn').addEventListener('click', exportSessions);
document.getElementById('export-selected-btn').addEventListener('click', exportSelected);
document.getElementById('import-btn').addEventListener('click', () => {
  if (IN_WINDOW_CTX) {
    document.getElementById('import-file').click();
    return;
  }
  chrome.windows.create({
    url: `${chrome.runtime.getURL('popup.html')}?ctx=window`,
    type: 'popup',
    width: 400,
    height: 620
  });
});
document.getElementById('import-file').addEventListener('change', async e => {
  const file = e.target.files[0];
  e.target.value = '';
  if (file) await importSessions(file);
});

renderCards();
