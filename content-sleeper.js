// Sleeper Draft Queue Helper - Content Script
// Phase 2: React Integration and DOM Analysis

console.log('[Content Script] Loading Sleeper Draft Helper...');
console.log('[Content Script] NameMatcher available:', typeof NameMatcher);
console.log('[Content Script] SleeperAPI available:', typeof SleeperAPI);

class SleeperDraftHelper {
    constructor() {
        this.isDebug = false;
        this.players = null;
        this.queueElements = new Map();
        this.initialized = false;
        
        this.log('Initializing Sleeper Draft Helper...');
        this.init();
    }

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

    createMainInterface() {
        const container = document.createElement('div');
        container.id = 'sleeper-helper-main';
        container.className = 'sleeper-main-interface hidden';
        
        container.innerHTML = `
            <div class="sleeper-header">
                <h3>🏈 Draft Queue Helper</h3>
                <button class="sleeper-close" onclick="document.getElementById('sleeper-helper-main').classList.add('hidden')">×</button>
            </div>
            
            <div class="sleeper-content">
                <div class="sleeper-section">
                    <label>Paste player names (one per line):</label>
                    <textarea id="player-input" placeholder="Josh Allen&#10;Christian McCaffrey&#10;Tyreek Hill&#10;..."></textarea>
                    <div class="sleeper-actions">
                        <button id="analyze-players" class="sleeper-btn">Analyze Players</button>
                        <button id="queue-players" class="sleeper-btn primary">Add to Queue</button>
                        <button id="clear-queue" class="sleeper-btn secondary">Clear Queue</button>
                    </div>
                    <div id="analysis-results" class="sleeper-results"></div>
                </div>
            </div>
        `;

        this.setupEventListeners(container);
        return container;
    }

    setupEventListeners(container) {
        // Player analysis
        const analyzeBtn = container.querySelector('#analyze-players');
        analyzeBtn.addEventListener('click', () => this.analyzePlayers());

        // Queue players
        const queueBtn = container.querySelector('#queue-players');
        queueBtn.addEventListener('click', () => this.queuePlayers());

        // Clear queue
        const clearQueueBtn = container.querySelector('#clear-queue');
        clearQueueBtn.addEventListener('click', () => this.clearQueue());
    }

    toggleMainInterface() {
        const main = document.getElementById('sleeper-helper-main');
        if (main.classList.contains('hidden')) {
            main.classList.remove('hidden');
        } else {
            main.classList.add('hidden');
        }
    }

    async analyzePlayers() {
        const input = document.getElementById('player-input');
        const results = document.getElementById('analysis-results');
        
        const playerNames = input.value.split('\n')
            .map(name => name.trim())
            .filter(name => name.length > 0);

        if (playerNames.length === 0) {
            results.innerHTML = '<div class="error">Please enter player names</div>';
            return;
        }

        results.innerHTML = '<div class="loading">Analyzing players...</div>';

        try {
            const analysis = [];

            for (const name of playerNames) {
                // Use NameMatcher.findPlayerMatches method - include IR/inactive players but prefer active
                const matches = NameMatcher.findPlayerMatches(name, this.players, { requireActive: false, preferActive: true });
                analysis.push({
                    input: name,
                    matches: matches,
                    bestMatch: matches[0] || null
                });
            }

            this.displayAnalysisResults(analysis);

        } catch (error) {
            results.innerHTML = `<div class="error">Analysis failed: ${error.message}</div>`;
            this.log(`Analysis error: ${error.message}`, 'error');
        }
    }

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

    async queuePlayers() {
        if (!this.lastAnalysis || this.lastAnalysis.length === 0) {
            this.log('No analyzed players to queue', 'error');
            return;
        }

        this.log(`Starting queue operation for ${this.lastAnalysis.length} players`);
        this.log(`Available queue elements: ${this.queueElements.size}`);
        for (const [key, element] of this.queueElements) {
            this.log(`  - ${key}: "${element.text}"`);
        }

        const results = document.getElementById('analysis-results');
        const originalContent = results.innerHTML;
        
        results.innerHTML = '<div class="loading">Adding players to queue...</div>';

        try {
            let successCount = 0;
            let failureCount = 0;
            const queueResults = [];

            for (let i = 0; i < this.lastAnalysis.length; i++) {
                const analysis = this.lastAnalysis[i];
                const player = analysis.bestMatch;
                
                this.log(`\n--- Processing player ${i + 1}/${this.lastAnalysis.length}: ${player.full_name} ---`);
                
                try {
                    const success = await this.addPlayerToQueue(player);
                    
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
                            message: 'Could not find queue button'
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

                // Add delay between requests to avoid overwhelming the UI
                await this.delay(100);
                
                // Update progress in UI
                results.innerHTML = `<div class="loading">Adding players to queue... (${i + 1}/${this.lastAnalysis.length})</div>`;
            }

            // Display queue results
            this.displayQueueResults(queueResults, successCount, failureCount);

        } catch (error) {
            results.innerHTML = originalContent + `<div class="error">Queue operation failed: ${error.message}</div>`;
            this.log(`Queue operation error: ${error.message}`, 'error');
        }
    }

    async clearQueue() {
        this.log('Starting queue clear operation...');
        
        const results = document.getElementById('analysis-results');
        const originalContent = results.innerHTML;
        
        results.innerHTML = '<div class="loading">Clearing queue...</div>';

        try {
            // Look for queued players - these might be in different sections
            let queuedPlayers = await this.findQueuedPlayers();
            
            if (queuedPlayers.length === 0) {
                results.innerHTML = '<div class="info">No players found in queue to clear.</div>';
                this.log('No queued players found');
                return;
            }

            this.log(`Found ${queuedPlayers.length} players in queue to clear`);
            
            let successCount = 0;
            let failureCount = 0;
            const clearResults = [];
            let totalPlayers = queuedPlayers.length;

            // Process players one by one, re-scanning after each removal
            while (queuedPlayers.length > 0) {
                const queuedPlayer = queuedPlayers[0]; // Always take the first player
                const currentIndex = totalPlayers - queuedPlayers.length + 1;
                
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

                // Add delay between operations (BLAZING FAST!)
                await this.delay(100); // MAXIMUM SPEED!
                
                // Update progress
                results.innerHTML = `<div class="loading">Clearing queue... (${currentIndex}/${totalPlayers})</div>`;
                
                // Wait for DOM to update after removal
                await this.delay(100); // MAXIMUM SPEED!
                
                // Re-scan for remaining queued players
                queuedPlayers = await this.findQueuedPlayers();
                this.log(`Re-scan found ${queuedPlayers.length} remaining players in queue`);
                
                // Safety check - if we've processed the expected number, stop
                if (currentIndex >= totalPlayers) {
                    this.log('Reached expected total, stopping');
                    break;
                }
            }

            // Display clear results
            this.displayClearResults(clearResults, successCount, failureCount);

        } catch (error) {
            results.innerHTML = originalContent + `<div class="error">Clear queue operation failed: ${error.message}</div>`;
            this.log(`Clear queue error: ${error.message}`, 'error');
        }
    }

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
