# Sleeper Fantasy Football Draft Queue Chrome Extension

This extension adds bulk player import functionality to Sleeper fantasy football draft queues, inspired by [Henry Goodman's extension for Yahoo fantasy football](https://github.com/hgoodman/yahoo-pre-draft).

### Features & Capabilities

- **Bulk Player Import**: Paste lists of player names for instant queue population
- **Smart Name Matching**: Advanced fuzzy matching handles variations and nicknames
- **Queue Validation**: Check which players from your list are already queued
- **Queue Management**: Clear entire queue or add multiple players efficiently

### Extension Structure
```
/
├── manifest.json              # Chrome extension manifest (Manifest V3)
├── sleeper-api.js             # Sleeper API client
├── content-sleeper.js         # Main content script
├── name-matching.js           # Advanced player name matching
├── sleeper-styles.css         # Modern CSS styling
├── img/                       # Extension icons (16, 32, 48, 128px)
└── README.md                  # This file
```

### Installation & Testing

#### Quick Installation
1. Open Chrome Extensions (chrome://extensions/)
2. Enable "Developer mode" (top-right toggle)
3. Click "Load unpacked"
4. Select this folder
5. Navigate to sleeper.com draft page to test

#### 🚀 Quick Start Testing (5 Minutes)

**1. Verify Installation**
- ✅ Extension loads without errors in chrome://extensions/
- ✅ Extension shows as "Enabled"

**2. Test on Sleeper**
- Navigate to any Sleeper draft page:
  - Mock Draft: `sleeper.com/draft/nfl/[draft-id]`
  - League Draft: `sleeper.com/draft/nfl/[your-draft-id]`
  - Pre-Draft: `sleeper.com/leagues/[league-id]/predraft`
- Look for floating 📋 button (bottom-right)
- Click it → Clean white interface should open

**3. Test Queue Functionality**
```
Paste test names:
Josh Allen
Christian McCaffrey
Travis Kelce
Cooper Kupp
Tyreek Hill
```
- Click "Analyze Players" → Expected: 95%+ match confidence
- Click "Add X Players to Queue" → Expected: Players added to draft queue
