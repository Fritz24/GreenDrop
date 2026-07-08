'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard, Users, Truck, UserCog,
  Package, Leaf, LogOut, Trophy, Award
} from 'lucide-react';

const groupedNavItems = [
  {
    title: 'Monitor',
    items: [
      { label: 'Overview',   href: '/dashboard',  icon: LayoutDashboard },
    ]
  },
  {
    title: 'Operations',
    items: [
      { label: 'Users',      href: '/users',       icon: Users },
      { label: 'Pickups',    href: '/pickups',     icon: Truck },
      { label: 'Agents',     href: '/agents',      icon: UserCog },
      { label: 'Materials',  href: '/materials',   icon: Package },
    ]
  },
  {
    title: 'Gamification',
    items: [
      { label: 'Levels',     href: '/levels',      icon: Trophy },
      { label: 'Badges',     href: '/badges',      icon: Award },
    ]
  }
];

export default function Sidebar({ user }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  }

  const initials = user?.full_name
    ? user.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'A';

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-logo-row">
          <div className="sidebar-logo-mark">
            <Leaf size={20} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div className="sidebar-logo-name">GreenDrop</div>
            <div className="sidebar-logo-role">Admin console</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" style={{ flex: 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {groupedNavItems.map(section => (
          <div key={section.title} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="sidebar-section-title" style={{ padding: '0 8px', marginBottom: 6 }}>
              {section.title}
            </div>
            {section.items.map(({ label, href, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link key={href} href={href} className={`nav-item${active ? ' active' : ''}`}>
                  <Icon size={18} strokeWidth={active ? 2.2 : 1.7} />
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer with User info & Logout */}
      <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'var(--primary)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 13,
            boxShadow: '0 2px 8px rgba(69, 90, 63, 0.2)'
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: 700,
              fontSize: 13,
              color: 'var(--text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {user?.full_name || 'Administrator'}
            </div>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              color: user?.role === 'super_admin' ? 'var(--danger)' : 'var(--accent)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {user?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
            </div>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            padding: '10px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            background: 'rgba(255, 255, 255, 0.4)',
            color: 'var(--text-secondary)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          className="sidebar-logout-btn"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

