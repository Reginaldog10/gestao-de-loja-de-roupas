import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Se as chaves estiverem ausentes, o cliente ainda é instanciado,
// mas as requisições falharão até que o usuário configure o arquivo .env
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
