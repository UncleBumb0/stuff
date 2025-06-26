
/**
 * Content script for ChatGPT Mass Manager
 * Injects checkboxes next to each conversation in the sidebar and
 * lets the popup drive bulk archive or delete actions.
 */

const CHECKBOX_CLASS = 'chat-select-checkbox';
// Only grab conversation links in the sidebar
const SELECTOR_CONVO_LINK = 'nav a[href^="/c/"]';
let observer;

// ----- Utility --------------------------------------------------------------
/** Extract the current workspace slug so we can hit the right backend endpoint */
function getWorkspaceSlug() {
  const match = window.location.pathname.match(/^\/c\/([^\/]+)/);
  return match ? match[1] : 'default';
}

/** PATCH helper for /backend-api/conversations/:id */
async function patchConversation(id, body) {
  const slug = getWorkspaceSlug();
  const url = `${window.location.origin}/backend-api/conversations/${id}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({...body, workspace: slug})
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

/** DELETE helper */
async function deleteConversation(id) {
  const slug = getWorkspaceSlug();
  const url = `${window.location.origin}/backend-api/conversations/${id}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({workspace: slug})
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return true;
}

// ----- Checkbox injection ---------------------------------------------------
function addCheckboxes() {
  document.querySelectorAll(SELECTOR_CONVO_LINK).forEach(anchor => {
    if (anchor.querySelector('.' + CHECKBOX_CLASS)) return; // already added
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.width = '100%';
    wrapper.style.gap = '8px';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = CHECKBOX_CLASS;
    wrapper.appendChild(checkbox);

    // Move existing content into wrapper
    while (anchor.firstChild) wrapper.appendChild(anchor.firstChild);
    anchor.appendChild(wrapper);
  });
}

function startObserver() {
  if (observer) return;
  const nav = document.querySelector('nav');
  if (!nav) return;
  observer = new MutationObserver(addCheckboxes);
  observer.observe(nav, {childList: true, subtree: true});
}

function stopObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

function removeCheckboxes() {
  stopObserver();
  document.querySelectorAll('.' + CHECKBOX_CLASS).forEach(cb => {
    const parent = cb.parentElement;
    cb.remove();
    // unwrap: move remaining nodes back to anchor
    while (parent.firstChild) parent.parentElement.appendChild(parent.firstChild);
    parent.remove();
  });
}

function getSelectedConversationIds() {
  const ids = [];
  document.querySelectorAll('.' + CHECKBOX_CLASS + ':checked').forEach(cb => {
    const anchor = cb.closest('a');
    const href = anchor?.getAttribute('href') || '';
    const idMatch = href.match(/\/c\/[^\/]+\/([a-f0-9-]+)/);
    if (idMatch) ids.push(idMatch[1]);
  });
  return ids;
}

// ----- Bulk operations ------------------------------------------------------
async function archiveSelected() {
  const ids = getSelectedConversationIds();
  for (const id of ids) {
    try {
      await patchConversation(id, {is_archived: true});
    } catch (e) {
      console.error('Archive failed', id, e);
    }
  }
  // Small delay to let backend settle then reload list
  setTimeout(() => window.location.reload(), 500);
}

async function deleteSelected() {
  const ids = getSelectedConversationIds();
  for (const id of ids) {
    try {
      await deleteConversation(id);
    } catch (e) {
      console.error('Delete failed', id, e);
    }
  }
  setTimeout(() => window.location.reload(), 500);
}

// ----- Listen for messages from popup ---------------------------------------
chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  switch (msg.action) {
    case 'show-checkboxes':
      addCheckboxes();
      startObserver();
      break;
    case 'hide-checkboxes':
      removeCheckboxes();
      break;
    case 'select-all':
      document.querySelectorAll('.' + CHECKBOX_CLASS).forEach(cb => cb.checked = true);
      break;
    case 'deselect-all':
      document.querySelectorAll('.' + CHECKBOX_CLASS).forEach(cb => cb.checked = false);
      break;
    case 'archive-selected': archiveSelected(); break;
    case 'delete-selected': deleteSelected(); break;
  }
});
