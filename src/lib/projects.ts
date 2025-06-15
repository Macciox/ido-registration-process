import { supabase } from './supabase';
import { Project, ProjectField, FAQ, QuizQuestion } from '@/types/database.types';

// Project CRUD operations
export async function createProject(name: string, ownerEmail: string) {
  const { data, error } = await supabase
    .from('projects')
    .insert([{ name, owner_email: ownerEmail }])
    .select()
    .single();
  
  return { data, error };
}

export async function getProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  
  return { data, error };
}

export async function getProjectById(id: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();
  
  return { data, error };
}

export async function getProjectByOwnerEmail(email: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_email', email)
    .single();
  
  return { data, error };
}

// Project fields operations
export async function saveProjectField(projectId: string, fieldName: string, fieldValue: string, status: 'Confirmed' | 'Not Confirmed' | 'Might Still Change') {
  // Check if field exists
  const { data: existingField } = await supabase
    .from('project_fields')
    .select('*')
    .eq('project_id', projectId)
    .eq('field_name', fieldName)
    .single();
  
  if (existingField) {
    // Update existing field
    const { data, error } = await supabase
      .from('project_fields')
      .update({ field_value: fieldValue, status, updated_at: new Date().toISOString() })
      .eq('id', existingField.id)
      .select()
      .single();
    
    return { data, error };
  } else {
    // Create new field
    const { data, error } = await supabase
      .from('project_fields')
      .insert([{ 
        project_id: projectId, 
        field_name: fieldName, 
        field_value: fieldValue, 
        status 
      }])
      .select()
      .single();
    
    return { data, error };
  }
}

export async function getProjectFields(projectId: string) {
  const { data, error } = await supabase
    .from('project_fields')
    .select('*')
    .eq('project_id', projectId);
  
  return { data, error };
}

// FAQ operations
export async function saveFAQs(projectId: string, faqs: { question: string; answer: string }[]) {
  // Delete existing FAQs for this project
  await supabase
    .from('faqs')
    .delete()
    .eq('project_id', projectId);
  
  // Insert new FAQs
  if (faqs.length > 0) {
    const faqsToInsert = faqs.map(faq => ({
      project_id: projectId,
      question: faq.question,
      answer: faq.answer
    }));
    
    const { data, error } = await supabase
      .from('faqs')
      .insert(faqsToInsert)
      .select();
    
    return { data, error };
  }
  
  return { data: [], error: null };
}

export async function getProjectFAQs(projectId: string) {
  const { data, error } = await supabase
    .from('faqs')
    .select('*')
    .eq('project_id', projectId);
  
  return { data, error };
}

// Quiz questions operations
export async function saveQuizQuestions(
  projectId: string, 
  questions: { 
    question: string; 
    options: [string, string, string, string]; 
    correctAnswer: 'A' | 'B' | 'C' | 'D' 
  }[]
) {
  // Delete existing questions for this project
  await supabase
    .from('quiz_questions')
    .delete()
    .eq('project_id', projectId);
  
  // Insert new questions
  if (questions.length > 0) {
    const questionsToInsert = questions.map(q => ({
      project_id: projectId,
      question: q.question,
      option_a: q.options[0],
      option_b: q.options[1],
      option_c: q.options[2],
      option_d: q.options[3],
      correct_answer: q.correctAnswer
    }));
    
    const { data, error } = await supabase
      .from('quiz_questions')
      .insert(questionsToInsert)
      .select();
    
    return { data, error };
  }
  
  return { data: [], error: null };
}

export async function getProjectQuizQuestions(projectId: string) {
  const { data, error } = await supabase
    .from('quiz_questions')
    .select('*')
    .eq('project_id', projectId);
  
  return { data, error };
}