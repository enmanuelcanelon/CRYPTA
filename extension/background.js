// background.js — CRYPTA Service Worker

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'OFFER_SAVE') {
    // Store pending credentials in session storage for the popup to pick up
    chrome.storage.session.set({ pendingSave: {
      site: msg.site,
      username: msg.username,
      password: msg.password
    }}).then(() => {
      // Show badge to indicate something can be saved
      chrome.action.setBadgeText({ text: '!', tabId: sender.tab.id });
      chrome.action.setBadgeBackgroundColor({ color: '#58a6ff' });
      sendResponse({ ok: true });
    });
    return true; // Keep channel open for async response
  }

  if (msg.action === 'GET_CREDENTIALS') {
    // Retrieve vault from session storage (only exists if unlocked)
    chrome.storage.session.get(['sessionVault']).then(res => {
      if (!res.sessionVault) {
        sendResponse({ credentials: [] });
        return;
      }
      const vault = JSON.parse(res.sessionVault);
      const msgSite = msg.site.replace(/^www\./i, '').toLowerCase();
      
      const matches = vault.credentials.filter(c => {
        const credSite = c.site.replace(/^www\./i, '').toLowerCase();
        // Match if one contains the other (e.g. accounts.google.com matches google.com)
        return msgSite.includes(credSite) || credSite.includes(msgSite);
      });
      
      sendResponse({ credentials: matches });
    });
    return true;
  }
});

// Clear badge when popup opens
chrome.action.onClicked && chrome.action.onClicked.addListener(tab => {
  chrome.action.setBadgeText({ text: '', tabId: tab.id });
});
