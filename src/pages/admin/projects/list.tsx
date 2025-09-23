import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/layout/Layout';

interface Project {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: string;
  owner_email?: string;
}

export default function ProjectsList() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
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

    // Fetch all projects
    const { data: projectsData } = await supabase
      .from('projects')
      .select(`
        id, 
        name, 
        description,
        owner_id,
        created_at,
        profiles!projects_owner_id_fkey(email)
      `)
      .order('created_at', { ascending: false });

    if (projectsData) {
      const mappedProjects = projectsData.map((project: any) => ({
        ...project,
        owner_email: project.profiles?.email || 'Unknown'
      }));
      setProjects(mappedProjects);
    }
    
    setLoading(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">All Projects</h1>
          <Link
            href="/admin/projects/new"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Create New Project
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projects.map((project) => (
                <tr key={project.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {project.name}
                      </div>
                      {project.description && (
                        <div className="text-sm text-gray-500">
                          {project.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {project.owner_email || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(project.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Link
                      href={`/admin/projects/${project.id}/documents`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Documents
                    </Link>
                    <Link
                      href={`/admin/projects/${project.id}/announcements`}
                      className="text-purple-600 hover:text-purple-900"
                    >
                      Announcements
                    </Link>
                    <Link
                      href={`/admin/projects/${project.id}/settings`}
                      className="text-green-600 hover:text-green-900"
                    >
                      Settings
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {projects.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No projects found</p>
              <Link
                href="/admin/projects/new"
                className="text-blue-600 hover:text-blue-800 mt-2 inline-block"
              >
                Create your first project
              </Link>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}