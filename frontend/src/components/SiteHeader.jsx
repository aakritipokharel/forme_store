import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

function SiteHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
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
        <Link className="cart-link" to="/cart">Cart <span>(coming soon)</span></Link>
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
