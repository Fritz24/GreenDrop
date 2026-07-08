'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Check, X, Pencil, Trash2, Plus, Sparkles } from 'lucide-react';
import * as Icons from 'lucide-react';
import Loader from '@/components/Loader';

// Predefined list of usable Lucide icon names for easy admin selection
const AVAILABLE_ICONS = [
  'Recycle', 'Leaf', 'Award', 'Sparkles', 'Trophy', 'Medal', 
  'Shield', 'Star', 'Crown', 'Zap', 'Flame', 'Droplet', 'Heart'
];

// Predefined premium color palette
const THEME_COLORS = [
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Purple', hex: '#8B5CF6' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Rose', hex: '#F43F5E' },
  { name: 'Cyan', hex: '#06B6D4' },
  { name: 'Indigo', hex: '#6366F1' },
];

const RULE_LABELS = {
  total_weight: 'Total Weight (kg)',
  plastic_weight: 'Plastic Weight (kg)',
  paper_weight: 'Paper Weight (kg)',
  metal_weight: 'Metal Weight (kg)',
  glass_weight: 'Glass Weight (kg)',
};

export default function BadgesPage() {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Edit mode states
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editIcon, setEditIcon] = useState('Recycle');
  const [editColor, setEditColor] = useState('#10B981');
  const [editRuleType, setEditRuleType] = useState('total_weight');
  const [editRuleValue, setEditRuleValue] = useState('');

  // Add new badge states
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newIcon, setNewIcon] = useState('Recycle');
  const [newColor, setNewColor] = useState('#10B981');
  const [newRuleType, setNewRuleType] = useState('total_weight');
  const [newRuleValue, setNewRuleValue] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchBadges();
  }, []);

  const fetchBadges = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('badges')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (!error) {
      setBadges(data || []);
    } else {
      console.error('Error fetching badges:', error);
    }
    setLoading(false);
  };

  const startEdit = (b) => {
    setEditingId(b.id);
    setEditTitle(b.title);
    setEditDesc(b.description);
    setEditIcon(b.icon);
    setEditColor(b.color);
    setEditRuleType(b.rule_type);
    setEditRuleValue(String(b.rule_value));
    setErrorMsg('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setErrorMsg('');
  };

  const saveEdit = async (id) => {
    setErrorMsg('');
    const val = parseFloat(editRuleValue);

    if (!editTitle.trim()) {
      setErrorMsg('Badge title is required.');
      return;
    }
    if (!editDesc.trim()) {
      setErrorMsg('Description is required.');
      return;
    }
    if (isNaN(val) || val <= 0) {
      setErrorMsg('Threshold rule value must be greater than 0.');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('badges')
      .update({
        title: editTitle,
        description: editDesc,
        icon: editIcon,
        color: editColor,
        rule_type: editRuleType,
        rule_value: val
      })
      .eq('id', id);

    if (error) {
      setErrorMsg(error.message || 'Error updating badge.');
    } else {
      setBadges(prev =>
        prev.map(b => (b.id === id ? { ...b, title: editTitle, description: editDesc, icon: editIcon, color: editColor, rule_type: editRuleType, rule_value: val } : b))
      );
      setEditingId(null);
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this badge?')) return;
    
    const { error } = await supabase
      .from('badges')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error deleting badge: ' + error.message);
    } else {
      setBadges(prev => prev.filter(b => b.id !== id));
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const val = parseFloat(newRuleValue);

    if (!newTitle.trim()) {
      setErrorMsg('Badge title is required.');
      return;
    }
    if (!newDesc.trim()) {
      setErrorMsg('Description is required.');
      return;
    }
    if (isNaN(val) || val <= 0) {
      setErrorMsg('Threshold rule value must be greater than 0.');
      return;
    }

    setSaving(true);
    const { data, error } = await supabase
      .from('badges')
      .insert({
        title: newTitle,
        description: newDesc,
        icon: newIcon,
        color: newColor,
        rule_type: newRuleType,
        rule_value: val
      })
      .select();

    if (error) {
      setErrorMsg(error.message || 'Error creating badge.');
    } else {
      if (data && data[0]) {
        setBadges(prev => [...prev, data[0]]);
      }
      setNewTitle('');
      setNewDesc('');
      setNewIcon('Recycle');
      setNewColor('#10B981');
      setNewRuleType('total_weight');
      setNewRuleValue('');
      setShowAddForm(false);
    }
    setSaving(false);
  };

  // Helper to render dynamically referenced Lucide icon components in Next.js Admin app
  const renderBadgeIcon = (iconName, color = 'var(--text)') => {
    const LucideIcon = Icons[iconName] || Icons.Recycle;
    return <LucideIcon size={18} style={{ color }} />;
  };

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Achievements & Badges</h1>
          <p className="page-subtitle">Configure rules and rewards for unlocked badges</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowAddForm(!showAddForm); setErrorMsg(''); }}>
          {showAddForm ? <X size={16} style={{ marginRight: 6 }} /> : <Plus size={16} style={{ marginRight: 6 }} />}
          {showAddForm ? 'Cancel' : 'Add Badge'}
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
          maxWidth: 1000
        }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {showAddForm && (
        <div className="card" style={{ maxWidth: 1000, marginBottom: 24 }}>
          <div className="card-body">
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>Create Dynamic Achievement Badge</h3>
            <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Badge Title</label>
                <input className="input" type="text" placeholder="e.g. Super Saver" value={newTitle} onChange={e => setNewTitle(e.target.value)} required />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Badge Icon</label>
                <select className="input" value={newIcon} onChange={e => setNewIcon(e.target.value)} style={{ padding: '8px 12px' }}>
                  {AVAILABLE_ICONS.map(i => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Icon Theme Color</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select className="input" value={newColor} onChange={e => setNewColor(e.target.value)} style={{ padding: '8px 12px', flex: 1 }}>
                    {THEME_COLORS.map(c => (
                      <option key={c.hex} value={c.hex}>{c.name} ({c.hex})</option>
                    ))}
                  </select>
                  <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} style={{ border: 'none', background: 'none', cursor: 'pointer', width: 32, height: 32 }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Condition Metric</label>
                <select className="input" value={newRuleType} onChange={e => setNewRuleType(e.target.value)} style={{ padding: '8px 12px' }}>
                  {Object.entries(RULE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Condition Threshold (kg)</label>
                <input className="input" type="number" step="0.01" min="0.001" placeholder="e.g. 25" value={newRuleValue} onChange={e => setNewRuleValue(e.target.value)} required />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Description</label>
                <input className="input" type="text" placeholder="e.g. Recycled over 25 kg of total materials!" value={newDesc} onChange={e => setNewDesc(e.target.value)} required />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  Create Achievement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card" style={{ maxWidth: 1000 }}>
        <div className="card-body">
          {loading ? (
            <Loader message="Loading badges..." />
          ) : badges.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)' }}>
              No achievement badges configured yet. Click "Add Badge" to get started.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Icon</th>
                  <th>Badge Title</th>
                  <th>Unlock Condition</th>
                  <th>Description</th>
                  <th style={{ width: 140 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {badges.map(b => (
                  <tr key={b.id}>
                    <td>
                      <div style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        background: (editingId === b.id ? editColor : b.color) + '1A',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {renderBadgeIcon(editingId === b.id ? editIcon : b.icon, editingId === b.id ? editColor : b.color)}
                      </div>
                    </td>
                    <td>
                      {editingId === b.id ? (
                        <input className="input" type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ padding: '6px 10px' }} />
                      ) : (
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{b.title}</span>
                      )}
                    </td>
                    <td>
                      {editingId === b.id ? (
                        <div style={{ display: 'flex', gap: 6, flexDirection: 'column' }}>
                          <select className="input" value={editRuleType} onChange={e => setEditRuleType(e.target.value)} style={{ padding: '4px 6px', fontSize: 13 }}>
                            {Object.entries(RULE_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                          <input className="input" type="number" step="0.01" min="0.001" value={editRuleValue} onChange={e => setEditRuleValue(e.target.value)} style={{ padding: '4px 6px', width: 90 }} />
                        </div>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ background: 'var(--bg-warm)', padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>
                            {b.rule_type.toUpperCase().replace('_', ' ')}
                          </span>
                          <span style={{ fontWeight: 600 }}>&ge; {b.rule_value} kg</span>
                        </span>
                      )}
                    </td>
                    <td>
                      {editingId === b.id ? (
                        <div style={{ display: 'flex', gap: 6, flexDirection: 'column' }}>
                          <input className="input" type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)} style={{ padding: '6px 10px' }} />
                          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                            <select className="input" value={editIcon} onChange={e => setEditIcon(e.target.value)} style={{ padding: '4px 6px', fontSize: 12 }}>
                              {AVAILABLE_ICONS.map(i => (
                                <option key={i} value={i}>{i}</option>
                              ))}
                            </select>
                            <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} style={{ border: 'none', background: 'none', cursor: 'pointer', width: 28, height: 28 }} />
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{b.description}</span>
                      )}
                    </td>
                    <td>
                      {editingId === b.id ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-primary" style={{ padding: '6px 12px' }} onClick={() => saveEdit(b.id)} disabled={saving}>
                            <Check size={14} />
                          </button>
                          <button className="btn btn-ghost" style={{ padding: '6px 12px' }} onClick={cancelEdit}>
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost" style={{ padding: '6px 12px' }} onClick={() => startEdit(b)}>
                            <Pencil size={13} />
                          </button>
                          <button className="btn btn-ghost" style={{ padding: '6px 12px', color: 'var(--danger)' }} onClick={() => handleDelete(b.id)}>
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
            Achievements reward user contributions and encourage green habits. Mobile app calculates locking status in real-time.
          </div>
        </div>
      </div>
    </>
  );
}
