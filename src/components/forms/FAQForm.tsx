import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';

interface FAQFormProps {
  projectId: string;
}

interface FAQ {
  question: string;
  answer: string;
}

const FAQForm: React.FC<FAQFormProps> = ({ projectId }) => {
  const { register, handleSubmit, reset } = useForm();
  const [faqs, setFaqs] = useState<FAQ[]>([{ question: '', answer: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
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
    }
  };
  
  const onSubmit = async (data: any) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Extract FAQs from form data
      const faqsToSave = [];
      for (let i = 0; i < faqs.length; i++) {
        if (data[`faqs[${i}].question`] && data[`faqs[${i}].answer`]) {
          faqsToSave.push({
            project_id: projectId,
            question: data[`faqs[${i}].question`],
            answer: data[`faqs[${i}].answer`]
          });
        }
      }
      
      // Delete existing FAQs
      await supabase
        .from('faqs')
        .delete()
        .eq('project_id', projectId);
      
      // Insert new FAQs
      if (faqsToSave.length > 0) {
        const { error } = await supabase
          .from('faqs')
          .insert(faqsToSave);
        
        if (error) {
          setError(error.message);
          return;
        }
      }
      
      setSuccess('FAQs saved successfully!');
    } catch (err) {
      console.error('Error saving FAQs:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium">FAQ (up to 5 entries)</h2>
        <div className="text-sm text-gray-500">
          {faqs.length}/5 FAQs
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)}>
        {faqs.map((faq, index) => (
          <div key={index} className="mb-6 p-4 border border-gray-200 rounded-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-md font-medium">FAQ #{index + 1}</h3>
              {faqs.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeFAQ(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              )}
            </div>
            
            <div className="mb-4">
              <label className="form-label" htmlFor={`faq_${index}_question`}>
                Question
              </label>
              <input
                id={`faq_${index}_question`}
                type="text"
                className="form-input"
                placeholder="Enter question"
                defaultValue={faq.question}
                {...register(`faqs[${index}].question`)}
              />
            </div>
            
            <div>
              <label className="form-label" htmlFor={`faq_${index}_answer`}>
                Answer
              </label>
              <textarea
                id={`faq_${index}_answer`}
                rows={4}
                className="form-input"
                placeholder="Enter answer"
                defaultValue={faq.answer}
                {...register(`faqs[${index}].answer`)}
              />
            </div>
          </div>
        ))}
        
        {faqs.length < 5 && (
          <div className="mb-6">
            <button
              type="button"
              onClick={addFAQ}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              + Add Another FAQ
            </button>
          </div>
        )}
        
        <div className="mt-6">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FAQForm;