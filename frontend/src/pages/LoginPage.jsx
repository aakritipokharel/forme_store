import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/ToastContext';

function LoginPage() {
  const { login } = useAuth();
  const notify = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const user = await login(email, password);
      notify('success', 'Welcome back!');
      const requestedPath = location.state?.from?.pathname;
      navigate(user.role === 'admin' && requestedPath === '/admin' ? '/admin' : requestedPath || '/account', {
        replace: true,
      });
    } catch (requestError) {
      const message = requestError.response?.data?.message || 'Email or password is incorrect.';
      setError(message);
      notify('error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="login-title">
        <p className="eyebrow">FORME · WELCOME BACK</p>
        <h1 id="login-title">Log in</h1>
        <p className="auth-intro">Enter your account details to continue.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="login-email">Email</label>
          <input
            autoComplete="email"
            id="login-email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />

          <label htmlFor="login-password">Password</label>
          <input
            autoComplete="current-password"
            id="login-password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />

          {error && <p className="form-message error-message" role="alert">{error}</p>}
          <button className="primary-button form-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Signing in...' : 'Log in'}
          </button>
        </form>

        <p className="auth-switch">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </section>
    </main>
  );
}

export default LoginPage;
