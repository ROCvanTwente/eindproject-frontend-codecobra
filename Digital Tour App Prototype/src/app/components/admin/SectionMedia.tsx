import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Film,
  Image as ImageIcon,
  Music,
  Trash2,
  Link as LinkIcon,
  QrCode,
  Plus,
} from "lucide-react";
import { Language, MediaItem, Stop } from "../../types";
import { resolveMediaUrl, saveTourStop, uploadMedia } from "../../../services/api";

interface Props {
  language: Language;
  stops: Stop[];
  onUpdateStops: (stops: Stop[]) => void;
}

type MediaKind = "image" | "video" | "audio";

function detectKind(file: File): MediaKind {
  if (file.type.startsWith("video/")) return "video";
  return "image";
}

export function SectionMedia({ language, stops, onUpdateStops }: Props) {
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [dragId, setDragId] = useState<number | null>(null);
  const [urlFormId, setUrlFormId] = useState<number | null>(null);
  const [urlForm, setUrlForm] = useState({ type: "image" as MediaKind, url: "" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: Record<string, string> = {};
      for (const s of stops) {
        if (!s.qrCode) continue;
        try {
          out[s.qrCode] = await QRCode.toDataURL(s.qrCode, { width: 140, margin: 1 });
        } catch {}
      }
      if (!cancelled) setQrMap(out);
    })();
    return () => { cancelled = true; };
  }, [stops]);

  const handleFiles = async (stopId: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const targetStop = stops.find((s) => s.id === stopId);
    if (!targetStop) return;

    const added: MediaItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const uploaded = await uploadMedia(file);
        const url = uploaded?.filePath ?? uploaded?.fileUrl ?? "";
        if (!url) throw new Error("No media path returned");
        added.push({ type: detectKind(file), url });
      } catch (error) {
        console.error("Failed to upload", error);
        alert(language === "nl" ? "Uploaden mislukt." : "Upload failed.");
      }
    }
    if (added.length === 0) return;

    try {
      const newMedia = [...(targetStop.media ?? []), ...added];
      const updatedStop = await saveTourStop(stopId, { ...targetStop, media: newMedia });
      onUpdateStops(stops.map((s) => (s.id === updatedStop.id ? updatedStop : s)));
    } catch (error) {
      console.error("Failed to save stop", error);
      alert(language === "nl" ? "Opslaan mislukt." : "Save failed.");
    }
  };

  const saveUrl = async () => {
    if (urlFormId == null || !urlForm.url.trim()) return;
    const targetStop = stops.find((s) => s.id === urlFormId);
    if (!targetStop) return;
    const newMedia: MediaItem[] = [
      ...(targetStop.media ?? []),
      { type: urlForm.type, url: urlForm.url.trim() },
    ];
    try {
      const updatedStop = await saveTourStop(urlFormId, { ...targetStop, media: newMedia });
      onUpdateStops(stops.map((s) => (s.id === updatedStop.id ? updatedStop : s)));
      setUrlFormId(null);
      setUrlForm({ type: "image", url: "" });
    } catch (error) {
      console.error("Failed to save URL", error);
      alert(language === "nl" ? "Opslaan mislukt." : "Save failed.");
    }
  };

  const remove = async (stop: Stop, index: number) => {
    if (!confirm(language === "nl" ? "Media verwijderen?" : "Remove media?")) return;
    const newMedia = (stop.media ?? []).filter((_, i) => i !== index);
    try {
      const updatedStop = await saveTourStop(stop.id, { ...stop, media: newMedia });
      onUpdateStops(stops.map((s) => (s.id === updatedStop.id ? updatedStop : s)));
    } catch (error) {
      console.error("Failed to remove media", error);
      alert(language === "nl" ? "Verwijderen mislukt." : "Remove failed.");
    }
  };

  return (
    <div>
      <h2 className="text-2xl mb-2">
        {language === "nl" ? "Foto's & video's" : "Photos & videos"}
      </h2>
      <p className="text-gray-600 mb-4">
        {language === "nl"
          ? "Upload meerdere foto's of video's per stop. Sleep ze hierheen of klik op de knop."
          : "Upload multiple photos or videos per stop. Drag them here or click the button."}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {stops.map((stop) => {
          const isDragging = dragId === stop.id;
          const mediaItems = stop.media ?? [];

          return (
            <div key={stop.id} className="border-2 border-gray-200 rounded-xl p-4 bg-white">
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-lg truncate">{stop.title[language]}</p>
                  <p className="text-xs text-gray-500 truncate">{stop.location[language]}</p>
                </div>
                <div className="flex flex-col items-center flex-shrink-0">
                  {qrMap[stop.qrCode] ? (
                    <img src={qrMap[stop.qrCode]} alt={stop.qrCode} className="w-16 h-16 border border-gray-200 rounded" />
                  ) : (
                    <div className="w-16 h-16 flex items-center justify-center border-2 border-dashed border-gray-200 rounded text-gray-400">
                      <QrCode className="w-6 h-6" />
                    </div>
                  )}
                  <span className="text-[10px] text-gray-500 mt-1 font-mono">{stop.qrCode || "—"}</span>
                </div>
              </div>

              {/* Existing media thumbnails */}
              {mediaItems.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {mediaItems.map((m, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200 bg-black aspect-square">
                      {m.type === "image" && (
                        <img src={resolveMediaUrl(m.url)} alt="" className="w-full h-full object-cover" />
                      )}
                      {m.type === "video" && (
                        <video src={resolveMediaUrl(m.url)} className="w-full h-full object-cover" muted />
                      )}
                      {m.type === "audio" && (
                        <div className="w-full h-full flex items-center justify-center text-white bg-gray-700">
                          <Music className="w-6 h-6" />
                        </div>
                      )}
                      <button
                        onClick={() => remove(stop, idx)}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <div className="absolute bottom-1 left-1">
                        {m.type === "image" && <ImageIcon className="w-3 h-3 text-white drop-shadow" />}
                        {m.type === "video" && <Film className="w-3 h-3 text-white drop-shadow" />}
                        {m.type === "audio" && <Music className="w-3 h-3 text-white drop-shadow" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload drop zone */}
              <label
                onDragEnter={(e) => { e.preventDefault(); setDragId(stop.id); }}
                onDragOver={(e) => { e.preventDefault(); setDragId(stop.id); }}
                onDragLeave={() => setDragId((prev) => (prev === stop.id ? null : prev))}
                onDrop={async (e) => { e.preventDefault(); setDragId(null); await handleFiles(stop.id, e.dataTransfer.files); }}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer px-3 py-3 text-sm transition-colors ${
                  isDragging
                    ? "border-[#0066B3] bg-blue-50 text-[#0066B3]"
                    : "border-gray-300 bg-gray-50 text-gray-500 hover:border-[#0066B3] hover:text-[#0066B3]"
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>
                  {mediaItems.length === 0
                    ? language === "nl" ? "Foto of video uploaden" : "Upload photo or video"
                    : language === "nl" ? "Nog een toevoegen" : "Add another"}
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,video/*"
                  multiple
                  onChange={(e) => handleFiles(stop.id, e.target.files)}
                />
              </label>

              {/* Footer row */}
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-400">
                  {mediaItems.length > 0
                    ? `${mediaItems.length} item${mediaItems.length !== 1 ? "s" : ""}`
                    : language === "nl" ? "Geen media" : "No media"}
                </p>
                <button
                  onClick={() => { setUrlFormId(urlFormId === stop.id ? null : stop.id); setUrlForm({ type: "image", url: "" }); }}
                  className="p-2 text-[#0066B3] hover:bg-blue-50 rounded-lg"
                  title={language === "nl" ? "URL toevoegen" : "Add URL"}
                >
                  <LinkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* URL form */}
              {urlFormId === stop.id && (
                <div className="mt-2 pt-3 border-t border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-2">
                  <select
                    value={urlForm.type}
                    onChange={(e) => setUrlForm({ ...urlForm, type: e.target.value as MediaKind })}
                    className="px-3 py-2 rounded-lg border-2 border-gray-300"
                  >
                    <option value="image">{language === "nl" ? "Foto" : "Image"}</option>
                    <option value="video">Video</option>
                    <option value="audio">Audio</option>
                  </select>
                  <input
                    type="text"
                    value={urlForm.url}
                    onChange={(e) => setUrlForm({ ...urlForm, url: e.target.value })}
                    placeholder="https://…"
                    className="md:col-span-2 px-3 py-2 rounded-lg border-2 border-gray-300"
                  />
                  <button
                    onClick={saveUrl}
                    className="bg-[#0066B3] text-white px-3 py-2 rounded-lg hover:opacity-90"
                  >
                    {language === "nl" ? "Voeg toe" : "Add"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
