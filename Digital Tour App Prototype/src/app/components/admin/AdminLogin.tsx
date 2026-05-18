import { useState } from "react";
import { ArrowLeft, LogIn } from "lucide-react";
import { Language } from "../../types";
import { AdminAccount } from "../../data/settings";
import { ForgotPassword } from "./ForgotPassword";

interface Props {
  language: Language;
  accounts: AdminAccount[];
  onLogin: (acc: AdminAccount) => void;
  onBack: () => void;
}

export function AdminLogin({
  language,
  accounts,
  onLogin,
  onBack,
}: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] =
    useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const match = accounts.find(
      (a) => a.username === username && a.password === password,
    );
    if (match) {
      onLogin(match);
    } else {
      setError(
        language === "nl"
          ? "Onjuiste gebruikersnaam of wachtwoord"
          : "Invalid username or password",
      );
    }
  };

  if (showForgotPassword) {
    return (
      <ForgotPassword
        language={language}
        accounts={accounts}
        onBack={() => setShowForgotPassword(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-[#E30613] text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 hover:opacity-80"
          >
            <ArrowLeft className="w-6 h-6" />
            <span className="text-lg">
              {language === "nl" ? "Terug" : "Back"}
            </span>
          </button>
          <h1 className="text-xl ml-auto">
            {language === "nl" ? "Beheer login" : "Admin login"}
          </h1>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-8 w-full max-w-md"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-[#0066B3] text-white flex items-center justify-center">
              <LogIn className="w-6 h-6" />
            </div>
            <h2 className="text-2xl">
              {language === "nl" ? "Inloggen" : "Sign in"}
            </h2>
          </div>

          <label className="block mb-4">
            <span className="text-sm text-gray-700">
              {language === "nl"
                ? "Gebruikersnaam"
                : "Username"}
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-[#0066B3] outline-none text-base"
              autoFocus
            />
          </label>

          <label className="block mb-4">
            <span className="text-sm text-gray-700">
              {language === "nl" ? "Wachtwoord" : "Password"}
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-[#0066B3] outline-none text-base"
            />
          </label>

          {error && (
            <p className="text-red-600 text-sm mb-3">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-[#0066B3] text-white py-3 rounded-lg text-lg hover:opacity-90 transition-opacity"
          >
            {language === "nl" ? "Inloggen" : "Sign in"}
          </button>

          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            className="w-full text-[#0066B3] py-2 text-sm hover:underline mt-2"
          >
            {language === "nl"
              ? "Wachtwoord vergeten?"
              : "Forgot password?"}
          </button>

          <p className="text-xs text-gray-400 mt-4 text-center">
            {language === "nl"
              ? "Standaard account: admin / gieterij"
              : "Default account: admin / gieterij"}
          </p>
        </form>
      </div>
    </div>
  );
}