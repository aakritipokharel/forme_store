import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/ToastContext';
import '../Admin.css';

const navigation = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/customers', label: 'Customers' },
  { to: '/admin/activity', label: 'Activity' },
];

function AdminLayout() {
  const { user, logout } = useAuth();
  const notify = useToast();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const signOut = () => {
    logout();
    notify('success', 'You have been logged out.');
    navigate('/');
  };

  return (
    <div className="admin-shell">
      <header className="admin-mobile-bar">
        <button
          className="admin-menu-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="admin-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? 'Close menu' : 'Menu'}
        </button>
        <span className="admin-mobile-brand">FORME / ADMIN</span>
      </header>
      <aside className={`admin-sidebar${menuOpen ? ' admin-sidebar-open' : ''}`} id="admin-navigation">
        <NavLink className="admin-brand" to="/admin" onClick={() => setMenuOpen(false)}>
          <span>FORME</span><small>ADMINISTRATION</small>
        </NavLink>
        <nav className="admin-nav" aria-label="Administration">
          {navigation.map(({ to, label, end }) => (
            <NavLink
              className={({ isActive }) => `admin-nav-link${isActive ? ' admin-nav-link-active' : ''}`}
              end={end}
              key={to}
              onClick={() => setMenuOpen(false)}
              to={to}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <button className="admin-storefront-link" type="button" onClick={() => navigate('/')}>
          View storefront
        </button>
      </aside>
      {menuOpen && <button className="admin-backdrop" type="button" aria-label="Close admin menu" onClick={() => setMenuOpen(false)} />}
      <div className="admin-main">
        <header className="admin-topbar">
          <div><p className="eyebrow">FORME CONTROL ROOM</p><p className="admin-greeting">Welcome, {user?.name || 'Administrator'}</p></div>
          <button className="admin-logout" type="button" onClick={signOut}>Log out</button>
        </header>
        <div className="admin-content"><Outlet /></div>
      </div>
    </div>
  );
}

export default AdminLayout;
