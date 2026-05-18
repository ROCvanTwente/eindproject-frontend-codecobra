import { useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { Language } from "../../types";
import {
  AdminSettings,
  AdminAccount,
} from "../../data/settings";

interface Props {
  language: Language;
  settings: AdminSettings;
  onChange: (
    patch: Partial<AdminSettings>,
    log?: { action: string; target: string },
  ) => void;
}

export function SectionAccounts({
  language,
  settings,
  onChange,
}: Props) {
  const [form, setForm] = useState({
    username: "",
    password: "",
    email: "",
    role: "editor" as AdminAccount["role"],
  });
  const [error, setError] = useState<string | null>(null);

  const create = () => {
    setError(null);
    if (!form.username.trim() || !form.password.trim()) {
      setError(
        language === "nl"
          ? "Vul alle velden in"
          : "Fill in all fields",
      );
      return;
    }
    if (
      settings.accounts.some(
        (a) => a.username === form.username,
      )
    ) {
      setError(
        language === "nl"
          ? "Gebruikersnaam bestaat al"
          : "Username already exists",
      );
      return;
    }
    const newId =
      Math.max(0, ...settings.accounts.map((a) => a.id)) + 1;
    const newAcc: AdminAccount = { id: newId, ...form };
    onChange(
      { accounts: [...settings.accounts, newAcc] },
      { action: "create-account", target: newAcc.username },
    );
    setForm({
      username: "",
      password: "",
      email: "",
      role: "editor",
    });
  };

  const remove = (acc: AdminAccount) => {
    if (acc.username === settings.currentSession?.username) {
      alert(
        language === "nl"
          ? "Je kunt je eigen account niet verwijderen"
          : "You cannot delete your own account",
      );
      return;
    }
    if (settings.accounts.length <= 1) {
      alert(
        language === "nl"
          ? "Minimaal 1 account vereist"
          : "At least one account required",
      );
      return;
    }
    if (
      confirm(
        language === "nl"
          ? `Account "${acc.username}" verwijderen?`
          : `Delete account "${acc.username}"?`,
      )
    ) {
      onChange(
        {
          accounts: settings.accounts.filter(
            (a) => a.id !== acc.id,
          ),
        },
        { action: "delete-account", target: acc.username },
      );
    }
  };

  return (
    <div>
      <h2 className="text-2xl mb-2">
        {language === "nl"
          ? "Beheer accounts"
          : "Admin accounts"}
      </h2>
      <p className="text-gray-600 mb-4">
        {language === "nl"
          ? "Beheer wie toegang heeft tot dit paneel."
          : "Manage who has access to this panel."}
      </p>

      <div className="border-2 border-gray-200 rounded-xl p-4 mb-6 bg-gray-50">
        <h3 className="text-lg mb-3 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-[#0066B3]" />
          {language === "nl"
            ? "Nieuw account aanmaken"
            : "Create new account"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input
            type="text"
            placeholder={
              language === "nl" ? "Gebruikersnaam" : "Username"
            }
            value={form.username}
            onChange={(e) =>
              setForm({ ...form, username: e.target.value })
            }
            className="px-3 py-2 rounded-lg border-2 border-gray-300"
          />
          <input
            type="password"
            placeholder={
              language === "nl" ? "Wachtwoord" : "Password"
            }
            value={form.password}
            onChange={(e) =>
              setForm({ ...form, password: e.target.value })
            }
            className="px-3 py-2 rounded-lg border-2 border-gray-300"
          />
          <input
            type="email"
            placeholder={language === "nl" ? "E-mail" : "Email"}
            value={form.email}
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
            className="px-3 py-2 rounded-lg border-2 border-gray-300"
          />
          <select
            value={form.role}
            onChange={(e) =>
              setForm({ ...form, role: e.target.value as any })
            }
            className="px-3 py-2 rounded-lg border-2 border-gray-300"
          >
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
          </select>
          <button
            onClick={create}
            className="bg-[#0066B3] text-white px-4 py-2 rounded-lg hover:opacity-90"
          >
            {language === "nl" ? "Aanmaken" : "Create"}
          </button>
        </div>
        {error && (
          <p className="text-red-600 text-sm mt-2">{error}</p>
        )}
      </div>

      <div className="space-y-2">
        {settings.accounts.map((acc) => (
          <div
            key={acc.id}
            className="flex items-center gap-3 border-2 border-gray-200 rounded-xl p-3"
          >
            <div className="w-10 h-10 rounded-full bg-[#0066B3] text-white flex items-center justify-center">
              {acc.username[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-base">{acc.username}</p>
              <p className="text-xs text-gray-500">
                {acc.role}
                {acc.email ? ` • ${acc.email}` : ""}
              </p>
            </div>
            <button
              onClick={() => remove(acc)}
              className="text-red-600 hover:bg-red-50 p-2 rounded-lg"
              aria-label="Delete"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}