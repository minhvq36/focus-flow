import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client initialization
 */
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);
