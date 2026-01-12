// ============================================
// SOURCE CODE PROTECTION & DEV TOOLS BLOCKER
// ============================================

(function() {
  'use strict';

  // === 1. BLOCK DEVELOPER TOOLS ===
  let devToolsOpen = false;
  let devToolsCheckInterval;

  function detectDevTools() {
    const threshold = 160;
    if (window.outerHeight - window.innerHeight > threshold ||
        window.outerWidth - window.innerWidth > threshold) {
      if (!devToolsOpen) {
        devToolsOpen = true;
        handleDevToolsDetected();
      }
    } else {
      devToolsOpen = false;
    }
  }

  function handleDevToolsDetected() {
    console.clear();
    console.log('%c🔒 PROTECTED CONTENT', 'color: red; font-size: 20px; font-weight: bold;');
    console.log('%cDeveloper tools are disabled for this application.', 'color: red; font-size: 14px;');
    
    // Disable all console methods
    disableConsole();
    
    // Close devtools if possible (may not work in all browsers)
    if (window.devtools?.open) {
      window.devtools.open = false;
    }
  }

  function disableConsole() {
    const noop = () => {};
    console.log = noop;
    console.error = noop;
    console.warn = noop;
    console.info = noop;
    console.debug = noop;
    console.table = noop;
    console.trace = noop;
  }

  // Start monitoring for dev tools
  devToolsCheckInterval = setInterval(detectDevTools, 500);

  // === 2. BLOCK KEYBOARD SHORTCUTS ===
  document.addEventListener('keydown', (e) => {
    // F12 - Dev Tools
    if (e.keyCode === 123) {
      e.preventDefault();
      showWarning('Developer Tools are disabled');
      return false;
    }
    
    // Ctrl+Shift+I - Dev Tools (Windows/Linux)
    if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
      e.preventDefault();
      showWarning('Developer Tools are disabled');
      return false;
    }
    
    // Ctrl+Shift+J - Console (Windows/Linux)
    if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
      e.preventDefault();
      showWarning('Developer Tools are disabled');
      return false;
    }
    
    // Cmd+Option+I - Dev Tools (Mac)
    if (e.metaKey && e.altKey && e.keyCode === 73) {
      e.preventDefault();
      showWarning('Developer Tools are disabled');
      return false;
    }
    
    // Cmd+Option+J - Console (Mac)
    if (e.metaKey && e.altKey && e.keyCode === 74) {
      e.preventDefault();
      showWarning('Developer Tools are disabled');
      return false;
    }
    
    // Cmd+Option+U - View Source (Mac)
    if (e.metaKey && e.altKey && e.keyCode === 85) {
      e.preventDefault();
      showWarning('View source is disabled');
      return false;
    }

    // Ctrl+Shift+C - Inspect Element
    if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
      e.preventDefault();
      showWarning('Inspect element is disabled');
      return false;
    }

    // Ctrl+U - View Source (Windows/Linux)
    if (e.ctrlKey && e.keyCode === 85) {
      e.preventDefault();
      showWarning('View source is disabled');
      return false;
    }
  }, true);

  // === 3. BLOCK RIGHT-CLICK CONTEXT MENU ===
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showWarning('Right-click is disabled');
    return false;
  }, true);

  // === 4. HIDE SOURCE MAPS ===
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    if (typeof url === 'string' && (url.includes('.map') || url.includes('sourceMap'))) {
      return Promise.reject(new Error('Source maps are disabled'));
    }
    return originalFetch.apply(this, args);
  };

  // === 5. WARNING NOTIFICATION ===
  function showWarning(message) {
    const warning = document.createElement('div');
    warning.id = 'devToolsWarning';
    warning.textContent = '🔒 ' + message;
    warning.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, #d4af37, #b38728);
      color: #000;
      padding: 20px 40px;
      border-radius: 10px;
      font-size: 16px;
      font-weight: bold;
      z-index: 999999;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
      animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(warning);
    setTimeout(() => {
      warning.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => warning.remove(), 300);
    }, 2000);
  }

  // === 6. ANIMATION STYLES ===
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translate(-50%, -60%);
      }
      to {
        opacity: 1;
        transform: translate(-50%, -50%);
      }
    }
    @keyframes slideOut {
      from {
        opacity: 1;
        transform: translate(-50%, -50%);
      }
      to {
        opacity: 0;
        transform: translate(-50%, -60%);
      }
    }
  `;
  document.head.appendChild(style);

  // === 7. DISABLE INSPECT ELEMENT IN CHROME/EDGE ===
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = undefined;
  }

  // === 8. PROTECT AGAINST SCRIPT INJECTION ===
  Object.defineProperty(window, '__proto__', {
    get() {
      showWarning('Source inspection is not allowed');
      return {};
    }
  });

  console.log('%c✅ Protection Enabled', 'color: green; font-size: 14px; font-weight: bold;');
})();
