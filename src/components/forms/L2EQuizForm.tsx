import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';

interface L2EQuizFormProps {
  projectId: string;
}

interface QuizQuestion {
  question: string;
  options: [string, string, string, string];
  correctAnswer: 'A' | 'B' | 'C' | 'D';
}

const L2EQuizForm: React.FC<L2EQuizFormProps> = ({ projectId }) => {
  const { register, handleSubmit } = useForm();
  const [questions, setQuestions] = useState<QuizQuestion[]>([
    { question: '', options: ['', '', '', ''], correctAnswer: 'A' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Load existing quiz questions
  useEffect(() => {
    const loadQuizQuestions = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('quiz_questions')
          .select('*')
          .eq('project_id', projectId);
        
        if (error) {
          console.error('Error loading quiz questions:', error);
          return;
        }
        
        if (data && data.length > 0) {
          const loadedQuestions = data.map(q => ({
            question: q.question,
            options: [q.option_a, q.option_b, q.option_c, q.option_d] as [string, string, string, string],
            correctAnswer: q.correct_answer as 'A' | 'B' | 'C' | 'D'
          }));
          setQuestions(loadedQuestions);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (projectId) {
      loadQuizQuestions();
    }
  }, [projectId]);
  
  const addQuestion = () => {
    if (questions.length < 5) {
      setQuestions([
        ...questions, 
        { question: '', options: ['', '', '', ''], correctAnswer: 'A' }
      ]);
    }
  };
  
  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      const newQuestions = [...questions];
      newQuestions.splice(index, 1);
      setQuestions(newQuestions);
    }
  };
  
  const onSubmit = async (data: any) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Extract quiz questions from form data
      const questionsToSave = [];
      for (let i = 0; i < questions.length; i++) {
        if (data[`questions[${i}].question`]) {
          questionsToSave.push({
            project_id: projectId,
            question: data[`questions[${i}].question`],
            option_a: data[`questions[${i}].options[0]`] || '',
            option_b: data[`questions[${i}].options[1]`] || '',
            option_c: data[`questions[${i}].options[2]`] || '',
            option_d: data[`questions[${i}].options[3]`] || '',
            correct_answer: data[`questions[${i}].correctAnswer`] || 'A'
          });
        }
      }
      
      // Delete existing quiz questions
      await supabase
        .from('quiz_questions')
        .delete()
        .eq('project_id', projectId);
      
      // Insert new quiz questions
      if (questionsToSave.length > 0) {
        const { error } = await supabase
          .from('quiz_questions')
          .insert(questionsToSave);
        
        if (error) {
          setError(error.message);
          return;
        }
      }
      
      setSuccess('Quiz questions saved successfully!');
    } catch (err) {
      console.error('Error saving quiz questions:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium">L2E Quiz Questions (up to 5 entries)</h2>
        <div className="text-sm text-gray-500">
          {questions.length}/5 Questions
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
        {questions.map((question, index) => (
          <div key={index} className="mb-6 p-4 border border-gray-200 rounded-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-md font-medium">Question #{index + 1}</h3>
              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeQuestion(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              )}
            </div>
            
            <div className="mb-4">
              <label className="form-label" htmlFor={`question_${index}`}>
                Question
              </label>
              <input
                id={`question_${index}`}
                type="text"
                className="form-input"
                placeholder="Enter question"
                defaultValue={question.question}
                {...register(`questions[${index}].question`)}
              />
            </div>
            
            <div className="mb-4">
              <label className="form-label" htmlFor={`question_${index}_option_a`}>
                Option A
              </label>
              <input
                id={`question_${index}_option_a`}
                type="text"
                className="form-input"
                placeholder="Enter option A"
                defaultValue={question.options[0]}
                {...register(`questions[${index}].options[0]`)}
              />
            </div>
            
            <div className="mb-4">
              <label className="form-label" htmlFor={`question_${index}_option_b`}>
                Option B
              </label>
              <input
                id={`question_${index}_option_b`}
                type="text"
                className="form-input"
                placeholder="Enter option B"
                defaultValue={question.options[1]}
                {...register(`questions[${index}].options[1]`)}
              />
            </div>
            
            <div className="mb-4">
              <label className="form-label" htmlFor={`question_${index}_option_c`}>
                Option C
              </label>
              <input
                id={`question_${index}_option_c`}
                type="text"
                className="form-input"
                placeholder="Enter option C"
                defaultValue={question.options[2]}
                {...register(`questions[${index}].options[2]`)}
              />
            </div>
            
            <div className="mb-4">
              <label className="form-label" htmlFor={`question_${index}_option_d`}>
                Option D
              </label>
              <input
                id={`question_${index}_option_d`}
                type="text"
                className="form-input"
                placeholder="Enter option D"
                defaultValue={question.options[3]}
                {...register(`questions[${index}].options[3]`)}
              />
            </div>
            
            <div>
              <label className="form-label" htmlFor={`question_${index}_correct`}>
                Correct Answer
              </label>
              <select
                id={`question_${index}_correct`}
                className="form-input"
                defaultValue={question.correctAnswer}
                {...register(`questions[${index}].correctAnswer`)}
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
              </select>
            </div>
          </div>
        ))}
        
        {questions.length < 5 && (
          <div className="mb-6">
            <button
              type="button"
              onClick={addQuestion}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              + Add Another Question
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

export default L2EQuizForm;