'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Check, X, Pencil, Sparkles } from 'lucide-react';
import * as Icons from 'lucide-react';
import Loader from '@/components/Loader';

const renderMaterialIcon = (iconName, color = 'var(--text)') => {
  const LucideIcon = Icons[iconName] || Icons.Recycle;
  return <LucideIcon size={15} style={{ color }} />;
};

export default function MaterialsPage() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState(null);
  const [editVal, setEditVal]     = useState('');
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    supabase.from('materials')
      .select('*')
      .order('name')
      .then(({ data }) => { setMaterials(data || []); setLoading(false); });
  }, []);

  const startEdit = (mat) => {
    setEditing(mat.id);
    setEditVal(String(mat.eco_coins_per_kg));
  };
  const cancelEdit = () => { setEditing(null); setEditVal(''); };

  const saveEdit = async (id) => {
    const newVal = parseInt(editVal, 10);
    if (isNaN(newVal) || newVal < 1) return;
    setSaving(true);
    const { error } = await supabase
      .from('materials')
      .update({ eco_coins_per_kg: newVal })
      .eq('id', id);
    if (!error) {
      setMaterials(prev => prev.map(m => m.id === id ? { ...m, eco_coins_per_kg: newVal } : m));
    }
    setSaving(false);
    setEditing(null);
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Material rates</h1>
        <p className="page-subtitle">Configure eco credit reward rates per kilogram</p>
      </div>

      <div className="card" style={{ maxWidth: 680 }}>
        <div className="card-body">
          {loading ? (
            <Loader message="Loading materials..." />
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Credits per kg</th>
                  <th style={{ width: 120 }}></th>
                </tr>
              </thead>
              <tbody>
                {materials.map(m => (
                  <tr key={m.id}>
                    <td>
                      <div className="material-row" style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: (m.color || '#8C9E88') + '1A',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 10
                        }}>
                          {renderMaterialIcon(m.icon, m.color || '#8C9E88')}
                        </div>
                        <span className="material-name" style={{ fontWeight: 600, color: 'var(--text)' }}>{m.name}</span>
                      </div>
                    </td>
                    <td>
                      {editing === m.id ? (
                        <div className="inline-edit">
                          <input
                            className="input"
                            type="number"
                            min="1"
                            value={editVal}
                            onChange={e => setEditVal(e.target.value)}
                            autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') saveEdit(m.id); if (e.key === 'Escape') cancelEdit(); }}
                          />
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>credits</span>
                        </div>
                      ) : (
                        <span>
                          <span className="coin-value">{m.eco_coins_per_kg}</span>
                          <span className="coin-unit">/ kg</span>
                        </span>
                      )}
                    </td>
                    <td>
                      {editing === m.id ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-primary" style={{ padding: '6px 12px' }}
                            onClick={() => saveEdit(m.id)} disabled={saving}>
                            <Check size={14} />
                          </button>
                          <button className="btn btn-ghost" style={{ padding: '6px 12px' }}
                            onClick={cancelEdit}>
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button className="btn btn-ghost" style={{ padding: '6px 14px' }}
                          onClick={() => startEdit(m)}>
                          <Pencil size={13} /> Edit
                        </button>
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
            Changes save instantly to Supabase and apply to all future pickups.
          </div>
        </div>
      </div>
    </>
  );
}
