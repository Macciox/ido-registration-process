import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';

interface FAQFormProps {
  projectId: string;
  onCompletionUpdate?: (tabId: string, percentage: number) => void;
}

interface FAQ {
  question: string;
  answer: string;
}

const FAQForm: React.FC<FAQFormProps> = ({ projectId, onCompletionUpdate }) => {
  const { register, handleSubmit, reset } = useForm();
  const [faqs, setFaqs] = useState<FAQ[]>([{ question: '', answer: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  
  // Load existing FAQs
  useEffect(() => {
    const loadFAQs = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('faqs')
          .select('*')
          .eq('project_id', projectId);
        
        if (error) {
          console.error('Error loading FAQs:', error);
          return;
        }
        
        if (data && data.length > 0) {
          const loadedFaqs = data.map(faq => ({
            question: faq.question,
            answer: faq.answer
          }));
          setFaqs(loadedFaqs);
          
          // Calculate completion percentage
          calculateCompletionPercentage(loadedFaqs);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (projectId) {
      loadFAQs();
    }
  }, [projectId]);
  
  const calculateCompletionPercentage = (faqsData: FAQ[]) => {
    // For FAQs, we consider it complete if there's at least one FAQ with both question and answer
    const validFaqs = faqsData.filter(faq => faq.question && faq.answer);
    const percentage = validFaqs.length > 0 ? 100 : 0;
    
    setCompletionPercentage(percentage);
    
    // Update parent component with completion percentage
    if (onCompletionUpdate) {
      onCompletionUpdate('faq', percentage);
    }
  };
  
  const addFAQ = () => {
    if (faqs.length < 5) {
      setFaqs([...faqs, { question: '', answer: '' }]);
    }
  };
  
  const removeFAQ = (index: number) => {
    if (faqs.length > 1) {
      const newFaqs = [...faqs];
      newFaqs.splice(index, 1);
      setFaqs(newFaqs);
      calculateCompletionPercentage(newFaqs);
    }
  };
  
  const handleFAQChange = async (index: number, field: 'question' | 'answer', value: string) => {
    const newFaqs = [...faqs];
    newFaqs[index][field] = value;
    setFaqs(newFaqs);
    
    try {
      // Get existing FAQs
      const { data: existingFaqs } = await supabase
        .from('faqs')
        .select('*')
        .eq('project_id', projectId);
      
      // Delete existing FAQs
      if (existingFaqs && existingFaqs.length > 0) {
        await supabase
          .from('faqs')
          .delete()
          .eq('project_id', projectId);
      }
      
      // Insert updated FAQs
      const faqsToSave = newFaqs.filter(faq => faq.question || faq.answer).map(faq => ({
        project_id: projectId,
        question: faq.question,
        answer: faq.answer
      }));
      
      if (faqsToSave.length > 0) {
        await supabase
          .from('faqs')
          .insert(faqsToSave);
      }
      
      // Calculate completion percentage
      calculateCompletionPercentage(newFaqs);
      
    } catch (err) {
      console.error('Error saving FAQs:', err);
    }
  };

  return (
    <div className="sleek-card p-6 form-container">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium text-text-primary">FAQ (up to 5 entries)</h2>
        <div className="flex items-center">
          <div className="mr-3 text-sm font-medium text-text-primary">
            Completion: {completionPercentage}%
          </div>
          <div className="progress-bar w-32">
            <div 
              className="progress-fill" 
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="alert alert-error mb-4">
          <div className="alert-icon">⚠</div>
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="alert alert-success mb-4">
          <div className="alert-icon">✓</div>
          <p>{success}</p>
        </div>
      )}
      
      <div>
        {faqs.map((faq, index) => (
          <div key={index} className="mb-6 p-4 border border-white/10 rounded-lg bg-white/5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-md font-medium text-text-primary">FAQ #{index + 1}</h3>
              {faqs.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeFAQ(index)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-secondary mb-2" htmlFor={`faq_${index}_question`}>
                Question
              </label>
              <input
                id={`faq_${index}_question`}
                type="text"
                className="sleek-input w-full"
                placeholder="Enter question"
                value={faq.question}
                onChange={(e) => handleFAQChange(index, 'question', e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2" htmlFor={`faq_${index}_answer`}>
                Answer
              </label>
              <textarea
                id={`faq_${index}_answer`}
                rows={4}
                className="sleek-input w-full"
                placeholder="Enter answer"
                value={faq.answer}
                onChange={(e) => handleFAQChange(index, 'answer', e.target.value)}
              />
            </div>
          </div>
        ))}
        
        {faqs.length < 5 && (
          <div className="mb-6">
            <button
              type="button"
              onClick={addFAQ}
              className="btn-light"
            >
              + Add Another FAQ
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FAQForm;