// Settings dialog script

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('settings-form');
    const providerSelect = document.getElementById('provider');
    const openaiSection = document.getElementById('openai-section');
    const ollamaSection = document.getElementById('ollama-section');
    const refreshModelsBtn = document.getElementById('refresh-models-btn');
    const modelStatus = document.getElementById('model-status');
    const ollamaModelSelect = document.getElementById('ollamaModel');
    const ollamaUrlInput = document.getElementById('ollamaUrl');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    // Load current settings
    try {
        const currentSettings = await window.electronAPI.getSettings();
        document.getElementById('provider').value = currentSettings.provider;
        document.getElementById('openaiApiKey').value = currentSettings.openaiApiKey || '';
        document.getElementById('openaiModel').value = currentSettings.openaiModel;
        document.getElementById('ollamaUrl').value = currentSettings.ollamaUrl;
        
        // Set ollama model value after loading models if Ollama is selected
        if (currentSettings.provider === 'ollama') {
            await loadOllamaModels();
            document.getElementById('ollamaModel').value = currentSettings.ollamaModel;
        }
        
        toggleProviderSections();
    } catch (error) {
        console.error('Error loading settings:', error);
        showModelStatus('Error loading current settings', 'error');
    }

    // Toggle provider sections
    function toggleProviderSections() {
        const provider = providerSelect.value;
        
        if (provider === 'openai') {
            openaiSection.classList.remove('hidden');
            ollamaSection.classList.add('hidden');
        } else {
            openaiSection.classList.add('hidden');
            ollamaSection.classList.remove('hidden');
            // Load models when switching to Ollama
            loadOllamaModels();
        }
    }

    // Show model status message
    function showModelStatus(message, type) {
        modelStatus.textContent = message;
        modelStatus.className = `model-status ${type}`;
        modelStatus.classList.remove('hidden');
        
        if (type !== 'loading') {
            setTimeout(() => {
                modelStatus.classList.add('hidden');
            }, 3000);
        }
    }

    // Load Ollama models
    async function loadOllamaModels() {
        const ollamaUrl = ollamaUrlInput.value || 'http://localhost:11434';
        
        showModelStatus('Loading models...', 'loading');
        refreshModelsBtn.disabled = true;
        
        try {
            console.log('Fetching models from:', ollamaUrl);
            const result = await window.electronAPI.fetchOllamaModels(ollamaUrl);
            console.log('Model fetch result:', result);
            
            if (result.error) {
                showModelStatus(result.error, 'error');
                return;
            }
            
            // Clear existing options except the first one
            ollamaModelSelect.innerHTML = '<option value="">Select a model...</option>';
            
            // Add models to select
            if (result.models && result.models.length > 0) {
                result.models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.name;
                    option.textContent = `${model.name} (${formatSize(model.size)})`;
                    ollamaModelSelect.appendChild(option);
                });
                
                showModelStatus(`Found ${result.models.length} models`, 'success');
            } else {
                showModelStatus('No models found', 'error');
            }
        } catch (error) {
            console.error('Error fetching models:', error);
            showModelStatus(`Failed to connect to Ollama: ${error.message}`, 'error');
        } finally {
            refreshModelsBtn.disabled = false;
        }
    }

    // Format byte size for display
    function formatSize(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
    }

    // Validation function
    function validateSettings(settings) {
        if (settings.provider === 'openai') {
            if (!settings.openaiApiKey || settings.openaiApiKey.trim() === '') {
                throw new Error('OpenAI API Key is required');
            }
            if (!settings.openaiModel) {
                throw new Error('OpenAI Model selection is required');
            }
        } else if (settings.provider === 'ollama') {
            if (!settings.ollamaUrl || settings.ollamaUrl.trim() === '') {
                throw new Error('Ollama URL is required');
            }
            if (!settings.ollamaModel || settings.ollamaModel.trim() === '') {
                throw new Error('Ollama Model selection is required');
            }
        }
        return true;
    }

    // Event listeners
    providerSelect.addEventListener('change', toggleProviderSections);
    
    refreshModelsBtn.addEventListener('click', loadOllamaModels);
    
    // Also refresh when URL changes
    ollamaUrlInput.addEventListener('blur', () => {
        if (providerSelect.value === 'ollama') {
            loadOllamaModels();
        }
    });

    // Handle form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        
        try {
            const formData = new FormData(e.target);
            const newSettings = {
                provider: formData.get('provider'),
                openaiApiKey: formData.get('openaiApiKey'),
                openaiModel: formData.get('openaiModel'),
                ollamaUrl: formData.get('ollamaUrl'),
                ollamaModel: formData.get('ollamaModel')
            };

            console.log('Submitting settings:', newSettings);

            // Validate settings before saving
            validateSettings(newSettings);

            const result = await window.electronAPI.saveSettings(newSettings);
            
            if (result && result.success) {
                console.log('Settings saved successfully');
                window.close();
            } else {
                throw new Error(result?.error || 'Unknown error saving settings');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            showModelStatus(`Failed to save settings: ${error.message}`, 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Settings';
        }
    });

    // Handle cancel button
    cancelBtn.addEventListener('click', () => {
        window.close();
    });
});
