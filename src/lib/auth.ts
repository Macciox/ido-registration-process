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
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Clear any cached data
    localStorage.removeItem('supabase.auth.token');
    
    return { error: null };
  } catch (error) {
    console.error('Error during sign out:', error);
    return { error };
  }
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