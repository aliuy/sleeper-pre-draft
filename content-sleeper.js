// Sleeper Draft Queue Helper - Content Script
// Phase 2: React Integration and DOM Analysis

console.log('[Content Script] Loading Sleeper Draft Helper...');
console.log('[Content Script] NameMatcher available:', typeof NameMatcher);
console.log('[Content Script] SleeperAPI available:', typeof SleeperAPI);

/**
 * Main class for the Sleeper Draft Helper Chrome extension.
 * Handles player analysis, queue management, and DOM manipulation for Sleeper draft pages.
 * 
 * @class SleeperDraftHelper
 */
class SleeperDraftHelper {
    /**
     * Creates an instance of SleeperDraftHelper.
     * Initializes properties and starts the setup process.
     * 
     * @constructor
     */
    constructor() {
        this.isDebug = false;
        this.players = null;
        this.queueElements = new Map();
        this.initialized = false;
        this.settings = null; // Will be loaded in init
        
        this.log('Initializing Sleeper Draft Helper...');
        this.init();
    }

    /**
     * Logs messages with timestamps and different severity levels.
     * 
     * @param {string} message - The message to log
     * @param {string} [level='info'] - The log level: 'info', 'warn', or 'error'
     */
    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = `[Sleeper Helper ${timestamp}]`;
        
        if (level === 'error') {
            console.error(prefix, message);
        } else if (level === 'warn') {
            console.warn(prefix, message);
        } else if (this.isDebug || level === 'info') {
            console.log(prefix, message);
        }
    }

    /**
     * Initializes the Sleeper Draft Helper by loading players, finding draft elements,
     * and injecting the UI. Handles page ready state checking.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async init() {
        try {
            // Wait for page to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.init());
                return;
            }

            this.log('Page ready, analyzing structure...');
            
            // Load player data
            await this.loadPlayers();
            
            // Find draft interface elements
            await this.findDraftElements();
            
            // Inject our UI
            await this.injectUI();
            
        this.initialized = true;
        this.log('Initialization complete');
        
    } catch (error) {
        this.log(`Initialization error: ${error.message}`, 'error');
    }
}

/**
 * Sets the loading state of a button with visual feedback.
 * 
 * @param {HTMLElement} button - The button element to modify
 * @param {boolean} isLoading - Whether the button should show loading state
 */
setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.classList.add('loading');
        button.dataset.originalText = button.textContent;
        button.textContent = '';
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.textContent = button.dataset.originalText || button.textContent;
        button.disabled = false;
    }
}

/**
 * Shows an error message in the specified container.
 * 
 * @param {HTMLElement} container - The container element to display the error in
 * @param {string} message - The error message to display
 */
showError(container, message) {
    container.className = 'sleeper-results error';
    container.innerHTML = `<div class="error">❌ ${message}</div>`;
}

/**
 * Shows a success message in the specified container.
 * 
 * @param {HTMLElement} container - The container element to display the success in
 * @param {string} message - The success message to display
 */
showSuccess(container, message) {
    container.className = 'sleeper-results success';
    container.innerHTML = `<div class="success">✅ ${message}</div>`;
}

/**
 * Shows an informational message in the specified container.
 * 
 * @param {HTMLElement} container - The container element to display the info in
 * @param {string} message - The informational message to display
 */
showInfo(container, message) {
    container.className = 'sleeper-results';
    container.innerHTML = `<div class="info">ℹ️ ${message}</div>`;
}

/**
 * Loads player data from the Sleeper API with error handling and logging.
 * 
 * @async
 * @returns {Promise<void>}
 */
async loadPlayers() {
        try {
            this.log('Loading player data...');
            this.log('SleeperAPI available:', typeof SleeperAPI);
            this.log('SleeperAPI.getAllPlayers available:', typeof SleeperAPI.getAllPlayers);
            
            this.players = await SleeperAPI.getAllPlayers();
            this.log(`Loaded ${Object.keys(this.players).length} players`);
        } catch (error) {
            this.log(`Failed to load players: ${error.message}`, 'error');
            console.error('Full error:', error);
        }
    }

    /**
     * Finds and identifies draft interface elements on the page using various selectors.
     * Logs discovered elements for debugging purposes.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async findDraftElements() {
        this.log('Searching for draft interface elements...');

        // Search for player list containers
        const playerContainers = [
            '[class*="draft-board"]',
            '[role="grid"]'
        ];

        for (const selector of playerContainers) {
            const elements = document.querySelectorAll(selector);
            elements.forEach((el, index) => {
                const key = `players-${selector}[${index}]`;
                this.queueElements.set(key, {
                    element: el,
                    selector: selector,
                    type: 'player-container',
                    childCount: el.children.length
                });
                this.log(`Player container found: ${key} with ${el.children.length} children`);
            });
        }
    }

    /**
     * Injects the main UI interface into the page by finding a suitable container
     * and creating the necessary DOM elements.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async injectUI() {
        this.log('Injecting extension UI...');

        // Create floating action button
        const fab = this.createFloatingActionButton();
        document.body.appendChild(fab);

        // Create main interface (initially hidden)
        const mainUI = this.createMainInterface();
        document.body.appendChild(mainUI);

        this.log('UI injection complete');
    }

    /**
     * Creates a floating action button for easy access to the draft helper interface.
     * 
     * @returns {HTMLElement} The floating action button element
     */
    createFloatingActionButton() {
        const fab = document.createElement('div');
        fab.id = 'sleeper-helper-fab';
        fab.className = 'sleeper-fab';
        fab.innerHTML = `
            <div class="sleeper-fab-icon">📋</div>
            <div class="sleeper-fab-tooltip">Draft Queue Helper</div>
        `;
        
        fab.addEventListener('click', () => {
            this.toggleMainInterface();
        });

        return fab;
    }

    /**
     * Creates the main interface container with all necessary UI elements including
     * textarea, buttons, results area, and settings panel.
     * 
     * @returns {HTMLElement} The main interface container element
     */
    createMainInterface() {
        const container = document.createElement('div');
        container.id = 'sleeper-helper-main';
        container.className = 'sleeper-main-interface hidden';
        
        container.innerHTML = `
            <div class="sleeper-header">
                <h3>🏈 Draft Queue Helper</h3>
                <div class="sleeper-header-actions">
                    <button class="sleeper-settings-btn" id="settings-btn" title="Settings">⚙️</button>
                    <button class="sleeper-close" onclick="document.getElementById('sleeper-helper-main').classList.add('hidden')">×</button>
                </div>
            </div>
            
            <div class="sleeper-content">
                <div class="sleeper-section">
                    <label>Paste player names (one per line):</label>
                    <textarea id="player-input" placeholder="Josh Allen&#10;Christian McCaffrey&#10;Tyreek Hill&#10;..." 
                              title="Tip: Use Ctrl+V to paste, Ctrl+A to select all"></textarea>
                    <div class="sleeper-actions">
                        <button id="analyze-players" class="sleeper-btn" title="Shortcut: Ctrl+Enter">Analyze Players</button>
                        <button id="validate-queue" class="sleeper-btn" title="Check which players are already queued">Validate Queue</button>
                        <button id="queue-players" class="sleeper-btn primary" title="Add analyzed players to queue">Add to Queue</button>
                        <button id="clear-queue" class="sleeper-btn secondary" title="Remove all players from queue">Clear Queue</button>
                    </div>
                    <div id="analysis-results" class="sleeper-results"></div>
                </div>
                
                <!-- Settings Panel (hidden by default) -->
                <div id="settings-panel" class="sleeper-settings hidden">
                    <h4>⚙️ Settings</h4>
                    <div class="setting-item">
                        <label>
                            <input type="number" id="delay-setting" min="50" max="1000" value="150" />
                            Delay between operations (ms)
                        </label>
                    </div>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" id="auto-scroll-setting" checked />
                            Auto-scroll to show progress
                        </label>
                    </div>
                    <div class="setting-item">
                        <label>
                            <input type="checkbox" id="sound-notifications" />
                            Sound notifications when complete
                        </label>
                    </div>
                    <div class="setting-item">
                        <button id="reset-settings" class="sleeper-btn secondary">Reset to Defaults</button>
                    </div>
                </div>
            </div>
            <div class="sleeper-resize-handle"></div>
        `;

        this.setupEventListeners(container);
        return container;
    }

    /**
     * Sets up event listeners for the main interface buttons and interactions.
     * 
     * @param {HTMLElement} container - The main interface container
     */
    setupEventListeners(container) {
        // Player analysis
        const analyzeBtn = container.querySelector('#analyze-players');
        analyzeBtn.addEventListener('click', () => this.analyzePlayers());

        // Validate queue
        const validateBtn = container.querySelector('#validate-queue');
        validateBtn.addEventListener('click', () => this.validateQueue());

        // Queue players
        const queueBtn = container.querySelector('#queue-players');
        queueBtn.addEventListener('click', () => this.queuePlayers());

        // Clear queue
        const clearQueueBtn = container.querySelector('#clear-queue');
        clearQueueBtn.addEventListener('click', () => this.clearQueue());

        // Settings panel
        const settingsBtn = container.querySelector('#settings-btn');
        const settingsPanel = container.querySelector('#settings-panel');
        settingsBtn.addEventListener('click', () => {
            settingsPanel.classList.toggle('hidden');
        });

        // Settings functionality
        this.setupSettingsHandlers(container);

        // Keyboard shortcuts
        this.setupKeyboardShortcuts(container);

        // Setup resize functionality
        this.setupResizeHandlers(container);
    }

    /**
     * Sets up event handlers for the settings panel controls.
     * 
     * @param {HTMLElement} container - The main interface container
     */
    setupSettingsHandlers(container) {
        const delayInput = container.querySelector('#delay-setting');
        const autoScrollInput = container.querySelector('#auto-scroll-setting');
        const soundInput = container.querySelector('#sound-notifications');
        const resetBtn = container.querySelector('#reset-settings');

        // Load saved settings
        this.loadSettings();

        // Save settings on change
        delayInput.addEventListener('change', () => {
            this.settings.delay = parseInt(delayInput.value);
            this.saveSettings();
        });

        autoScrollInput.addEventListener('change', () => {
            this.settings.autoScroll = autoScrollInput.checked;
            this.saveSettings();
        });

        soundInput.addEventListener('change', () => {
            this.settings.soundNotifications = soundInput.checked;
            this.saveSettings();
        });

        resetBtn.addEventListener('click', () => {
            this.resetSettings();
            this.loadSettings();
        });
    }

    /**
     * Sets up keyboard shortcuts for the interface.
     * 
     * @param {HTMLElement} container - The main interface container
     */
    setupKeyboardShortcuts(container) {
        const playerInput = container.querySelector('#player-input');
        
        // Add keyboard event listener to the container
        container.addEventListener('keydown', (e) => {
            // Ctrl+Enter to analyze players
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.analyzePlayers();
            }
            
            // Escape to close modal
            if (e.key === 'Escape') {
                container.classList.add('hidden');
            }
        });

        // Focus management
        playerInput.addEventListener('keydown', (e) => {
            // Ctrl+A to select all text
            if (e.ctrlKey && e.key === 'a') {
                e.stopPropagation(); // Let the default behavior work for textarea
            }
        });
    }

    /**
     * Loads user settings from storage with fallback to default values.
     * Updates UI elements to reflect current settings.
     * 
     * @returns {Object} The loaded settings object
     */
    loadSettings() {
        const defaultSettings = {
            delay: 150,
            autoScroll: true,
            soundNotifications: false
        };

        try {
            const saved = localStorage.getItem('sleeper-helper-settings');
            this.settings = saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
        } catch (error) {
            this.settings = defaultSettings;
        }

        // Apply to UI
        const delayInput = document.getElementById('delay-setting');
        const autoScrollInput = document.getElementById('auto-scroll-setting');
        const soundInput = document.getElementById('sound-notifications');

        if (delayInput) delayInput.value = this.settings.delay;
        if (autoScrollInput) autoScrollInput.checked = this.settings.autoScroll;
        if (soundInput) soundInput.checked = this.settings.soundNotifications;
    }

    /**
     * Saves current settings to localStorage.
     * 
     * @returns {void}
     */
    saveSettings() {
        try {
            localStorage.setItem('sleeper-helper-settings', JSON.stringify(this.settings));
        } catch (error) {
            this.log('Failed to save settings', 'warn');
        }
    }

    /**
     * Resets settings to default values and removes from localStorage.
     * 
     * @returns {void}
     */
    resetSettings() {
        localStorage.removeItem('sleeper-helper-settings');
        this.settings = {
            delay: 150,
            autoScroll: true,
            soundNotifications: false
        };
    }

    /**
     * Plays a notification sound if sound notifications are enabled in settings.
     * 
     * @returns {void}
     */
    playNotificationSound() {
        if (this.settings?.soundNotifications) {
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.3);
            } catch (error) {
                this.log('Could not play notification sound', 'warn');
            }
        }
    }

    /**
     * Sets up resize handlers for the main interface container.
     * Allows users to resize the interface by dragging the resize handle.
     * 
     * @param {HTMLElement} container - The main interface container
     */
    setupResizeHandlers(container) {
        const resizeHandle = container.querySelector('.sleeper-resize-handle');
        let isResizing = false;
        let startX, startY, startWidth, startHeight;

        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = parseInt(document.defaultView.getComputedStyle(container).width, 10);
            startHeight = parseInt(document.defaultView.getComputedStyle(container).height, 10);
            
            document.addEventListener('mousemove', handleResize);
            document.addEventListener('mouseup', stopResize);
            e.preventDefault();
        });

        function handleResize(e) {
            if (!isResizing) return;
            
            const newWidth = Math.max(600, startWidth + e.clientX - startX);
            const newHeight = Math.max(300, startHeight + e.clientY - startY);
            
            container.style.width = newWidth + 'px';
            container.style.height = newHeight + 'px';
            
            // Adjust content height
            const header = container.querySelector('.sleeper-header');
            const headerHeight = header.offsetHeight;
            const content = container.querySelector('.sleeper-content');
            content.style.maxHeight = (newHeight - headerHeight - 20) + 'px';
        }

        function stopResize() {
            isResizing = false;
            document.removeEventListener('mousemove', handleResize);
            document.removeEventListener('mouseup', stopResize);
        }
    }

    /**
     * Toggles the visibility of the main interface.
     * 
     * @returns {void}
     */
    toggleMainInterface() {
        const main = document.getElementById('sleeper-helper-main');
        if (main.classList.contains('hidden')) {
            main.classList.remove('hidden');
        } else {
            main.classList.add('hidden');
        }
    }

    /**
     * Analyzes player names from input text against the Sleeper player database.
     * Displays match results with confidence scores and player information.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async analyzePlayers() {
        const input = document.getElementById('player-input');
        const results = document.getElementById('analysis-results');
        const analyzeBtn = document.getElementById('analyze-players');
        
        const playerNames = input.value.split('\n')
            .map(name => name.trim())
            .filter(name => name.length > 0);

        if (playerNames.length === 0) {
            this.showError(results, 'Please enter player names');
            return;
        }

        // Enhanced loading state
        this.setButtonLoading(analyzeBtn, true);
        results.className = 'sleeper-results loading';
        results.innerHTML = `
            <div class="loading">Analyzing ${playerNames.length} players...</div>
            <div class="sleeper-progress">
                <div class="sleeper-progress-bar" id="analysis-progress"></div>
            </div>
        `;

        try {
            const analysis = [];
            const progressBar = document.getElementById('analysis-progress');

            for (let i = 0; i < playerNames.length; i++) {
                const name = playerNames[i];
                
                // Update progress
                const progress = ((i + 1) / playerNames.length) * 100;
                if (progressBar) {
                    progressBar.style.width = `${progress}%`;
                }
                
                // Update status
                results.querySelector('.loading').textContent = `Analyzing ${name}... (${i + 1}/${playerNames.length})`;
                
                try {
                    const matches = NameMatcher.findPlayerMatches(name, this.players, { requireActive: false, preferActive: true });
                    analysis.push({
                        input: name,
                        matches: matches,
                        bestMatch: matches[0] || null
                    });
                } catch (matchError) {
                    this.log(`Error matching player ${name}: ${matchError.message}`, 'warn');
                    analysis.push({
                        input: name,
                        matches: [],
                        bestMatch: null,
                        error: matchError.message
                    });
                }
                
                // Small delay for smoother UI updates
                if (i < playerNames.length - 1) {
                    await this.delay(50);
                }
            }

            results.className = 'sleeper-results success';
            this.displayAnalysisResults(analysis);

        } catch (error) {
            results.className = 'sleeper-results error';
            this.showError(results, `Analysis failed: ${error.message}`);
            this.log(`Analysis error: ${error.message}`, 'error');
        } finally {
            this.setButtonLoading(analyzeBtn, false);
        }
    }

    /**
     * Displays the results of player analysis in a formatted HTML structure.
     * Shows match quality, player details, and enables queue operations.
     * 
     * @param {Array} analysis - Array of analysis results for each player
     */
    displayAnalysisResults(analysis) {
        const results = document.getElementById('analysis-results');
        
        // Count how many players were actually found (have matches)
        const foundCount = analysis.filter(item => item.bestMatch).length;
        const totalCount = analysis.length;
        
        let html = `<div class="analysis-summary">Found ${foundCount} out of ${totalCount} players:</div>`;
        
        analysis.forEach((item, index) => {
            const bestMatch = item.bestMatch;
            
            if (bestMatch) {
                const confidence = Math.round(bestMatch.confidence * 100);
                const confidenceClass = confidence >= 80 ? 'high' : confidence >= 60 ? 'medium' : 'low';
                
                html += `<div class="result-item ${confidenceClass}">
                    <div class="player-match">
                        ${item.input} → ${bestMatch.full_name} (${bestMatch.position}) 
                        <span class="confidence">${confidence}%</span>
                    </div>
                </div>`;
            } else {
                html += `<div class="result-item error">
                    <div class="player-match">${item.input} → No match found</div>
                </div>`;
            }
        });

        results.innerHTML = html;
        
        // Store analysis for queue manipulation
        this.lastAnalysis = analysis.filter(item => item.bestMatch);
        
        // Update button state
        const queueBtn = document.getElementById('queue-players');
        queueBtn.disabled = this.lastAnalysis.length === 0;
        queueBtn.textContent = `Add ${this.lastAnalysis.length} Players to Queue`;
    }

    /**
     * Validates input player names against the current draft queue to check
     * which players are already queued and which are missing.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async validateQueue() {
        const input = document.getElementById('player-input');
        const results = document.getElementById('analysis-results');
        
        const playerNames = input.value.split('\n')
            .map(name => name.trim())
            .filter(name => name.length > 0);

        if (playerNames.length === 0) {
            results.innerHTML = '<div class="error">Please enter player names to validate against queue</div>';
            return;
        }

        results.innerHTML = '<div class="loading">Validating queue...</div>';

        try {
            // Get current queue players
            const queuedPlayers = await this.findQueuedPlayers();
            this.log(`Found ${queuedPlayers.length} players currently in queue`);

            // Analyze input players
            const inputAnalysis = [];
            for (const name of playerNames) {
                const matches = NameMatcher.findPlayerMatches(name, this.players, { requireActive: false, preferActive: true });
                inputAnalysis.push({
                    input: name,
                    matches: matches,
                    bestMatch: matches[0] || null
                });
            }

            // Compare input vs queue
            const validation = this.compareInputWithQueue(inputAnalysis, queuedPlayers);
            this.displayValidationResults(validation, queuedPlayers.length);

        } catch (error) {
            results.innerHTML = `<div class="error">Validation failed: ${error.message}</div>`;
            this.log(`Validation error: ${error.message}`, 'error');
        }
    }

    /**
     * Compares analyzed input players with the current queue to determine
     * which players are already queued and which are not.
     * 
     * @param {Array} inputAnalysis - Array of analyzed input players
     * @param {Array} queuedPlayers - Array of currently queued players
     * @returns {Object} Object containing inQueue, notInQueue, and invalidInputs arrays
     */
    compareInputWithQueue(inputAnalysis, queuedPlayers) {
        const queueNames = queuedPlayers.map(q => q.name.toLowerCase());
        
        const inQueue = [];
        const notInQueue = [];
        const invalidInputs = [];

        for (const item of inputAnalysis) {
            if (!item.bestMatch) {
                invalidInputs.push(item.input);
                continue;
            }

            const playerName = item.bestMatch.full_name.toLowerCase();
            const isQueued = queueNames.some(queueName => 
                this.namesMatch(playerName, queueName)
            );

            if (isQueued) {
                inQueue.push({
                    input: item.input,
                    match: item.bestMatch,
                    confidence: item.bestMatch.confidence
                });
            } else {
                notInQueue.push({
                    input: item.input,
                    match: item.bestMatch,
                    confidence: item.bestMatch.confidence
                });
            }
        }

        return { inQueue, notInQueue, invalidInputs };
    }

    /**
     * Compares two player names for matching using various normalization
     * and fuzzy matching techniques.
     * 
     * @param {string} name1 - First player name to compare
     * @param {string} name2 - Second player name to compare
     * @returns {boolean} True if names match, false otherwise
     */
    namesMatch(name1, name2) {
        // Simple name matching - enhanced for better matching
        const normalize = name => name.toLowerCase().replace(/[^a-z\s]/g, '').trim();
        const n1 = normalize(name1);
        const n2 = normalize(name2);
        
        // Exact match
        if (n1 === n2) return true;
        
        // Split into words
        const words1 = n1.split(/\s+/).filter(w => w.length > 0);
        const words2 = n2.split(/\s+/).filter(w => w.length > 0);
        
        // If either name has only one word, check if it's contained in the other
        if (words1.length === 1 || words2.length === 1) {
            return n1.includes(n2) || n2.includes(n1);
        }
        
        // If both have multiple words, check various combinations
        if (words1.length >= 2 && words2.length >= 2) {
            // Check if first and last words match
            const firstMatch = words1[0] === words2[0];
            const lastMatch = words1[words1.length - 1] === words2[words2.length - 1];
            
            if (firstMatch && lastMatch) return true;
            
            // Check if first name of one matches first name of other, and any other word matches
            if (firstMatch) {
                for (let i = 1; i < words1.length; i++) {
                    for (let j = 1; j < words2.length; j++) {
                        if (words1[i] === words2[j]) return true;
                    }
                }
            }
        }
        
        // Check if one name is a subset of the other (useful for nicknames)
        const allWords1 = words1.join(' ');
        const allWords2 = words2.join(' ');
        if (allWords1.includes(allWords2) || allWords2.includes(allWords1)) {
            return true;
        }
        
        return false;
    }

    /**
     * Displays validation results comparing input players with current queue.
     * Shows which players are already queued, not queued, or invalid.
     * 
     * @param {Object} validation - Validation results object
     * @param {number} queueSize - Number of players currently in queue
     */
    displayValidationResults(validation, queueSize) {
        const results = document.getElementById('analysis-results');
        const { inQueue, notInQueue, invalidInputs } = validation;
        
        const totalInput = inQueue.length + notInQueue.length + invalidInputs.length;
        
        let html = `<div class="analysis-summary">Queue Validation Results (${queueSize} players in queue):</div>`;
        
        // Players already in queue
        if (inQueue.length > 0) {
            html += `<div class="validation-section">
                <h4 class="validation-header">✅ Already in Queue (${inQueue.length}):</h4>`;
            inQueue.forEach(item => {
                const confidence = Math.round(item.confidence * 100);
                html += `<div class="result-item high">
                    <div class="player-match">
                        ${item.input} → ${item.match.full_name} (${item.match.position})
                        <span class="confidence">${confidence}%</span>
                    </div>
                </div>`;
            });
            html += `</div>`;
        }

        // Players not in queue
        if (notInQueue.length > 0) {
            html += `<div class="validation-section">
                <h4 class="validation-header">❌ Not in Queue (${notInQueue.length}):</h4>`;
            notInQueue.forEach(item => {
                const confidence = Math.round(item.confidence * 100);
                const confidenceClass = confidence >= 80 ? 'high' : confidence >= 60 ? 'medium' : 'low';
                html += `<div class="result-item ${confidenceClass}">
                    <div class="player-match">
                        ${item.input} → ${item.match.full_name} (${item.match.position})
                        <span class="confidence">${confidence}%</span>
                    </div>
                </div>`;
            });
            html += `</div>`;
        }

        // Invalid inputs
        if (invalidInputs.length > 0) {
            html += `<div class="validation-section">
                <h4 class="validation-header">⚠️ Invalid Players (${invalidInputs.length}):</h4>`;
            invalidInputs.forEach(input => {
                html += `<div class="result-item error">
                    <div class="player-match">${input} → No match found</div>
                </div>`;
            });
            html += `</div>`;
        }

        // Summary
        html += `<div class="validation-summary">
            <strong>Summary:</strong> ${inQueue.length}/${totalInput - invalidInputs.length} players found in queue
        </div>`;

        results.innerHTML = html;
    }

    /**
     * Queues all previously analyzed players by attempting to add them to the draft queue.
     * Shows progress and results for each player addition attempt.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async queuePlayers() {
        if (!this.lastAnalysis || this.lastAnalysis.length === 0) {
            this.log('No analyzed players to queue', 'error');
            this.showError(document.getElementById('analysis-results'), 'No analyzed players to queue');
            return;
        }

        this.log(`Starting queue operation for ${this.lastAnalysis.length} players`);
        const results = document.getElementById('analysis-results');
        const queueBtn = document.getElementById('queue-players');
        
        // Enhanced loading state with progress
        this.setButtonLoading(queueBtn, true);
        results.className = 'sleeper-results loading';
        results.innerHTML = `
            <div class="loading">Adding ${this.lastAnalysis.length} players to queue...</div>
            <div class="sleeper-progress">
                <div class="sleeper-progress-bar" id="queue-progress"></div>
            </div>
            <div id="queue-status"></div>
        `;

        try {
            let successCount = 0;
            let failureCount = 0;
            const queueResults = [];
            const progressBar = document.getElementById('queue-progress');
            const statusDiv = document.getElementById('queue-status');

            for (let i = 0; i < this.lastAnalysis.length; i++) {
                const analysis = this.lastAnalysis[i];
                const player = analysis.bestMatch;
                
                // Update progress
                const progress = ((i + 1) / this.lastAnalysis.length) * 100;
                if (progressBar) progressBar.style.width = `${progress}%`;
                if (statusDiv) statusDiv.textContent = `Processing ${player.full_name}... (${i + 1}/${this.lastAnalysis.length})`;
                
                this.log(`Processing player ${i + 1}/${this.lastAnalysis.length}: ${player.full_name}`);

                try {
                    const success = await this.addPlayerToQueue(player.full_name);
                    
                    if (success) {
                        successCount++;
                        queueResults.push({
                            player: player.full_name,
                            status: 'success',
                            message: 'Added to queue'
                        });
                        this.log(`✅ Added ${player.full_name} to queue`);
                    } else {
                        failureCount++;
                        queueResults.push({
                            player: player.full_name,
                            status: 'failed',
                            message: 'Could not find player on draft board'
                        });
                        this.log(`❌ Failed to add ${player.full_name} to queue`);
                    }
                } catch (error) {
                    failureCount++;
                    queueResults.push({
                        player: player.full_name,
                        status: 'error',
                        message: error.message
                    });
                    this.log(`❌ Error adding ${player.full_name}: ${error.message}`, 'error');
                }

                // Delay between requests for stability
                if (i < this.lastAnalysis.length - 1) {
                    await this.delay(this.settings?.delay || 150);
                }
            }

            // Display enhanced results
            results.className = successCount > 0 ? 'sleeper-results success' : 'sleeper-results error';
            this.displayQueueResults(queueResults, successCount, failureCount);
            
            // Play notification sound if enabled
            if (successCount > 0) {
                this.playNotificationSound();
            }

        } catch (error) {
            results.className = 'sleeper-results error';
            this.showError(results, `Queue operation failed: ${error.message}`);
            this.log(`Queue operation error: ${error.message}`, 'error');
        } finally {
            this.setButtonLoading(queueBtn, false);
        }
    }

    /**
     * Clears all players from the draft queue by finding and clicking remove buttons.
     * Rescans after each removal to handle dynamic queue updates.
     * 
     * @async
     * @returns {Promise<void>}
     */
    async clearQueue() {
        this.log('Starting queue clear operation...');
        
        const results = document.getElementById('analysis-results');
        const clearBtn = document.getElementById('clear-queue');
        
        // Enhanced loading state
        this.setButtonLoading(clearBtn, true);
        results.className = 'sleeper-results loading';
        results.innerHTML = `
            <div class="loading">Scanning for queued players...</div>
            <div class="sleeper-progress">
                <div class="sleeper-progress-bar" id="clear-progress"></div>
            </div>
            <div id="clear-status"></div>
        `;

        try {
            let queuedPlayers = await this.findQueuedPlayers();
            
            if (queuedPlayers.length === 0) {
                this.showInfo(results, 'No players found in queue to clear.');
                this.log('No queued players found');
                return;
            }

            this.log(`Found ${queuedPlayers.length} players in queue to clear`);
            
            let successCount = 0;
            let failureCount = 0;
            const clearResults = [];
            let totalPlayers = queuedPlayers.length;
            const progressBar = document.getElementById('clear-progress');
            const statusDiv = document.getElementById('clear-status');

            // Process players one by one, re-scanning after each removal
            while (queuedPlayers.length > 0) {
                const queuedPlayer = queuedPlayers[0];
                const currentIndex = totalPlayers - queuedPlayers.length + 1;
                
                // Update progress
                const progress = (currentIndex / totalPlayers) * 100;
                if (progressBar) progressBar.style.width = `${progress}%`;
                if (statusDiv) statusDiv.textContent = `Removing ${queuedPlayer.name}... (${currentIndex}/${totalPlayers})`;
                
                try {
                    this.log(`Removing player ${currentIndex}/${totalPlayers}: ${queuedPlayer.name}`);
                    
                    const success = await this.removePlayerFromQueue(queuedPlayer);
                    
                    if (success) {
                        successCount++;
                        clearResults.push({
                            player: queuedPlayer.name,
                            status: 'success',
                            message: 'Removed from queue'
                        });
                        this.log(`✅ Removed ${queuedPlayer.name} from queue`);
                    } else {
                        failureCount++;
                        clearResults.push({
                            player: queuedPlayer.name,
                            status: 'failed',
                            message: 'Could not find remove button'
                        });
                        this.log(`❌ Failed to remove ${queuedPlayer.name} from queue`);
                    }
                } catch (error) {
                    failureCount++;
                    clearResults.push({
                        player: queuedPlayer.name,
                        status: 'error',
                        message: error.message
                    });
                    this.log(`❌ Error removing ${queuedPlayer.name}: ${error.message}`, 'error');
                }

                // Delay for stability
                await this.delay(this.settings?.delay || 150);
                
                // Re-scan for remaining queued players
                queuedPlayers = await this.findQueuedPlayers();
                this.log(`Re-scan found ${queuedPlayers.length} remaining players in queue`);
                
                // Safety check
                if (currentIndex >= totalPlayers) {
                    this.log('Reached expected total, stopping');
                    break;
                }
            }

            // Display enhanced results
            results.className = successCount > 0 ? 'sleeper-results success' : 'sleeper-results error';
            this.displayClearResults(clearResults, successCount, failureCount, totalPlayers);
            
            // Play notification sound if enabled
            if (successCount > 0) {
                this.playNotificationSound();
            }

        } catch (error) {
            results.className = 'sleeper-results error';
            this.showError(results, `Clear operation failed: ${error.message}`);
            this.log(`Clear operation error: ${error.message}`, 'error');
        } finally {
            this.setButtonLoading(clearBtn, false);
        }
    }

    /**
     * Helper method for displaying clear queue results in a formatted HTML structure.
     * 
     * @param {Array} clearResults - Array of clear operation results
     * @param {number} successCount - Number of successfully removed players
     * @param {number} failureCount - Number of failed removal attempts
     * @param {number} totalPlayers - Total number of players that were in queue
     */
    displayClearResults(clearResults, successCount, failureCount, totalPlayers) {
        const results = document.getElementById('analysis-results');
        
        let html = `
            <div class="analysis-summary">
                Queue Clear Complete: ${successCount}/${totalPlayers} players removed successfully
            </div>
        `;

        clearResults.forEach(result => {
            const statusClass = result.status === 'success' ? 'high' : 'error';
            const statusIcon = result.status === 'success' ? '✅' : '❌';
            
            html += `<div class="result-item ${statusClass}">
                <div class="player-match">
                    ${statusIcon} ${result.player} - ${result.message}
                </div>
            </div>`;
        });

        if (successCount > 0) {
            html += `<div class="success-note">
                🎉 Successfully removed ${successCount} players from your draft queue!
            </div>`;
        }

        if (failureCount > 0) {
            html += `<div class="error-note">
                ⚠️ ${failureCount} players could not be removed. They may have already been removed or the page structure has changed.
            </div>`;
        }

        results.innerHTML = html;
    }

    /**
     * Attempts to add a player to the draft queue by finding and clicking their queue action button.
     * 
     * @param {Object} player - Player object containing player details
     * @async
     * @returns {Promise<boolean>} True if player was successfully added to queue, false otherwise
     */
    async addPlayerToQueue(player) {
        this.log(`Attempting to add ${player.full_name} to queue...`);

        try {
            // Strategy 1: Look for .queue-action div for this player
            this.log(`Strategy 1: Looking for queue-action div for ${player.full_name}`);
            const queueActionButton = await this.findQueueActionByPlayer(player);

            if (queueActionButton) {
                this.log(`Found queue-action div for ${player.full_name}`);

                // Scroll into view and click
                queueActionButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await this.delay(100);

                queueActionButton.click();
                this.log(`✅ Successfully clicked queue-action for ${player.full_name}`);
                return true;
            }

            // No queue-action found
            this.log(`❌ No queue-action found for ${player.full_name}`);
            return false;

        } catch (error) {
            this.log(`❌ Error in addPlayerToQueue for ${player.full_name}: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Finds the queue action button for a specific player by searching through
     * available queue action elements and matching player names.
     * 
     * @param {Object} player - Player object or player name string
     * @async
     * @returns {Promise<HTMLElement|null>} The queue action element if found, null otherwise
     */
    async findQueueActionByPlayer(player) {
        // Handle both string and object formats
        const playerName = typeof player === 'string' ? player : (
            player?.full_name || player?.fullName || `${player?.first_name || ''} ${player?.last_name || ''}`
        ).trim();
        this.log(`Strategy 1: Looking for queue-action div for ${playerName}`);
        
        // Find all queue-action divs
        const queueActions = document.querySelectorAll('.queue-action');
        this.log(`Found ${queueActions.length} total queue-action elements to search`);
        
        for (const queueDiv of queueActions) {
            // Find the player container this queue action belongs to
            const playerContainer = queueDiv.closest('[class*="player"], .player-rank-item, .player-row, tr, li');
            
            if (playerContainer) {
                const containerText = playerContainer.textContent || '';
                
                // Check if this container matches our player
                if (this.checkPlayerNameInText(player, containerText)) {
                    this.log(`Matched queue-action for ${playerName} in: "${containerText.substring(0, 100)}..."`);
                    return queueDiv;
                }
            }
        }
        
        // Enhanced debugging for failed matches
        this.log(`No queue-action match for ${playerName}. Checking available players...`);
        queueActions.forEach((queueDiv, index) => {
            const playerContainer = queueDiv.closest('[class*="player"], .player-rank-item, .player-row, tr, li');
            if (playerContainer && index < 10) { // Show first 10 for debugging
                const text = playerContainer.textContent.slice(0, 80);
                this.log(`Queue ${index}: "${text}"`);
            }
        });
        
        // Check if player is in currently loaded players
        this.log(`🔍 Searching all ${queueActions.length} players for partial matches with "${playerName}"`);
        const specialMatches = this.findAllPlayersWithPartialMatch(playerName, queueActions);
        this.log(`Found ${specialMatches.length} potential matches for "${playerName}"`);
        
        if (specialMatches.length > 0) {
            for (const match of specialMatches) {
                if (this.checkPlayerNameInText(playerName, match.textContent)) {
                    this.log(`✅ Found exact match for ${playerName}!`);
                    return match.querySelector('.queue-action');
                }
            }
        }

        // Player not found in current list - ask for manual search
        this.log(`❌ ${playerName} not found in currently loaded players`);
        return await this.handleMissingPlayer(playerName);
    }

    /**
     * Checks if a player name exists within a given text string using normalization
     * and partial matching techniques.
     * 
     * @param {Object|string} player - Player object or player name string
     * @param {string} text - Text to search within
     * @returns {boolean} True if player name is found in text, false otherwise
     */
    checkPlayerNameInText(player, text) {
        // Handle both string and object formats
        const playerName = typeof player === 'string' ? player : (
            player?.full_name || player?.fullName || `${player?.first_name || ''} ${player?.last_name || ''}`
        ).trim();

        if (!playerName) return false;
        
        const normalizedText = (text || '').toLowerCase().replace(/[^a-z\s]/g, ' ');
        const normalizedPlayerName = playerName.toLowerCase().replace(/[^a-z\s]/g, ' ');
        
        // Check full name match
        if (normalizedText.includes(normalizedPlayerName)) {
            return true;
        }
        
        // Check first and last name separately for partial matches
        const nameParts = normalizedPlayerName.split(' ').filter(part => part.length > 1);
        if (nameParts.length >= 2) {
            const firstName = nameParts[0];
            const lastName = nameParts[nameParts.length - 1];
            
            if (normalizedText.includes(firstName) && normalizedText.includes(lastName)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Handles cases where a player is not found in the current visible list
     * by attempting automatic search using React-based methods.
     * 
     * @param {string} playerName - Name of the player to search for
     * @async
     * @returns {Promise<HTMLElement|null>} The action element if found via search, null otherwise
     */
    async handleMissingPlayer(playerName) {
        this.log(`❌ ${playerName} not found in current player list`);
        this.log(`🔍 Attempting automatic search using React method...`);
        
        try {
            // Try the React-based search for queue-action only
            const actionElement = await this.searchForPlayer(playerName, 'queue-action');
            
            if (actionElement) {
                this.log(`✅ Found ${playerName} via automatic search!`);
                return actionElement;
            }

            // Automatic search failed
            this.log(`❌ Automatic search failed for ${playerName}, skipping`);
            return null;
            
        } catch (error) {
            this.log(`❌ Error during automatic search for ${playerName}: ${error.message}`, 'error');
            return null;
        }
    }
    
    /**
     * Searches for a player using Sleeper's search functionality by interacting
     * with search inputs and filtering results.
     * 
     * @param {string} playerName - Name of the player to search for
     * @param {string} [actionType='queue-action'] - Type of action element to find
     * @async
     * @returns {Promise<HTMLElement|null>} The action element if found, null otherwise
     */
    async searchForPlayer(playerName, actionType = 'queue-action') {
        this.log(`🔍 Searching for ${playerName} using Sleeper's search functionality...`);
        
        // Look for search input field using the provided structure
        const searchSelectors = [
            '.player-search input',
            'input[placeholder*="Find player"]',
            'input[placeholder*="Search"]',
            'input[placeholder*="search"]',
            'input[type="search"]',
            '.search-input',
            '[class*="search"] input',
            'input[placeholder*="player"]',
            'input[placeholder*="Player"]'
        ];
        
        let searchInput = null;
        for (const selector of searchSelectors) {
            const input = document.querySelector(selector);
            if (input) {
                searchInput = input;
                this.log(`Found search input: ${selector}`);
                break;
            }
        }
        
        if (!searchInput) {
            this.log(`❌ No search input found`);
            return null;
        }
        
        // Try different name variations for better matching
        const nameVariations = [
            playerName,
            playerName.replace(/'/g, ''), // Remove apostrophes (Ja'Marr -> JaMarr)
            playerName.split(' ')[0], // First name only
            playerName.split(' ').slice(-1)[0], // Last name only
            playerName.toLowerCase(),
            playerName.toUpperCase()
        ];
        
        for (const nameVariation of nameVariations) {
            this.log(`Trying search variation: "${nameVariation}"`);
            
            try {
                // Clear and focus the search input
                searchInput.focus();
                searchInput.value = '';
                
                // Type the player name variation character by character (more realistic)
                this.log(`Typing "${nameVariation}" into search...`);
                await this.typeTextRealistically(searchInput, nameVariation);
                
                // Wait for search results to load and stabilize
                this.log(`Waiting for search results to load...`);
                await new Promise(resolve => setTimeout(resolve, 100)); // BLAZING FAST!
                
                // Check current search results
                const actionElements = document.querySelectorAll(`.${actionType}`);
                this.log(`Found ${actionElements.length} action elements after searching for "${nameVariation}"`);
                
                let visiblePlayers = [];
                actionElements.forEach((actionElement, index) => {
                    if (index < 5) { // Show first 5
                        const playerContainer = actionElement.closest('[class*="player"], .player-rank-item, .player-row, tr, li');
                        if (playerContainer) {
                            const text = playerContainer.textContent.slice(0, 50);
                            visiblePlayers.push(text);
                        }
                    }
                });
                this.log(`Visible players after search: ${visiblePlayers.join(' | ')}`);
                
                // Look for the player in the filtered results
                for (const actionElement of actionElements) {
                    const playerContainer = actionElement.closest('[class*="player"], .player-rank-item, .player-row, tr, li');
                    if (playerContainer && this.checkPlayerNameInText(playerName, playerContainer.textContent)) {
                        this.log(`✅ Found ${playerName} via search with variation "${nameVariation}"!`);
                        
                        // Verify the button is clickable before proceeding
                        if (!actionElement.offsetParent) {
                            this.log(`❌ Button for ${playerName} is not visible, waiting longer...`);
                            await new Promise(resolve => setTimeout(resolve, 100)); // BLAZING FAST!
                            if (!actionElement.offsetParent) {
                                this.log(`❌ Button still not visible, skipping this variation`);
                                continue;
                            }
                        }
                        
                        // Click the button BEFORE clearing search (while results are still filtered)
                        this.log(`🎯 Clicking queue button for ${playerName}...`);
                        actionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        await new Promise(resolve => setTimeout(resolve, 100)); // BLAZING FAST!
                        
                        // Click the button
                        actionElement.click();
                        this.log(`✅ Clicked queue button for ${playerName}`);
                        
                        // Wait a moment for the action to register
                        await new Promise(resolve => setTimeout(resolve, 100)); // BLAZING FAST!
                        
                        // NOW clear the search to restore full list
                        this.log(`🧹 Clearing search to restore full player list...`);
                        await this.clearSearchInput(searchInput);
                        
                        return actionElement;
                    }
                }
                
                this.log(`❌ ${playerName} not found with variation "${nameVariation}"`);
                
                // Try alternative search triggers if this is the second attempt
                if (nameVariation === nameVariations[1]) {
                    this.log('🔄 Trying alternative search triggers...');
                    await this.tryAlternativeSearchTriggers(searchInput, nameVariation);
                    
                    // Check again after alternative triggers
                    await new Promise(resolve => setTimeout(resolve, 100)); // BLAZING FAST!
                    const newActionElements = document.querySelectorAll(`.${actionType}`);
                    this.log(`After alternative triggers: ${newActionElements.length} action elements`);
                    
                    for (const actionElement of newActionElements) {
                        const playerContainer = actionElement.closest('[class*="player"], .player-rank-item, .player-row, tr, li');
                        if (playerContainer && this.checkPlayerNameInText(playerName, playerContainer.textContent)) {
                            this.log(`✅ Found ${playerName} via alternative triggers!`);
                            await this.clearSearchInput(searchInput);
                            return actionElement;
                        }
                    }
                }
            } catch (error) {
                this.log(`❌ Error during search with "${nameVariation}": ${error.message}`);
            }
        }
        
        // Clear the search after all attempts
        try {
            await this.clearSearchInput(searchInput);
        } catch (error) {
            this.log(`Error clearing search: ${error.message}`);
        }
        
        this.log(`❌ ${playerName} not found with any search variation`);
        return null;
    }

    async tryAlternativeSearchTriggers(input, text) {
        this.log('🔄 Trying alternative search triggers...');
        
        // Method 1: Try clicking the input and then typing
        input.click();
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Method 2: Try setting innerHTML instead of value
        const originalValue = input.value;
        input.innerHTML = text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Method 3: Try triggering a paste event
        try {
            const pasteEvent = new ClipboardEvent('paste', {
                bubbles: true,
                cancelable: true
            });
            input.dispatchEvent(pasteEvent);
        } catch (e) {
            // Fallback if ClipboardEvent not supported
            input.dispatchEvent(new Event('paste', { bubbles: true }));
        }
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Method 4: Try triggering on parent elements
        const parent = input.parentElement;
        if (parent) {
            parent.dispatchEvent(new Event('input', { bubbles: true }));
            parent.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Method 5: Try dispatching custom events
        input.dispatchEvent(new CustomEvent('search', { detail: text, bubbles: true }));
        input.dispatchEvent(new CustomEvent('filter', { detail: text, bubbles: true }));
        
        // Method 6: Try simulating user interaction events
        input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        input.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        input.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
        
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    /**
     * Types text into an input field using React's onChange handler for compatibility
     * with React-based interfaces.
     * 
     * @param {HTMLElement} input - Input element to type into
     * @param {string} text - Text to type
     * @async
     * @returns {Promise<boolean>} True if typing was successful, false otherwise
     */
    async typeTextRealistically(input, text) {
        this.log(`🔧 Using React onChange method to search for "${text}"`);
        
        try {
            // Find React fiber and onChange handler
            const reactKeys = Object.keys(input).filter(key => 
                key.startsWith('__reactFiber') || 
                key.startsWith('__reactInternalInstance')
            );
            
            if (reactKeys.length === 0) {
                this.log('❌ No React fiber found — no DOM fallback configured, skipping');
                return false;
            }
            
            const fiber = input[reactKeys[0]];
            const props = fiber?.memoizedProps;
            
            if (!props || !props.onChange) {
                this.log('❌ No React onChange handler found — no DOM fallback configured, skipping');
                return false;
            }
            
            this.log('✅ Found React onChange handler, calling it directly');
            
            // Create synthetic event matching React's expected structure
            const syntheticEvent = {
                target: { value: text },
                currentTarget: input,
                type: 'change',
                bubbles: true,
                preventDefault: () => {},
                stopPropagation: () => {},
                persist: () => {}
            };
            
            // Set the input value and call React's onChange
            input.value = text;
            props.onChange(syntheticEvent);
            
            this.log(`🎯 React onChange called with "${text}"`);
            
            // Give the React state update time to process
            await new Promise(resolve => setTimeout(resolve, 500));
            
            return true;
            
        } catch (error) {
            this.log(`❌ React search failed: ${error.message}`, 'error');
            return false;
        }
    }

    /**
     * Clears a search input field using React's onChange handler to properly
     * reset React state and trigger re-renders.
     * 
     * @param {HTMLElement} input - Input element to clear
     * @async
     * @returns {Promise<void>}
     */
    async clearSearchInput(input) {
        this.log('🧹 Clearing search input using React method...');
        
        try {
            // Try React approach only
            const reactKeys = Object.keys(input).filter(key => 
                key.startsWith('__reactFiber') || 
                key.startsWith('__reactInternalInstance')
            );
            
            if (reactKeys.length > 0) {
                const fiber = input[reactKeys[0]];
                const props = fiber?.memoizedProps;
                
                if (props && props.onChange) {
                    this.log('✅ Using React onChange to clear search');
                    
                    // Create synthetic event for empty value
                    const syntheticEvent = {
                        target: { value: '' },
                        currentTarget: input,
                        type: 'change',
                        bubbles: true,
                        preventDefault: () => {},
                        stopPropagation: () => {},
                        persist: () => {}
                    };
                    
                    // Clear the input and call React onChange
                    input.value = '';
                    props.onChange(syntheticEvent);
                    
                    await new Promise(resolve => setTimeout(resolve, 500));
                    this.log('✅ Search input cleared via React');
                    return;
                }
            }
            
            this.log('❌ No React onChange handler found — no DOM fallback configured, skipping clear');
            
        } catch (error) {
            this.log(`❌ React clear failed: ${error.message}`, 'error');
        }
    }

    /**
     * Finds all players that have partial name matches with the target name.
     * Useful for fuzzy searching when exact matches aren't found.
     * 
     * @param {string} targetName - Target player name to search for
     * @param {NodeList} actionElements - Collection of action elements to search through
     * @returns {Array} Array of match objects with match details
     */
    findAllPlayersWithPartialMatch(targetName, actionElements) {
        this.log(`🔍 Searching all ${actionElements.length} players for partial matches with "${targetName}"`);
        
        const targetParts = targetName.toLowerCase().split(' ');
        const matches = [];
        
        actionElements.forEach((actionElement, index) => {
            const playerContainer = actionElement.closest('[class*="player"], .player-rank-item, .player-row, tr, li');
            if (playerContainer) {
                const text = playerContainer.textContent.toLowerCase();
                
                // Check for partial matches
                const hasFirstName = targetParts[0] && text.includes(targetParts[0]);
                const hasLastName = targetParts[1] && text.includes(targetParts[1]);
                
                if (hasFirstName || hasLastName) {
                    matches.push({
                        index,
                        text: playerContainer.textContent.slice(0, 100),
                        hasFirstName,
                        hasLastName
                    });
                }
            }
        });
        
        this.log(`Found ${matches.length} potential matches for "${targetName}"`);
        matches.forEach(match => {
            this.log(`  Match ${match.index}: "${match.text}" (First: ${match.hasFirstName}, Last: ${match.hasLastName})`);
        });
        
        return matches;
    }

    /**
     * Displays the results of queue operations in a formatted HTML structure.
     * 
     * @param {Array} queueResults - Array of queue operation results
     * @param {number} successCount - Number of successfully queued players
     * @param {number} failureCount - Number of failed queue attempts
     */
    displayQueueResults(queueResults, successCount, failureCount) {
        const results = document.getElementById('analysis-results');
        
        let html = `<div class="queue-summary">
            Queue Results: ${successCount} added, ${failureCount} failed
        </div>`;

        queueResults.forEach(result => {
            const statusClass = result.status === 'success' ? 'high' : 'error';
            const statusIcon = result.status === 'success' ? '✅' : '❌';
            
            html += `<div class="result-item ${statusClass}">
                <div class="player-match">
                    ${statusIcon} ${result.player} - ${result.message}
                </div>
            </div>`;
        });

        if (successCount > 0) {
            html += `<div class="success-note">
                🎉 Successfully added ${successCount} players to your draft queue!
            </div>`;
        }

        if (failureCount > 0) {
            html += `<div class="error-note">
                ⚠️ ${failureCount} players could not be added. Try refreshing the page or checking if the players are visible in the draft board.
            </div>`;
        }

        results.innerHTML = html;
    }

    /**
     * Finds all players currently in the draft queue by locating delete/remove buttons
     * and extracting associated player information.
     * 
     * @async
     * @returns {Promise<Array>} Array of queued player objects with name, element, and removeButton
     */
    async findQueuedPlayers() {
        this.log('Looking for queued players with .delete-button elements...');
        const queuedPlayers = [];

        // Look specifically for .delete-button elements with "REMOVE" text
        const deleteButtons = document.querySelectorAll('.delete-button');
        this.log(`Found ${deleteButtons.length} .delete-button elements`);

        for (const deleteButton of deleteButtons) {
            const buttonText = (deleteButton.textContent || '').trim().toLowerCase();
            
            // Verify this is actually a "REMOVE" button
            if (buttonText === 'remove') {
                // Find the player container this remove button belongs to
                const playerContainer = deleteButton.closest('[class*="player"], .player-item, tr, li, .queue-item, [class*="queue"]');
                
                if (playerContainer) {
                    const playerText = playerContainer.textContent || '';
                    const playerName = this.extractPlayerName(playerText);
                    
                    if (playerName) {
                        this.log(`Found queued player: ${playerName}`);
                        queuedPlayers.push({
                            name: playerName,
                            element: playerContainer,
                            removeButton: deleteButton
                        });
                    }
                } else {
                    // If no clear container, try to find nearby player text
                    const nearbyText = this.getNearbyText(deleteButton, 100);
                    const playerName = this.extractPlayerName(nearbyText);
                    
                    if (playerName) {
                        this.log(`Found queued player (nearby): ${playerName}`);
                        queuedPlayers.push({
                            name: playerName,
                            element: deleteButton.parentElement || deleteButton,
                            removeButton: deleteButton
                        });
                    }
                }
            }
        }

        this.log(`Found ${queuedPlayers.length} queued players with REMOVE buttons`);
        return queuedPlayers;
    }

    /**
     * Extracts player name from text by removing common UI elements and
     * filtering out positions and numbers.
     * 
     * @param {string} text - Text containing player information
     * @returns {string|null} Extracted player name or null if unable to extract
     */
    extractPlayerName(text) {
        // Clean up the text and extract player name
        const cleanText = text.trim()
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/REMOVE/gi, '') // Remove the REMOVE text
            .replace(/\s*$/, ''); // Trim trailing space
        
        // Look for typical player name patterns
        const words = cleanText.split(/\s+/).filter(word => word.length > 0);
        
        if (words.length >= 2) {
            // Take first 2-3 words as player name, avoiding numbers and positions
            let nameWords = [];
            for (let i = 0; i < Math.min(3, words.length); i++) {
                const word = words[i];
                // Skip if it looks like a position (QB, RB, WR, TE, etc) or number
                if (!/^(QB|RB|WR|TE|K|DEF|DST|\d+)$/i.test(word)) {
                    nameWords.push(word);
                }
                // Stop if we have 2 good name words
                if (nameWords.length >= 2) break;
            }
            
            if (nameWords.length >= 2) {
                return nameWords.join(' ');
            }
        }
        
        // Fallback: just take first 2 words if available
        if (words.length >= 2) {
            return words.slice(0, 2).join(' ');
        }
        
        return null;
    }

    /**
     * Removes a player from the draft queue by clicking their remove button.
     * Includes validation to ensure the button still exists and is clickable.
     * 
     * @param {Object} queuedPlayer - Queued player object with name and removeButton
     * @async
     * @returns {Promise<boolean>} True if player was successfully removed, false otherwise
     */
    async removePlayerFromQueue(queuedPlayer) {
        this.log(`Attempting to remove ${queuedPlayer.name} from queue...`);

        try {
            // Check if the button still exists (DOM might have changed)
            if (!document.contains(queuedPlayer.removeButton)) {
                this.log(`Remove button for ${queuedPlayer.name} no longer exists in DOM`);
                return false;
            }

            // Scroll the remove button into view
            queuedPlayer.removeButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await this.delay(100); // BLAZING FAST!

            // Double-check the button is still clickable
            if (!queuedPlayer.removeButton.offsetParent) {
                this.log(`Remove button for ${queuedPlayer.name} is not visible`);
                return false;
            }

            // Click the remove button
            queuedPlayer.removeButton.click();
            await this.delay(100); // BLAZING FAST!

            this.log(`✅ Successfully clicked remove button for ${queuedPlayer.name}`);
            return true;

        } catch (error) {
            this.log(`❌ Failed to remove ${queuedPlayer.name}: ${error.message}`, 'error');
            return false;
        }
    }

    displayClearResults(clearResults, successCount, failureCount) {
        const results = document.getElementById('analysis-results');
        
        let html = `<div class="queue-summary">
            Clear Queue Results: ${successCount} removed, ${failureCount} failed
        </div>`;

        clearResults.forEach(result => {
            const statusClass = result.status === 'success' ? 'good' : 'error';
            const statusIcon = result.status === 'success' ? '✅' : '❌';
            
            html += `<div class="player-result ${statusClass}">
                <div class="player-match">
                    ${statusIcon} ${result.player} - ${result.message}
                </div>
            </div>`;
        });

        if (successCount > 0) {
            html += `<div class="success-note">
                🧹 Successfully removed ${successCount} players from your draft queue!
            </div>`;
        }

        if (failureCount > 0) {
            html += `<div class="error-note">
                ⚠️ ${failureCount} players could not be removed. They may not be in the queue or the buttons couldn't be found.
            </div>`;
        }

        results.innerHTML = html;
    }

    /**
     * Creates a delay/pause in execution for the specified number of milliseconds.
     * 
     * @param {number} ms - Number of milliseconds to delay
     * @returns {Promise} Promise that resolves after the specified delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize when page loads
console.log('[Sleeper Extension] Content script executing on:', window.location.href);
console.log('[Sleeper Extension] Document ready state:', document.readyState);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[Sleeper Extension] DOMContentLoaded - Creating SleeperDraftHelper');
        window.sleeperHelper = new SleeperDraftHelper();
        console.log('[Sleeper Extension] window.sleeperHelper assigned:', !!window.sleeperHelper);
    });
} else {
    console.log('[Sleeper Extension] Document already ready - Creating SleeperDraftHelper');
    window.sleeperHelper = new SleeperDraftHelper();
    console.log('[Sleeper Extension] window.sleeperHelper assigned:', !!window.sleeperHelper);
}
