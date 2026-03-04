require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'placeholder_key';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    console.warn('Supabase URL or Key missing in .env file.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };
