import { ChevronRight } from "lucide-react";
import { Stop, Language } from "../types";

interface StopCardProps {
  stop: Stop;
  language: Language;
  onClick: () => void;
  number: number;
}

export function StopCard({
  stop,
  language,
  onClick,
  number,
}: StopCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl shadow-lg p-8 text-left hover:shadow-xl transition-shadow border-4 border-transparent hover:border-primary"
    >
      <div className="flex items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-primary text-white flex items-center justify-center flex-shrink-0">
          <span className="text-4xl font-bold">{number}</span>
        </div>

        <div className="flex-1">
          <h3 className="text-3xl mb-2 leading-tight">
            {stop.title[language]}
          </h3>
          <p className="text-xl text-muted-foreground">
            {stop.location[language]}
          </p>
        </div>

        <ChevronRight className="w-10 h-10 text-primary flex-shrink-0" />
      </div>
    </button>
  );
}