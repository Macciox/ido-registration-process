import { supabase } from './supabase';
import { User } from '@/types/database.types';

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  return { data, error };
}

export async function signOut() {
  // First, clear any cached data
  localStorage.removeItem('supabase.auth.token');
  sessionStorage.clear();
  
  // Then sign out from Supabase
  const { error } = await supabase.auth.signOut();
  
  return { error };
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  // Get user role from profiles table
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('email', user.email)
    .single();
  
  if (!data) return null;
  
  return {
    id: user.id,
    email: user.email as string,
    role: data.role,
  };
}

export async function isAdmin(user: User | null): Promise<boolean> {
  if (!user) return false;
  return user.role === 'admin';
}