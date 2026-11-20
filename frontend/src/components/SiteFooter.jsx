import { Link } from 'react-router-dom';

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <Link className="site-brand footer-brand" to="/">FORME</Link>
          <p>Considered pieces for everyday wear.</p>
        </div>
        <nav className="footer-nav" aria-label="Footer navigation">
          <Link to="/">Home</Link>
          <Link to="/shop">Shop</Link>
          <Link to="/categories">Categories</Link>
          <Link to="/account">My account</Link>
        </nav>
        <p className="footer-note">A clothing store by FORME.</p>
      </div>
    </footer>
  );
}

export default SiteFooter;
