import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gitxgpwxxutrdvdirdke.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdpdHhncHd4eHV0cmR2ZGlyZGtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwMjQ0NjMsImV4cCI6MjA2NTYwMDQ2M30.Xibm9POBM-NR8dO5h8N5fCAaz1MhlH-ZTb9ltuHAwFE';

console.log('Supabase config:', { supabaseUrl, supabaseAnonKey: !!supabaseAnonKey });

export const supabase = createClient(supabaseUrl, supabaseAnonKey);