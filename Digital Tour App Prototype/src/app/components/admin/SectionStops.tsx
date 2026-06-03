import { useEffect, useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Stop, Language } from "../../types";
import { SortableList } from "./SortableList";
import { getAllTourStops, deleteTourStop } from "../../../services/api";

interface Props {
  language: Language;
  onEdit: (stop: Stop) => void;
  onCreate: () => void;
  log: (action: string, target: string) => void;
  onStopsChange?: (stops: Stop[]) => void;
}

export function SectionStops({
  language,
  onEdit,
  onCreate,
  log,
  onStopsChange,
}: Props) {
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all stops on mount
  useEffect(() => {
    const fetchStops = async () => {
      try {
        setLoading(true);
        const data = await getAllTourStops();
        console.log("Fetched stops from API:", data);
        setStops(data);
        onStopsChange?.(data);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to fetch stops";
        console.error("Error fetching stops:", errorMsg);
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchStops();
  }, []);

  const handleDelete = async (stop: Stop) => {
    if (
      confirm(
        language === "nl"
          ? "Weet je zeker dat je deze stop wilt verwijderen?"
          : "Are you sure you want to delete this stop?",
      )
    ) {
      try {
        await deleteTourStop(stop.id);
        const updatedStops = stops.filter((s) => s.id !== stop.id);
        setStops(updatedStops);
        onStopsChange?.(updatedStops);
        log("delete-stop", stop.titleNl || `#${stop.id}`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to delete stop";
        console.error("Error deleting stop:", errorMsg);
        setError(errorMsg);
      }
    }
  };

  const move = (index: number, delta: number) => {
    const next = [...stops];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setStops(next);
    onStopsChange?.(next);
    log(
      "reorder-stop",
      next[target].titleNl || `#${next[target].id}`,
    );
  };

  const handleReorder = (next: Stop[]) => {
    setStops(next);
    onStopsChange?.(next);
    log("reorder-stop", "drag-drop");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-gray-600">
          {language === "nl" ? "Laden..." : "Loading..."}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

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
                    {stop.qrCode.code}
                  </span>
                  <span className="text-gray-500 text-sm">
                    #{index + 1}
                  </span>
                </div>
                <h3 className="text-xl mb-1 truncate">
                  {language === "nl" ? stop.titleNl : stop.titleEn}
                </h3>
                <p className="text-gray-600 text-sm mb-3">
                  {language === "nl" ? stop.locationNl : stop.locationEn}
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