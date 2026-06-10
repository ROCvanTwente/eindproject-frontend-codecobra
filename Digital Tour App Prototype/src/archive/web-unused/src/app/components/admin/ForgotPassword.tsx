import { useState } from "react";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { Language } from "../../types";
import { AdminAccount } from "../../data/settings";

interface Props {
  language: Language;
  accounts: AdminAccount[];
  onBack: () => void;
}

export function ForgotPassword({
  language,
  accounts,
  onBack,
}: Props) {
  const [username, setUsername] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const account = accounts.find(
      (a) => a.username === username,
    );
    if (!account) {
      setError(
        language === "nl"
          ? "Gebruikersnaam niet gevonden"
          : "Username not found",
      );
      return;
    }

    if (!account.email) {
      setError(
        language === "nl"
          ? "Geen e-mailadres gevonden voor dit account"
          : "No email address found for this account",
      );
      return;
    }

    setSent(true);
  };

  if (sent) {
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
                {language === "nl"
                  ? "Terug naar login"
                  : "Back to login"}
              </span>
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-8 w-full max-w-md text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl mb-3">
              {language === "nl"
                ? "E-mail verstuurd!"
                : "Email sent!"}
            </h2>
            <p className="text-gray-600 mb-6">
              {language === "nl"
                ? "We hebben een wachtwoord reset link naar je e-mailadres gestuurd. Controleer je inbox en volg de instructies."
                : "We have sent a password reset link to your email address. Check your inbox and follow the instructions."}
            </p>
            <button
              onClick={onBack}
              className="w-full bg-[#0066B3] text-white py-3 rounded-lg text-lg hover:opacity-90 transition-opacity"
            >
              {language === "nl"
                ? "Terug naar login"
                : "Back to login"}
            </button>
            <p className="text-xs text-gray-400 mt-4">
              {language === "nl"
                ? "(Demo: reset-link wordt normaal via e-mail verzonden)"
                : "(Demo: reset link is normally sent by email)"}
            </p>
          </div>
        </div>
      </div>
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
            {language === "nl"
              ? "Wachtwoord vergeten"
              : "Forgot password"}
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
              <Mail className="w-6 h-6" />
            </div>
            <h2 className="text-2xl">
              {language === "nl"
                ? "Reset wachtwoord"
                : "Reset password"}
            </h2>
          </div>

          <p className="text-gray-600 mb-6">
            {language === "nl"
              ? "Vul je gebruikersnaam in en we sturen een reset-link naar het gekoppelde e-mailadres."
              : "Enter your username and we will send a reset link to the associated email address."}
          </p>

          <label className="block mb-6">
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
              required
            />
          </label>

          {error && (
            <p className="text-red-600 text-sm mb-3">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-[#0066B3] text-white py-3 rounded-lg text-lg hover:opacity-90 transition-opacity"
          >
            {language === "nl"
              ? "Verstuur reset-link"
              : "Send reset link"}
          </button>
        </form>
      </div>
    </div>
  );
}