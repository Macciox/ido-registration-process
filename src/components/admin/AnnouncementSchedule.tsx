import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { defaultAnnouncements } from '@/data/defaultAnnouncements';

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

  const loadDefaultData = async () => {
    try {
      for (const announcement of defaultAnnouncements) {
        await fetch(`/api/projects/${projectId}/announcements`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(announcement)
        });
      }
      fetchAnnouncements();
    } catch (error) {
      console.error('Error loading default data:', error);
    }
  };

  const calendarEvents = announcements.map(ann => ({
    id: ann.id,
    title: ann.post_name,
    start: new Date(ann.scheduled_date),
    end: new Date(ann.scheduled_date),
    resource: ann
  }));

  const handleEventDrop = async ({ event, start }: any) => {
    const announcement = event.resource;
    await saveAnnouncement({
      ...announcement,
      scheduled_date: start.toISOString()
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Announcement Schedule</h2>
        <div className="space-x-2">
          <button
            onClick={addNewRow}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Add Announcement
          </button>
          <button
            onClick={loadDefaultData}
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
          >
            Load Default Schedule
          </button>
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            {showCalendar ? 'Show Table' : 'Show Calendar'}
          </button>
        </div>
      </div>

      {!showCalendar ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border px-4 py-2">Phase</th>
                <th className="border px-4 py-2">Post Name</th>
                <th className="border px-4 py-2">Twitter</th>
                <th className="border px-4 py-2">Telegram</th>
                <th className="border px-4 py-2">Email</th>
                <th className="border px-4 py-2">Date & Time</th>
                <th className="border px-4 py-2">Notes</th>
                <th className="border px-4 py-2">Actions</th>
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
      ) : (
        <div style={{ height: '600px' }}>
          <Calendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            onEventDrop={handleEventDrop}
            draggableAccessor={() => true}
            views={['month', 'week', 'day']}
            defaultView="month"
          />
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
        <td className="border px-4 py-2">{announcement.phase}</td>
        <td className="border px-4 py-2">{announcement.post_name}</td>
        <td className="border px-4 py-2 text-center">{announcement.twitter ? '✓' : ''}</td>
        <td className="border px-4 py-2 text-center">{announcement.telegram ? '✓' : ''}</td>
        <td className="border px-4 py-2 text-center">{announcement.email ? '✓' : ''}</td>
        <td className="border px-4 py-2">{moment(announcement.scheduled_date).format('DD/MM/YY - HH:mm UTC')}</td>
        <td className="border px-4 py-2">{announcement.notes}</td>
        <td className="border px-4 py-2">
          <button onClick={onEdit} className="text-blue-500 hover:underline mr-2">Edit</button>
          <button onClick={onDelete} className="text-red-500 hover:underline">Delete</button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="border px-2 py-2">
        <input
          type="text"
          value={formData.phase}
          onChange={(e) => setFormData({ ...formData, phase: e.target.value })}
          className="w-full p-1 border rounded"
        />
      </td>
      <td className="border px-2 py-2">
        <input
          type="text"
          value={formData.post_name}
          onChange={(e) => setFormData({ ...formData, post_name: e.target.value })}
          className="w-full p-1 border rounded"
        />
      </td>
      <td className="border px-2 py-2 text-center">
        <input
          type="checkbox"
          checked={formData.twitter}
          onChange={(e) => setFormData({ ...formData, twitter: e.target.checked })}
        />
      </td>
      <td className="border px-2 py-2 text-center">
        <input
          type="checkbox"
          checked={formData.telegram}
          onChange={(e) => setFormData({ ...formData, telegram: e.target.checked })}
        />
      </td>
      <td className="border px-2 py-2 text-center">
        <input
          type="checkbox"
          checked={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.checked })}
        />
      </td>
      <td className="border px-2 py-2">
        <input
          type="datetime-local"
          value={moment(formData.scheduled_date).format('YYYY-MM-DDTHH:mm')}
          onChange={(e) => setFormData({ ...formData, scheduled_date: new Date(e.target.value).toISOString() })}
          className="w-full p-1 border rounded"
        />
      </td>
      <td className="border px-2 py-2">
        <textarea
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full p-1 border rounded"
          rows={2}
        />
      </td>
      <td className="border px-2 py-2">
        <button onClick={handleSave} className="text-green-500 hover:underline mr-2">Save</button>
        <button onClick={onCancel} className="text-gray-500 hover:underline">Cancel</button>
      </td>
    </tr>
  );
}