import { createClient } from '@supabase/supabase-js';

// Coleta as variáveis de ambiente configuradas no Vite
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

// Valida se as credenciais do Supabase existem e não são placeholders
export const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseAnonKey !== 'INSIRA_AQUI_SUA_ANON_KEY' &&
  !supabaseAnonKey.includes('INSIRA_')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
