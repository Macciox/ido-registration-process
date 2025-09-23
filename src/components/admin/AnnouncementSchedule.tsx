import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '@/styles/calendar.css';

const localizer = momentLocalizer(moment);

interface Announcement {
  id?: string;
  phase: string;
  post_name: string;
  twitter: boolean;
  telegram: boolean;
  email: boolean;
  scheduled_date: string;
  notes?: string;
}

interface AnnouncementScheduleProps {
  projectId: string;
  token: string;
}

export default function AnnouncementSchedule({ projectId, token }: AnnouncementScheduleProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAnnouncements();
  }, [projectId]);

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/announcements`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  };

  const saveAnnouncement = async (announcement: Announcement) => {
    try {
      const method = announcement.id ? 'PUT' : 'POST';
      await fetch(`/api/projects/${projectId}/announcements`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(announcement)
      });
      fetchAnnouncements();
      setEditingId(null);
    } catch (error) {
      console.error('Error saving announcement:', error);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      await fetch(`/api/projects/${projectId}/announcements`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ id })
      });
      fetchAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
    }
  };

  const addNewRow = () => {
    const newAnnouncement: Announcement = {
      phase: 'IDO Phase',
      post_name: '',
      twitter: false,
      telegram: false,
      email: false,
      scheduled_date: new Date().toISOString(),
      notes: ''
    };
    setAnnouncements([...announcements, newAnnouncement]);
    setEditingId('new');
  };

  const clearAllAnnouncements = async () => {
    if (confirm('Are you sure you want to delete all announcements?')) {
      try {
        await fetch(`/api/projects/${projectId}/announcements/clear`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchAnnouncements();
      } catch (error) {
        console.error('Error clearing announcements:', error);
      }
    }
  };



  const calendarEvents = announcements.map(ann => ({
    id: ann.id,
    title: ann.post_name,
    start: new Date(ann.scheduled_date),
    end: new Date(ann.scheduled_date),
    resource: ann
  }));



  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Announcement Schedule</h2>
        <div className="flex gap-3">
          <button
            onClick={addNewRow}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
          >
            Add Announcement
          </button>
          <button
            onClick={clearAllAnnouncements}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
          >
            {showCalendar ? 'Show Table' : 'Show Calendar'}
          </button>
        </div>
      </div>

      {!showCalendar ? (
        <div className="sleek-card p-6">
          <div className="overflow-x-auto">
            <table className="sleek-table w-full">
              <thead>
                <tr>
                  <th>Phase</th>
                  <th>Post Name</th>
                  <th>Twitter</th>
                  <th>Telegram</th>
                  <th>Email</th>
                  <th>Date & Time</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
            <tbody>
              {announcements.map((ann, index) => (
                <AnnouncementRow
                  key={ann.id || index}
                  announcement={ann}
                  isEditing={editingId === ann.id || editingId === 'new'}
                  onSave={saveAnnouncement}
                  onEdit={() => setEditingId(ann.id || 'new')}
                  onCancel={() => {
                    setEditingId(null);
                    if (!ann.id) {
                      setAnnouncements(announcements.slice(0, -1));
                    }
                  }}
                  onDelete={() => ann.id && deleteAnnouncement(ann.id)}
                />
              ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="sleek-card p-6">
          <div style={{ height: '600px' }}>
            <Calendar
              localizer={localizer}
              events={calendarEvents}
              startAccessor="start"
              endAccessor="end"
              views={['month', 'week', 'day']}
              defaultView="month"
              onSelectEvent={(event) => {
                const announcement = event.resource;
                if (announcement.id) {
                  setEditingId(announcement.id);
                  setShowCalendar(false);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface AnnouncementRowProps {
  announcement: Announcement;
  isEditing: boolean;
  onSave: (announcement: Announcement) => void;
  onEdit: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

function AnnouncementRow({ announcement, isEditing, onSave, onEdit, onCancel, onDelete }: AnnouncementRowProps) {
  const [formData, setFormData] = useState(announcement);

  useEffect(() => {
    setFormData(announcement);
  }, [announcement]);

  const handleSave = () => {
    onSave(formData);
  };

  if (!isEditing) {
    return (
      <tr>
        <td className="text-white">{announcement.phase}</td>
        <td className="text-white font-medium">{announcement.post_name}</td>
        <td className="text-center">{announcement.twitter ? <span className="text-primary">✓</span> : <span className="text-text-muted">-</span>}</td>
        <td className="text-center">{announcement.telegram ? <span className="text-primary">✓</span> : <span className="text-text-muted">-</span>}</td>
        <td className="text-center">{announcement.email ? <span className="text-primary">✓</span> : <span className="text-text-muted">-</span>}</td>
        <td className="text-text-secondary">{moment(announcement.scheduled_date).format('DD/MM/YY - HH:mm UTC')}</td>
        <td className="text-text-secondary">{announcement.notes}</td>
        <td>
          <div className="flex gap-2">
            <button onClick={onEdit} className="text-primary hover:text-primary/80 transition-colors">Edit</button>
            <button onClick={onDelete} className="text-red-400 hover:text-red-300 transition-colors">Delete</button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>
        <input
          type="text"
          value={formData.phase}
          onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
          className="w-full p-2 bg-white/10 border border-white/20 rounded text-white placeholder-text-muted"
        />
      </td>
      <td>
        <input
          type="text"
          value={formData.post_name}
          onChange={(e) => setFormData({ ...formData, post_name: e.target.value })}
          className="w-full p-2 bg-white/10 border border-white/20 rounded text-white placeholder-text-muted"
        />
      </td>
      <td className="text-center">
        <input
          type="checkbox"
          checked={formData.twitter}
          onChange={(e) => setFormData({ ...formData, twitter: e.target.checked })}
          className="w-4 h-4 text-primary bg-white/10 border-white/20 rounded focus:ring-primary"
        />
      </td>
      <td className="text-center">
        <input
          type="checkbox"
          checked={formData.telegram}
          onChange={(e) => setFormData({ ...formData, telegram: e.target.checked })}
          className="w-4 h-4 text-primary bg-white/10 border-white/20 rounded focus:ring-primary"
        />
      </td>
      <td className="text-center">
        <input
          type="checkbox"
          checked={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.checked })}
          className="w-4 h-4 text-primary bg-white/10 border-white/20 rounded focus:ring-primary"
        />
      </td>
      <td>
        <input
          type="datetime-local"
          value={moment(formData.scheduled_date).format('YYYY-MM-DDTHH:mm')}
          onChange={(e) => setFormData({ ...formData, scheduled_date: new Date(e.target.value).toISOString() })}
          className="w-full p-2 bg-white/10 border border-white/20 rounded text-white"
        />
      </td>
      <td>
        <textarea
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full p-2 bg-white/10 border border-white/20 rounded text-white placeholder-text-muted"
          rows={2}
        />
      </td>
      <td>
        <div className="flex gap-2">
          <button onClick={handleSave} className="text-primary hover:text-primary/80 transition-colors">Save</button>
          <button onClick={onCancel} className="text-text-muted hover:text-white transition-colors">Cancel</button>
        </div>
      </td>
    </tr>
  );
}