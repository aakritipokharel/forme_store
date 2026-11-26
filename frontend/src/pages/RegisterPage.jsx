import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useToast } from '../context/ToastContext';

function RegisterPage() {
  const { register } = useAuth();
  const notify = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (name.trim().length < 2) {
      setError('Please enter a name with at least 2 characters.');
      return;
    }
    if (password.length < 8) {
      setError('Your password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(name, email, password);
      setIsRegistered(true);
      notify('success', 'Your account has been created!');
    } catch (requestError) {
      const message = requestError.response?.data?.message || 'We could not create your account. Please try again.';
      setError(message);
      notify('error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel" aria-labelledby="register-title">
        <p className="eyebrow">FORME · YOUR ACCOUNT</p>
        <h1 id="register-title">Create an account</h1>
        <p className="auth-intro">Join us to keep your account details together.</p>

        {isRegistered ? (
          <div className="form-message success-message" role="status">
            Your account is ready. <Link to="/login">Log in to continue</Link>.
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="register-name">Name</label>
            <input
              autoComplete="name"
              id="register-name"
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
            />

            <label htmlFor="register-email">Email</label>
            <input
              autoComplete="email"
              id="register-email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />

            <label htmlFor="register-password">Password</label>
            <input
              autoComplete="new-password"
              id="register-password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
            <p className="field-hint">Use at least 8 characters.</p>

            {error && <p className="form-message error-message" role="alert">{error}</p>}
            <button className="primary-button form-submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        )}

        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </section>
    </main>
  );
}

export default RegisterPage;
