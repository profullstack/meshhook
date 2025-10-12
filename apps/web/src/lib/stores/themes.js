// src/lib/stores/theme.js
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const THEME_KEY = 'meshhook-theme';

function createThemeStore() {
  const initialTheme = browser 
    ? localStorage.getItem(THEME_KEY) || 'light'
    : 'light';

  const { subscribe, set, update } = writable(initialTheme);

  function applyTheme(theme) {
    if (browser) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem(THEME_KEY, theme);
    }
  }

  if (browser) {
    applyTheme(initialTheme);
  }

  return {
    subscribe,
    toggle: async () => {
      let newTheme;
      update(current => {
        newTheme = current === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
        return newTheme;
      });

      // Sync with server via API
      if (browser) {
        try {
          await fetch('/api/user/theme', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theme: newTheme })
          });
        } catch (error) {
          console.error('Failed to sync theme preference:', error);
        }
      }
    },
    set: async (theme) => {
      set(theme);
      applyTheme(theme);

      // Sync with server via API
      if (browser) {
        try {
          await fetch('/api/user/theme', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theme })
          });
        } catch (error) {
          console.error('Failed to sync theme preference:', error);
        }
      }
    },
    loadFromServer: async () => {
      if (!browser) return;
      
      try {
        const response = await fetch('/api/user/theme');
        const data = await response.json();
        
        if (data.theme) {
          set(data.theme);
          applyTheme(data.theme);
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      }
    }
  };
}

export const theme = createThemeStore();