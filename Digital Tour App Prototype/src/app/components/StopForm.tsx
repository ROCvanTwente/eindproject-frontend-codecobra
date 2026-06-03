import { useRef, useState } from "react";
import { Stop, Language } from "../types";
import plattegrondImg from "../../imports/PlattegrondGieterijBeganegrondV2.0.png";
import {
  normalizeMediaUrlForStorage,
  resolveMediaUrl,
  uploadMedia,
} from "../../services/api";

const MAP_W = 1528;
const MAP_H = 704;

type MediaKind = "image" | "video";

function detectKindFromUrl(url: string): MediaKind {
  const lower = url.toLowerCase();
  if (/\.(mp4|webm|mov|m4v)(\?|$)/.test(lower)) return "video";
  return "image";
}

interface StopFormProps {
  stop: Stop;
  language: Language;
  onSave: (stop: Stop) => void;
  onCancel: () => void;
  isCreating: boolean;
}

function normalizeQrCode(stop: Stop) {
  const current = (stop as any).qrCode;
  if (current?.code) {
    return current;
  }

  const qrCodeId = (stop as any).qrCodeId;
  const fallbackCode =
    qrCodeId !== undefined && qrCodeId !== null
      ? String(qrCodeId)
      : "";

  return {
    id: Number(qrCodeId ?? 0),
    code: fallbackCode,
    name: fallbackCode,
    createdAt: new Date().toISOString(),
    statistics: [],
  };
}

export function StopForm({
  stop,
  language,
  onSave,
  onCancel,
  isCreating,
}: StopFormProps) {
  const normalizedStop: Stop = {
    ...stop,
    qrCode: normalizeQrCode(stop),
    locationNl: stop.locationNl ?? "",
    locationEn: stop.locationEn ?? "",
    titleNl: stop.titleNl ?? "",
    titleEn: stop.titleEn ?? "",
    descriptionNl: stop.descriptionNl ?? "",
    descriptionEn: stop.descriptionEn ?? "",
    estimatedDuration: stop.estimatedDuration ?? 1,
    mediaUrl: normalizeMediaUrlForStorage(stop.mediaUrl) ?? null,
  };

  const [formData, setFormData] = useState<Stop>(normalizedStop);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * MAP_W);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * MAP_H);
    setFormData({ ...formData, positionX: x, positionY: y });
  };

  const clearMapPosition = () => {
    setFormData({ ...formData, positionX: undefined, positionY: undefined });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Auto-fallback: if English is empty, copy the Dutch value so the user
    // isn't forced to fill both sides.
    const fillText = (nl: string, en: string) =>
      en.trim() ? en : nl;

    onSave({
      ...formData,
      locationEn: fillText(formData.locationNl, formData.locationEn),
      titleEn: fillText(formData.titleNl, formData.titleEn),
      descriptionEn: fillText(formData.descriptionNl, formData.descriptionEn),
    });
  };

  const updateField = (field: keyof Stop, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const updateMedia = (url: string) => {
    setFormData((prev) => ({
      ...prev,
      mediaUrl: normalizeMediaUrlForStorage(url),
    }));
  };

  const removeMedia = () => {
    setFormData((prev) => ({ ...prev, mediaUrl: null }));
  };

  const handleMediaFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      alert(
        language === "nl"
          ? "Alleen foto's en video's zijn toegestaan."
          : "Only photos and videos are allowed.",
      );
      return;
    }

    try {
      setIsUploadingMedia(true);
      const uploaded = await uploadMedia(file, formData.qrCode?.id);
      if (!uploaded?.filePath) {
        throw new Error("Missing filePath in upload response");
      }
      updateMedia(uploaded.filePath);
    } catch (error) {
      console.error("Media upload failed:", error);
      alert(
        language === "nl"
          ? "Uploaden van media is mislukt."
          : "Uploading media failed.",
      );
    } finally {
      setIsUploadingMedia(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-[#0066B3] text-white p-6 sticky top-0 z-10 shadow-lg">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl">
            {isCreating
              ? language === "nl"
                ? "Nieuwe Stop"
                : "New Stop"
              : language === "nl"
                ? "Stop Bewerken"
                : "Edit Stop"}
          </h1>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="max-w-5xl mx-auto p-6"
      >
        <div className="space-y-8">
          {/* QR Code */}
          <div>
            <label className="block text-xl mb-3">
              {language === "nl" ? "QR Code" : "QR Code"}
            </label>
            <input
              type="text"
              value={formData.qrCode?.code || ""}
              onChange={(e) =>
                updateField("qrCode", { ...formData.qrCode, code: e.target.value })
              }
              className="w-full border-2 border-gray-300 rounded-lg p-4 text-lg focus:border-[#0066B3] focus:outline-none"
              placeholder="GIETERIJ-001"
              required
            />
          </div>

          {/* Location NL/EN */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xl mb-3">
                {language === "nl"
                  ? "Locatie (Nederlands)"
                  : "Location (Dutch)"}
              </label>
              <input
                type="text"
                value={formData.locationNl ?? ""}
                onChange={(e) =>
                  updateField("locationNl", e.target.value)
                }
                className="w-full border-2 border-gray-300 rounded-lg p-4 text-lg focus:border-[#0066B3] focus:outline-none"
                placeholder="Hoofdingang - Hal"
                required
              />
            </div>
            <div>
              <label className="block text-xl mb-3">
                {language === "nl"
                  ? "Locatie (Engels) — optioneel"
                  : "Location (English) — optional"}
              </label>
              <input
                type="text"
                value={formData.locationEn ?? ""}
                onChange={(e) =>
                  updateField("locationEn", e.target.value)
                }
                className="w-full border-2 border-gray-300 rounded-lg p-4 text-lg focus:border-[#0066B3] focus:outline-none"
                placeholder={
                  language === "nl"
                    ? "Leeg laten = Nederlandse tekst gebruiken"
                    : "Leave empty to reuse Dutch text"
                }
              />
            </div>
          </div>

          {/* Title NL/EN */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xl mb-3">
                {language === "nl"
                  ? "Titel (Nederlands)"
                  : "Title (Dutch)"}
              </label>
              <input
                type="text"
                value={formData.titleNl ?? ""}
                onChange={(e) =>
                  updateField("titleNl", e.target.value)
                }
                className="w-full border-2 border-gray-300 rounded-lg p-4 text-lg focus:border-[#0066B3] focus:outline-none"
                placeholder="Welkom bij de Gieterij"
                required
              />
            </div>
            <div>
              <label className="block text-xl mb-3">
                {language === "nl"
                  ? "Titel (Engels) — optioneel"
                  : "Title (English) — optional"}
              </label>
              <input
                type="text"
                value={formData.titleEn ?? ""}
                onChange={(e) =>
                  updateField("titleEn", e.target.value)
                }
                className="w-full border-2 border-gray-300 rounded-lg p-4 text-lg focus:border-[#0066B3] focus:outline-none"
                placeholder={
                  language === "nl"
                    ? "Leeg laten = Nederlandse tekst gebruiken"
                    : "Leave empty to reuse Dutch text"
                }
              />
            </div>
          </div>

          {/* Description NL/EN */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xl mb-3">
                {language === "nl"
                  ? "Beschrijving (Nederlands)"
                  : "Description (Dutch)"}
              </label>
              <textarea
                value={formData.descriptionNl ?? ""}
                onChange={(e) =>
                  updateField("descriptionNl", e.target.value)
                }
                className="w-full border-2 border-gray-300 rounded-lg p-4 text-lg focus:border-[#0066B3] focus:outline-none min-h-[150px]"
                placeholder="Beschrijving..."
                required
              />
            </div>
            <div>
              <label className="block text-xl mb-3">
                {language === "nl"
                  ? "Beschrijving (Engels) — optioneel"
                  : "Description (English) — optional"}
              </label>
              <textarea
                value={formData.descriptionEn ?? ""}
                onChange={(e) =>
                  updateField("descriptionEn", e.target.value)
                }
                className="w-full border-2 border-gray-300 rounded-lg p-4 text-lg focus:border-[#0066B3] focus:outline-none min-h-[150px]"
                placeholder={
                  language === "nl"
                    ? "Leeg laten = Nederlandse tekst gebruiken"
                    : "Leave empty to reuse Dutch text"
                }
              />
            </div>
          </div>

          {/* Positie op plattegrond */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xl">
                {language === "nl"
                  ? "Positie op plattegrond"
                  : "Position on floor plan"}
              </label>
              {typeof formData.positionX === "number" && (
                <button
                  type="button"
                  onClick={clearMapPosition}
                  className="text-red-600 hover:text-red-700 text-base"
                >
                  {language === "nl"
                    ? "Positie wissen"
                    : "Clear position"}
                </button>
              )}
            </div>
            <p className="text-base text-gray-600 mb-3">
              {language === "nl"
                ? "Klik op de plattegrond om de positie van deze stop te plaatsen."
                : "Click the floor plan to set this stop’s position."}
            </p>
            <div className="border-2 border-gray-300 rounded-xl overflow-hidden">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${MAP_W} ${MAP_H}`}
                onClick={handleMapClick}
                className="w-full cursor-crosshair"
                style={{ display: "block" }}
              >
                <image
                  href={plattegrondImg}
                  xlinkHref={plattegrondImg}
                  x={0}
                  y={0}
                  width={MAP_W}
                  height={MAP_H}
                  preserveAspectRatio="xMidYMid meet"
                />
                {typeof formData.positionX === "number" &&
                  typeof formData.positionY === "number" && (
                    <g style={{ pointerEvents: "none" }}>
                      <circle
                        cx={formData.positionX}
                        cy={formData.positionY}
                        r="46"
                        fill="#E30613"
                        fillOpacity="0.3"
                      />
                      <circle
                        cx={formData.positionX}
                        cy={formData.positionY}
                        r="24"
                        fill="#E30613"
                        stroke="white"
                        strokeWidth="5"
                      />
                    </g>
                  )}
              </svg>
            </div>
            {typeof formData.positionX === "number" ? (
              <p className="text-sm text-gray-500 mt-2">
                x: {formData.positionX}, y: {formData.positionY}
              </p>
            ) : (
              <p className="text-sm text-gray-500 mt-2">
                {language === "nl"
                  ? "Nog geen positie gekozen."
                  : "No position set yet."}
              </p>
            )}
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xl mb-3">
              {language === "nl"
                ? "Geschatte duur (minuten)"
                : "Estimated duration (minutes)"}
            </label>
            <input
              type="number"
              value={formData.estimatedDuration || ""}
              onChange={(e) =>
                updateField(
                  "estimatedDuration",
                  e.target.value ? parseInt(e.target.value) : undefined,
                )
              }
              className="w-full border-2 border-gray-300 rounded-lg p-4 text-lg focus:border-[#0066B3] focus:outline-none"
              min="1"
              required
            />
          </div>

          {/* Media Section */}
          <div className="border-2 border-gray-300 rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl">
                {language === "nl" ? "Media" : "Media"}
              </h3>
              {formData.mediaUrl && (
                <button
                  type="button"
                  onClick={removeMedia}
                  className="text-red-600 hover:text-red-700 text-lg"
                >
                  {language === "nl"
                    ? "Verwijder media"
                    : "Remove media"}
                </button>
              )}
            </div>

            {formData.mediaUrl ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-gray-200 overflow-hidden bg-black">
                  {detectKindFromUrl(formData.mediaUrl) === "video" ? (
                    <video
                      src={resolveMediaUrl(formData.mediaUrl)}
                      controls
                      className="w-full max-h-[320px]"
                    />
                  ) : (
                    <img
                      src={resolveMediaUrl(formData.mediaUrl)}
                      alt="Stop media"
                      className="w-full max-h-[320px] object-contain bg-black"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-lg mb-2">
                    {language === "nl" ? "Upload bestand" : "Upload file"}
                  </label>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => handleMediaFileUpload(e.target.files)}
                    className="w-full border-2 border-gray-300 rounded-lg p-3 text-base focus:border-[#0066B3] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-lg mb-2">
                    URL
                  </label>
                  <input
                    type="text"
                    value={formData.mediaUrl ?? ""}
                    onChange={(e) => updateMedia(e.target.value)}
                    className="w-full border-2 border-gray-300 rounded-lg p-4 text-lg focus:border-[#0066B3] focus:outline-none"
                    placeholder="/uploads/... of https://..."
                    required
                  />
                </div>

                {isUploadingMedia && (
                  <p className="text-sm text-[#0066B3]">
                    {language === "nl" ? "Uploaden..." : "Uploading..."}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => updateMedia("")}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-lg text-gray-500 hover:border-[#0066B3] hover:text-[#0066B3] transition-colors"
                >
                  +{" "}
                  {language === "nl"
                    ? "Media toevoegen"
                    : "Add media"}
                </button>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => handleMediaFileUpload(e.target.files)}
                  className="w-full border-2 border-gray-300 rounded-lg p-3 text-base focus:border-[#0066B3] focus:outline-none"
                />
                {isUploadingMedia && (
                  <p className="text-sm text-[#0066B3]">
                    {language === "nl" ? "Uploaden..." : "Uploading..."}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-200 text-gray-800 py-5 px-8 rounded-xl text-xl hover:bg-gray-300 transition-colors"
            >
              {language === "nl" ? "Annuleren" : "Cancel"}
            </button>
            <button
              type="submit"
              className="flex-1 bg-[#E30613] text-white py-5 px-8 rounded-xl text-xl hover:opacity-90 transition-opacity shadow-lg"
            >
              {language === "nl" ? "Opslaan" : "Save"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}