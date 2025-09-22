import React, { useState, useEffect, useRef } from 'react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
        
        <div className="relative" ref={dropdownRef}>
          <div 
            className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-white cursor-pointer flex justify-between items-center"
            onClick={() => setIsOpen(!isOpen)}
          >
            <span>
              {selectedProjectId === null ? 'No project (General analysis)' : 
               projects.find(p => p.id === selectedProjectId)?.name || 'Select project...'}
            </span>
            <span className="text-gray-400">{isOpen ? '▲' : '▼'}</span>
          </div>
          
          {isOpen && (
            <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {/* Search input */}
              <div className="p-2 border-b border-gray-600">
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 text-sm"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              
              {/* No project option */}
              <div 
                className="p-3 hover:bg-gray-700 cursor-pointer text-white border-b border-gray-600"
                onClick={() => {
                  onProjectSelect(null);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
              >
                No project (General analysis)
              </div>
              
              {/* Filtered projects */}
              {projects
                .filter(project => project.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((project) => (
                <div 
                  key={project.id}
                  className="p-3 hover:bg-gray-700 cursor-pointer text-white border-b border-gray-600 last:border-b-0"
                  onClick={() => {
                    onProjectSelect(project.id, project.name);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  {project.name}
                </div>
              ))}
              
              {/* Create new project option */}
              <div 
                className="p-3 hover:bg-gray-700 cursor-pointer text-green-400 border-t border-gray-600"
                onClick={() => {
                  setShowNewProjectForm(true);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
              >
                + Create new project
              </div>
              
              {projects.filter(project => project.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && searchTerm && (
                <div className="p-3 text-gray-400 text-center">
                  No projects found
                </div>
              )}
            </div>
          )}
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