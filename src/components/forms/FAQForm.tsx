import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

const FAQForm: React.FC = () => {
  const [faqs, setFaqs] = useState<{ question: string; answer: string }[]>([
    { question: '', answer: '' },
  ]);
  
  const { register, handleSubmit } = useForm();
  
  const onSubmit = (data: any) => {
    console.log(data);
    // Will be connected to Supabase in the future
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
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium mb-6">FAQ (up to 5 entries)</h2>
      
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
          <button type="submit" className="btn btn-primary">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

export default FAQForm;