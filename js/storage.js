function storageKey() { return `accounts_${currentApp}`; }

async function getAccounts() {
  const data = await chrome.storage.local.get([storageKey(), 'currentAccount']);
  return {
    accounts: data[storageKey()] || {},
    currentAccount: data.currentAccount || {}
  };
}

async function saveAccounts(accounts, currentAccount) {
  const data = { [storageKey()]: accounts };
  if (currentAccount !== undefined) data.currentAccount = currentAccount;
  await chrome.storage.local.set(data);
}
