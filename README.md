# Thread Post Counter - Chrome Extension

A lightweight Chrome extension that shows how many posts you have in the current forum thread as an overlay.

## Setup Instructions

### 1. Configure Your Username

Open `content.js` and find the `CONFIG` object near the top:

```javascript
const CONFIG = {
  username: 'YOUR_USERNAME_HERE',  // ← Change this to your forum username
  autoHideDelay: 0,                 // Set to milliseconds to auto-hide, 0 = never
  position: 'bottom-right'          // Options: 'top-right', 'top-left', 'bottom-right', 'bottom-left'
};
```

### 2. Update the Domain

In `manifest.json`, replace `domain.com` with your actual forum domain:

```json
"host_permissions": [
  "*://*.yourforum.com/*"
],
"content_scripts": [
  {
    "matches": ["*://*.yourforum.com/forums/threads/*"],
    ...
  }
]
```

### 3. Add Icons (Optional)

Create icon images at these sizes and place them in the `icons/` folder:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

Or remove the `icons` section from `manifest.json` to use Chrome's default icon.

### 4. Install the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top right)
3. Click **Load unpacked**
4. Select the `chrome-extension` folder

### 5. Test It

Navigate to a forum thread. You should see an overlay in the bottom-right corner showing your post count.

## How It Works

1. When you visit a thread page matching `/forums/threads/*`, the extension activates
2. It extracts the thread ID from the URL (handles formats like `/threads/58863-title` or `/threads/58863`)
3. It fetches the "Who Posted" page at `/forums/misc.php?do=whoposted&t={threadId}`
4. It parses the HTML to find your username and post count
5. It displays the count in a non-intrusive overlay

## Customizing the Parser

If the extension shows 0 posts but you know you've posted, the HTML parsing may need adjustment for your specific forum. Open the browser console (F12) to see debug output, then modify the `parsePostCount()` function in `content.js` to match your forum's HTML structure.

## Troubleshooting

- **"Could not load post count"**: Check that the domain in `manifest.json` matches your forum
- **Shows 0 but you have posts**: The HTML parser may need customization for your forum
- **Not appearing at all**: Verify the URL pattern in `manifest.json` matches your forum's thread URLs

## Files

```
chrome-extension/
├── manifest.json    # Extension configuration
├── content.js       # Main logic - thread ID extraction, fetching, parsing
├── overlay.css      # Styling for the post count overlay
├── icons/           # Extension icons (optional)
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md        # This file
```
