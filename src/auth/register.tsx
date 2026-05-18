import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = [];
    if (pwd.length < 6) errors.push('Minimum 6 tekens');
    if (!/[A-Z]/.test(pwd)) errors.push('Minstens 1 hoofdletter (A-Z)');
    if (!/[a-z]/.test(pwd)) errors.push('Minstens 1 kleine letter (a-z)');
    if (!/[0-9]/.test(pwd)) errors.push('Minstens 1 cijfer (0-9)');
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]/.test(pwd)) errors.push('Minstens 1 speciaal teken (!@#$%^&*...)');
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const pwErrors = validatePassword(password);
    if (pwErrors.length > 0) {
      setError('Wachtwoord voldoet niet aan eisen:\n' + pwErrors.join('\n'));
      return;
    }

    if (password !== confirmPassword) {
      setError('Wachtwoorden komen niet overeen');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('https://localhost:7199/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        setSuccess('Account aangemaakt! Je wordt doorgestuurd...');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setTimeout(() => (window.location.href = '/login'), 1500);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || data.title || 'Registratie mislukt.');
      }
    } catch (err) {
      setError('Fout bij verbinden met backend. Controleer of de API op https://localhost:7199 draait.');
    } finally {
      setLoading(false);
    }
  };

  const pwFeedback = password ? validatePassword(password) : [];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow p-8 border border-gray-200">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Account aanmaken</h2>
            <p className="text-sm text-gray-600">Maak een account om te beginnen</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-md border-gray-300 focus:outline-none focus:ring-1 focus:ring-black"
                placeholder="jouw@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Wachtwoord</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-md border-gray-300 focus:outline-none focus:ring-1 focus:ring-black"
                placeholder="••••••••"
              />

              {password && (
                <div className="mt-2 text-xs text-gray-600">
                  <p className="font-semibold mb-1">Vereisten:</p>
                  <ul className="list-inside space-y-1">
                    <li className={password.length >= 6 ? 'text-green-600' : 'text-gray-500'}>• Min 6 tekens</li>
                    <li className={/[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-500'}>• Min 1 hoofdletter</li>
                    <li className={/[a-z]/.test(password) ? 'text-green-600' : 'text-gray-500'}>• Min 1 kleine letter</li>
                    <li className={/[0-9]/.test(password) ? 'text-green-600' : 'text-gray-500'}>• Min 1 cijfer</li>
                    <li className={/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]/.test(password) ? 'text-green-600' : 'text-gray-500'}>• Min 1 speciaal teken</li>
                  </ul>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Bevestig wachtwoord</label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-md border-gray-300 focus:outline-none focus:ring-1 focus:ring-black"
                placeholder="••••••••"
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-600 mt-1">Wachtwoorden komen niet overeen</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || pwFeedback.length > 0}
              className="w-full py-2 bg-black text-white rounded-md disabled:opacity-50"
            >
              {loading ? 'Bezig...' : 'Account aanmaken'}
            </button>
          </form>

          <div className="mt-4 text-center text-sm">
            <Link to="/login" className="text-black underline">Al een account? Inloggen</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
