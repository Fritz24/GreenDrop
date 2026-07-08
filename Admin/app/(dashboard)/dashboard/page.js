'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Loader from '@/components/Loader';
import {
  Users, Truck, Coins, Leaf, TrendingUp, Recycle, ArrowRight, Calendar
} from 'lucide-react';
import * as Icons from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const PIE_PALETTE = ['#455A3F', '#6D8E67', '#B08047', '#4A607A', '#8C9E88'];

const STATUS_COLORS = {
  collected:  '#5A8F53',
  accepted:   '#4A607A',
  pending:    '#B08047',
  cancelled:  '#C45B52',
};

function KPICard({ icon: Icon, tint, label, value }) {
  return (
    <div className="kpi-card">
      <div className="kpi-top">
        <div className="kpi-icon-wrap" style={{ background: tint }}>
          <Icon size={20} color="#fff" strokeWidth={2} />
        </div>
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    collected: 'badge-green',
    accepted:  'badge-blue',
    pending:   'badge-amber',
    cancelled: 'badge-red',
  };
  return (
    <span className={`badge ${map[status] || 'badge-gray'}`}>
      <span className="status-dot" style={{ background: STATUS_COLORS[status] || '#8C9E88' }} />
      {status}
    </span>
  );
}

const ChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#fff', border: '1px solid #E8E2D5',
        borderRadius: 12, padding: '10px 16px',
        boxShadow: '0 8px 24px rgba(52, 68, 47, 0.12)', fontSize: 13,
      }}>
        <p style={{ color: '#8C9E88', marginBottom: 4, fontSize: 11, fontWeight: 500 }}>{label}</p>
        <p style={{ fontWeight: 700, color: '#202B1D', letterSpacing: '-0.3px' }}>{payload[0].value} pickups</p>
      </div>
    );
  }
  return null;
};

const PieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#fff', border: '1px solid #E8E2D5',
        borderRadius: 12, padding: '10px 16px',
        boxShadow: '0 8px 24px rgba(52, 68, 47, 0.12)', fontSize: 13,
      }}>
        <p style={{ fontWeight: 700, color: '#202B1D' }}>{payload[0].name}</p>
        <p style={{ color: '#5A6B57', fontSize: 12 }}>{payload[0].value} kg</p>
      </div>
    );
  }
  return null;
};

const renderMaterialIcon = (iconName, color = 'var(--text)') => {
  // Dynamic lookup of standard Lucide icons
  const LucideIcon = Icons[iconName] || Icons.Recycle;
  return <LucideIcon size={14} style={{ color }} />;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  
  // Date and period filter states
  const [period, setPeriod] = useState('all'); // 'all', 'today', 'week', 'month', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Raw database records
  const [rawUsers, setRawUsers] = useState([]);
  const [rawPickups, setRawPickups] = useState([]);
  const [rawItems, setRawItems] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const [
          { data: usersData, error: e1 },
          { data: pickupsData, error: e2 },
          { data: itemsData, error: e3 }
        ] = await Promise.all([
          supabase.from('profiles').select('id, created_at, eco_coins_balance'),
          supabase.from('pickups').select('id, status, created_at, total_eco_coins_earned, profiles!user_id(full_name)'),
          supabase.from('pickup_items').select('weight_kg, materials(name, icon, color), pickups(created_at, status)')
        ]);

        if (e1) console.error('[dashboard] profiles:', e1);
        if (e2) console.error('[dashboard] pickups:', e2);
        if (e3) console.error('[dashboard] pickup_items:', e3);

        setRawUsers(usersData || []);
        setRawPickups(pickupsData || []);
        setRawItems(itemsData || []);
      } catch (err) {
        console.error('[dashboard] Unexpected error in load():', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Filter and compute statistics dynamically in memory
  const getFilteredData = () => {
    const now = new Date();
    let start = null;
    let end = null;

    if (period === 'today') {
      start = new Date();
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    } else if (period === 'week') {
      start = new Date();
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      start = new Date();
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
    } else if (period === 'custom') {
      if (startDate) {
        start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
      }
      if (endDate) {
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
      }
    }

    const checkDate = (dateStr) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    };

    // Filter Users
    const filteredUsers = rawUsers.filter(u => checkDate(u.created_at));

    // Filter Pickups
    const filteredPickups = rawPickups.filter(p => checkDate(p.created_at));

    // Filter Items
    const filteredItems = rawItems.filter(item => {
      const pickupDate = item.pickups?.created_at;
      return checkDate(pickupDate);
    });

    // Compute KPIs
    const totalUsersCount = filteredUsers.length;
    const totalPickupsCount = filteredPickups.length;
    const totalCoinsEarned = filteredPickups.reduce((sum, p) => sum + (p.total_eco_coins_earned || 0), 0);
    
    // Total weight collected (from collected/completed items)
    const collectedItems = filteredItems.filter(item => {
      const status = item.pickups?.status;
      return status === 'collected' || status === 'completed';
    });
    const totalKgCollected = collectedItems.reduce((sum, item) => sum + (item.weight_kg || 0), 0);

    // Recent Pickups (take top 5 from filtered, sorted by date descending)
    const recentPickups = [...filteredPickups]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    // Material Breakdown for Pie Chart & Details List
    const matMap = {};
    collectedItems.forEach(item => {
      const name = item.materials?.name || 'Other';
      if (!matMap[name]) {
        matMap[name] = { weight: 0, color: item.materials?.color, icon: item.materials?.icon };
      }
      matMap[name].weight += (item.weight_kg || 0);
    });
    const materialBreakdown = Object.entries(matMap).map(([name, obj]) => ({
      name,
      value: Number(obj.weight.toFixed(1)),
      color: obj.color,
      icon: obj.icon
    })).sort((a, b) => b.value - a.value);

    // Pickups activity chart
    let chartValues = [];
    if (period === 'today') {
      // hourly
      const hours = Array.from({ length: 24 }, (_, i) => i);
      const hourCounts = {};
      filteredPickups.forEach(p => {
        const h = new Date(p.created_at).getHours();
        hourCounts[h] = (hourCounts[h] || 0) + 1;
      });
      chartValues = hours.map(h => ({
        date: `${h}:00`,
        pickups: hourCounts[h] || 0
      }));
    } else {
      let daysCount = 14;
      let startDay = new Date();
      startDay.setDate(startDay.getDate() - 13);

      if (period === 'week') {
        daysCount = 7;
        startDay = new Date();
        startDay.setDate(startDay.getDate() - 6);
      } else if (period === 'month') {
        daysCount = 30;
        startDay = new Date();
        startDay.setDate(startDay.getDate() - 29);
      } else if (period === 'custom' && start && end) {
        const diffTime = Math.abs(end - start);
        daysCount = Math.min(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 60);
        startDay = new Date(start);
      }

      const days = Array.from({ length: daysCount }, (_, i) => {
        const d = new Date(startDay);
        d.setDate(d.getDate() + i);
        return d.toISOString().split('T')[0];
      });

      const dayCounts = {};
      filteredPickups.forEach(p => {
        const d = p.created_at.split('T')[0];
        dayCounts[d] = (dayCounts[d] || 0) + 1;
      });

      chartValues = days.map(d => ({
        date: new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        pickups: dayCounts[d] || 0
      }));
    }

    return {
      kpis: {
        users: totalUsersCount,
        pickups: totalPickupsCount,
        coins: totalCoinsEarned,
        kg: Number(totalKgCollected.toFixed(1))
      },
      recent: recentPickups,
      pieData: materialBreakdown,
      chartData: chartValues
    };
  };

  if (loading) return <Loader message="Loading dashboard..." />;

  const { kpis, recent, pieData, chartData } = getFilteredData();
  const fmt = n => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Overview</h1>
        <p className="page-subtitle">Real-time snapshot of your GreenDrop activity</p>
      </div>

      {/* Dynamic Date Filter Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
        padding: '12px 20px',
        background: '#fff',
        border: '1px solid #E8E2D5',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Calendar size={16} color="var(--text-secondary)" />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>Filter Period:</span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['all', 'today', 'week', 'month', 'custom'].map(p => (
              <button
                key={p}
                className={`btn ${period === p ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '6px 12px', fontSize: 13, textTransform: 'capitalize' }}
                onClick={() => setPeriod(p)}
              >
                {p === 'all' ? 'All Time' : p === 'week' ? 'Last 7 Days' : p === 'month' ? 'Last 30 Days' : p}
              </button>
            ))}
          </div>
        </div>

        {period === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="date"
              className="input"
              style={{ padding: '6px 10px', fontSize: 13, width: 145 }}
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>to</span>
            <input
              type="date"
              className="input"
              style={{ padding: '6px 10px', fontSize: 13, width: 145 }}
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Wallet + KPI Row */}
      <div className="dashboard-hero-row">
        {/* Stacked Wallet Card */}
        <div className="dashboard-hero-left">
          <div className="wallet-stack">
            {/* Back Card */}
            <div className="wallet-card-back">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="wallet-back-chip" />
                <div className="wallet-back-dots">
                  •••• •••• •••• <span style={{ opacity: 1, letterSpacing: '0.5px' }}>7216</span>
                </div>
              </div>
            </div>

            {/* Front Card */}
            <div className="wallet-card-front">
              <div className="wallet-front-top">
                <div className="wallet-chip" />
                <div className="wallet-dots">
                  •••• •••• •••• <span style={{ opacity: 1, letterSpacing: '0.5px' }}>4364</span>
                </div>
              </div>

              <div className="wallet-balance-section">
                <div className="wallet-balance-label">Eco Coins Issued</div>
                <div className="wallet-balance-value">
                  {kpis.coins.toLocaleString()} <span style={{ fontSize: 18, fontWeight: 600, opacity: 0.7 }}>credits</span>
                </div>
              </div>

              <div className="wallet-bottom-row">
                <div>
                  <div className="wallet-detail-label">Platform</div>
                  <div className="wallet-detail-value">GreenDrop Admin</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="wallet-detail-label">Weight Collected</div>
                  <div className="wallet-detail-value">{kpis.kg} kg</div>
                </div>
                <div className="wallet-footer-pill">
                  <Recycle size={12} />
                  {kpis.pickups} pickups
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Mini Cards */}
        <div className="dashboard-hero-right">
          <KPICard icon={Users}  tint="linear-gradient(145deg, #4A607A, #3B4E66)" label="Registered users"  value={fmt(kpis.users)} />
          <KPICard icon={Truck}  tint="linear-gradient(145deg, #455A3F, #34442F)" label="Pickups processed" value={fmt(kpis.pickups)} />
          <KPICard icon={Coins}  tint="linear-gradient(145deg, #B08047, #8E6638)" label="Eco coins issued"   value={fmt(kpis.coins)} />
          <KPICard icon={Leaf}   tint="linear-gradient(145deg, #6D8E67, #5A7A53)" label="Total kg collected"  value={kpis.kg} />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        {/* Area Chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Pickup activity {period !== 'all' ? `— ${period}` : '— last 14 days'}</span>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#455A3F" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#455A3F" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(69, 90, 63, 0.06)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#8C9E88', fontWeight: 500 }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#8C9E88', fontWeight: 500 }}
                  axisLine={false} tickLine={false}
                  width={24}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone" dataKey="pickups"
                  stroke="#455A3F" strokeWidth={2.5}
                  fill="url(#areaGrad)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#455A3F', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Material Breakdown Pie & List */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Materials breakdown</span>
          </div>
          <div className="card-body">
            {pieData.length === 0 ? (
              <div className="empty-state" style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p>No material collections recorded in this period</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, alignItems: 'center' }}>
                <div>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={pieData} cx="50%" cy="50%"
                        innerRadius={50} outerRadius={80}
                        dataKey="value" paddingAngle={3}
                        strokeWidth={0}
                      >
                        {pieData.map((d, i) => (
                          <Cell key={i} fill={d.color || '#8C9E88'} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Exact Collected Quantities
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {pieData.map((d, i) => {
                      const totalKg = pieData.reduce((sum, item) => sum + item.value, 0) || 1;
                      const percent = Math.round((d.value / totalKg) * 100);
                      return (
                        <div key={d.name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--text)' }}>
                              <div style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                background: (d.color || '#8C9E88') + '1A',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                {renderMaterialIcon(d.icon, d.color || '#8C9E88')}
                              </div>
                              {d.name}
                            </div>
                            <div style={{ fontWeight: 700, color: 'var(--text)' }}>
                              {d.value} kg <span style={{ fontWeight: 500, color: 'var(--text-muted)', fontSize: 11 }}>({percent}%)</span>
                            </div>
                          </div>
                          <div style={{ width: '100%', height: 6, background: 'rgba(69, 90, 63, 0.06)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${percent}%`, background: d.color || '#8C9E88', borderRadius: 3 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Pickups */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Recent pickups</span>
          <span style={{ fontSize: 12, color: '#8C9E88', fontWeight: 500 }}>{recent.length} in selected period</span>
        </div>
        <div className="card-body" style={{ padding: '0 26px 26px' }}>
          {recent.length === 0 ? (
            <div className="empty-state"><p>No pickups recorded in this period</p></div>
          ) : recent.map(p => (
            <div key={p.id} className="feed-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="avatar">
                  {(p.profiles?.full_name || '?').split(' ').map(w => w[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#202B1D' }}>
                    {p.profiles?.full_name || 'Unknown user'}
                  </div>
                  <div className="feed-meta">
                    {new Date(p.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#B08047' }}>
                  +{p.total_eco_coins_earned} credits
                </span>
                <StatusBadge status={p.status} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
