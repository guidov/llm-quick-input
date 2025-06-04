// llm-quick-input/main.js
const { app, BrowserWindow, ipcMain, protocol, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config(); // Load .env variables

const { OpenAI } = require('openai');

// Import markdown and LaTeX libraries
const marked = require('marked');
const katex = require('katex');

// Configure marked for better rendering
marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: false,
    mangle: false
});

// Settings management
const settingsPath = path.join(app.getPath('userData'), 'settings.json');
let settings = {
    provider: 'openai', // 'openai' or 'ollama'
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiModel: 'gpt-3.5-turbo',
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'llama2'
};

// Load settings from file
function loadSettings() {
    try {
        if (fs.existsSync(settingsPath)) {
            const data = fs.readFileSync(settingsPath, 'utf8');
            settings = { ...settings, ...JSON.parse(data) };
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

// Save settings to file
function saveSettings() {
    try {
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    } catch (error) {
        console.error('Error saving settings:', error);
    }
}

// Markdown and LaTeX rendering function
function renderMarkdown(text) {
    try {
        // First, remove any reasoning blocks (like <think>...</think>) that might interfere
        let cleanText = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
        
        // Then, render LaTeX expressions with multiple delimiter formats
        let withMath = cleanText
            // Handle \[...\] (display math) - OpenAI format
            .replace(/\\\[([\s\S]*?)\\\]/g, (match, latex) => {
                try {
                    return katex.renderToString(latex.trim(), { displayMode: true });
                } catch (e) {
                    console.warn('Failed to render display LaTeX:', e.message);
                    return match; // Return original if LaTeX parsing fails
                }
            })
            // Handle \(...\) (inline math) - OpenAI format
            .replace(/\\\(([\s\S]*?)\\\)/g, (match, latex) => {
                try {
                    return katex.renderToString(latex.trim(), { displayMode: false });
                } catch (e) {
                    console.warn('Failed to render inline LaTeX:', e.message);
                    return match; // Return original if LaTeX parsing fails
                }
            })
            // Handle $$...$$ (display math) - Traditional format
            .replace(/\$\$([\s\S]*?)\$\$/g, (match, latex) => {
                try {
                    return katex.renderToString(latex.trim(), { displayMode: true });
                } catch (e) {
                    console.warn('Failed to render $$ LaTeX:', e.message);
                    return match; // Return original if LaTeX parsing fails
                }
            })
            // Handle $...$ (inline math) - Traditional format
            .replace(/\$([^$\n]+?)\$/g, (match, latex) => {
                try {
                    return katex.renderToString(latex.trim(), { displayMode: false });
                } catch (e) {
                    console.warn('Failed to render $ LaTeX:', e.message);
                    return match; // Return original if LaTeX parsing fails
                }
            });
        
        // Then render markdown
        return marked.parse(withMath);
    } catch (error) {
        console.error('Error rendering markdown:', error);
        return text; // Return original text if parsing fails
    }
}

// Initialize settings
loadSettings();

let openai = null;
function initializeOpenAI() {
    if (settings.openaiApiKey) {
        openai = new OpenAI({
            apiKey: settings.openaiApiKey,
        });
        console.log("OpenAI client initialized");
    }
}

// Initialize OpenAI client
initializeOpenAI();

// Function to show settings dialog
function showSettingsDialog() {
    const settingsWindow = new BrowserWindow({
        width: 500,
        height: 650,
        parent: mainWindow,
        modal: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        }
    });

    // Load the settings HTML file
    settingsWindow.loadFile('settings.html');
}

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 600,
        height: 800, // Doubled the height for better response viewing
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        frame: true, // Set to false for a frameless window if desired
        // alwaysOnTop: true, // Optional: make it stay on top
        // skipTaskbar: true, // Optional: don't show in taskbar (if launched by shortcut)
    });
    
    // Load the HTML file directly using file:// protocol
    mainWindow.loadFile('index.html');

    // Disable dev tools for production use
    // mainWindow.webContents.openDevTools();

    mainWindow.on('blur', () => {
        // Optional: close the window when it loses focus
        // if (mainWindow && !mainWindow.isDestroyed()) {
        //     mainWindow.close();
        // }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

const { Menu } = require('electron');

app.whenReady().then(() => {
    createWindow();

    // Create custom menu
    const template = [
        {
            label: 'LLM Quick Input',
            submenu: [
                { 
                    label: 'Settings...',
                    accelerator: 'CmdOrCtrl+,',
                    click: () => showSettingsDialog()
                },
                { type: 'separator' },
                { 
                    label: 'About LLM Quick Input',
                    click: () => {
                        require('electron').shell.openExternal('https://github.com/guidov/llm-quick-input')
                    }
                },
                { type: 'separator' },
                { 
                    label: 'Quit', 
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => app.quit() 
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectAll' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    // Ensure the app quits when all windows are closed
    app.quit();
});

// Add proper quit handling
app.on('before-quit', (event) => {
    // Clean up any resources if needed
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.removeAllListeners('close');
    }
});

// IPC Handler for LLM requests
ipcMain.handle('send-to-llm', async (event, userText) => {
    // Validate sender (file:// protocol for local files)
    if (!event.senderFrame.url.startsWith('file://')) {
        console.warn('Blocked IPC request from untrusted source:', event.senderFrame.url);
        return { error: 'Unauthorized request' };
    }
    console.log("ipcMain: 'send-to-llm' received with text:", userText);

    if (!userText || userText.trim() === "") {
        console.log("ipcMain: Empty userText received.");
        return { error: "Input text cannot be empty." };
    }

    try {
        console.log(`Sending to ${settings.provider.toUpperCase()}: "${userText}"`);
        
        if (settings.provider === 'openai') {
            if (!openai) {
                return { error: "OpenAI not configured. Please set your API key in Settings." };
            }
            
            const completion = await openai.chat.completions.create({
                model: settings.openaiModel,
                messages: [{ role: "user", content: userText }],
                max_tokens: 250,
            });

            if (!completion.choices?.[0]?.message?.content) {
                console.error("Invalid response format from OpenAI:", completion);
                return { error: "Received invalid response format from OpenAI" };
            }

            const response = completion.choices[0].message.content;
            console.log("OpenAI Response:", response);
            return { response };
            
        } else if (settings.provider === 'ollama') {
            // Ollama API call using axios
            const ollamaResponse = await axios.post(`${settings.ollamaUrl}/api/generate`, {
                model: settings.ollamaModel,
                prompt: userText,
                stream: false
            }, {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 30000 // 30 second timeout
            });

            const response = ollamaResponse.data.response;
            console.log("Ollama Response:", response);
            return { response };
        } else {
            return { error: "Unknown provider configured" };
        }
        
    } catch (error) {
        console.error("ipcMain: Error calling LLM API:", error);
        
        // Handle axios errors
        if (error.code === 'ECONNREFUSED') {
            return { error: `Cannot connect to ${settings.provider}. Make sure the service is running.` };
        } else if (error.code === 'ETIMEDOUT') {
            return { error: `Connection to ${settings.provider} timed out. Check your connection.` };
        } else if (error.response) {
            // Axios error with response
            return { error: `${settings.provider} API error: ${error.response.status} ${error.response.statusText}` };
        }
        
        // Handle OpenAI API errors
        if (error instanceof OpenAI?.APIError) {
            console.error("OpenAI API Error Details:", {
                status: error.status,
                message: error.message,
                code: error.code,
                type: error.type,
            });
            return { error: `OpenAI Error: ${error.message}` };
        }
        
        // Handle other errors
        return { error: `Error: ${error.message}` };
    }
});

// Settings IPC handlers
ipcMain.handle('get-settings', () => {
    console.log('Getting settings:', settings);
    return settings;
});

ipcMain.handle('save-settings', (event, newSettings) => {
    try {
        console.log('Saving new settings:', newSettings);
        settings = { ...settings, ...newSettings };
        saveSettings();
        
        // Reinitialize OpenAI client if API key changed
        if (newSettings.openaiApiKey) {
            initializeOpenAI();
        }
        
        console.log('Settings saved successfully:', settings);
        return { success: true, settings };
    } catch (error) {
        console.error('Error in save-settings handler:', error);
        return { success: false, error: error.message };
    }
});

// IPC Handler to fetch Ollama models
ipcMain.handle('fetch-ollama-models', async (event, ollamaUrl) => {
    try {
        const response = await axios.get(`${ollamaUrl}/api/tags`, {
            timeout: 10000 // 10 second timeout
        });
        return { models: response.data.models || [] };
    } catch (error) {
        console.error('Error fetching Ollama models:', error);
        if (error.code === 'ECONNREFUSED') {
            return { error: 'Cannot connect to Ollama. Make sure Ollama is running.' };
        } else if (error.code === 'ETIMEDOUT') {
            return { error: 'Connection to Ollama timed out. Check your URL.' };
        } else {
            return { error: `Failed to fetch models: ${error.message}` };
        }
    }
});

// IPC Handler for rendering markdown and LaTeX
ipcMain.handle('render-markdown', async (event, text) => {
    return renderMarkdown(text);
});

// IPC Handler to close the app (e.g., on Escape key)
ipcMain.on('close-app', () => {
    app.quit();
});

// IPC Handler to open settings dialog
ipcMain.on('open-settings', () => {
    showSettingsDialog();
});

