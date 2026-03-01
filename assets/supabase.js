// Provide your Supabase project URL and anon public key here
const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Initialize the Supabase client
// This requires the Supabase JS library to be loaded via CDN first
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
