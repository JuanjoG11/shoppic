// Supabase Configuration
const SUPABASE_URL = 'https://ofbskcynmwajnnrhhaau.supabase.co';
const SUPABASE_KEY = 'sb_publishable_LJtAuuj_dLzSG_XUjqVi4A_JPKRNaLD';

// Use a simple window global to avoid module system complexities in existing project
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
