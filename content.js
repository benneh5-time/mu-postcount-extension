/**
 * Thread Post Counter - Content Script
 * Extracts thread ID from URL and fetches user's post count from whoposted endpoint
 */

(function() {
  'use strict';

  const CONFIG = {
    // How long to show the overlay before auto-hiding (ms), set to 0 to never auto-hide
    autoHideDelay: 0,
    // Position: 'top-right', 'top-left', 'bottom-right', 'bottom-left'
    position: 'bottom-right'
  };

  /**
   * Extract the logged-in username from the page's welcome link
   */
  function getLoggedInUsername() {
    const welcomeLink = document.querySelector('#toplinks .welcomelink a');
    if (welcomeLink) {
      return welcomeLink.textContent.trim();
    }
    return null;
  }

  /**
   * Extract thread ID from the current URL
   * Handles formats like:
   *   - /forums/threads/58863-thread-title
   *   - /forums/threads/58863
   */
  function extractThreadId() {
    const url = window.location.href;
    const pathname = window.location.pathname;

    // Match thread ID from URL path
    // Format: /forums/threads/12345-optional-title or /forums/threads/12345
    const match = pathname.match(/\/forums\/threads\/(\d+)/);
    
    if (match && match[1]) {
      return match[1];
    }

    // Fallback: check for 't=' parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const tParam = urlParams.get('t');
    
    if (tParam) {
      return tParam;
    }

    return null;
  }

  /**
   * Fetch the whoposted page and parse post count for the configured user
   */
  async function fetchPostCount(threadId, username) {
    const whoPostedUrl = `${window.location.origin}/forums/misc.php?do=whoposted&t=${threadId}`;

    try {
      const response = await fetch(whoPostedUrl, {
        credentials: 'include' // Include cookies for authentication
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      return parsePostCount(html, username);
    } catch (error) {
      console.error('[Thread Post Counter] Failed to fetch post count:', error);
      return null;
    }
  }

  /**
   * Parse the whoposted HTML to find the user's post count
   * This function may need adjustment based on the actual HTML structure
   */
  function parsePostCount(html, username) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Debug: log the HTML structure to help troubleshoot
    console.log('[Thread Post Counter] Parsing whoposted page for user:', username);

    // Strategy 1: Look for links to user profiles - count is usually BEFORE the username
    const userLinks = doc.querySelectorAll('a[href*="member"]');
    
    for (const link of userLinks) {
      const linkText = link.textContent.trim();
      if (linkText.toLowerCase() === username.toLowerCase()) {
        console.log('[Thread Post Counter] Found username link:', linkText);
        
        const parent = link.closest('td') || link.closest('li') || link.parentElement;
        if (parent) {
          // Try PREVIOUS sibling first (count before username)
          const prevSibling = parent.previousElementSibling;
          if (prevSibling) {
            const count = parseInt(prevSibling.textContent.trim(), 10);
            console.log('[Thread Post Counter] Previous sibling text:', prevSibling.textContent.trim());
            if (!isNaN(count)) {
              return { username: linkText, count };
            }
          }
          
          // Fallback to next sibling
          const nextSibling = parent.nextElementSibling;
          if (nextSibling) {
            const count = parseInt(nextSibling.textContent.trim(), 10);
            console.log('[Thread Post Counter] Next sibling text:', nextSibling.textContent.trim());
            if (!isNaN(count)) {
              return { username: linkText, count };
            }
          }
        }
        
        // Try looking within the same row for any number
        const row = link.closest('tr');
        if (row) {
          const cells = row.querySelectorAll('td');
          console.log('[Thread Post Counter] Row has', cells.length, 'cells');
          for (const cell of cells) {
            if (!cell.contains(link)) {
              const count = parseInt(cell.textContent.trim(), 10);
              if (!isNaN(count)) {
                console.log('[Thread Post Counter] Found count in row cell:', count);
                return { username: linkText, count };
              }
            }
          }
        }
      }
    }

    // Strategy 2: Look for table rows with username text and count
    const rows = doc.querySelectorAll('table tr');
    
    for (const row of rows) {
      const rowText = row.textContent.toLowerCase();
      if (rowText.includes(username.toLowerCase())) {
        console.log('[Thread Post Counter] Found row containing username:', row.textContent.trim().substring(0, 100));
        
        const cells = row.querySelectorAll('td');
        // Try to find which cell has the username and which has the count
        let usernameFound = false;
        let countValue = null;
        
        for (const cell of cells) {
          const cellText = cell.textContent.trim();
          if (cellText.toLowerCase().includes(username.toLowerCase())) {
            usernameFound = true;
          } else {
            const num = parseInt(cellText, 10);
            if (!isNaN(num) && cellText === String(num)) {
              countValue = num;
            }
          }
        }
        
        if (usernameFound && countValue !== null) {
          return { username: username, count: countValue };
        }
      }
    }

    // Strategy 3: Regex - look for count BEFORE username (common pattern: "5    Username")
    const allText = doc.body.textContent;
    const regexBefore = new RegExp(`(\\d+)\\s+${username}`, 'i');
    const matchBefore = allText.match(regexBefore);
    
    if (matchBefore && matchBefore[1]) {
      console.log('[Thread Post Counter] Regex matched count before username:', matchBefore[1]);
      return { username: username, count: parseInt(matchBefore[1], 10) };
    }

    // Fallback: count after username
    const regexAfter = new RegExp(`${username}\\s+(\\d+)`, 'i');
    const matchAfter = allText.match(regexAfter);
    
    if (matchAfter && matchAfter[1]) {
      console.log('[Thread Post Counter] Regex matched count after username:', matchAfter[1]);
      return { username: username, count: parseInt(matchAfter[1], 10) };
    }

    console.log('[Thread Post Counter] Could not find username in whoposted page');
    // Could not find user in the list - they may have 0 posts
    return { username: username, count: 0, notFound: true };
  }

  /**
   * Create and inject the overlay element
   */
  function createOverlay(data) {
    // Remove existing overlay if present
    const existing = document.getElementById('thread-post-counter-overlay');
    if (existing) {
      existing.remove();
    }

    const overlay = document.createElement('div');
    overlay.id = 'thread-post-counter-overlay';
    overlay.className = `tpc-overlay tpc-${CONFIG.position}`;

    if (data.error) {
      overlay.innerHTML = `
        <div class="tpc-content tpc-error">
          <span class="tpc-icon">⚠️</span>
          <span class="tpc-text">Could not load post count</span>
        </div>
      `;
    } else if (data.notFound) {
      overlay.innerHTML = `
        <div class="tpc-content">
          <span class="tpc-count">0</span>
          <span class="tpc-label">posts in thread</span>
        </div>
      `;
    } else {
      overlay.innerHTML = `
        <div class="tpc-content">
          <span class="tpc-count">${data.count}</span>
          <span class="tpc-label">post${data.count !== 1 ? 's' : ''} in thread</span>
        </div>
      `;
    }

    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'tpc-close';
    closeBtn.innerHTML = '×';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.addEventListener('click', () => {
      overlay.classList.add('tpc-hiding');
      setTimeout(() => overlay.remove(), 300);
    });
    overlay.appendChild(closeBtn);

    document.body.appendChild(overlay);

    // Trigger entrance animation
    requestAnimationFrame(() => {
      overlay.classList.add('tpc-visible');
    });

    // Auto-hide if configured
    if (CONFIG.autoHideDelay > 0) {
      setTimeout(() => {
        if (overlay.parentElement) {
          overlay.classList.add('tpc-hiding');
          setTimeout(() => overlay.remove(), 300);
        }
      }, CONFIG.autoHideDelay);
    }

    return overlay;
  }

  /**
   * Main initialization
   */
  async function init() {
    const threadId = extractThreadId();
    
    if (!threadId) {
      console.log('[Thread Post Counter] Could not extract thread ID from URL');
      return;
    }

    console.log(`[Thread Post Counter] Thread ID: ${threadId}`);

    // Get logged-in username from the page
    const username = getLoggedInUsername();
    
    if (!username) {
      console.log('[Thread Post Counter] Could not find logged-in username - user may not be logged in');
      return; // Silently exit if not logged in
    }

    console.log(`[Thread Post Counter] Logged in as: ${username}`);

    const result = await fetchPostCount(threadId, username);
    
    if (result === null) {
      createOverlay({ error: true });
    } else {
      createOverlay(result);
    }
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
