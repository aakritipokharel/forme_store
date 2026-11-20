import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import api from './services/api';
import { useAuth } from './context/useAuth';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import CategoriesPage from './pages/CategoriesPage';
import ShopPage from './pages/ShopPage';
import ProductPage from './pages/ProductPage';
import SiteHeader from './components/SiteHeader';
import SiteFooter from './components/SiteFooter';
import './App.css';
import './Storefront.css';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <p className="route-status" role="status">Checking your account...</p>;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
}

function AccountPage() {
  const { user } = useAuth();

  return (
    <main className="protected-page">
      <p className="eyebrow">YOUR ACCOUNT</p>
      <h1>Welcome, {user.name}</h1>
      <dl className="profile-details">
        <div><dt>Name</dt><dd>{user.name}</dd></div>
        <div><dt>Email</dt><dd>{user.email}</dd></div>
        <div><dt>Account type</dt><dd>{user.role}</dd></div>
      </dl>
    </main>
  );
}

function AdminPage() {
  const [status, setStatus] = useState('Verifying administrator access...');

  useEffect(() => {
    let active = true;
    api.get('/admin/me')
      .then(({ data }) => {
        if (active) {
          setStatus(`Administrator access confirmed for ${data.data.user.name}.`);
        }
      })
      .catch(() => {
        if (active) {
          setStatus('Administrator access could not be verified.');
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="protected-page">
      <p className="eyebrow">ADMINISTRATION</p>
      <h1>Administrator access</h1>
      <p className="setup-status" role="status">{status}</p>
      <p className="home-copy">Admin tools will be added in a later project phase.</p>
    </main>
  );
}

function NotFoundPage() {
  return (
    <main className="protected-page">
      <h1>Page not found</h1>
      <Link className="secondary-link" to="/">Return home</Link>
    </main>
  );
}

function CartPlaceholderPage() {
  return (
    <main className="product-page-state">
      <p className="eyebrow">COMING IN A LATER PHASE</p>
      <h1>Your cart</h1>
      <p>Cart functionality is not available yet. You can continue browsing the collection.</p>
      <Link className="primary-button" to="/shop">Browse the collection</Link>
    </main>
  );
}

function App() {
  return (
    <>
      <SiteHeader />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/products/:id" element={<ProductPage />} />
        <Route path="/cart" element={<CartPlaceholderPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/account"
          element={(
            <ProtectedRoute>
              <AccountPage />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin"
          element={(
            <ProtectedRoute adminOnly>
              <AdminPage />
            </ProtectedRoute>
          )}
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <SiteFooter />
    </>
  );
}

export default App;
