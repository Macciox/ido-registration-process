import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/auth';

interface Project {
  id: string;
  name: string;
}

interface ProjectSelectorProps {
  onProjectSelect: (projectId: string | null, projectName?: string) => void;
  selectedProjectId: string | null;
}

export default function ProjectSelector({ onProjectSelect, selectedProjectId }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-white">
        Project (Optional)
      </label>
      <select
        value={selectedProjectId || ''}
        onChange={(e) => {
          const projectId = e.target.value || null;
          const project = projects.find(p => p.id === projectId);
          onProjectSelect(projectId, project?.name);
        }}
        className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white"
      >
        <option value="">No project (standalone analysis)</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
      <p className="text-xs text-text-secondary mt-1">
        💡 Select a project to organize your analysis, or leave blank for standalone analysis
      </p>
    </div>
  );
}