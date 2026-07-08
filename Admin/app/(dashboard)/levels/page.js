'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Check, X, Pencil, Trash2, Plus, Sparkles } from 'lucide-react';
import Loader from '@/components/Loader';

export default function LevelsPage() {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Edit mode states
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editMin, setEditMin] = useState('');
  const [editMax, setEditMax] = useState('');
  const [editNext, setEditNext] = useState('');

  // Add new level states
  const [newName, setNewName] = useState('');
  const [newMin, setNewMin] = useState('');
  const [newMax, setNewMax] = useState('');
  const [newNext, setNewNext] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchLevels();
  }, []);

  const fetchLevels = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('levels')
      .select('*')
      .order('min_points', { ascending: true });
    
    if (!error) {
      setLevels(data || []);
    } else {
      console.error('Error fetching levels:', error);
    }
    setLoading(false);
  };

  const startEdit = (lvl) => {
    setEditingId(lvl.id);
    setEditName(lvl.name);
    setEditMin(String(lvl.min_points));
    setEditMax(String(lvl.max_points));
    setEditNext(lvl.next_level_name || '');
    setErrorMsg('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setErrorMsg('');
  };

  const saveEdit = async (id) => {
    setErrorMsg('');
    const minVal = parseInt(editMin, 10);
    const maxVal = parseInt(editMax, 10);

    if (!editName.trim()) {
      setErrorMsg('Level name is required.');
      return;
    }
    if (isNaN(minVal) || minVal < 0) {
      setErrorMsg('Min points must be 0 or greater.');
      return;
    }
    if (isNaN(maxVal) || maxVal <= minVal) {
      setErrorMsg('Max points must be greater than min points.');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('levels')
      .update({
        name: editName,
        min_points: minVal,
        max_points: maxVal,
        next_level_name: editNext || null
      })
      .eq('id', id);

    if (error) {
      setErrorMsg(error.message || 'Error updating level.');
    } else {
      setLevels(prev =>
        prev.map(l => (l.id === id ? { ...l, name: editName, min_points: minVal, max_points: maxVal, next_level_name: editNext || null } : l))
      );
      setEditingId(null);
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this level tier?')) return;
    
    const { error } = await supabase
      .from('levels')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error deleting level: ' + error.message);
    } else {
      setLevels(prev => prev.filter(l => l.id !== id));
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const minVal = parseInt(newMin, 10);
    const maxVal = parseInt(newMax, 10);

    if (!newName.trim()) {
      setErrorMsg('Level name is required.');
      return;
    }
    if (isNaN(minVal) || minVal < 0) {
      setErrorMsg('Min points must be 0 or greater.');
      return;
    }
    if (isNaN(maxVal) || maxVal <= minVal) {
      setErrorMsg('Max points must be greater than min points.');
      return;
    }

    setSaving(true);
    const { data, error } = await supabase
      .from('levels')
      .insert({
        name: newName,
        min_points: minVal,
        max_points: maxVal,
        next_level_name: newNext || null
      })
      .select();

    if (error) {
      setErrorMsg(error.message || 'Error creating level.');
    } else {
      if (data && data[0]) {
        setLevels(prev => [...prev, data[0]].sort((a, b) => a.min_points - b.min_points));
      }
      setNewName('');
      setNewMin('');
      setNewMax('');
      setNewNext('');
      setShowAddForm(false);
    }
    setSaving(false);
  };

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Levels</h1>
          <p className="page-subtitle">Configure points boundaries for user ranks and levels</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowAddForm(!showAddForm); setErrorMsg(''); }}>
          {showAddForm ? <X size={16} style={{ marginRight: 6 }} /> : <Plus size={16} style={{ marginRight: 6 }} />}
          {showAddForm ? 'Cancel' : 'Add Level'}
        </button>
      </div>

      {errorMsg && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          color: 'var(--danger)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-sm)',
          marginBottom: 20,
          fontSize: 14,
          fontWeight: 600,
          maxWidth: 900
        }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {showAddForm && (
        <div className="card" style={{ maxWidth: 900, marginBottom: 24 }}>
          <div className="card-body">
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>Create New Level</h3>
            <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Level Name</label>
                <input className="input" type="text" placeholder="e.g. Eco Master" value={newName} onChange={e => setNewName(e.target.value)} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Min Points</label>
                <input className="input" type="number" min="0" placeholder="e.g. 5000" value={newMin} onChange={e => setNewMin(e.target.value)} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Max Points</label>
                <input className="input" type="number" min="0" placeholder="e.g. 10000" value={newMax} onChange={e => setNewMax(e.target.value)} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Next Level Title</label>
                <input className="input" type="text" placeholder="e.g. Eco Legend" value={newNext} onChange={e => setNewNext(e.target.value)} />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  Create Level
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card" style={{ maxWidth: 900 }}>
        <div className="card-body">
          {loading ? (
            <Loader message="Loading level tiers..." />
          ) : levels.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)' }}>
              No levels configured yet. Click "Add Level" to get started.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Level Name</th>
                  <th>Min Points</th>
                  <th>Max Points</th>
                  <th>Next Level Target</th>
                  <th style={{ width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {levels.map(l => (
                  <tr key={l.id}>
                    <td>
                      {editingId === l.id ? (
                        <input className="input" type="text" value={editName} onChange={e => setEditName(e.target.value)} style={{ padding: '6px 10px' }} />
                      ) : (
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{l.name}</span>
                      )}
                    </td>
                    <td>
                      {editingId === l.id ? (
                        <input className="input" type="number" min="0" value={editMin} onChange={e => setEditMin(e.target.value)} style={{ padding: '6px 10px', width: 100 }} />
                      ) : (
                        <span>{l.min_points.toLocaleString()} pts</span>
                      )}
                    </td>
                    <td>
                      {editingId === l.id ? (
                        <input className="input" type="number" min="0" value={editMax} onChange={e => setEditMax(e.target.value)} style={{ padding: '6px 10px', width: 100 }} />
                      ) : (
                        <span>{l.max_points.toLocaleString()} pts</span>
                      )}
                    </td>
                    <td>
                      {editingId === l.id ? (
                        <input className="input" type="text" placeholder="None" value={editNext} onChange={e => setEditNext(e.target.value)} style={{ padding: '6px 10px' }} />
                      ) : (
                        <span style={{ color: l.next_level_name ? 'var(--text)' : 'var(--text-secondary)' }}>
                          {l.next_level_name || 'N/A'}
                        </span>
                      )}
                    </td>
                    <td>
                      {editingId === l.id ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-primary" style={{ padding: '6px 12px' }} onClick={() => saveEdit(l.id)} disabled={saving}>
                            <Check size={14} />
                          </button>
                          <button className="btn btn-ghost" style={{ padding: '6px 12px' }} onClick={cancelEdit}>
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost" style={{ padding: '6px 12px' }} onClick={() => startEdit(l)}>
                            <Pencil size={13} />
                          </button>
                          <button className="btn btn-ghost" style={{ padding: '6px 12px', color: 'var(--danger)' }} onClick={() => handleDelete(l.id)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ 
            marginTop: 24, fontSize: 12, color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '12px 16px',
            background: 'var(--bg-warm)',
            borderRadius: 'var(--radius-sm)',
          }}>
            <Sparkles size={13} color="var(--accent)" />
            Levels define the ranking structure for users. Changes are synced dynamically to the mobile app.
          </div>
        </div>
      </div>
    </>
  );
}
