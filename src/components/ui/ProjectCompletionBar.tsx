import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ProjectCompletionBarProps {
  projectId: string;
}

const ProjectCompletionBar: React.FC<ProjectCompletionBarProps> = ({ projectId }) => {
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calculateProjectCompletion = async () => {
      try {
        setLoading(true);
        
        // Get all fields for the project
        const { data: fields, error } = await supabase
          .from('project_fields')
          .select('status')
          .eq('project_id', projectId);
        
        if (error || !fields || fields.length === 0) {
          setCompletionPercentage(0);
          return;
        }
        
        // Calculate percentage of confirmed fields
        const confirmedFields = fields.filter(field => field.status === 'Confirmed').length;
        const percentage = Math.round((confirmedFields / fields.length) * 100);
        
        setCompletionPercentage(percentage);
      } catch (err) {
        console.error('Error calculating project completion:', err);
        setCompletionPercentage(0);
      } finally {
        setLoading(false);
      }
    };
    
    if (projectId) {
      calculateProjectCompletion();
    }
  }, [projectId]);

  return (
    <div className="flex items-center">
      <div className="mr-3 text-sm font-medium">
        Overall Completion: {completionPercentage}%
      </div>
      <div className="w-32 bg-gray-200 rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full ${
            completionPercentage > 75 ? 'bg-green-500' :
            completionPercentage > 25 ? 'bg-yellow-500' :
            'bg-red-500'
          }`}
          style={{ width: `${completionPercentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProjectCompletionBar;