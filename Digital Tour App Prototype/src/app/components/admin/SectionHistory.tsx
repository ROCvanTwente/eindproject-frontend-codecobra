import { Trash2 } from "lucide-react";
import { Language } from "../../types";
import { AdminSettings } from "../../data/settings";

interface Props {
  language: Language;
  settings: AdminSettings;
  onChange: (
    patch: Partial<AdminSettings>,
    log?: { action: string; target: string },
  ) => void;
}

function formatTs(ts: number, language: Language) {
  const d = new Date(ts);
  return d.toLocaleString(
    language === "nl" ? "nl-NL" : "en-GB",
  );
}

export function SectionHistory({
  language,
  settings,
  onChange,
}: Props) {
  const clear = () => {
    if (
      confirm(
        language === "nl"
          ? "Hele geschiedenis wissen?"
          : "Clear all history?",
      )
    ) {
      onChange(
        { history: [] },
        { action: "clear-history", target: "all" },
      );
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl">
          {language === "nl" ? "History" : "History"}
        </h2>
        {settings.history.length > 0 && (
          <button
            onClick={clear}
            className="flex items-center gap-1.5 text-sm text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
            {language === "nl" ? "Wissen" : "Clear"}
          </button>
        )}
      </div>
      <p className="text-gray-600 mb-4">
        {language === "nl"
          ? "Log van alle wijzigingen in het beheersysteem."
          : "Log of all changes in the admin panel."}
      </p>

      {settings.history.length === 0 ? (
        <p className="text-gray-500 text-center py-6">
          {language === "nl"
            ? "Nog geen activiteit."
            : "No activity yet."}
        </p>
      ) : (
        <div className="border-2 border-gray-200 rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">
                  {language === "nl" ? "Tijd" : "Time"}
                </th>
                <th className="text-left p-3">
                  {language === "nl" ? "Gebruiker" : "User"}
                </th>
                <th className="text-left p-3">
                  {language === "nl" ? "Actie" : "Action"}
                </th>
                <th className="text-left p-3">
                  {language === "nl" ? "Onderwerp" : "Target"}
                </th>
              </tr>
            </thead>
            <tbody>
              {settings.history.map((h) => (
                <tr
                  key={h.id}
                  className="border-t border-gray-100"
                >
                  <td className="p-3 text-gray-600 whitespace-nowrap">
                    {formatTs(h.timestamp, language)}
                  </td>
                  <td className="p-3">{h.actor}</td>
                  <td className="p-3 font-mono text-xs">
                    {h.action}
                  </td>
                  <td className="p-3 truncate max-w-[20ch]">
                    {h.target}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}