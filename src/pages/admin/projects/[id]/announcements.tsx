import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import Layout from '@/components/layout/Layout';
import AnnouncementSchedule from '@/components/admin/AnnouncementSchedule';

export default function ProjectAnnouncements() {
  const router = useRouter();
  const { id } = router.query;
  const [project, setProject] = useState<any>(null);
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setToken(session.access_token);
    };

    getSession();
  }, [router]);

  useEffect(() => {
    if (id && token) {
      fetchProject();
    }
  }, [id, token]);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
    }
  };

  if (!project) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="text-primary hover:text-primary/80 mb-4 transition-colors"
            >
              ← Back to Project
            </button>
            <h1 className="text-3xl font-bold text-white">
              {project.name} - Announcement Schedule
            </h1>
          </div>

          <AnnouncementSchedule projectId={id as string} token={token} />
        </div>
      </div>
    </Layout>
  );
}