import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { Language, Stop } from "../../types";
import {
  AdminSettings,
  ScavengerQuestion,
} from "../../data/settings";
import { SortableList } from "./SortableList";

interface Props {
  language: Language;
  settings: AdminSettings;
  stops: Stop[];
  onChange: (
    patch: Partial<AdminSettings>,
    log?: { action: string; target: string },
  ) => void;
}

export function SectionScavenger({
  language,
  settings,
  stops,
  onChange,
}: Props) {
  const [form, setForm] = useState({
    stopId: stops[0]?.id ?? 0,
    questionNl: "",
    questionEn: "",
    answer: "",
  });

  const add = () => {
    if (!form.questionNl.trim() || !form.answer.trim()) return;
    const q: ScavengerQuestion = {
      id: Date.now(),
      stopId: form.stopId,
      question: {
        nl: form.questionNl,
        en: form.questionEn || form.questionNl,
      },
      answer: form.answer,
    };
    onChange(
      {
        scavengerQuestions: [...settings.scavengerQuestions, q],
      },
      {
        action: "add-scavenger-question",
        target: q.question.nl,
      },
    );
    setForm({
      ...form,
      questionNl: "",
      questionEn: "",
      answer: "",
    });
  };

  const remove = (id: number) => {
    onChange(
      {
        scavengerQuestions: settings.scavengerQuestions.filter(
          (q) => q.id !== id,
        ),
      },
      {
        action: "delete-scavenger-question",
        target: String(id),
      },
    );
  };

  return (
    <div>
      <h2 className="text-2xl mb-2">
        {language === "nl" ? "Speurtocht" : "Scavenger hunt"}
      </h2>
      <p className="text-gray-600 mb-4">
        {language === "nl"
          ? "Voeg vragen toe per stop voor een speurtocht door De Gieterij."
          : "Add questions per stop for a scavenger hunt through De Gieterij."}
      </p>

      <label className="flex items-center gap-3 mb-5 cursor-pointer">
        <input
          type="checkbox"
          checked={settings.scavengerEnabled}
          onChange={(e) =>
            onChange(
              { scavengerEnabled: e.target.checked },
              {
                action: "toggle-scavenger",
                target: e.target.checked ? "on" : "off",
              },
            )
          }
          className="w-5 h-5 accent-[#0066B3]"
        />
        <span>
          {language === "nl"
            ? "Speurtocht tonen tijdens rondleiding"
            : "Show scavenger hunt during tour"}
        </span>
      </label>

      <div className="border-2 border-gray-200 rounded-xl p-4 mb-6 bg-gray-50">
        <h3 className="text-lg mb-3 flex items-center gap-2">
          <Plus className="w-5 h-5 text-[#0066B3]" />
          {language === "nl" ? "Nieuwe vraag" : "New question"}
        </h3>
        <div className="space-y-2">
          <select
            value={form.stopId}
            onChange={(e) =>
              setForm({
                ...form,
                stopId: Number(e.target.value),
              })
            }
            className="w-full px-3 py-2 rounded-lg border-2 border-gray-300"
          >
            {stops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title[language]}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder={
              language === "nl" ? "Vraag (NL)" : "Question (NL)"
            }
            value={form.questionNl}
            onChange={(e) =>
              setForm({ ...form, questionNl: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg border-2 border-gray-300"
          />
          <input
            type="text"
            placeholder={
              language === "nl" ? "Vraag (EN)" : "Question (EN)"
            }
            value={form.questionEn}
            onChange={(e) =>
              setForm({ ...form, questionEn: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg border-2 border-gray-300"
          />
          <input
            type="text"
            placeholder={
              language === "nl" ? "Antwoord" : "Answer"
            }
            value={form.answer}
            onChange={(e) =>
              setForm({ ...form, answer: e.target.value })
            }
            className="w-full px-3 py-2 rounded-lg border-2 border-gray-300"
          />
          <button
            onClick={add}
            className="w-full bg-[#0066B3] text-white py-2 rounded-lg hover:opacity-90"
          >
            {language === "nl" ? "Toevoegen" : "Add"}
          </button>
        </div>
      </div>

      {settings.scavengerQuestions.length === 0 ? (
        <p className="text-gray-500 text-center py-4">
          {language === "nl"
            ? "Nog geen vragen."
            : "No questions yet."}
        </p>
      ) : (
        <>
          <p className="text-gray-600 text-sm mb-2">
            {language === "nl"
              ? "Sleep aan de greep om de vragen te herordenen."
              : "Drag the handle to reorder questions."}
          </p>
          <SortableList
            items={settings.scavengerQuestions}
            onReorder={(scavengerQuestions) =>
              onChange(
                { scavengerQuestions },
                {
                  action: "reorder-scavenger-questions",
                  target: "drag-drop",
                },
              )
            }
            className="space-y-2"
            renderItem={(q) => {
              const stop = stops.find((s) => s.id === q.stopId);
              return (
                <div className="flex items-start gap-3 border-2 border-gray-200 rounded-xl p-3">
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-1">
                      📍{" "}
                      {stop?.title[language] ?? `#${q.stopId}`}
                    </p>
                    <p className="text-base">
                      {q.question[language]}
                    </p>
                    <p className="text-sm text-green-700">
                      ✓ {q.answer}
                    </p>
                  </div>
                  <button
                    onClick={() => remove(q.id)}
                    className="text-red-600 hover:bg-red-50 p-2 rounded-lg"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              );
            }}
          />
        </>
      )}
    </div>
  );
}