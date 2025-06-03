// llm-quick-input/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    sendToLLM: (userText) => {
        // Validate input before sending
        if (typeof userText !== 'string' || userText.length > 1000) {
            throw new Error('Invalid input');
        }
        return ipcRenderer.invoke('send-to-llm', userText);
    },
    closeApp: () => ipcRenderer.send('close-app')
});

