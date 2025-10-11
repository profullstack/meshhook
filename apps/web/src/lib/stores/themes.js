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
    toggle: async (supabase) => {
      let newTheme;
      update(current => {
        newTheme = current === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
        return newTheme;
      });

      // Sync with Supabase if provided
      if (supabase) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from('user_settings')
              .upsert({ 
                user_id: user.id, 
                theme_preference: newTheme,
                updated_at: new Date().toISOString()
              }, { 
                onConflict: 'user_id' 
              });
          }
        } catch (error) {
          console.error('Failed to sync theme preference:', error);
        }
      }
    },
    set: async (theme, supabase) => {
      set(theme);
      applyTheme(theme);

      if (supabase) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from('user_settings')
              .upsert({ 
                user_id: user.id, 
                theme_preference: theme,
                updated_at: new Date().toISOString()
              }, { 
                onConflict: 'user_id' 
              });
          }
        } catch (error) {
          console.error('Failed to sync theme preference:', error);
        }
      }
    },
    loadFromSupabase: async (supabase) => {
      if (!supabase || !browser) return;
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('user_settings')
            .select('theme_preference')
            .eq('user_id', user.id)
            .single();

          if (!error && data?.theme_preference) {
            set(data.theme_preference);
            applyTheme(data.theme_preference);
          }
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      }
    }
  };
}

export const theme = createThemeStore();