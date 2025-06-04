const { contextBridge, ipcRenderer } = require('electron');

console.log('Simple preload test is loading...');

contextBridge.exposeInMainWorld('electronAPI', {
    sendToLLM: (userText) => {
        return ipcRenderer.invoke('send-to-llm', userText);
    },
    closeApp: () => ipcRenderer.send('close-app'),
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    openSettings: () => ipcRenderer.send('open-settings'),
    fetchOllamaModels: (ollamaUrl) => ipcRenderer.invoke('fetch-ollama-models', ollamaUrl),
    renderMarkdown: (text) => text // Simple fallback
});

console.log('Simple electronAPI exposed successfully');
