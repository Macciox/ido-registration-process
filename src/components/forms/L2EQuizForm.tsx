import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';

interface L2EQuizFormProps {
  projectId: string;
  onCompletionUpdate?: (tabId: string, percentage: number) => void;
}

interface QuizQuestion {
  question: string;
  options: [string, string, string, string];
  correctAnswer: 'A' | 'B' | 'C' | 'D';
}

const L2EQuizForm: React.FC<L2EQuizFormProps> = ({ projectId, onCompletionUpdate }) => {
  const { register } = useForm();
  const [questions, setQuestions] = useState<QuizQuestion[]>([
    { question: '', options: ['', '', '', ''] as [string, string, string, string], correctAnswer: 'A' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  
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
          
          // Calculate completion percentage
          calculateCompletionPercentage(loadedQuestions);
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
  
  const calculateCompletionPercentage = (questionsData: QuizQuestion[]) => {
    // For quiz questions, we consider it complete if there's at least one question with all fields filled
    const validQuestions = questionsData.filter(q => 
      q.question && 
      q.options.every(option => option) && 
      q.correctAnswer
    );
    
    const percentage = validQuestions.length > 0 ? 100 : 0;
    setCompletionPercentage(percentage);
    
    // Update parent component with completion percentage
    if (onCompletionUpdate) {
      onCompletionUpdate('l2e-quiz', percentage);
    }
  };
  
  const addQuestion = () => {
    if (questions.length < 5) {
      const newQuestions = [
        ...questions, 
        { question: '', options: ['', '', '', ''] as [string, string, string, string], correctAnswer: 'A' }
      ];
      setQuestions(newQuestions);
    }
  };
  
  const removeQuestion = async (index: number) => {
    if (questions.length > 1) {
      const newQuestions = [...questions];
      newQuestions.splice(index, 1);
      setQuestions(newQuestions);
      
      // Save to database
      await saveQuestionsToDatabase(newQuestions);
      
      // Update completion percentage
      calculateCompletionPercentage(newQuestions);
    }
  };
  
  const handleQuestionChange = async (
    index: number, 
    field: 'question' | 'correctAnswer' | 'option', 
    value: string,
    optionIndex?: number
  ) => {
    const newQuestions = [...questions];
    
    if (field === 'question') {
      newQuestions[index].question = value;
    } else if (field === 'correctAnswer') {
      newQuestions[index].correctAnswer = value as 'A' | 'B' | 'C' | 'D';
    } else if (field === 'option' && optionIndex !== undefined) {
      const newOptions = [...newQuestions[index].options];
      newOptions[optionIndex] = value;
      newQuestions[index].options = newOptions as [string, string, string, string];
    }
    
    setQuestions(newQuestions);
    
    // Save to database
    await saveQuestionsToDatabase(newQuestions);
    
    // Update completion percentage
    calculateCompletionPercentage(newQuestions);
  };
  
  const saveQuestionsToDatabase = async (questionsToSave: QuizQuestion[]) => {
    try {
      // Delete existing questions
      await supabase
        .from('quiz_questions')
        .delete()
        .eq('project_id', projectId);
      
      // Insert new questions
      const formattedQuestions = questionsToSave
        .filter(q => q.question) // Only save questions with at least a question
        .map(q => ({
          project_id: projectId,
          question: q.question,
          option_a: q.options[0],
          option_b: q.options[1],
          option_c: q.options[2],
          option_d: q.options[3],
          correct_answer: q.correctAnswer
        }));
      
      if (formattedQuestions.length > 0) {
        await supabase
          .from('quiz_questions')
          .insert(formattedQuestions);
      }
      
      // Show success message briefly
      setSuccess('Quiz questions saved');
      setTimeout(() => setSuccess(null), 2000);
      
    } catch (err) {
      console.error('Error saving quiz questions:', err);
      setError('Failed to save quiz questions');
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium">L2E Quiz Questions (up to 5 entries)</h2>
        <div className="flex items-center">
          <div className="mr-3 text-sm font-medium">
            Completion: {completionPercentage}%
          </div>
          <div className="w-32 bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-primary h-2.5 rounded-full" 
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
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
      
      <div>
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
                value={question.question}
                onChange={(e) => handleQuestionChange(index, 'question', e.target.value)}
              />
            </div>
            
            {['A', 'B', 'C', 'D'].map((option, optionIndex) => (
              <div className="mb-4" key={optionIndex}>
                <label className="form-label" htmlFor={`question_${index}_option_${option.toLowerCase()}`}>
                  Option {option}
                </label>
                <input
                  id={`question_${index}_option_${option.toLowerCase()}`}
                  type="text"
                  className="form-input"
                  placeholder={`Enter option ${option}`}
                  value={question.options[optionIndex]}
                  onChange={(e) => handleQuestionChange(index, 'option', e.target.value, optionIndex)}
                />
              </div>
            ))}
            
            <div>
              <label className="form-label" htmlFor={`question_${index}_correct`}>
                Correct Answer
              </label>
              <select
                id={`question_${index}_correct`}
                className="form-input"
                value={question.correctAnswer}
                onChange={(e) => handleQuestionChange(index, 'correctAnswer', e.target.value)}
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
      </div>
    </div>
  );
};

export default L2EQuizForm;