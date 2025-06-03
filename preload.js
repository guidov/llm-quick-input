// llm-quick-input/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    sendToLLM: (userText) => ipcRenderer.invoke('send-to-llm', userText),
    closeApp: () => ipcRenderer.send('close-app')
});

