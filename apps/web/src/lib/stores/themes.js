// src/lib/stores/theme.js
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const THEME_KEY = 'meshhook-theme';

function getSystemTheme() {
  if (!browser) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function createThemeStore() {
  // Get theme: localStorage > system preference > light
  const storedTheme = browser ? localStorage.getItem(THEME_KEY) : null;
  const initialTheme = storedTheme || getSystemTheme();

  const { subscribe, set, update } = writable(initialTheme);

  function applyTheme(theme) {
    if (browser) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem(THEME_KEY, theme);
    }
  }

  if (browser) {
    applyTheme(initialTheme);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
      // Only update if user hasn't manually set a preference
      if (!localStorage.getItem(THEME_KEY)) {
        const newTheme = e.matches ? 'dark' : 'light';
        set(newTheme);
        applyTheme(newTheme);
      }
    });
  }

  return {
    subscribe,
    toggle: () => {
      update(current => {
        const newTheme = current === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
        return newTheme;
      });
    },
    set: (theme) => {
      set(theme);
      applyTheme(theme);
    }
  };
}

export const theme = createThemeStore();