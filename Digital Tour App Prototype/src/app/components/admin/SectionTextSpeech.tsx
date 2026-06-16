import { useState, useEffect } from "react";
import { Language } from "../../types";
import { Pencil, Trash2 } from "lucide-react";
import { ConfirmModal, AlertModal } from "../admin/AdminModal"; // Adjust this path if your folder structure differs
// Import your API handlers directly here
import { 
  getAllPronunciationRules, 
  createPronunciationRule, 
  updatePronunciationRule, 
  deletePronunciationRule 
} from "../../../services/api";

export interface PronunciationRule {
  id: string;
  word: string;
  ipa: string;
  lang: Language;
}

interface Props {
  language: Language; // The interface language (nl or en)
}

export function SectionTextSpeech({ language }: Props) {
  // ── Local State ───────────────────────────────────────────────────────────
  const [rules, setRules] = useState<PronunciationRule[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [word, setWord] = useState("");
  const [ipa, setIpa] = useState("");
  const [ruleLang, setRuleLang] = useState<Language>("nl");

  // Modal State
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string; variant: "error" | "success" | "info" } | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // ── Fetch Rules on Mount ──────────────────────────────────────────────────
  useEffect(() => {
    async function fetchRules() {
      try {
        setLoading(true);
        const data = await getAllPronunciationRules();
        
        // Map backend PascalCase (PronunciationText, Language) to frontend keys (ipa, lang)
        const mappedRules: PronunciationRule[] = data.map((item: any) => ({
          id: String(item.id),
          word: item.word,
          ipa: item.pronunciationText, 
          lang: item.language.toLowerCase() as Language,
        }));
        
        setRules(mappedRules);
      } catch (error) {
        console.error("Failed to load pronunciation rules:", error);
        setAlertConfig({
          title: language === "nl" ? "Fout bij laden" : "Loading Error",
          message: language === "nl" ? "Kon de uitspraakregels niet ophalen." : "Could not fetch pronunciation rules.",
          variant: "error"
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchRules();
  }, [language]);

  // ── API Mutation Handlers ─────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || !ipa.trim()) return;

    try {
      if (editingId) {
        // Find current item to preserve untracked data if necessary
        const current = rules.find(r => r.id === editingId);
        if (!current) return;

        const updatedLocal = { ...current, word, ipa, lang: ruleLang };
        
        // Prepare payload for C# [HttpPut]
        const payload = {
          id: Number(editingId),
          word: updatedLocal.word,
          pronunciationText: updatedLocal.ipa,
          language: updatedLocal.lang
        };

        await updatePronunciationRule(payload);

        // Update local UI state
        setRules((prev) => prev.map((r) => (r.id === editingId ? updatedLocal : r)));
        resetForm();
        setAlertConfig({
          title: language === "nl" ? "Succes" : "Success",
          message: language === "nl" ? "Uitspraak succesvol aangepast." : "Pronunciation updated successfully.",
          variant: "success"
        });
      } else {
        // Prepare payload for C# [HttpPost]
        const payload = {
          word,
          pronunciationText: ipa,
          language: ruleLang
        };

        const createdItem = await createPronunciationRule(payload);

        const mappedRule: PronunciationRule = {
          id: String(createdItem.id),
          word: createdItem.word,
          ipa: createdItem.pronunciationText,
          lang: createdItem.language.toLowerCase() as Language
        };

        setRules((prev) => [...prev, mappedRule]);
        resetForm();
        setAlertConfig({
          title: language === "nl" ? "Succes" : "Success",
          message: language === "nl" ? "Uitspraak succesvol toegevoegd." : "Pronunciation added successfully.",
          variant: "success"
        });
      }
    } catch (error) {
      console.error("Failed to save rule:", error);
      setAlertConfig({
        title: language === "nl" ? "Fout bij opslaan" : "Save Error",
        message: language === "nl" ? "Opslaan mislukt. Controleer de verbinding met de backend." : "Failed to save rule. Please verify backend connectivity.",
        variant: "error"
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;

    try {
      await deletePronunciationRule(Number(deleteTargetId));
      setRules((prev) => prev.filter((rule) => rule.id !== deleteTargetId));
      if (editingId === deleteTargetId) resetForm();
      setDeleteTargetId(null);
    } catch (error) {
      console.error("Failed to delete rule:", error);
      setDeleteTargetId(null);
      setAlertConfig({
        title: language === "nl" ? "Fout bij verwijderen" : "Deletion Error",
        message: language === "nl" ? "Verwijderen mislukt." : "Failed to delete rule.",
        variant: "error"
      });
    }
  };

  // ── UI Helper Functions ───────────────────────────────────────────────────
  const resetForm = () => {
    setEditingId(null);
    setWord("");
    setIpa("");
    setRuleLang("nl");
  };

  const startEdit = (rule: PronunciationRule) => {
    setEditingId(rule.id);
    setWord(rule.word);
    setIpa(rule.ipa);
    setRuleLang(rule.lang);
  };

  const handlePreview = (textToSpeak: string, langCode: Language) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    const sampleUtterance = new SpeechSynthesisUtterance(textToSpeak);
    sampleUtterance.lang = langCode === "nl" ? "nl-NL" : "en-US";
    window.speechSynthesis.speak(sampleUtterance);
  };

  // ── Render Component ──────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl mb-2">
          {language === "nl" ? "TTS Uitspraak Woordenboek" : "TTS Pronunciation Lexicon"}
        </h2>
        <p className="text-gray-600">
          {language === "nl"
            ? "Pas aan hoe de voorleesstem specifieke woorden uitspreekt met behulp van IPA."
            : "Customize how the reading voice pronounces specific words using IPA."}
        </p>
      </div>

      {/* Form Section */}
      <section className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <h3 className="text-lg font-medium mb-4">
          {editingId
            ? language === "nl" ? "Uitspraak aanpassen" : "Edit pronunciation"
            : language === "nl" ? "Nieuwe uitspraak toevoegen" : "Add new pronunciation"}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === "nl" ? "Origineel woord" : "Original word"}
              </label>
              <input
                type="text"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="Bijv. Hengelo"
                className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:border-[#0066B3]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === "nl" ? "Uitspraak (IPA)" : "Pronunciation (IPA)"}
              </label>
              <input
                type="text"
                value={ipa}
                onChange={(e) => setIpa(e.target.value)}
                placeholder="Bijv. ˈhɛŋəloʊ/"
                className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:border-[#0066B3]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === "nl" ? "Taal" : "Language"}
              </label>
              <select
                value={ruleLang}
                onChange={(e) => setRuleLang(e.target.value as Language)}
                className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white focus:outline-none focus:border-[#0066B3]"
              >
                <option value="nl">{language === "nl" ? "Nederlands" : "Dutch"}</option>
                <option value="en">{language === "nl" ? "Engels" : "English"}</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-100"
              >
                {language === "nl" ? "Annuleren" : "Cancel"}
              </button>
            )}
            <button
              type="button"
              onClick={() => handlePreview(word, ruleLang)}
              disabled={!word.trim()}
              className="border border-[#0066B3] text-[#0066B3] px-4 py-2 rounded-lg text-sm hover:bg-blue-50 disabled:opacity-50"
            >
              🔊 {language === "nl" ? "Test woord" : "Test word"}
            </button>
            <button
              type="submit"
              className="bg-[#0066B3] text-white px-4 py-2 rounded-lg text-sm hover:opacity-90"
            >
              {editingId
                ? language === "nl" ? "Opslaan" : "Save changes"
                : language === "nl" ? "Toevoegen" : "Add word"}
            </button>
          </div>
        </form>
      </section>

      {/* Rules Table Section */}
      <section>
        <h3 className="text-lg mb-3">
          {language === "nl" ? "Bestaande aanpassingen" : "Current adjustments"} ({rules.length})
        </h3>

        {loading ? (
          <div className="text-center p-8 text-gray-500">
            {language === "nl" ? "Laden..." : "Loading..."}
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center p-8 border-2 border-dashed border-gray-200 rounded-xl text-gray-500">
            {language === "nl" 
              ? "Er zijn nog geen aangepaste uitspraken toegevoegd." 
              : "No custom pronunciations added yet."}
          </div>
        ) : (
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200 text-sm font-medium text-gray-700">
                  <th className="p-4">{language === "nl" ? "Woord" : "Word"}</th>
                  <th className="p-4">IPA</th>
                  <th className="p-4">{language === "nl" ? "Taal" : "Language"}</th>
                  <th className="p-4 text-right">{language === "nl" ? "Acties" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium text-gray-900">{rule.word}</td>
                    <td className="p-4 font-mono text-gray-600 bg-gray-50/50">{rule.ipa}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        rule.lang === 'nl' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {rule.lang === "nl" ? "NL" : "EN"}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => startEdit(rule)}
                        className="text-blue-600 hover:bg-blue-50 hover:cursor-pointer p-2 rounded-lg"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setDeleteTargetId(rule.id)}
                        className="text-red-600 hover:bg-red-50 hover:cursor-pointer p-2 rounded-lg"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modals Insertion */}
      {deleteTargetId && (
        <ConfirmModal
          language={language}
          title={language === "nl" ? "Item verwijderen?" : "Delete item?"}
          message={
            language === "nl" 
              ? "Weet u zeker dat u dit item wilt verwijderen uit het woordenboek?" 
              : "Are you sure you want to remove this item from the lexicon?"
          }
          variant="danger"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTargetId(null)}
        />
      )}

      {alertConfig && (
        <AlertModal
          language={language}
          title={alertConfig.title}
          message={alertConfig.message}
          variant={alertConfig.variant}
          onClose={() => setAlertConfig(null)}
        />
      )}
    </div>
  );
}