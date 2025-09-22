import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import ProjectDocumentManager from '@/components/admin/ProjectDocumentManager';

interface Project {
  id: string;
  name: string;
  owner_id: string;
  owner_email?: string;
}

export default function ProjectDocumentsPage() {
  const router = useRouter();
  const { id } = router.query;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchProject();
    }
  }, [id]);

  const fetchProject = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role !== 'admin') {
      router.push('/');
      return;
    }

    // Fetch project details
    const { data: projectData } = await supabase
      .from('projects')
      .select(`
        id, 
        name, 
        owner_id,
        profiles!projects_owner_id_fkey(email)
      `)
      .eq('id', id)
      .single();

    if (projectData) {
      setProject({
        ...projectData,
        owner_email: projectData.profiles?.email
      });
    }
    
    setLoading(false);
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!project) {
    return <div className="p-6">Project not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Document Management
              </h1>
              <p className="text-gray-600 mt-1">
                Project: <span className="font-medium">{project.name}</span>
              </p>
              <p className="text-sm text-gray-500">
                Owner: {project.owner_email}
              </p>
            </div>
            <button
              onClick={() => router.push('/admin/projects')}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Back to Projects
            </button>
          </div>
        </div>

        {/* Document Manager */}
        <div className="bg-white rounded-lg shadow p-6">
          <ProjectDocumentManager 
            projectId={project.id} 
            isAdmin={true}
          />
        </div>

        {/* Help Section */}
        <div className="bg-blue-50 rounded-lg p-4 mt-6">
          <h3 className="font-medium text-blue-900 mb-2">Permission Guide</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p><strong>Can View:</strong> Project owner can see this document</p>
            <p><strong>Can Upload:</strong> Project owner can upload new versions</p>
            <p><strong>Can Edit:</strong> Project owner can modify document details</p>
            <p><strong>Can Delete:</strong> Project owner can remove this document</p>
            <p><strong>Public Document:</strong> Visible to all users (not just project team)</p>
          </div>
        </div>
      </div>
    </div>
  );
}