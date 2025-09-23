import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import AnnouncementSchedule from '@/components/admin/AnnouncementSchedule';

export default function ProjectOwnerAnnouncements() {
  const router = useRouter();
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
    if (token) {
      fetchUserProject();
    }
  }, [token]);

  const fetchUserProject = async () => {
    try {
      const response = await fetch('/api/projects/user', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.length > 0) {
        setProject(data[0]);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
    }
  };

  if (!project) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-6">Announcement Schedule</h1>
          <p className="text-text-secondary">No project found. Please contact an administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">
          {project.name} - Announcement Schedule
        </h1>

        <AnnouncementSchedule projectId={project.id} token={token} />
      </div>
    </div>
  );
}