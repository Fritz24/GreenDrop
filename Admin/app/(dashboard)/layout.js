'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import Loader from '@/components/Loader';
import { Bell } from 'lucide-react';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('pickups')
        .select(`
          id,
          status,
          created_at,
          scheduled_date,
          scheduled_time,
          user:profiles!user_id(full_name),
          agent:profiles!agent_id(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) throw error;

      if (data) {
        const formatted = data.map(p => {
          let title = '';
          let message = '';
          let type = '';

          if (p.status === 'pending') {
            title = 'New Pickup Requested';
            message = `${p.user?.full_name || 'A customer'} requested a pickup for ${p.scheduled_date}.`;
            type = 'pending';
          } else if (p.status === 'accepted') {
            title = 'Agent Assigned';
            message = `${p.agent?.full_name || 'An agent'} is assigned to ${p.user?.full_name || 'customer'}.`;
            type = 'accepted';
          } else if (p.status === 'collected') {
            title = 'Pickup Collected 🌿';
            message = `${p.agent?.full_name || 'Agent'} collected recycling from ${p.user?.full_name || 'customer'}.`;
            type = 'collected';
          } else {
            title = `Status: ${p.status}`;
            message = `Pickup for ${p.user?.full_name || 'customer'} updated.`;
            type = 'other';
          }

          return {
            id: p.id,
            title,
            message,
            time: new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date(p.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
            type,
            status: p.status
          };
        });

        setNotifications(formatted);
      }

      // Count pending (unassigned) pickups for unread count
      const { count, error: countError } = await supabase
        .from('pickups')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (!countError) {
        setUnreadCount(count || 0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          if (active) {
            router.replace('/login');
          }
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError || !profileData || (profileData.role !== 'admin' && profileData.role !== 'super_admin')) {
          // Access denied, sign out to clear session
          await supabase.auth.signOut();
          if (active) {
            router.replace('/login?error=unauthorized');
          }
          return;
        }

        if (active) {
          setProfile(profileData);
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth verification error:', err);
        if (active) {
          router.replace('/login');
        }
      }
    }

    checkAuth();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (loading || !profile) return;

    fetchNotifications();

    const channel = supabase
      .channel('admin_pickups_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pickups' }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loading, profile]);

  if (loading) {
    return (
      <div className="auth-loading-screen">
        <Loader message="Verifying admin authorization..." />
      </div>
    );
  }

  return (
    <div className="layout">
      <Sidebar user={profile} />
      <div style={{ flex: 1, marginLeft: 'var(--sidebar-w)', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <header className="top-header">
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              System Monitor
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* Notification Bell Container */}
            <div className="notif-container">
              <button 
                className="notif-bell-btn" 
                onClick={() => {
                  setShowDropdown(!showDropdown);
                  // Reset unread count to 0 when opened
                  if (!showDropdown) {
                    setUnreadCount(0);
                  }
                }}
              >
                <Bell size={20} />
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
              </button>

              {showDropdown && (
                <div className="notif-dropdown">
                  <div className="notif-header">
                    <h3>Recent Activities</h3>
                    <button onClick={() => setShowDropdown(false)}>Close</button>
                  </div>
                  <div className="notif-list">
                    {notifications.length > 0 ? (
                      notifications.map(notif => (
                        <div key={notif.id} className="notif-item">
                          <span className={`notif-dot-icon notif-dot-${notif.type}`} />
                          <div className="notif-content">
                            <div className="notif-title">{notif.title}</div>
                            <div className="notif-desc">{notif.message}</div>
                            <div className="notif-time-row">
                              <span className="notif-time">{notif.date} at {notif.time}</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="notif-empty">
                        <Bell size={32} style={{ opacity: 0.3 }} />
                        <p>No recent activity detected.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="main-content" style={{ marginLeft: 0, paddingTop: 32 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
