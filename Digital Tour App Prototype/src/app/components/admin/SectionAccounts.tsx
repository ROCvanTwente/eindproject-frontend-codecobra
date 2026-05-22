import { useState, useEffect } from "react";
import { Trash2, UserPlus, Loader2 } from "lucide-react";
import { Language } from "../../types";
import {
  AdminSettings,
  AdminAccount,
} from "../../data/settings";
import { AlertModal, ConfirmModal } from "./AdminModal";
import { getAllAccounts, createAccount, deleteAccount } from "../../../services/api";

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
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AdminAccount | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      const accounts = await getAllAccounts();
      onChange({ accounts }, { action: "load-accounts", target: "all" });
    } catch (err) {
      setErrorModal(
        language === "nl"
          ? "Fout bij het laden van accounts"
          : "Failed to load accounts"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const create = async () => {
    setUsernameError(null);

    if (!form.username.trim() || !form.password.trim()) {
      setErrorModal(
        language === "nl"
          ? "Vul alle velden in"
          : "Fill in all fields",
      );
      return;
    }

    if (!isPasswordValid(form.password)) {
      setErrorModal(
        language === "nl"
          ? "Wachtwoord voldoet niet aan de vereisten"
          : "Password does not meet the requirements",
      );
      return;
    }

    if (
      settings.accounts.some(
        (a) => a.username === form.username,
      )
    ) {
      setUsernameError(
        language === "nl"
          ? "Gebruikersnaam bestaat al"
          : "Username already exists",
      );
      return;
    }

    try {
      setIsLoading(true);
      const newAcc = await createAccount(
        form.username,
        form.email,
        form.password,
        form.role
      );
      onChange(
        { accounts: [...settings.accounts, newAcc] },
        { action: "create-account", target: form.username },
      );
      setForm({
        username: "",
        password: "",
        email: "",
        role: "editor",
      });
      setShowForm(false);
    } catch (err) {
      setErrorModal(
        language === "nl"
          ? "Fout bij het aanmaken van account"
          : "Failed to create account"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const validatePassword = (password: string) => {
    return {
      hasMinLength: password.length >= 6,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasDigit: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };
  };

  const isPasswordValid = (password: string) => {
    const req = validatePassword(password);
    return req.hasMinLength && req.hasUppercase && req.hasLowercase && req.hasDigit && req.hasSpecialChar;
  };

  const remove = (acc: AdminAccount) => {
    if (acc.username === settings.currentSession?.username) {
      setErrorModal(
        language === "nl"
          ? "Je kunt je eigen account niet verwijderen"
          : "You cannot delete your own account",
      );
      return;
    }
    if (settings.accounts.length <= 1) {
      setErrorModal(
        language === "nl"
          ? "Minimaal 1 account vereist"
          : "At least one account required",
      );
      return;
    }
    setConfirmDelete(acc);
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

      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-[#0066B3] text-white px-4 py-2 rounded-lg hover:opacity-90 mb-6"
        >
          <UserPlus className="w-5 h-5" />
          {language === "nl" ? "Gebruiker toevoegen" : "Add user"}
        </button>
      )}

      {showForm && (
        <div className="border-2 border-gray-200 rounded-xl p-4 mb-6 bg-gray-50">
          <h3 className="text-lg mb-3 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#0066B3]" />
            {language === "nl"
              ? "Nieuw account aanmaken"
              : "Create new account"}
          </h3>
          <div className="space-y-3">
            <div>
              <input
                type="text"
                placeholder={
                  language === "nl" ? "Gebruikersnaam" : "Username"
                }
                value={form.username}
                onChange={(e) => {
                  setForm({ ...form, username: e.target.value });
                  setUsernameError(null);
                }}
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-300"
              />
              {usernameError && (
                <span className="text-red-600 text-sm mt-1 block">
                  {usernameError}
                </span>
              )}
            </div>

            <div>
              <input
                type="password"
                placeholder={
                  language === "nl" ? "Wachtwoord" : "Password"
                }
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border-2 border-gray-300"
              />
              {form.password && (
                <div className="mt-2 space-y-1 text-sm">
                  <div className={`flex items-center gap-2 ${validatePassword(form.password).hasMinLength ? "text-green-600" : "text-red-500"}`}>
                    <span>{validatePassword(form.password).hasMinLength ? "✓" : "○"}</span>
                    <span>{language === "nl" ? "Minstens 6 tekens" : "At least 6 characters"}</span>
                  </div>
                  <div className={`flex items-center gap-2 ${validatePassword(form.password).hasUppercase ? "text-green-600" : "text-red-500"}`}>
                    <span>{validatePassword(form.password).hasUppercase ? "✓" : "○"}</span>
                    <span>{language === "nl" ? "Minimaal 1 hoofdletter" : "At least 1 uppercase letter"}</span>
                  </div>
                  <div className={`flex items-center gap-2 ${validatePassword(form.password).hasLowercase ? "text-green-600" : "text-red-500"}`}>
                    <span>{validatePassword(form.password).hasLowercase ? "✓" : "○"}</span>
                    <span>{language === "nl" ? "Minimaal 1 kleine letter" : "At least 1 lowercase letter"}</span>
                  </div>
                  <div className={`flex items-center gap-2 ${validatePassword(form.password).hasDigit ? "text-green-600" : "text-red-500"}`}>
                    <span>{validatePassword(form.password).hasDigit ? "✓" : "○"}</span>
                    <span>{language === "nl" ? "Minimaal 1 cijfer" : "At least 1 digit"}</span>
                  </div>
                  <div className={`flex items-center gap-2 ${validatePassword(form.password).hasSpecialChar ? "text-green-600" : "text-red-500"}`}>
                    <span>{validatePassword(form.password).hasSpecialChar ? "✓" : "○"}</span>
                    <span>{language === "nl" ? "Minimaal 1 speciaal teken" : "At least 1 special character"}</span>
                  </div>
                </div>
              )}
            </div>

            <input
              type="email"
              placeholder={language === "nl" ? "E-mail" : "Email"}
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
              className="w-full px-3 py-2 rounded-lg border-2 border-gray-300"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
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
                disabled={isLoading}
                className="bg-[#0066B3] text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {language === "nl" ? "Aanmaken" : "Create"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                disabled={isLoading}
                className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {language === "nl" ? "Annuleren" : "Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center gap-3 border-2 border-gray-200 rounded-xl p-6">
            <Loader2 className="w-5 h-5 text-[#0066B3] animate-spin" />
            <p className="text-gray-600">
              {language === "nl" ? "Gebruikers laden..." : "Loading users..."}
            </p>
          </div>
        ) : (
          settings.accounts.map((acc) => (
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
              disabled={isLoading}
              className="text-red-600 hover:bg-red-50 p-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Delete"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
          ))
        )}
      </div>

      {errorModal && (
        <AlertModal
          language={language}
          title={language === "nl" ? "Fout" : "Error"}
          message={errorModal}
          variant="error"
          onClose={() => setErrorModal(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          language={language}
          title={language === "nl" ? "Account verwijderen" : "Delete account"}
          message={
            language === "nl"
              ? `Account "${confirmDelete.username}" verwijderen?`
              : `Delete account "${confirmDelete.username}"?`
          }
          variant="danger"
          onConfirm={async () => {
            try {
              setIsLoading(true);
              await deleteAccount(confirmDelete.id);
              onChange(
                {
                  accounts: settings.accounts.filter(
                    (a) => a.id !== confirmDelete.id,
                  ),
                },
                { action: "delete-account", target: confirmDelete.username },
              );
              setConfirmDelete(null);
            } catch (err) {
              setErrorModal(
                language === "nl"
                  ? "Fout bij het verwijderen van account"
                  : "Failed to delete account"
              );
            } finally {
              setIsLoading(false);
            }
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}