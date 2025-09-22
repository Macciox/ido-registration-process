import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Project {
  id: string;
  name: string;
}

interface ProjectSelectorProps {
  onProjectSelect: (projectId: string | null, projectName?: string) => void;
  selectedProjectId?: string | null;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({ 
  onProjectSelect, 
  selectedProjectId 
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewProject = async () => {
    if (!newProjectName.trim()) return;

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([{ name: newProjectName.trim() }])
        .select('id, name')
        .single();

      if (error) throw error;

      setProjects([...projects, data]);
      onProjectSelect(data.id, data.name);
      setNewProjectName('');
      setShowNewProjectForm(false);
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading projects...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Associate with Project (Optional)
        </label>
        
        <div className="space-y-2">
          {/* No Project Option */}
          <label className="flex items-center">
            <input
              type="radio"
              name="project"
              value=""
              checked={selectedProjectId === null}
              onChange={() => onProjectSelect(null)}
              className="mr-2"
            />
            <span className="text-white">No project (General analysis)</span>
          </label>

          {/* Existing Projects */}
          {projects.map((project) => (
            <label key={project.id} className="flex items-center">
              <input
                type="radio"
                name="project"
                value={project.id}
                checked={selectedProjectId === project.id}
                onChange={() => onProjectSelect(project.id, project.name)}
                className="mr-2"
              />
              <span className="text-white">{project.name}</span>
            </label>
          ))}

          {/* New Project Option */}
          <label className="flex items-center">
            <input
              type="radio"
              name="project"
              value="new"
              checked={showNewProjectForm}
              onChange={() => setShowNewProjectForm(true)}
              className="mr-2"
            />
            <span className="text-white">Create new project</span>
          </label>
        </div>
      </div>

      {/* New Project Form */}
      {showNewProjectForm && (
        <div className="bg-bg-secondary p-4 rounded-lg border border-white/10">
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Enter project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="sleek-input w-full"
              onKeyPress={(e) => e.key === 'Enter' && createNewProject()}
            />
            <div className="flex gap-2">
              <button
                onClick={createNewProject}
                disabled={!newProjectName.trim() || creating}
                className="btn-dark"
              >
                {creating ? 'Creating...' : 'Create Project'}
              </button>
              <button
                onClick={() => {
                  setShowNewProjectForm(false);
                  setNewProjectName('');
                  onProjectSelect(null);
                }}
                className="btn-light"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectSelector;