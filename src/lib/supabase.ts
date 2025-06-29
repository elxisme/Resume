import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if environment variables are missing or contain placeholder values
const isPlaceholderUrl = !supabaseUrl || 
  supabaseUrl === 'https://your-project-id.supabase.co' || 
  supabaseUrl.includes('your-project-id');

const isPlaceholderKey = !supabaseAnonKey || 
  supabaseAnonKey === 'your_supabase_anon_key_here' ||
  supabaseAnonKey.includes('your_supabase_anon_key');

if (!supabaseUrl || !supabaseAnonKey || isPlaceholderUrl || isPlaceholderKey) {
  const errorMessage = `
🔧 Supabase Configuration Required

To use this application, you need to set up Supabase:

1. Create a Supabase project at https://supabase.com
2. Go to Project Settings > API
3. Copy your Project URL and Public anon key
4. Update your .env file with:
   VITE_SUPABASE_URL=your_actual_project_url
   VITE_SUPABASE_ANON_KEY=your_actual_anon_key
5. Restart the development server

Current values:
- VITE_SUPABASE_URL: ${supabaseUrl || '[MISSING]'}
- VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '[PRESENT BUT INVALID]' : '[MISSING]'}
  `;
  
  console.error(errorMessage);
  throw new Error('Supabase configuration required. Please check the console for setup instructions.');
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  console.error('Invalid Supabase URL format:', supabaseUrl);
  throw new Error(`Invalid Supabase URL format: ${supabaseUrl}. Please ensure it starts with https:// and is a valid URL.`);
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);