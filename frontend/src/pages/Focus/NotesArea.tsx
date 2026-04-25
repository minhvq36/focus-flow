import React, { useState, useEffect } from 'react';

interface Note {
  id: string;
  content: string;
  createdAt: string;
}

/**
 * NotesArea component - Append-only notes audit trail during focus session
 * Each note has a timestamp, creating an audit trail of thoughts/progress
 */
export default function NotesArea({ taskId }: { taskId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load notes on component mount
  useEffect(() => {
    loadNotes();
  }, [taskId]);

  const loadNotes = async () => {
    try {
      // Fetch notes: GET /api/tasks/:id/notes
      const response = await fetch(`/api/tasks/${taskId}/notes`);
      if (response.ok) {
        const data = await response.json();
        setNotes(data || []);
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;

    setIsLoading(true);
    try {
      // Add note: POST /api/tasks/:id/notes
      const response = await fetch(`/api/tasks/${taskId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNoteContent }),
      });

      if (response.ok) {
        const newNote = await response.json();
        setNotes([newNote, ...notes]); // Prepend new note (DESC order)
        setNewNoteContent(''); // Clear input
      }
    } catch (error) {
      console.error('Failed to add note:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="notes-area">
      <h3>💬 Notes</h3>
      
      {/* Notes list - scrollable audit trail */}
      <div className="notes-list">
        {notes.length === 0 ? (
          <p className="empty-state">No notes yet. Add one to keep track of your progress.</p>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="note-item">
              <span className="note-time">{formatTime(note.createdAt)}</span>
              <span className="note-content">{note.content}</span>
            </div>
          ))
        )}
      </div>

      {/* Add note input */}
      <div className="note-input-group">
        <textarea
          value={newNoteContent}
          onChange={(e) => setNewNoteContent(e.target.value)}
          placeholder="Add a quick note..."
          maxLength={500}
          disabled={isLoading}
        />
        <button onClick={handleAddNote} disabled={isLoading || !newNoteContent.trim()}>
          {isLoading ? '...' : '+ Add Note'}
        </button>
      </div>
    </div>
  );
}

