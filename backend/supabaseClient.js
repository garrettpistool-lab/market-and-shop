const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role for server-side

const supabase = createClient(supabaseUrl, supabaseServiceKey);

module.exports = supabase;

// Usage example: const { data } = await supabase.from('users').select('*')
// For migration, replace better-sqlite3 queries with supabase calls in server.js over time.
// Keep SQLite for now or switch DB.