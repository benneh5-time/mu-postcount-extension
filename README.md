# MU Post Count Extension

A Chrome extension that shows how many posts you have in the current forum thread as an overlay.

## Installation

1. Download this repository:
   - Click the green **Code** button above
   - Select **Download ZIP**
   - Extract the ZIP to a folder on your computer

2. Open Chrome and go to `chrome://extensions/`

3. Enable **Developer mode** (toggle in the top right corner)

4. Click **Load unpacked**

5. Select the extracted folder (the one containing `manifest.json`)

6. Navigate to any forum thread — you'll see your post count in the bottom-right corner

## Configuration

Edit `manifest.json` to set your forum domain:

```json
"host_permissions": [
  "*://*.yourforum.com/*"
],
"content_scripts": [
  {
    "matches": ["*://*.yourforum.com/forums/threads/*"],
```

Replace `yourforum.com` with the actual domain.

## How It Works

1. When you visit a thread, the extension detects your logged-in username from the welcome link
2. It fetches the "Who Posted" page for that thread
3. It parses your post count and displays it in an overlay

## Files

```
├── manifest.json    # Extension configuration
├── content.js       # Main logic
├── overlay.css      # Overlay styling
└── icons/           # Extension icons
```

## Updating

To update after a new version is released:

1. Download the new ZIP
2. Extract it to the same folder (overwrite existing files)
3. Go to `chrome://extensions/`
4. Click the refresh icon on the extension card

## Troubleshooting

**Overlay doesn't appear:**
- Make sure you're logged into the forum
- Check that the URL pattern in `manifest.json` matches your forum's thread URLs

**Shows wrong count:**
- Open DevTools (F12) → Console to see debug output
- The HTML parser may need adjusting for your forum's structure

**"Could not load manifest" error:**
- Make sure you selected the folder containing `manifest.json`, not a parent folder
