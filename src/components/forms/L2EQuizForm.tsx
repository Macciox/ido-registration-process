import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

const L2EQuizForm: React.FC = () => {
  const [questions, setQuestions] = useState<{ 
    question: string; 
    options: [string, string, string, string]; 
    correctAnswer: 'A' | 'B' | 'C' | 'D' 
  }[]>([
    { 
      question: '', 
      options: ['', '', '', ''], 
      correctAnswer: 'A' 
    },
  ]);
  
  const { register, handleSubmit } = useForm();
  
  const onSubmit = (data: any) => {
    console.log(data);
    // Will be connected to Supabase in the future
  };
  
  const addQuestion = () => {
    if (questions.length < 5) {
      setQuestions([
        ...questions, 
        { 
          question: '', 
          options: ['', '', '', ''], 
          correctAnswer: 'A' 
        }
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

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium mb-6">L2E Quiz Questions (up to 5 entries)</h2>
      
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
          <button type="submit" className="btn btn-primary">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

export default L2EQuizForm;