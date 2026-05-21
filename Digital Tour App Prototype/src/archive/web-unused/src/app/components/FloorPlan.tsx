import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Navigation,
  X,
  MapPin,
  Plus,
  Minus,
  Maximize2,
  Locate,
  Box,
  Compass,
} from "lucide-react";
import { Language, Stop } from "../types";
import plattegrondImg from "../../imports/PlattegrondGieterijBeganegrondV2.0.png";

// Module-level cache: once the plattegrond has loaded in this session,
// re-opening the map shows it instantly without a spinner flash.
let plattegrondLoadedOnce = false;
import {
  bfsPath,
  snapToWalkable,
  simplifyPath,
  cellToPixel,
} from "../data/walkability";

// Coordinates on the real floor plan PNG (native 1528 × 704).
// These map each beacon slot (b1..b5) to a point on the photo, matching the
// red dots drawn on the plattegrond.
// Matches walkability grid: 191 cells × 88 cells × 8px step = 1528 × 704
const PHOTO_VIEWBOX = { w: 1528, h: 704 };

// Photo user position = receptie, naast stop 4.
const PHOTO_ENTRY = { x: 308, y: 445 };

// BFS routing on the walkability grid derived from the real plattegrond.
// Only the gray corridor pixels are walkable — walls, rooms, and stair
// hatching are excluded, so routes automatically avoid them.
function photoRoute(
  from: { x: number; y: number },
  to: { x: number; y: number },
): { x: number; y: number }[] {
  const start = snapToWalkable(from.x, from.y);
  const end = snapToWalkable(to.x, to.y);
  const cells = bfsPath(start, end);
  if (cells.length === 0) return [from, to];
  const simplified = simplifyPath(cells);
  const pts = simplified.map(cellToPixel);
  // Splice the real start/end endpoints so the route visually begins at the
  // user dot and ends exactly on the hotspot.
  return [from, ...pts, to];
}

interface FloorPlanProps {
  language: Language;
  stops: Stop[];
  onBack: () => void;
}

export function FloorPlan({
  language,
  stops,
  onBack,
}: FloorPlanProps) {
  // Stops die een positie op de plattegrond hebben worden als rood bolletje getoond.
  const photoStops = useMemo(
    () => stops.filter((s) => typeof s.mapX === "number" && typeof s.mapY === "number"),
    [stops],
  );

  // Photo mode: index of the selected red dot, or null.
  const [photoDestIdx, setPhotoDestIdx] = useState<
    number | null
  >(null);

  const [imgState, setImgState] = useState<
    "loading" | "ready" | "error"
  >(plattegrondLoadedOnce ? "ready" : "loading");
  const [reloadKey, setReloadKey] = useState(0);

  // ── Zoom & pan state ─────────────────────────────────────────────────────
  // We modify the SVG viewBox instead of CSS transforms so that the dots,
  // route en plattegrond samen schalen en altijd scherp blijven.
  const MIN_SCALE = 1;
  const MAX_SCALE = 6;
  const fullView = {
    x: 0,
    y: 0,
    w: PHOTO_VIEWBOX.w,
    h: PHOTO_VIEWBOX.h,
  };
  const [view, setView] = useState(fullView);
  const [is3D, setIs3D] = useState(false);
  // Navigatiemodus: kaart draait mee zodat de route omhoog wijst (zoals
  // Google Maps "heading up"). Wordt geactiveerd door op "Zoom op mij" te
  // tikken als er een route loopt.
  const [navMode, setNavMode] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  // Pointer-tracking voor pan en pinch.
  const pointersRef = useRef<
    Map<number, { x: number; y: number }>
  >(new Map());
  const pinchRef = useRef<{
    dist: number;
    view: typeof fullView;
  } | null>(null);

  const clampView = (v: typeof fullView) => {
    // 1. Clamp de schaal eerst, en bewaar het centrum zodat de plattegrond
    // niet wegschiet naar de hoek als je tegen de zoom-limiet aan zit.
    const desiredScale = PHOTO_VIEWBOX.w / v.w;
    const s = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, desiredScale),
    );
    const w = PHOTO_VIEWBOX.w / s;
    const h = PHOTO_VIEWBOX.h / s;
    // Reken centrum uit op basis van de oorspronkelijke (mogelijk te kleine)
    // viewbox, en bouw daar de gecorrigeerde w/h omheen op.
    const centerX = v.x + v.w / 2;
    const centerY = v.y + v.h / 2;
    let x = centerX - w / 2;
    let y = centerY - h / 2;
    x = Math.min(PHOTO_VIEWBOX.w - w, Math.max(0, x));
    y = Math.min(PHOTO_VIEWBOX.h - h, Math.max(0, y));
    return { x, y, w, h };
  };

  const zoomAt = (factor: number, cx?: number, cy?: number) => {
    setView((cur) => {
      const newW = cur.w / factor;
      const newH = cur.h / factor;
      const centerX = cx ?? cur.x + cur.w / 2;
      const centerY = cy ?? cur.y + cur.h / 2;
      const ratioX = (centerX - cur.x) / cur.w;
      const ratioY = (centerY - cur.y) / cur.h;
      return clampView({
        x: centerX - newW * ratioX,
        y: centerY - newH * ratioY,
        w: newW,
        h: newH,
      });
    });
  };

  const fitFull = () => {
    setView(fullView);
    setNavMode(false);
  };

  useEffect(() => {
    if (photoDestIdx === null) setNavMode(false);
  }, [photoDestIdx]);

  const zoomToMe = () => {
    const targetW = PHOTO_VIEWBOX.w / 3;
    const targetH = PHOTO_VIEWBOX.h / 3;
    setView(
      clampView({
        x: PHOTO_ENTRY.x - targetW / 2,
        y: PHOTO_ENTRY.y - targetH / 2,
        w: targetW,
        h: targetH,
      }),
    );
    // Als er een route gekozen is, schakel de "heading-up" navigatiemodus
    // in zodat je richting bovenaan wijst.
    if (photoDestIdx !== null) setNavMode(true);
  };

  // Map a pointer position to image coordinates using the current viewBox.
  const clientToImage = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const px = (clientX - rect.left) / rect.width;
    const py = (clientY - rect.top) / rect.height;
    return {
      x: view.x + px * view.w,
      y: view.y + py * view.h,
    };
  };

  const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    if (imgState !== "ready") return;
    e.preventDefault();
    const pt = clientToImage(e.clientX, e.clientY);
    const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
    zoomAt(factor, pt?.x, pt?.y);
  };

  const onPointerDown = (
    e: React.PointerEvent<SVGSVGElement>,
  ) => {
    if (imgState !== "ready") return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointersRef.current.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
    });
    if (pointersRef.current.size === 2) {
      const [a, b] = Array.from(pointersRef.current.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      pinchRef.current = { dist, view };
    }
  };

  const onPointerMove = (
    e: React.PointerEvent<SVGSVGElement>,
  ) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    const prev = pointersRef.current.get(e.pointerId)!;
    pointersRef.current.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
    });

    if (pointersRef.current.size === 2 && pinchRef.current) {
      const [a, b] = Array.from(pointersRef.current.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const factor = dist / pinchRef.current.dist;
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      const pt = clientToImage(midX, midY);
      const base = pinchRef.current.view;
      const newW = base.w / factor;
      const newH = base.h / factor;
      if (pt) {
        const ratioX = (pt.x - base.x) / base.w;
        const ratioY = (pt.y - base.y) / base.h;
        setView(
          clampView({
            x: pt.x - newW * ratioX,
            y: pt.y - newH * ratioY,
            w: newW,
            h: newH,
          }),
        );
      }
      return;
    }

    if (pointersRef.current.size === 1) {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const dx = ((e.clientX - prev.x) / rect.width) * view.w;
      const dy = ((e.clientY - prev.y) / rect.height) * view.h;
      setView((cur) =>
        clampView({
          x: cur.x - dx,
          y: cur.y - dy,
          w: cur.w,
          h: cur.h,
        }),
      );
    }
  };

  const onPointerUp = (
    e: React.PointerEvent<SVGSVGElement>,
  ) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
  };

  // Stop schaling: route en dots blijven leesbaar als je inzoomt.
  const zoomScale = PHOTO_VIEWBOX.w / view.w;
  const k = 1 / zoomScale; // schaalfactor om elementgrootte stabiel te houden

  // ── Memoised BFS route ─────────────────────────────────────────────────
  // Computed once per destination change instead of twice per render.
  const routePoints = useMemo(() => {
    if (photoDestIdx === null || !photoStops[photoDestIdx]) return null;
    const target = photoStops[photoDestIdx];
    return photoRoute(PHOTO_ENTRY, { x: target.mapX!, y: target.mapY! });
  }, [photoDestIdx, photoStops]);

  // ── Heading-up rotatie ─────────────────────────────────────────────────
  // Bereken een rotatie zodat de eerste route-stap recht omhoog wijst. Als er
  // geen route is, blijft de rotatie 0.
  const headingDeg = useMemo(() => {
    if (!routePoints) return 0;
    const a = routePoints[0];
    const b =
      routePoints.find((p) => Math.hypot(p.x - a.x, p.y - a.y) > 40) ||
      routePoints[routePoints.length - 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    // atan2(dy, dx) → 0° wijst naar rechts. We willen dat de
    // bewegingsrichting omhoog wijst, dus draai zó dat de vector op −90° komt.
    const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
    return -90 - ang;
  }, [routePoints]);
  const rotateDeg = navMode ? headingDeg : 0;

  useEffect(() => {
    if (plattegrondLoadedOnce) {
      setImgState("ready");
    }
  }, [reloadKey]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ── Header ── */}
      <div className="bg-primary text-white px-3 sm:px-5 pt-10 sm:pt-12 pb-3 sm:pb-4 relative flex-shrink-0">
        <button
          onClick={onBack}
          className="absolute top-2 left-2 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors border border-white/30"
          aria-label={language === "nl" ? "Terug" : "Back"}
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-base sm:text-lg">
            {language === "nl" ? "Terug" : "Back"}
          </span>
        </button>
        <h1 className="text-2xl sm:text-3xl">De Gieterij</h1>
        <p className="text-base sm:text-xl opacity-90">
          {language === "nl" ? "Plattegrond" : "Floor plan"}
        </p>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex flex-col gap-3 px-3 py-3">
        {/* ── Route status card ── */}
        {photoDestIdx !== null ? (
          <div className="bg-[#0066B3] text-white rounded-2xl px-4 py-3 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3 min-w-0">
              <Navigation className="w-6 h-6 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm opacity-80">
                  {language === "nl"
                    ? "Route naar:"
                    : "Route to:"}
                </p>
                <p className="text-lg leading-tight truncate">
                  {photoStops[photoDestIdx]?.title[language] ||
                    (language === "nl"
                      ? `Stop ${photoDestIdx + 1}`
                      : `Stop ${photoDestIdx + 1}`)}
                </p>
              </div>
            </div>
            <button
              onClick={() => setPhotoDestIdx(null)}
              className="ml-3 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center flex-shrink-0 transition-colors"
              aria-label={
                language === "nl"
                  ? "Route wissen"
                  : "Clear route"
              }
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="bg-blue-50 border-2 border-[#0066B3]/30 rounded-2xl px-4 py-3 flex items-center gap-3">
            <MapPin className="w-6 h-6 text-[#0066B3] flex-shrink-0" />
            <p className="text-base text-[#0066B3]">
              {language === "nl"
                ? "Tik op een stopplaats (●) voor de route"
                : "Tap a stop (●) to see the route"}
            </p>
          </div>
        )}

        {/* ── Photo floor plan (real plattegrond) ── */}
        {(
          <div
            className="relative bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden"
            style={{
              perspective: is3D ? "1600px" : undefined,
              perspectiveOrigin: "50% 85%",
              background: is3D
                ? "linear-gradient(180deg,#dbeafe 0%,#eef2f7 60%,#e5e7eb 100%)"
                : undefined,
            }}
          >
            <div
              style={{
                transform: `${
                  is3D
                    ? "rotateX(42deg) translateY(-2%)"
                    : ""
                } rotate(${rotateDeg}deg)`.trim(),
                transformOrigin: "50% 60%",
                transformStyle: "preserve-3d",
                transition:
                  "transform 500ms cubic-bezier(.2,.7,.2,1)",
                filter: is3D
                  ? "drop-shadow(0 28px 22px rgba(0,0,0,0.28))"
                  : undefined,
              }}
            >
            <svg
              ref={svgRef}
              viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
              className="w-full select-none"
              style={{
                maxHeight: "54vh",
                display: "block",
                touchAction: "none",
                cursor:
                  zoomScale > 1.01 ? "grab" : "default",
              }}
              onWheel={onWheel}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              aria-label={
                language === "nl"
                  ? "2D Plattegrond De Gieterij"
                  : "2D Floor plan De Gieterij"
              }
            >

              {imgState !== "error" && (
                <image
                  key={reloadKey}
                  href={plattegrondImg}
                  xlinkHref={plattegrondImg}
                  x={0}
                  y={0}
                  width={PHOTO_VIEWBOX.w}
                  height={PHOTO_VIEWBOX.h}
                  preserveAspectRatio="xMidYMid meet"
                  onLoad={() => {
                    plattegrondLoadedOnce = true;
                    setImgState("ready");
                  }}
                  onError={() => setImgState("error")}
                />
              )}
              {imgState === "error" && (
                <rect
                  x={0}
                  y={0}
                  width={PHOTO_VIEWBOX.w}
                  height={PHOTO_VIEWBOX.h}
                  fill="#f3f4f6"
                />
              )}
              {imgState === "loading" && (
                <g>
                  <text
                    x={PHOTO_VIEWBOX.w / 2}
                    y={PHOTO_VIEWBOX.h / 2}
                    textAnchor="middle"
                    fontSize="32"
                    fill="#6b7280"
                    fontFamily="Calibri,sans-serif"
                  >
                    {language === "nl"
                      ? "Plattegrond laden…"
                      : "Loading floor plan…"}
                  </text>
                </g>
              )}
              {imgState === "error" && (
                <g
                  style={{ cursor: "pointer" }}
                  onClick={() => setReloadKey((k) => k + 1)}
                >
                  <text
                    x={PHOTO_VIEWBOX.w / 2}
                    y={PHOTO_VIEWBOX.h / 2 - 20}
                    textAnchor="middle"
                    fontSize="32"
                    fill="#E30613"
                    fontFamily="Calibri,sans-serif"
                  >
                    {language === "nl"
                      ? "Plattegrond kon niet laden"
                      : "Floor plan failed to load"}
                  </text>
                  <text
                    x={PHOTO_VIEWBOX.w / 2}
                    y={PHOTO_VIEWBOX.h / 2 + 20}
                    textAnchor="middle"
                    fontSize="26"
                    fill="#0066B3"
                    fontFamily="Calibri,sans-serif"
                  >
                    {language === "nl"
                      ? "Tik om opnieuw te proberen"
                      : "Tap to retry"}
                  </text>
                </g>
              )}

              {/* Route polyline via the gray corridor spine */}
              {imgState === "ready" && routePoints && (
                <polyline
                  points={routePoints.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke="#0066B3"
                  strokeWidth={8 * k}
                  strokeDasharray={`${18 * k} ${12 * k}`}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="animate-route"
                />
              )}

              {/* Hotspots — één per stop met een positie op de plattegrond */}
              {imgState === "ready" && photoStops.map((stop, idx) => {
                const isSelected = photoDestIdx === idx;
                const color = isSelected
                  ? "#16a34a"
                  : "#E30613";
                const x = stop.mapX!;
                const y = stop.mapY!;
                return (
                  <g
                    key={stop.id}
                    onClick={() =>
                      setPhotoDestIdx(isSelected ? null : idx)
                    }
                    style={{ cursor: "pointer" }}
                  >
                    <circle
                      cx={x}
                      cy={y}
                      r={46 * k}
                      fill={color}
                      fillOpacity="0.3"
                      className="animate-beacon-ping"
                      style={{
                        transformOrigin: `${x}px ${y}px`,
                      }}
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r={(isSelected ? 30 : 24) * k}
                      fill={color}
                      stroke="white"
                      strokeWidth={5 * k}
                    />
                    <text
                      x={x}
                      y={y + 9 * k}
                      textAnchor="middle"
                      fontSize={24 * k}
                      fill="white"
                      fontWeight="bold"
                      fontFamily="Calibri,sans-serif"
                      style={{ pointerEvents: "none" }}
                    >
                      {idx + 1}
                    </text>
                  </g>
                );
              })}

              {/* User position (entry) */}
              {imgState === "ready" && (
              <g>
                <circle
                  cx={PHOTO_ENTRY.x}
                  cy={PHOTO_ENTRY.y}
                  r={46 * k}
                  fill="#0066B3"
                  fillOpacity="0.2"
                  className="animate-ping"
                  style={{
                    transformOrigin: `${PHOTO_ENTRY.x}px ${PHOTO_ENTRY.y}px`,
                  }}
                />
                <circle
                  cx={PHOTO_ENTRY.x}
                  cy={PHOTO_ENTRY.y}
                  r={22 * k}
                  fill="#0066B3"
                  stroke="white"
                  strokeWidth={5 * k}
                />
              </g>
              )}
            </svg>
            </div>

            {/* ── Zoom controls ── */}
            {imgState === "ready" && (
              <div className="absolute top-2 right-2 flex flex-col gap-2">
                <button
                  onClick={() => zoomAt(1.4)}
                  className="w-11 h-11 rounded-xl bg-white/95 hover:bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-700"
                  aria-label={
                    language === "nl"
                      ? "Inzoomen"
                      : "Zoom in"
                  }
                >
                  <Plus className="w-5 h-5" />
                </button>
                <button
                  onClick={() => zoomAt(1 / 1.4)}
                  className="w-11 h-11 rounded-xl bg-white/95 hover:bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-700"
                  aria-label={
                    language === "nl"
                      ? "Uitzoomen"
                      : "Zoom out"
                  }
                >
                  <Minus className="w-5 h-5" />
                </button>
                <button
                  onClick={fitFull}
                  className="w-11 h-11 rounded-xl bg-white/95 hover:bg-white shadow-md border border-gray-200 flex items-center justify-center text-gray-700"
                  aria-label={
                    language === "nl"
                      ? "Volledige plattegrond"
                      : "Fit"
                  }
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
                <button
                  onClick={zoomToMe}
                  className="w-11 h-11 rounded-xl bg-[#0066B3] hover:bg-[#005599] shadow-md flex items-center justify-center text-white"
                  aria-label={
                    language === "nl"
                      ? "Zoom op mij"
                      : "Zoom to me"
                  }
                >
                  <Locate className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setNavMode((v) => !v)}
                  disabled={photoDestIdx === null}
                  className={`w-11 h-11 rounded-xl shadow-md border flex items-center justify-center transition-colors ${
                    navMode
                      ? "bg-[#16a34a] border-[#16a34a] text-white"
                      : photoDestIdx === null
                        ? "bg-white/60 border-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-white/95 hover:bg-white border-gray-200 text-gray-700"
                  }`}
                  aria-label={
                    language === "nl"
                      ? "Navigatie (route omhoog)"
                      : "Heading-up navigation"
                  }
                >
                  <Compass className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIs3D((v) => !v)}
                  className={`w-11 h-11 rounded-xl shadow-md border flex items-center justify-center transition-colors ${
                    is3D
                      ? "bg-[#E30613] border-[#E30613] text-white"
                      : "bg-white/95 hover:bg-white border-gray-200 text-gray-700"
                  }`}
                  aria-label={
                    is3D
                      ? language === "nl"
                        ? "2D weergave"
                        : "2D view"
                      : language === "nl"
                        ? "3D weergave"
                        : "3D view"
                  }
                >
                  <Box className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Legend ── */}
        <div className="flex items-center gap-4 px-1 text-sm text-gray-600">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-[#E30613] border-2 border-white shadow" />
            <span>
              {language === "nl" ? "Stopplaats" : "Stop"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-[#0066B3] border-2 border-white shadow" />
            <span>
              {language === "nl"
                ? "Uw locatie"
                : "Your location"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-6 h-0.5 bg-[#0066B3]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg,#0066B3 0,#0066B3 6px,transparent 6px,transparent 10px)",
              }}
            />
            <span>{language === "nl" ? "Route" : "Route"}</span>
          </div>
        </div>

        {/* ── Stop list ── */}
        <div className="space-y-2 pb-4">
          <p className="text-sm text-gray-500 px-1">
            {language === "nl" ? "Stopplaatsen:" : "Stops:"}
          </p>
          {photoStops.length === 0 && (
            <p className="text-sm text-gray-500 px-1 py-2">
              {language === "nl"
                ? "Nog geen stops met een positie op de plattegrond."
                : "No stops with a position on the floor plan yet."}
            </p>
          )}
          {photoStops.map((stop, idx) => {
            const isSelected = photoDestIdx === idx;
            return (
              <button
                key={stop.id}
                onClick={() =>
                  setPhotoDestIdx(isSelected ? null : idx)
                }
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors text-left ${
                  isSelected
                    ? "bg-green-50 border-green-400"
                    : "bg-white border-gray-200 hover:border-[#0066B3]/50"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-base ${
                    isSelected ? "bg-green-500" : "bg-[#E30613]"
                  }`}
                >
                  {idx + 1}
                </div>
                <span className="text-base leading-tight flex-1">
                  {stop.title[language] || `Stop ${idx + 1}`}
                </span>
                {isSelected && (
                  <span className="ml-auto text-green-600 text-sm flex-shrink-0">
                    {language === "nl" ? "Actief" : "Active"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}