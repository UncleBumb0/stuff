
const sendAction = (action) => chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, {action});
});

document.getElementById('showCheckboxes').addEventListener('click', () => sendAction('show-checkboxes'));
document.getElementById('hideCheckboxes').addEventListener('click', () => sendAction('hide-checkboxes'));
document.getElementById('selectAll').addEventListener('click', () => sendAction('select-all'));
document.getElementById('deselectAll').addEventListener('click', () => sendAction('deselect-all'));
document.getElementById('archiveSelected').addEventListener('click', () => sendAction('archive-selected'));
document.getElementById('deleteSelected').addEventListener('click',  () => sendAction('delete-selected'));

