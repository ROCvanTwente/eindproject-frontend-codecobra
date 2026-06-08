import { useRef, useState } from "react";
import { Stop, Language } from "../types";
import plattegrondImg from "../../imports/PlattegrondGieterijBeganegrondV2.0.png";
import { ArrowLeft, Film, Image as ImageIcon, Upload } from "lucide-react";
import { resolveMediaUrl, uploadMedia } from "../../services/api";

const MAP_W = 1528;
const MAP_H = 704;

interface StopFormProps {
  stop: Stop;
  language: Language;
  onSave: (stop: Stop) => void;
  onCancel: () => void;
  isCreating: boolean;
}

export function StopForm({
  stop,
  language,
  onSave,
  onCancel,
  isCreating,
}: StopFormProps) {
  const hugeInputClass =
    "w-full border-2 border-gray-300 rounded-lg p-6 text-2xl leading-tight focus:border-[#0066B3] focus:outline-none";
  const hugeTextAreaClass = `${hugeInputClass} min-h-[320px] leading-relaxed`;

  const [formData, setFormData] = useState<Stop>(stop);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [isMediaDragging, setIsMediaDragging] = useState(false);

  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * MAP_W);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * MAP_H);
    setFormData({ ...formData, mapX: x, mapY: y });
  };

  const clearMapPosition = () => {
    setFormData({ ...formData, mapX: undefined, mapY: undefined });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Auto-fallback: if English is empty, copy the Dutch value so the user
    // isn't forced to fill both sides.
    const fill = (pair: { nl: string; en: string }) => ({
      nl: pair.nl,
      en: pair.en.trim() ? pair.en : pair.nl,
    });
    onSave({
      ...formData,
      location: fill(formData.location),
      title: fill(formData.title),
      description: fill(formData.description),
    });
  };

  const updateField = (field: keyof Stop, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const updateTranslation = (
    field: "location" | "title" | "description",
    lang: Language,
    value: string,
  ) => {
    setFormData({
      ...formData,
      [field]: { ...formData[field], [lang]: value },
    });
  };

  const updateMedia = (
    field: keyof NonNullable<Stop["media"]>,
    value: any,
  ) => {
    setFormData({
      ...formData,
      media: formData.media
        ? { ...formData.media, [field]: value }
        : { type: "image", url: "", [field]: value },
    });
  };

  const setUploadedMedia = async (file: File) => {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      alert(
        language === "nl"
          ? "Kies een foto of video."
          : "Choose a photo or video.",
      );
      return;
    }

    try {
      const uploaded = await uploadMedia(file);
      const mediaUrl = uploaded?.filePath ?? uploaded?.fileUrl ?? "";
      if (!mediaUrl) {
        throw new Error("No media path returned by API");
      }
      setFormData({
        ...formData,
        media: {
          type: file.type.startsWith("video/") ? "video" : "image",
          url: resolveMediaUrl(mediaUrl),
        },
      });
    } catch (error) {
      console.error("Failed to upload media in stop form", error);
      alert(
        language === "nl"
          ? "Uploaden van media is mislukt."
          : "Uploading media failed.",
      );
    }
  };

  const handleMediaDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsMediaDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      await setUploadedMedia(file);
    }
  };

  const removeMedia = () => {
    setFormData({ ...formData, media: undefined });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-[#0066B3] text-white p-6 sticky top-0 z-10 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-3 py-2 text-sm hover:bg-white/30"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{language === "nl" ? "Terug" : "Back"}</span>
          </button>

          <h1 className="text-2xl text-right">
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
            <label className="block text-2xl mb-4">
              {language === "nl" ? "QR Code" : "QR Code"}
            </label>
            <input
              type="text"
              value={formData.qrCode}
              onChange={(e) =>
                updateField("qrCode", e.target.value)
              }
              className={hugeInputClass}
              placeholder="GIETERIJ-001"
              required
            />
          </div>

          {/* Location NL/EN */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-2xl mb-4">
                {language === "nl"
                  ? "Locatie (Nederlands)"
                  : "Location (Dutch)"}
              </label>
              <input
                type="text"
                value={formData.location.nl}
                onChange={(e) =>
                  updateTranslation(
                    "location",
                    "nl",
                    e.target.value,
                  )
                }
                className={hugeInputClass}
                placeholder="Hoofdingang - Hal"
                required
              />
            </div>
            <div>
              <label className="block text-2xl mb-4">
                {language === "nl"
                  ? "Locatie (Engels) — optioneel"
                  : "Location (English) — optional"}
              </label>
              <input
                type="text"
                value={formData.location.en}
                onChange={(e) =>
                  updateTranslation(
                    "location",
                    "en",
                    e.target.value,
                  )
                }
                className={hugeInputClass}
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
              <label className="block text-2xl mb-4">
                {language === "nl"
                  ? "Titel (Nederlands)"
                  : "Title (Dutch)"}
              </label>
              <input
                type="text"
                value={formData.title.nl}
                onChange={(e) =>
                  updateTranslation(
                    "title",
                    "nl",
                    e.target.value,
                  )
                }
                className={hugeInputClass}
                placeholder="Welkom bij de Gieterij"
                required
              />
            </div>
            <div>
              <label className="block text-2xl mb-4">
                {language === "nl"
                  ? "Titel (Engels) — optioneel"
                  : "Title (English) — optional"}
              </label>
              <input
                type="text"
                value={formData.title.en}
                onChange={(e) =>
                  updateTranslation(
                    "title",
                    "en",
                    e.target.value,
                  )
                }
                className={hugeInputClass}
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
              <label className="block text-2xl mb-4">
                {language === "nl"
                  ? "Beschrijving (Nederlands)"
                  : "Description (Dutch)"}
              </label>
              <textarea
                value={formData.description.nl}
                onChange={(e) =>
                  updateTranslation(
                    "description",
                    "nl",
                    e.target.value,
                  )
                }
                className={hugeTextAreaClass}
                placeholder="Beschrijving..."
                required
              />
            </div>
            <div>
              <label className="block text-2xl mb-4">
                {language === "nl"
                  ? "Beschrijving (Engels) — optioneel"
                  : "Description (English) — optional"}
              </label>
              <textarea
                value={formData.description.en}
                onChange={(e) =>
                  updateTranslation(
                    "description",
                    "en",
                    e.target.value,
                  )
                }
                className={hugeTextAreaClass}
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
              {typeof formData.mapX === "number" && (
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
                {typeof formData.mapX === "number" &&
                  typeof formData.mapY === "number" && (
                    <g style={{ pointerEvents: "none" }}>
                      <circle
                        cx={formData.mapX}
                        cy={formData.mapY}
                        r="46"
                        fill="#E30613"
                        fillOpacity="0.3"
                      />
                      <circle
                        cx={formData.mapX}
                        cy={formData.mapY}
                        r="24"
                        fill="#E30613"
                        stroke="white"
                        strokeWidth="5"
                      />
                    </g>
                  )}
              </svg>
            </div>
            {typeof formData.mapX === "number" ? (
              <p className="text-sm text-gray-500 mt-2">
                x: {formData.mapX}, y: {formData.mapY}
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
            <label className="block text-2xl mb-4">
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
              className={hugeInputClass}
              min="1"
              required
            />
          </div>

          {/* Media Section */}
          <div
            className={`border-2 rounded-xl p-6 transition-colors ${
              isMediaDragging
                ? "border-[#0066B3] bg-blue-50"
                : "border-gray-300"
            }`}
            onDragEnter={(e) => {
              e.preventDefault();
              setIsMediaDragging(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsMediaDragging(true);
            }}
            onDragLeave={() => setIsMediaDragging(false)}
            onDrop={handleMediaDrop}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl">
                {language === "nl" ? "Foto's & video's" : "Photos & videos"}
              </h3>
              {formData.media && (
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

            {formData.media ? (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white/70">
                  <input
                    id="stop-media-upload"
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        await setUploadedMedia(file);
                      }
                      e.target.value = "";
                    }}
                  />
                  <label
                    htmlFor="stop-media-upload"
                    className="flex cursor-pointer items-center justify-center gap-3 text-gray-600 hover:text-[#0066B3]"
                  >
                    <Upload className="w-5 h-5" />
                    <span>
                      {language === "nl"
                        ? "Sleep een foto of video hierheen, of klik om een bestand te kiezen"
                        : "Drop a photo or video here, or click to choose a file"}
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-2xl mb-3">
                    {language === "nl" ? "Type" : "Type"}
                  </label>
                  <select
                    value={formData.media.type}
                    onChange={(e) =>
                      updateMedia(
                        "type",
                        e.target.value as
                          | "image"
                          | "video"
                          | "audio",
                      )
                    }
                      className={hugeInputClass}
                  >
                    <option value="image">
                      {language === "nl"
                        ? "Afbeelding"
                        : "Image"}
                    </option>
                    <option value="video">Video</option>
                  </select>
                </div>

                <div>
                  <label className="block text-2xl mb-3">
                    URL
                  </label>
                  <input
                    type="text"
                    value={formData.media.url}
                    onChange={(e) =>
                      updateMedia("url", e.target.value)
                    }
                    className={hugeInputClass}
                    placeholder="https://... of /uploads/..."
                    required
                  />
                </div>

                <div className="rounded-lg overflow-hidden border border-gray-200 bg-black/5">
                  {formData.media.type === "image" ? (
                    <img
                      src={resolveMediaUrl(formData.media.url)}
                      alt=""
                      className="w-full max-h-72 object-cover"
                    />
                  ) : (
                    <video
                      src={resolveMediaUrl(formData.media.url)}
                      className="w-full max-h-72 object-cover"
                      controls
                    />
                  )}
                </div>

                {formData.media.type === "video" && (
                  <>
                    <div>
                      <label className="block text-2xl mb-3">
                        {language === "nl"
                          ? "Duur (seconden)"
                          : "Duration (seconds)"}
                      </label>
                      <input
                        type="number"
                        value={formData.media.duration || ""}
                        onChange={(e) =>
                          updateMedia(
                            "duration",
                            e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          )
                        }
                        className={hugeInputClass}
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-2xl mb-3">
                        Thumbnail URL
                      </label>
                      <input
                        type="url"
                        value={formData.media.thumbnail || ""}
                        onChange={(e) =>
                          updateMedia(
                            "thumbnail",
                            e.target.value,
                          )
                        }
                        className={hugeInputClass}
                        placeholder="https://..."
                      />
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <input
                  id="stop-media-upload-empty"
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      await setUploadedMedia(file);
                    }
                    e.target.value = "";
                  }}
                />
                <label
                  htmlFor="stop-media-upload-empty"
                  className="flex min-h-48 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 text-center text-gray-500 hover:border-[#0066B3] hover:text-[#0066B3] transition-colors"
                >
                  <Upload className="w-8 h-8 mb-3" />
                  <span className="text-lg">
                    {language === "nl"
                      ? "Sleep een foto of video hierheen, of klik om te uploaden"
                      : "Drop a photo or video here, or click to upload"}
                  </span>
                  <span className="text-sm mt-2 text-gray-400">
                    JPG · PNG · MP4 · WebM
                  </span>
                </label>
              </>
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