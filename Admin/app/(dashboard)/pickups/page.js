'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, UserCheck, X, MapPin } from 'lucide-react';
import Loader from '@/components/Loader';

const STATUS_BADGE = {
  collected: 'badge-green',
  accepted:  'badge-blue',
  pending:   'badge-amber',
  cancelled: 'badge-red',
};

const STATUS_DOT_COLOR = {
  collected: '#5A8F53',
  accepted:  '#4A607A',
  pending:   '#B08047',
  cancelled: '#C45B52',
};

function StatusBadge({ status }) {
  return (
    <span className={`badge ${STATUS_BADGE[status] || 'badge-gray'}`}>
      <span className="status-dot" style={{ background: STATUS_DOT_COLOR[status] || '#8C9E88' }} />
      {status}
    </span>
  );
}

function AssignModal({ pickup, agents, onClose, onAssigned }) {
  const [selectedAgent, setSelectedAgent] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAssign = async () => {
    if (!selectedAgent) return;
    setSaving(true);
    const { error } = await supabase
      .from('pickups')
      .update({ agent_id: selectedAgent, status: 'accepted' })
      .eq('id', pickup.id);
    setSaving(false);
    if (error) { alert('Error: ' + error.message); return; }
    onAssigned();
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--surface)',
        borderRadius: 20,
        padding: 28,
        width: 400,
        maxWidth: '90vw',
        border: '1px solid var(--border)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Assign Agent</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ marginBottom: 16, padding: 14, borderRadius: 12, background: 'var(--bg)', border: '1px solid var(--border)' }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Requested by</p>
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--text)' }}>{pickup.user?.full_name || '—'}</p>
          {pickup.address && (
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 4, alignItems: 'center' }}>
              <MapPin size={12} /> {pickup.address}
            </p>
          )}
          {pickup.scheduled_date && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              📅 {new Date(pickup.scheduled_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              {pickup.scheduled_time && ` at ${pickup.scheduled_time}`}
            </p>
          )}
        </div>

        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
          Select Agent
        </label>
        <select
          value={selectedAgent}
          onChange={e => setSelectedAgent(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10,
            border: '1px solid var(--border)', background: 'var(--bg)',
            color: 'var(--text)', fontSize: 14, marginBottom: 20,
          }}
        >
          <option value="">— Choose an agent —</option>
          {agents.map(a => (
            <option key={a.id} value={a.id}>{a.full_name}</option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedAgent || saving}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
              background: selectedAgent ? 'var(--accent)' : 'var(--border)',
              color: '#fff', cursor: selectedAgent ? 'pointer' : 'default', fontWeight: 700,
            }}
          >
            {saving ? 'Assigning…' : 'Assign Agent'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PickupsPage() {
  const [pickups, setPickups]       = useState([]);
  const [filtered, setFiltered]     = useState([]);
  const [agents, setAgents]         = useState([]);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('all');
  const [loading, setLoading]       = useState(true);
  const [assignTarget, setAssignTarget] = useState(null);

  const fetchPickups = () => {
    supabase.from('pickups')
      .select(`
        id, status, created_at, scheduled_date, scheduled_time, address, latitude, longitude, photo_url, total_eco_coins_earned,
        user:profiles!user_id(full_name),
        agent:profiles!agent_id(full_name)
      `)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error("Pickups fetch error:", error);
        setPickups(data || []);
        setFiltered(data || []);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPickups();
    // Fetch agents for assignment
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'agent')
      .order('full_name')
      .then(({ data }) => setAgents(data || []));
  }, []);

  useEffect(() => {
    let res = pickups;
    if (statusFilter !== 'all') res = res.filter(p => p.status === statusFilter);
    if (search) res = res.filter(p =>
      (p.user?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.address || '').toLowerCase().includes(search.toLowerCase())
    );
    setFiltered(res);
  }, [search, statusFilter, pickups]);

  return (
    <>
      {assignTarget && (
        <AssignModal
          pickup={assignTarget}
          agents={agents}
          onClose={() => setAssignTarget(null)}
          onAssigned={fetchPickups}
        />
      )}

      <div className="page-header">
        <h1 className="page-title">Pickups</h1>
        <p className="page-subtitle">{pickups.length} total pickup requests</p>
      </div>

      {/* Status filter pills */}
      <div className="filter-pills">
        {['all', 'pending', 'accepted', 'collected', 'cancelled'].map(s => (
          <button
            key={s}
            className={`filter-pill${statusFilter === s ? ' active' : ''}`}
            onClick={() => setStatus(s)}
          >
            {s === 'all' ? 'All statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-body">
          <div className="toolbar">
            <div className="toolbar-left">
              <div className="search-wrap">
                <Search size={15} />
                <input className="input" placeholder="Search by user or address…"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="toolbar-right" style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </div>
          </div>

          {loading ? (
            <Loader message="Loading pickups..." />
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Id</th>
                    <th>User</th>
                    <th>Agent</th>
                    <th>Status</th>
                    <th>Location</th>
                    <th>Eco credits</th>
                    <th>Scheduled</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>No pickups found</td></tr>
                  ) : filtered.map(p => (
                    <tr key={p.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: "'SF Mono', 'Fira Code', monospace" }}>
                        {p.id.slice(0, 8)}…
                      </td>
                      <td style={{ fontWeight: 600 }}>{p.user?.full_name || '—'}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {p.agent?.full_name || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}
                      </td>
                      <td><StatusBadge status={p.status} /></td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 180 }}>
                        {p.latitude && p.longitude ? (
                          <a
                            href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                          >
                            <MapPin size={12} /> View map
                          </a>
                        ) : (p.address ? <span title={p.address}>{p.address.slice(0, 30)}…</span> : '—')}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
                          +{p.total_eco_coins_earned || 0}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        {p.scheduled_date
                          ? new Date(p.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : '—'}
                        {p.scheduled_time ? ` ${p.scheduled_time}` : ''}
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td>
                        {(p.status === 'pending' || !p.agent?.full_name) && (
                          <button
                            onClick={() => setAssignTarget(p)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              padding: '5px 12px', borderRadius: 8,
                              border: '1px solid var(--accent)',
                              background: 'transparent', color: 'var(--accent)',
                              cursor: 'pointer', fontWeight: 600, fontSize: 12,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <UserCheck size={13} />
                            Assign Agent
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
