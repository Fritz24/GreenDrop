'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Plus, X, UserPlus } from 'lucide-react';
import Loader from '@/components/Loader';

const ROLES = ['user', 'agent', 'admin', 'super_admin'];
const ROLE_LABEL = {
  user: 'User',
  agent: 'Agent',
  admin: 'Admin',
  super_admin: 'Super admin',
};
const ROLE_BADGE = {
  user: 'badge-blue',
  agent: 'badge-green',
  admin: 'badge-amber',
  super_admin: 'badge-red',
};

function Avatar({ name }) {
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return <span className="avatar">{initials}</span>;
}

export default function UsersPage() {
  const [users, setUsers]       = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch]     = useState('');
  const [roleFilter, setRole]   = useState('all');
  const [loading, setLoading]   = useState(true);
  const [savingRoleFor, setSavingRoleFor] = useState(null);
  const [roleError, setRoleError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [newUserType, setNewUserType] = useState('individual');
  const [modalError, setModalError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSuccess, setModalSuccess] = useState('');

  async function loadUsers() {
    const { data } = await supabase.from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    setUsers(data || []);
    setFiltered(data || []);
    setLoading(false);
  }

  useEffect(() => {
    async function initPage() {
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setCurrentUser(profile);
      }
      await loadUsers();
    }

    initPage();
  }, []);

  useEffect(() => {
    let res = users;
    if (roleFilter !== 'all') res = res.filter(u => u.role === roleFilter);
    if (search) res = res.filter(u =>
      (u.full_name || '').toLowerCase().includes(search.toLowerCase())
    );
    setFiltered(res);
  }, [search, roleFilter, users]);

  async function changeUserRole(userId, nextRole) {
    setRoleError('');

    // Prevent super_admin from demoting themselves to avoid lockout
    if (userId === currentUser?.id) {
      setRoleError('To prevent accidental account lockout, you cannot change your own role.');
      return;
    }

    setSavingRoleFor(userId);
    const previousUsers = users;
    setUsers(current => current.map(user =>
      user.id === userId ? { ...user, role: nextRole } : user
    ));

    const { error } = await supabase
      .from('profiles')
      .update({ role: nextRole })
      .eq('id', userId);

    if (error) {
      setUsers(previousUsers);
      setRoleError(error.message);
    }

    setSavingRoleFor(null);
  }

  async function handleAddUser(e) {
    e.preventDefault();
    setModalError('');
    setModalSuccess('');

    if (!newFullName || !newEmail || !newPassword) {
      setModalError('Please fill in all required fields.');
      return;
    }

    setModalLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setModalError('Session expired. Please log in again.');
        setModalLoading(false);
        return;
      }

      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fullName: newFullName,
          email: newEmail,
          password: newPassword,
          role: newRole,
          userType: newUserType,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setModalError(result.error || 'Failed to create user.');
        setModalLoading(false);
        return;
      }

      setModalSuccess(`Successfully created user: ${newFullName}`);
      setNewFullName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('user');
      setNewUserType('individual');
      
      // Reload list and close modal after short delay
      await loadUsers();
      setTimeout(() => {
        setShowAddModal(false);
        setModalSuccess('');
      }, 1500);
    } catch (err) {
      console.error(err);
      setModalError('An unexpected error occurred.');
    } finally {
      setModalLoading(false);
    }
  }

  const canDeleteUser = (targetUser) => {
    if (!currentUser || !targetUser) return false;
    if (targetUser.id === currentUser.id) return false; // cannot delete self
    if (currentUser.role === 'super_admin') return true; // super_admin can delete anyone else
    if (currentUser.role === 'admin') {
      // standard admin can only delete 'user' and 'agent'
      return targetUser.role === 'user' || targetUser.role === 'agent';
    }
    return false;
  };

  async function handleDeleteUser(user) {
    if (!confirm(`Are you sure you want to permanently delete user "${user.full_name || 'this user'}"? This action is permanent and cannot be undone.`)) {
      return;
    }

    setDeletingUser(user.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Session expired. Please log in again.');
        return;
      }

      const response = await fetch(`/api/users?id=${user.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || 'Failed to delete user.');
        return;
      }

      await loadUsers();
    } catch (err) {
      console.error(err);
      alert('An unexpected error occurred.');
    } finally {
      setDeletingUser(null);
    }
  }

  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Filter addable roles based on current user's role
  const availableAddRoles = isSuperAdmin
    ? ROLES
    : ['user', 'agent']; // Standard admin cannot create admin or super_admin

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">{users.length} registered users across the platform</p>
        </div>
        <button
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 'var(--radius-sm)' }}
          onClick={() => setShowAddModal(true)}
        >
          <UserPlus size={16} />
          Add User
        </button>
      </div>

      {/* Role filter pills */}
      <div className="filter-pills">
        {['all', ...ROLES].map(r => (
          <button
            key={r}
            className={`filter-pill${roleFilter === r ? ' active' : ''}`}
            onClick={() => setRole(r)}
          >
            {r === 'all' ? 'All roles' : ROLE_LABEL[r]}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-body">
          <div className="toolbar">
            <div className="toolbar-left">
              <div className="search-wrap">
                <Search size={15} />
                <input
                  className="input"
                  placeholder="Search by name…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="toolbar-right" style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </div>
          </div>
          {roleError && (
            <div className="form-alert form-alert-danger" style={{ marginBottom: 16 }}>
              {roleError}
            </div>
          )}
          <div className="form-alert form-alert-info" style={{ marginBottom: 20 }}>
            {isSuperAdmin
              ? 'Super admins can update roles from the role column. Changes save immediately.'
              : 'Standard admins have read-only access to user roles. Only super admins can update roles.'}
          </div>

          {loading ? (
            <Loader message="Loading users..." />
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Type</th>
                    <th>Eco credits</th>
                    <th>Joined</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>No users found</td></tr>
                  ) : filtered.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Avatar name={u.full_name} />
                          <span style={{ fontWeight: 600 }}>{u.full_name || '—'}</span>
                        </div>
                      </td>
                      <td>
                        {isSuperAdmin ? (
                          <select
                            className="select role-select"
                            value={u.role || 'user'}
                            disabled={savingRoleFor === u.id}
                            onChange={e => changeUserRole(u.id, e.target.value)}
                          >
                            {ROLES.map(role => (
                              <option key={role} value={role}>{ROLE_LABEL[role]}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`badge ${ROLE_BADGE[u.role || 'user']}`}>
                            {ROLE_LABEL[u.role || 'user']}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-gray">{u.user_type || 'individual'}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
                          {(u.eco_coins_balance || 0).toLocaleString()}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                        {new Date(u.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric'
                        })}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {canDeleteUser(u) ? (
                          <button
                            className="btn-danger-link"
                            onClick={() => handleDeleteUser(u)}
                            disabled={deletingUser === u.id}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--error)',
                              cursor: 'pointer',
                              fontWeight: 600,
                              fontSize: 13,
                              padding: '4px 8px',
                            }}
                          >
                            {deletingUser === u.id ? 'Deleting...' : 'Delete'}
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 13, paddingRight: 8 }}>—</span>
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

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-container">
            <div className="modal-header">
              <h2>Add New User</h2>
              <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAddUser}>
              <div className="modal-body">
                {modalError && (
                  <div className="form-alert form-alert-danger" style={{ marginBottom: 16 }}>
                    {modalError}
                  </div>
                )}
                {modalSuccess && (
                  <div className="form-alert form-alert-success" style={{ marginBottom: 16 }}>
                    {modalSuccess}
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Full Name *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Fritz Arnaud"
                    value={newFullName}
                    onChange={e => setNewFullName(e.target.value)}
                    required
                    disabled={modalLoading}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Email Address *</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="name@example.com"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    required
                    disabled={modalLoading}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Temporary Password *</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={modalLoading}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Account Role</label>
                    <select
                      className="select"
                      value={newRole}
                      onChange={e => setNewRole(e.target.value)}
                      disabled={modalLoading}
                    >
                      {availableAddRoles.map(role => (
                        <option key={role} value={role}>{ROLE_LABEL[role]}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>User Type</label>
                    <select
                      className="select"
                      value={newUserType}
                      onChange={e => setNewUserType(e.target.value)}
                      disabled={modalLoading}
                    >
                      <option value="individual">Individual</option>
                      <option value="business">Business</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={modalLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={modalLoading}
                >
                  {modalLoading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
