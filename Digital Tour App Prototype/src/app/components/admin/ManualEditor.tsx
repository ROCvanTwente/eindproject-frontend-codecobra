import {
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
} from "lucide-react";
import { Language } from "../../types";
import { ManualSection } from "../../data/settings";
import { SortableList } from "./SortableList";

interface Props {
  language: Language;
  title: string;
  sections: ManualSection[];
  onChange: (sections: ManualSection[]) => void;
}

export function ManualEditor({
  language,
  title,
  sections,
  onChange,
}: Props) {
  const update = (
    id: number,
    patch: Partial<ManualSection>,
  ) => {
    onChange(
      sections.map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      ),
    );
  };

  const updateField = (
    id: number,
    field: "title" | "body",
    lang: Language,
    value: string,
  ) => {
    const section = sections.find((s) => s.id === id);
    if (!section) return;
    update(id, {
      [field]: { ...section[field], [lang]: value },
    });
  };

  const add = () => {
    const newId = Math.max(0, ...sections.map((s) => s.id)) + 1;
    onChange([
      ...sections,
      {
        id: newId,
        title: {
          nl:
            language === "nl"
              ? "Nieuw onderdeel"
              : "New section",
          en: "New section",
        },
        body: { nl: "", en: "" },
      },
    ]);
  };

  const remove = (id: number) => {
    if (
      !confirm(
        language === "nl"
          ? "Dit onderdeel verwijderen?"
          : "Remove this section?",
      )
    )
      return;
    onChange(sections.filter((s) => s.id !== id));
  };

  const move = (index: number, delta: number) => {
    const next = [...sections];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2">
        <h2 className="text-2xl">{title}</h2>
        <button
          onClick={add}
          className="bg-[#0066B3] text-white px-3 sm:px-4 py-2 rounded-lg hover:opacity-90 text-sm sm:text-base flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          {language === "nl" ? "Nieuw" : "New"}
        </button>
      </div>

      <p className="text-gray-600 text-sm mb-4">
        {language === "nl"
          ? "Sleep aan de greep of gebruik de pijlen om onderdelen te herordenen. Wijzigingen worden direct opgeslagen."
          : "Drag the handle or use the arrows to reorder. Changes are saved immediately."}
      </p>

      <SortableList
        items={sections}
        onReorder={onChange}
        renderItem={(s, index) => (
          <div className="border-2 border-gray-200 rounded-xl p-3 sm:p-4">
            <div className="flex items-start gap-2 mb-3">
              <div className="flex flex-col gap-1 items-center">
                <button
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={
                    language === "nl" ? "Omhoog" : "Up"
                  }
                  className="p-1.5 rounded-lg border border-gray-200 hover:border-[#0066B3] disabled:opacity-30"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => move(index, 1)}
                  disabled={index === sections.length - 1}
                  aria-label={
                    language === "nl" ? "Omlaag" : "Down"
                  }
                  className="p-1.5 rounded-lg border border-gray-200 hover:border-[#0066B3] disabled:opacity-30"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 min-w-0 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-xs text-gray-600">
                      {language === "nl"
                        ? "Titel NL"
                        : "Title NL"}
                    </span>
                    <input
                      type="text"
                      value={s.title.nl}
                      onChange={(e) =>
                        updateField(
                          s.id,
                          "title",
                          "nl",
                          e.target.value,
                        )
                      }
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 mt-1 focus:border-[#0066B3] outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-600">
                      {language === "nl"
                        ? "Titel EN"
                        : "Title EN"}
                    </span>
                    <input
                      type="text"
                      value={s.title.en}
                      onChange={(e) =>
                        updateField(
                          s.id,
                          "title",
                          "en",
                          e.target.value,
                        )
                      }
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 mt-1 focus:border-[#0066B3] outline-none"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-xs text-gray-600">
                      {language === "nl"
                        ? "Tekst NL"
                        : "Text NL"}
                    </span>
                    <textarea
                      value={s.body.nl}
                      onChange={(e) =>
                        updateField(
                          s.id,
                          "body",
                          "nl",
                          e.target.value,
                        )
                      }
                      rows={3}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 mt-1 focus:border-[#0066B3] outline-none resize-y"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-600">
                      {language === "nl"
                        ? "Tekst EN"
                        : "Text EN"}
                    </span>
                    <textarea
                      value={s.body.en}
                      onChange={(e) =>
                        updateField(
                          s.id,
                          "body",
                          "en",
                          e.target.value,
                        )
                      }
                      rows={3}
                      className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 mt-1 focus:border-[#0066B3] outline-none resize-y"
                    />
                  </label>
                </div>
                <button
                  onClick={() => remove(s.id)}
                  className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  {language === "nl"
                    ? "Verwijder onderdeel"
                    : "Remove section"}
                </button>
              </div>
            </div>
          </div>
        )}
      />
    </div>
  );
}