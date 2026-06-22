import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AdminSettings } from "../data/settings";
import { Language, UserSession } from "../types";
import { getCurrentUserInfo, loginUser } from "../../services/authApi";

interface LoginScreenProps {
  settings: AdminSettings;
  onLogin: (session: UserSession) => void;
  onBack: () => void;
}

export function LoginScreen({
  settings,
  onLogin,
  onBack,
}: LoginScreenProps) {
    const [username, setUsername] = useState("");
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

    const fillAdminCredentials = () => {
        setUsername("admin");
        setPassword("Test-123");
        setError("");
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
            const result = await loginUser(username, password);

            if (result.ok) {
                const data: any = result.data ?? {};
                if (!data?.accessToken) {
                    setError("Inloggen gelukt, maar geen toegangstoken ontvangen.");
                    return;
                }

                const currentUser = await getCurrentUserInfo();

        // Build a UserSession to pass back to App. Prefer server-provided info if available.
        const session = {
                    username: currentUser?.username ?? data?.username ?? username,
                    role: currentUser?.isAdmin ? "Admin" : data?.role ?? "Editor",
        };

        // Notify parent app that login succeeded so it can switch to the admin view.
        onLogin(session);
      } else {
                const apiError =
                    result.data?.detail ??
                    result.data?.title ??
                    result.data?.message ??
                    'Login failed. Please check your credentials.';
                setError(apiError);
      }
    } catch (err) {
      setError('An error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full">
                {/* Card */}
                <div className="bg-white rounded-2xl shadow-md p-8 border border-gray-200">
                    {/* Header */}
                    <div className="text-start mb-8">
                        <div className="flex flex-row gap-4">
                            <div className="bg-[#006cb7] text-white rounded-full w-10 h-10 flex items-center justify-center mb-4">
                                <svg className="w-5 h-5 fill-current text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M416 160L480 160C497.7 160 512 174.3 512 192L512 448C512 465.7 497.7 480 480 480L416 480C398.3 480 384 494.3 384 512C384 529.7 398.3 544 416 544L480 544C533 544 576 501 576 448L576 192C576 139 533 96 480 96L416 96C398.3 96 384 110.3 384 128C384 145.7 398.3 160 416 160zM406.6 342.6C419.1 330.1 419.1 309.8 406.6 297.3L278.6 169.3C266.1 156.8 245.8 156.8 233.3 169.3C220.8 181.8 220.8 202.1 233.3 214.6L306.7 288L96 288C78.3 288 64 302.3 64 320C64 337.7 78.3 352 96 352L306.7 352L233.3 425.4C220.8 437.9 220.8 458.2 233.3 470.7C245.8 483.2 266.1 483.2 278.6 470.7L406.6 342.7z"/></svg>
                            </div>
                            <h2 className="text-3xl text-black mb-2">Inloggen</h2>
                        </div>
                        <div>
                            <span className="text-gray-600">Vul je gegevens in om door te gaan naar het beheerders dashboard.</span>
                        </div>
                    </div>

                        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
                            <p className="text-sm font-semibold text-blue-900">Test admin login</p>
                            <p className="text-sm text-blue-900">Naam: admin</p>
                            <p className="text-sm text-blue-900">Wachtwoord: Test-123</p>
                            <button
                                type="button"
                                onClick={fillAdminCredentials}
                                className="mt-3 inline-flex items-center rounded-md bg-[#006cb7] px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
                            >
                                Vul automatisch in
                            </button>
                        </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-700 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Username Input */}
                        <div>
                            <label htmlFor="username" className="block text-sm font-semibold text-gray-900 mb-2">
                                Naam
                            </label>
                            <input
                                type="text"
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                placeholder="admin"
                                autoComplete="username"
                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200"
                            />
                        </div>

                        {/* Password Input */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                autoComplete="current-password"
                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200"
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-6 px-4 py-3 bg-[#006cb7] text-white font-semibold rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300"></div>
                        </div>
                    </div>
                </div>

                {/* Footer Text */}
                <p className="text-center text-gray-500 text-xs mt-8">
                    By signing in, you agree to our Terms of Service and Privacy Policy
                </p>
            </div>
        </div>
    );
}