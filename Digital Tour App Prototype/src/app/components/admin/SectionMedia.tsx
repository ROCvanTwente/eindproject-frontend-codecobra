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
import {
  resolveMediaUrl,
  updateStopMedia,
  uploadMedia,
} from "../../../services/api";

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

function detectKindFromUrl(url: string): MediaKind {
  const lower = url.toLowerCase();
  if (lower.startsWith("data:video/")) return "video";
  if (lower.startsWith("data:audio/")) return "audio";
  if (lower.startsWith("data:image/")) return "image";
  if (/(\.mp4|\.webm|\.mov)(\?|$)/.test(lower)) return "video";
  if (/(\.mp3|\.wav|\.ogg)(\?|$)/.test(lower)) return "audio";
  return "image";
}

export function SectionMedia({
  language,
  stops,
  onUpdateStops,
}: Props) {
  const [qrMap, setQrMap] = useState<Record<string, string>>(
    {},
  );
  const [dragId, setDragId] = useState<Stop["id"] | null>(null);
  const [urlFormId, setUrlFormId] = useState<Stop["id"] | null>(
    null,
  );
  const [uploadingByStopId, setUploadingByStopId] = useState<
    Record<string, boolean>
  >({});
  const [urlForm, setUrlForm] = useState({
    url: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: Record<string, string> = {};
      for (const s of stops) {
        if (!s.qrCode?.code) continue;
        try {
          out[s.qrCode.code] = await QRCode.toDataURL(s.qrCode.code, {
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

  const updateMediaUrl = async (
    stopId: Stop["id"],
    mediaUrl?: string,
  ) => {
    const stopKey = String(stopId);
    try {
      setUploadingByStopId((prev) => ({
        ...prev,
        [stopKey]: true,
      }));

      await updateStopMedia(stopId, mediaUrl ?? null);

      onUpdateStops(
        stops.map((s) =>
          s.id === stopId
            ? { ...s, mediaUrl: mediaUrl ?? null }
            : s,
        ),
      );
    } finally {
      setUploadingByStopId((prev) => ({
        ...prev,
        [stopKey]: false,
      }));
    }
  };

  const handleFiles = async (
    stopId: Stop["id"],
    files: FileList | null,
  ) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const mediaKind = detectKind(file);

    if (mediaKind !== "image") {
      alert(
        language === "nl"
          ? "Alleen afbeeldingen kunnen direct naar de backend geupload worden. Gebruik een URL voor video of audio."
          : "Only images can be uploaded directly to the backend. Use a URL for video or audio.",
      );
      return;
    }

    const stop = stops.find((s) => s.id === stopId);
    const stopKey = String(stopId);

    try {
      setUploadingByStopId((prev) => ({
        ...prev,
        [stopKey]: true,
      }));

      const uploaded = await uploadMedia(file, stop?.qrCode?.id);
      const dbMediaUrl = uploaded?.filePath;

      if (!dbMediaUrl) {
        throw new Error(
          language === "nl"
            ? "Upload gelukt, maar geen bruikbare bestands-URL ontvangen."
            : "Upload succeeded, but no usable file URL was returned.",
        );
      }

      await updateMediaUrl(stopId, dbMediaUrl);
    } catch (error) {
      console.error("Media upload failed:", error);
      alert(
        language === "nl"
          ? "Uploaden van media naar de backend is mislukt."
          : "Uploading media to the backend failed.",
      );
    } finally {
      setUploadingByStopId((prev) => ({
        ...prev,
        [stopKey]: false,
      }));
    }
  };

  const saveUrl = async () => {
    if (urlFormId == null || !urlForm.url.trim()) return;
    try {
      await updateMediaUrl(urlFormId, urlForm.url.trim());
      setUrlFormId(null);
      setUrlForm({ url: "" });
    } catch (error) {
      console.error("Saving media URL failed:", error);
      alert(
        language === "nl"
          ? "Opslaan van media-URL is mislukt."
          : "Saving media URL failed.",
      );
    }
  };

  const remove = (stop: Stop) => {
    if (!stop.mediaUrl) return;
    if (
      confirm(
        language === "nl"
          ? "Media verwijderen?"
          : "Remove media?",
      )
    ) {
      void updateMediaUrl(stop.id, undefined).catch((error) => {
        console.error("Removing media failed:", error);
        alert(
          language === "nl"
            ? "Verwijderen van media is mislukt."
            : "Removing media failed.",
        );
      });
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
          const isUploading = !!uploadingByStopId[String(stop.id)];
          const isDragging = dragId === stop.id;
          const hasMedia = !!stop.mediaUrl;
          const mediaUrlRaw = stop.mediaUrl ?? "";
          const mediaUrl = resolveMediaUrl(mediaUrlRaw);
          const mediaKind = hasMedia
            ? detectKindFromUrl(mediaUrlRaw)
            : "image";
          return (
            <div
              key={stop.id}
              className="border-2 border-gray-200 rounded-xl p-4 bg-white"
            >
              {/* Header row: title + QR code */}
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-lg truncate">
                    {language === "nl" ? stop.titleNl : stop.titleEn}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {language === "nl" ? stop.locationNl : stop.locationEn}
                  </p>
                </div>
                <div className="flex flex-col items-center flex-shrink-0">
                  {qrMap[stop.qrCode.code] ? (
                    <img
                      src={qrMap[stop.qrCode.code]}
                      alt={stop.qrCode.code}
                      className="w-16 h-16 border border-gray-200 rounded"
                    />
                  ) : (
                    <div className="w-16 h-16 flex items-center justify-center border-2 border-dashed border-gray-200 rounded text-gray-400">
                      <QrCode className="w-6 h-6" />
                    </div>
                  )}
                  <span className="text-[10px] text-gray-500 mt-1 font-mono">
                    {stop.qrCode.code || "—"}
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
                {isUploading && (
                  <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-[1px] flex items-center justify-center text-sm text-[#0066B3]">
                    {language === "nl" ? "Uploaden..." : "Uploading..."}
                  </div>
                )}
                {hasMedia ? (
                  <div className="aspect-video bg-black flex items-center justify-center">
                    {mediaKind === "image" && (
                      <img
                        src={mediaUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                    {mediaKind === "video" && (
                      <video
                        src={mediaUrl}
                        className="w-full h-full object-cover"
                        muted
                      />
                    )}
                    {mediaKind === "audio" && (
                      <div className="flex flex-col items-center text-white gap-2">
                        <Music className="w-10 h-10" />
                        <audio
                          src={mediaUrl}
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
                      {mediaKind === "image" && (
                        <ImageIcon className="w-4 h-4" />
                      )}
                      {mediaKind === "video" && (
                        <Film className="w-4 h-4" />
                      )}
                      {mediaKind === "audio" && (
                        <Music className="w-4 h-4" />
                      )}
                      <span>{mediaKind}</span>
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
                        url: stop.mediaUrl ?? "",
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
                    className="md:col-span-3 px-3 py-2 rounded-lg border-2 border-gray-300"
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