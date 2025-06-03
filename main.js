// llm-quick-input/main.js
const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path = require('path');
require('dotenv').config(); // Load .env variables

const { OpenAI } = require('openai');

if (!process.env.OPENAI_API_KEY) {
    console.error("FATAL ERROR: OPENAI_API_KEY is not set in your .env file.");
    app.quit();
    process.exit(1);
} else {
    console.log("OpenAI API Key found."); // Confirmation
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 600,
        height: 400, // Increased height to see responses
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

    // mainWindow.webContents.openDevTools(); // Debugging enabled - commented out for production

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

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        // On macOS, apps stay active until Cmd+Q
        // app.quit(); // Comment this out if you want it to only close via shortcut
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
        console.log(`Sending to LLM: "${userText}"`);
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: userText }],
            max_tokens: 250,
        });

        if (!completion.choices?.[0]?.message?.content) {
            console.error("Invalid response format from OpenAI:", completion);
            return { error: "Received invalid response format from OpenAI" };
        }

        const response = completion.choices[0].message.content;
        console.log("LLM Response:", response);
        return { response };
    } catch (error) {
        console.error("ipcMain: Error calling OpenAI API:", error);
        
        // Handle network errors
        if (error.message.includes('Unexpected token')) {
            return { error: "Network error - received malformed response" };
        }
        
        // Handle OpenAI API errors
        if (error instanceof OpenAI.APIError) {
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

// IPC Handler to close the app (e.g., on Escape key)
ipcMain.on('close-app', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.close();
    }
    // If you want the whole app to quit:
    // app.quit();
});

