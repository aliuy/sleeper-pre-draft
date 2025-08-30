# Sleeper Fantasy Football Draft Queue Chrome Extension

This extension adds bulk player import functionality to Sleeper fantasy football draft queues, inspired by [Henry Goodman's extension for Yahoo fantasy football](https://github.com/hgoodman/yahoo-pre-draft).

### Current Status
- **Phase 1 Complete**: API research, foundation, and initial extension structure
- **Phase 2 Complete**: DOM analysis and React integration
- **Phase 3 Complete**: Queue manipulation and bulk import functionality
- **Phase 4 Complete**: UI/UX polish, performance optimization, and advanced features

### Phase 4 Enhancements ✨
- **Enhanced UI/UX**: Smooth animations, progress bars, and visual feedback
- **Resizable Modal**: Drag to resize the extension window for better visibility
- **Settings Panel**: Customizable delays, notifications, and preferences
- **Keyboard Shortcuts**: Ctrl+Enter to analyze, Escape to close
- **Progress Tracking**: Real-time progress bars for all operations
- **Error Recovery**: Robust error handling with retry mechanisms
- **Sound Notifications**: Optional audio feedback when operations complete
- **Tooltips & Help**: Contextual help and keyboard shortcut hints

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

**3. Test Enhanced Features**
```
New Phase 4 Features:
• Click ⚙️ settings button → Customize operation delays and notifications
• Use Ctrl+Enter to quickly analyze players
• Drag from bottom-right corner to resize window
• Watch real-time progress bars during operations
• Enable sound notifications for completion alerts
```

### Features & Capabilities

#### Core Functionality
- **Bulk Player Import**: Paste lists of player names for instant queue population
- **Smart Name Matching**: Advanced fuzzy matching handles variations and nicknames
- **Queue Validation**: Check which players from your list are already queued
- **Queue Management**: Clear entire queue or add multiple players efficiently

#### Phase 4 Advanced Features
- **Resizable Interface**: Drag-resize modal for optimal viewing of large player lists
- **Real-time Progress**: Visual progress bars and status updates for all operations
- **Customizable Settings**: Adjust operation delays, enable notifications, and more
- **Keyboard Shortcuts**: Fast access with Ctrl+Enter (analyze) and Escape (close)
- **Enhanced Error Handling**: Robust retry mechanisms and detailed error reporting
- **Visual Feedback**: Smooth animations, color-coded results, and status indicators
- **Sound Notifications**: Optional audio alerts when operations complete
- **Persistent Settings**: Your preferences are saved across browser sessions
