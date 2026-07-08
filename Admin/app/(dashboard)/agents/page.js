'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { UserCog, Truck, Coins, Calendar } from 'lucide-react';
import Loader from '@/components/Loader';

function Avatar({ name }) {
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('');
  return <span className="avatar avatar-lg">{initials}</span>;
}

export default function AgentsPage() {
  const [agents, setAgents]   = useState([]);
  const [stats, setStats]     = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: agentData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'agent')
        .order('created_at', { ascending: false });

      const agentsArr = agentData || [];
      setAgents(agentsArr);

      if (agentsArr.length > 0) {
        const { data: pickupData } = await supabase
          .from('pickups')
          .select('agent_id, total_eco_coins_earned, status')
          .in('agent_id', agentsArr.map(a => a.id));

        const statsMap = {};
        (pickupData || []).forEach(p => {
          if (!statsMap[p.agent_id]) statsMap[p.agent_id] = { total: 0, completed: 0, coins: 0 };
          statsMap[p.agent_id].total++;
          if (p.status === 'collected') statsMap[p.agent_id].completed++;
          statsMap[p.agent_id].coins += p.total_eco_coins_earned || 0;
        });
        setStats(statsMap);
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Agents</h1>
        <p className="page-subtitle">{agents.length} pickup agents registered</p>
      </div>

      {loading ? (
        <Loader message="Loading agents..." />
      ) : agents.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <UserCog size={44} />
            <p style={{ marginTop: 14, fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>No agents yet</p>
            <p style={{ marginTop: 6, fontSize: 13, color: 'var(--text-muted)' }}>
              Create agent accounts in your Supabase dashboard and set their role to &quot;agent&quot;.
            </p>
          </div>
        </div>
      ) : (
        <div className="agent-grid">
          {agents.map((agent, idx) => {
            const s = stats[agent.id] || { total: 0, completed: 0, coins: 0 };
            return (
              <div key={agent.id} className="agent-card" style={{ animationDelay: `${idx * 0.06}s`, animation: 'scaleIn 0.4s var(--ease) backwards' }}>
                <div className="agent-header">
                  <Avatar name={agent.full_name} />
                  <div>
                    <div className="agent-name">{agent.full_name || 'Unnamed agent'}</div>
                    <span className="badge badge-green" style={{ marginTop: 4 }}>
                      <span className="status-dot live" style={{ background: '#5A8F53' }} />
                      Agent
                    </span>
                  </div>
                </div>
                <div>
                  <div className="stat-row">
                    <span className="stat-label">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Truck size={14} color="var(--text-muted)" />
                        Total pickups
                      </span>
                    </span>
                    <span className="stat-value">{s.total}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <UserCog size={14} color="var(--text-muted)" />
                        Completed
                      </span>
                    </span>
                    <span className="stat-value" style={{ color: 'var(--success)' }}>{s.completed}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Coins size={14} color="var(--text-muted)" />
                        Credits awarded
                      </span>
                    </span>
                    <span className="stat-value" style={{ color: 'var(--accent)' }}>{s.coins.toLocaleString()}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Calendar size={14} color="var(--text-muted)" />
                        Member since
                      </span>
                    </span>
                    <span className="stat-value" style={{ fontSize: 13, fontWeight: 600 }}>
                      {new Date(agent.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
