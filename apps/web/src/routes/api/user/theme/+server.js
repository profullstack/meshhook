import { json } from '@sveltejs/kit';
import { createServerSupabaseClient } from '$lib/supabase.js';

export async function POST(event) {
  const supabase = createServerSupabaseClient(event);
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { theme } = await event.request.json();

  if (!theme || !['light', 'dark'].includes(theme)) {
    return json({ error: 'Invalid theme' }, { status: 400 });
  }

  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: user.id,
      theme_preference: theme,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    });

  if (error) {
    console.error('Failed to update theme:', error);
    return json({ error: 'Failed to update theme' }, { status: 500 });
  }

  return json({ success: true, theme });
}

export async function GET(event) {
  const supabase = createServerSupabaseClient(event);
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return json({ theme: 'light' });
  }

  const { data, error } = await supabase
    .from('user_settings')
    .select('theme_preference')
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    return json({ theme: 'light' });
  }

  return json({ theme: data.theme_preference });
}