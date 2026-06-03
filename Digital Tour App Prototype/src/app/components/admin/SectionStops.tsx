import { ChevronUp, ChevronDown } from "lucide-react";
import { Stop, Language } from "../../types";
import { SortableList } from "./SortableList";

interface Props {
  language: Language;
  stops: Stop[];
  onUpdateStops: (stops: Stop[]) => void;
  onEdit: (stop: Stop) => void;
  onCreate: () => void;
  log: (action: string, target: string) => void;
}

export function SectionStops({
  language,
  stops,
  onUpdateStops,
  onEdit,
  onCreate,
  log,
}: Props) {
  const handleDelete = (stop: Stop) => {
    if (
      confirm(
        language === "nl"
          ? "Weet je zeker dat je deze stop wilt verwijderen?"
          : "Are you sure you want to delete this stop?",
      )
    ) {
      onUpdateStops(stops.filter((s) => s.id !== stop.id));
      log("delete-stop", stop.title.nl || `#${stop.id}`);
    }
  };

  const move = (index: number, delta: number) => {
    const next = [...stops];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onUpdateStops(next);
    log(
      "reorder-stop",
      next[target].title.nl || `#${next[target].id}`,
    );
  };

  const handleReorder = (next: Stop[]) => {
    onUpdateStops(next);
    log("reorder-stop", "drag-drop");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2">
        <h2 className="text-2xl">
          {language === "nl" ? "Stops beheren" : "Manage stops"}
        </h2>
        <button
          onClick={onCreate}
          className="bg-[#0066B3] text-white px-3 sm:px-4 py-2 rounded-lg hover:opacity-90 text-sm sm:text-base"
        >
          + {language === "nl" ? "Nieuwe stop" : "New stop"}
        </button>
      </div>

      <p className="text-gray-600 text-sm mb-3">
        {language === "nl"
          ? "Sleep aan de greep of gebruik de pijlen om stops te herordenen."
          : "Drag the handle or use the arrows to reorder stops."}
      </p>

      <SortableList
        items={stops}
        onReorder={handleReorder}
        renderItem={(stop, index) => (
          <div className="border-2 border-gray-200 rounded-xl p-4 hover:border-[#0066B3] transition-colors">
            <div className="flex items-start gap-3">
              <div className="flex flex-col gap-1 items-center">
                <button
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={
                    language === "nl" ? "Omhoog" : "Move up"
                  }
                  className="p-1.5 rounded-lg border border-gray-200 hover:border-[#0066B3] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => move(index, 1)}
                  disabled={index === stops.length - 1}
                  aria-label={
                    language === "nl" ? "Omlaag" : "Move down"
                  }
                  className="p-1.5 rounded-lg border border-gray-200 hover:border-[#0066B3] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="bg-[#E30613] text-white px-3 py-1 rounded-full text-sm">
                    {stop.qrCode}
                  </span>
                  <span className="text-gray-500 text-sm">
                    #{index + 1}
                  </span>
                </div>
                <h3 className="text-xl mb-1 truncate">
                  {stop.title[language]}
                </h3>
                <p className="text-gray-600 text-sm mb-3">
                  {stop.location[language]}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(stop)}
                    className="flex-1 bg-[#0066B3] text-white py-2 rounded-lg hover:opacity-90"
                  >
                    {language === "nl" ? "Bewerken" : "Edit"}
                  </button>
                  <button
                    onClick={() => handleDelete(stop)}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:opacity-90"
                  >
                    {language === "nl"
                      ? "Verwijderen"
                      : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      />
    </div>
  );
}