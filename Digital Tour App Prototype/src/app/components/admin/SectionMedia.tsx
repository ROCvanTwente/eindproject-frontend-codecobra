import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Film,
  Image as ImageIcon,
  Music,
  Trash2,
  Upload,
  Link as LinkIcon,
  QrCode,
} from "lucide-react";
import { Language, Stop } from "../../types";

interface Props {
  language: Language;
  stops: Stop[];
  onUpdateStops: (stops: Stop[]) => void;
}

type MediaKind = "image" | "video" | "audio";

function detectKind(file: File): MediaKind {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "image";
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function SectionMedia({
  language,
  stops,
  onUpdateStops,
}: Props) {
  const [qrMap, setQrMap] = useState<Record<string, string>>(
    {},
  );
  const [dragId, setDragId] = useState<number | null>(null);
  const [urlFormId, setUrlFormId] = useState<number | null>(
    null,
  );
  const [urlForm, setUrlForm] = useState({
    type: "image" as MediaKind,
    url: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: Record<string, string> = {};
      for (const s of stops) {
        if (!s.qrCode) continue;
        try {
          out[s.qrCode] = await QRCode.toDataURL(s.qrCode, {
            width: 140,
            margin: 1,
          });
        } catch {}
      }
      if (!cancelled) setQrMap(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [stops]);

  const updateMedia = (
    stopId: number,
    media: Stop["media"],
  ) => {
    onUpdateStops(
      stops.map((s) => (s.id === stopId ? { ...s, media } : s)),
    );
  };

  const handleFiles = async (
    stopId: number,
    files: FileList | null,
  ) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const kind = detectKind(file);
    const url = await readAsDataURL(file);
    updateMedia(stopId, { type: kind, url });
  };

  const saveUrl = () => {
    if (urlFormId == null || !urlForm.url.trim()) return;
    updateMedia(urlFormId, {
      type: urlForm.type,
      url: urlForm.url.trim(),
    });
    setUrlFormId(null);
    setUrlForm({ type: "image", url: "" });
  };

  const remove = (stop: Stop) => {
    if (!stop.media) return;
    if (
      confirm(
        language === "nl"
          ? "Media verwijderen?"
          : "Remove media?",
      )
    ) {
      updateMedia(stop.id, undefined);
    }
  };

  return (
    <div>
      <h2 className="text-2xl mb-2">
        {language === "nl"
          ? "Foto's & video's"
          : "Photos & videos"}
      </h2>
      <p className="text-gray-600 mb-4">
        {language === "nl"
          ? "Sleep foto's, video's of audio direct naar een stop, of plak een URL. Rechts zie je de gekoppelde QR-code."
          : "Drag photos, videos or audio directly onto a stop, or paste a URL. On the right you see the linked QR code."}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {stops.map((stop) => {
          const isDragging = dragId === stop.id;
          const hasMedia = !!stop.media;
          const m = stop.media;
          return (
            <div
              key={stop.id}
              className="border-2 border-gray-200 rounded-xl p-4 bg-white"
            >
              {/* Header row: title + QR code */}
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-lg truncate">
                    {stop.title[language]}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {stop.location[language]}
                  </p>
                </div>
                <div className="flex flex-col items-center flex-shrink-0">
                  {qrMap[stop.qrCode] ? (
                    <img
                      src={qrMap[stop.qrCode]}
                      alt={stop.qrCode}
                      className="w-16 h-16 border border-gray-200 rounded"
                    />
                  ) : (
                    <div className="w-16 h-16 flex items-center justify-center border-2 border-dashed border-gray-200 rounded text-gray-400">
                      <QrCode className="w-6 h-6" />
                    </div>
                  )}
                  <span className="text-[10px] text-gray-500 mt-1 font-mono">
                    {stop.qrCode || "—"}
                  </span>
                </div>
              </div>

              {/* Drop zone / preview */}
              <label
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragId(stop.id);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragId(stop.id);
                }}
                onDragLeave={() =>
                  setDragId((prev) =>
                    prev === stop.id ? null : prev,
                  )
                }
                onDrop={async (e) => {
                  e.preventDefault();
                  setDragId(null);
                  await handleFiles(
                    stop.id,
                    e.dataTransfer.files,
                  );
                }}
                className={`relative block rounded-xl border-2 border-dashed cursor-pointer overflow-hidden transition-colors ${
                  isDragging
                    ? "border-[#0066B3] bg-blue-50"
                    : hasMedia
                      ? "border-gray-200 bg-gray-50"
                      : "border-gray-300 bg-gray-50 hover:border-[#0066B3]"
                }`}
              >
                {hasMedia ? (
                  <div className="aspect-video bg-black flex items-center justify-center">
                    {m!.type === "image" && (
                      <img
                        src={m!.url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                    {m!.type === "video" && (
                      <video
                        src={m!.url}
                        className="w-full h-full object-cover"
                        muted
                      />
                    )}
                    {m!.type === "audio" && (
                      <div className="flex flex-col items-center text-white gap-2">
                        <Music className="w-10 h-10" />
                        <audio
                          src={m!.url}
                          controls
                          className="max-w-full"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-video flex flex-col items-center justify-center text-gray-500 gap-2 px-4 text-center">
                    <Upload className="w-8 h-8" />
                    <p className="text-sm">
                      {language === "nl"
                        ? "Sleep hierheen of klik om te uploaden"
                        : "Drop here or click to upload"}
                    </p>
                    <p className="text-xs text-gray-400">
                      JPG · PNG · MP4 · MP3
                    </p>
                  </div>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,video/*,audio/*"
                  onChange={(e) =>
                    handleFiles(stop.id, e.target.files)
                  }
                />
              </label>

              {/* Meta row */}
              <div className="flex items-center justify-between mt-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  {hasMedia ? (
                    <>
                      {m!.type === "image" && (
                        <ImageIcon className="w-4 h-4" />
                      )}
                      {m!.type === "video" && (
                        <Film className="w-4 h-4" />
                      )}
                      {m!.type === "audio" && (
                        <Music className="w-4 h-4" />
                      )}
                      <span>{m!.type}</span>
                    </>
                  ) : (
                    <span className="text-gray-400">
                      {language === "nl"
                        ? "Geen media"
                        : "No media"}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setUrlFormId(
                        urlFormId === stop.id ? null : stop.id,
                      );
                      setUrlForm({
                        type: (m?.type as MediaKind) ?? "image",
                        url: m?.url ?? "",
                      });
                    }}
                    className="p-2 text-[#0066B3] hover:bg-blue-50 rounded-lg"
                    aria-label="URL"
                  >
                    <LinkIcon className="w-5 h-5" />
                  </button>
                  {hasMedia && (
                    <button
                      onClick={() => remove(stop)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* URL form */}
              {urlFormId === stop.id && (
                <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-2">
                  <select
                    value={urlForm.type}
                    onChange={(e) =>
                      setUrlForm({
                        ...urlForm,
                        type: e.target.value as MediaKind,
                      })
                    }
                    className="px-3 py-2 rounded-lg border-2 border-gray-300"
                  >
                    <option value="image">
                      {language === "nl" ? "Foto" : "Image"}
                    </option>
                    <option value="video">
                      {language === "nl" ? "Video" : "Video"}
                    </option>
                    <option value="audio">
                      {language === "nl" ? "Audio" : "Audio"}
                    </option>
                  </select>
                  <input
                    type="text"
                    value={urlForm.url}
                    onChange={(e) =>
                      setUrlForm({
                        ...urlForm,
                        url: e.target.value,
                      })
                    }
                    placeholder="https://…"
                    className="md:col-span-2 px-3 py-2 rounded-lg border-2 border-gray-300"
                  />
                  <button
                    onClick={saveUrl}
                    className="bg-[#0066B3] text-white px-3 py-2 rounded-lg hover:opacity-90"
                  >
                    {language === "nl"
                      ? "Koppel URL"
                      : "Link URL"}
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