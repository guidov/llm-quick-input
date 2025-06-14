// llm-quick-input/preload.js
const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script is loading...');

contextBridge.exposeInMainWorld('electronAPI', {
    sendToLLM: (userText) => {
        // Validate input before sending
        if (typeof userText !== 'string' || userText.length > 1000) {
            throw new Error('Invalid input');
        }
        return ipcRenderer.invoke('send-to-llm', userText);
    },
    closeApp: () => ipcRenderer.send('close-app'),
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    openSettings: () => ipcRenderer.send('open-settings'),
    fetchOllamaModels: (ollamaUrl) => ipcRenderer.invoke('fetch-ollama-models', ollamaUrl),
    // Expose rendering function via IPC
    renderMarkdown: (text) => {
        return ipcRenderer.invoke('render-markdown', text);
    }
});

console.log('electronAPI exposed successfully');

