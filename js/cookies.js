function toCookieUrl(cookie) {
  const d = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain;
  return `https://${d}${cookie.path}`;
}

function partitionOf(cookie) {
  return cookie.partitionKey?.topLevelSite
    ? { partitionKey: cookie.partitionKey }
    : {};
}

async function getSessionCookies() {
  const domains = APPS[currentApp].domains;
  const seen = new Set();
  const result = [];
  for (const domain of domains) {
    const cookies = await chrome.cookies.getAll({ domain, partitionKey: {} });
    for (const c of cookies) {
      const pk = c.partitionKey?.topLevelSite || '';
      const key = `${c.domain}|${c.path}|${c.name}|${pk}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(c);
      }
    }
  }
  return result;
}
