import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
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
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-blue-500 hover:underline mb-4"
          >
            ← Back to Project
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {project.name} - Announcement Schedule
          </h1>
        </div>

        <AnnouncementSchedule projectId={id as string} token={token} />
      </div>
    </div>
  );
}