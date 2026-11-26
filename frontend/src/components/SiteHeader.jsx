import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useCart } from '../context/useCart';
import { useToast } from '../context/ToastContext';

function SiteHeader() {
  const { user, logout } = useAuth();
  const notify = useToast();
  const { itemCount } = useCart();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    notify('success', 'You have been logged out.');
    navigate('/');
  };

  return (
    <header className="site-header">
      <Link className="site-brand" to="/" aria-label="FORME home">FORME</Link>
      <nav className="site-nav" aria-label="Main navigation">
        <Link to="/">Home</Link>
        <Link to="/shop">Shop</Link>
        <Link to="/categories">Categories</Link>
        {user?.role === 'admin' && <Link to="/admin">Admin</Link>}
      </nav>
      <div className="site-actions">
        <Link to="/account">My account</Link>
        {user && <Link to="/my-orders">My orders</Link>}
        <Link className="cart-link" to="/cart" aria-label={`Shopping bag, ${itemCount} items`}>
          <svg className="cart-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 8h16l-1.5 13h-13L4 8Z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M9 9V6a3 3 0 0 1 6 0v3" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <span>Bag</span>
          <span className="cart-count" aria-live="polite">{itemCount}</span>
        </Link>
        {user ? (
          <button className="text-button" type="button" onClick={handleLogout}>Log out</button>
        ) : (
          <Link className="header-login" to="/login">Log in</Link>
        )}
      </div>
    </header>
  );
}

export default SiteHeader;
