import { useState, useRef } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Stop, Language } from "../types";

interface MediaPlayerProps {
  media: Stop["media"];
  language: Language;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

function cleanImageUrl(url: string): string {
  if (!url) return url;
  try {
    const u = new URL(url);
    // Google Images "View image" redirect → extract actual imgurl
    if (
      u.hostname.includes("google.") &&
      (u.pathname === "/imgres" || u.pathname === "/url")
    ) {
      const real =
        u.searchParams.get("imgurl") ||
        u.searchParams.get("url") ||
        u.searchParams.get("q");
      if (real) return real;
    }
  } catch {}
  return url;
}

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be")
      return u.pathname.slice(1) || null;
    if (u.hostname.endsWith("youtube.com")) {
      if (u.pathname === "/watch")
        return u.searchParams.get("v");
      const m = u.pathname.match(
        /^\/(embed|shorts|v)\/([^/?]+)/,
      );
      if (m) return m[2];
    }
  } catch {}
  return null;
}

function getVimeoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("vimeo.com")) return null;
    const m = u.pathname.match(/\/(\d+)/);
    return m ? m[1] : null;
  } catch {}
  return null;
}

export function MediaPlayer({
  media,
  language,
  onPlayStateChange,
}: MediaPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mediaError, setMediaError] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  if (!media) return null;

  const mediaRef = media.type === "video" ? videoRef : audioRef;

  const togglePlayPause = () => {
    const el = mediaRef.current;
    if (!el) return;
    const newPlayState = !isPlaying;
    try {
      if (newPlayState) {
        const p = el.play();
        if (p && typeof p.catch === "function") {
          p.catch((err) => {
            console.warn("Media play failed:", err);
            setIsPlaying(false);
            onPlayStateChange?.(false);
          });
        }
      } else {
        el.pause();
      }
      setIsPlaying(newPlayState);
      onPlayStateChange?.(newPlayState);
    } catch (err) {
      console.warn("Media toggle failed:", err);
      setIsPlaying(false);
      onPlayStateChange?.(false);
    }
  };

  const toggleMute = () => {
    if (mediaRef.current) {
      mediaRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (mediaRef.current) {
      setCurrentTime(mediaRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (mediaRef.current) {
      setDuration(mediaRef.current.duration);
    }
  };

  const handleSeek = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newTime = parseFloat(e.target.value);
    if (mediaRef.current) {
      mediaRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (media.type === "image") {
    return (
      <div className="relative w-full h-full bg-black">
        <img
          src={media.url}
          alt="Stop media"
          className="w-full h-full object-cover"
        />
        {/* Play knop voor foto's */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-center gap-6">
              <div className="w-16 h-16"></div>

              <button
                onClick={() => {
                  const newState = !isPlaying;
                  setIsPlaying(newState);
                  onPlayStateChange?.(newState);
                }}
                className="w-20 h-20 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center transition-colors shadow-lg"
                aria-label={
                  isPlaying
                    ? language === "nl"
                      ? "Pauzeer"
                      : "Pause"
                    : language === "nl"
                      ? "Afspelen"
                      : "Play"
                }
              >
                {isPlaying ? (
                  <Pause className="w-10 h-10 text-white" />
                ) : (
                  <Play className="w-10 h-10 text-white ml-1" />
                )}
              </button>

              <div className="w-16 h-16"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // YouTube / Vimeo embeds use their own native player controls. We render a
  // poster with a single play button; once started the iframe takes over.
  if (media.type === "video") {
    const ytId = getYouTubeId(media.url);
    const vimeoId = getVimeoId(media.url);
    if (ytId || vimeoId) {
      const embedUrl = ytId
        ? `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1${isPlaying ? "&autoplay=1" : ""}`
        : `https://player.vimeo.com/video/${vimeoId}${isPlaying ? "?autoplay=1" : ""}`;
      const poster =
        (media.thumbnail && cleanImageUrl(media.thumbnail)) ||
        (ytId
          ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
          : "");
      return (
        <div className="relative w-full h-full bg-black">
          {isPlaying ? (
            <iframe
              src={embedUrl}
              title="video"
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsPlaying(true);
                onPlayStateChange?.(true);
              }}
              className="relative w-full h-full group"
              aria-label={
                language === "nl"
                  ? "Video afspelen"
                  : "Play video"
              }
            >
              {poster && !thumbFailed && (
                <img
                  src={poster}
                  alt="video thumbnail"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={() => setThumbFailed(true)}
                />
              )}
              {(!poster || thumbFailed) && (
                <div className="absolute inset-0 bg-gray-800" />
              )}
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center shadow-lg">
                  <Play className="w-10 h-10 text-white ml-1" />
                </div>
              </div>
            </button>
          )}
        </div>
      );
    }
  }

  return (
    <div className="relative w-full h-full bg-black">
      {media.type === "video" && (
        <>
          <video
            ref={videoRef}
            src={media.url}
            poster={media.thumbnail}
            playsInline
            preload="metadata"
            className="w-full h-full object-cover"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onError={() => {
              setMediaError(true);
              setIsPlaying(false);
              onPlayStateChange?.(false);
            }}
            onEnded={() => {
              setIsPlaying(false);
              onPlayStateChange?.(false);
            }}
          />
          {/* Thumbnail overlay — guarantees the poster is visible even when
              the browser prefers the first frame of the loaded metadata. */}
          {media.thumbnail && !isPlaying && !thumbFailed && (
            <img
              src={cleanImageUrl(media.thumbnail)}
              alt="video thumbnail"
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              onError={() => setThumbFailed(true)}
            />
          )}
          {mediaError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white text-center p-6">
              <p>
                {language === "nl"
                  ? "Video kan niet direct worden afgespeeld. Tip: YouTube- of Vimeo-links werken automatisch via embed."
                  : "Video cannot be played directly. Tip: paste a YouTube or Vimeo link instead."}
              </p>
            </div>
          )}
        </>
      )}

      {media.type === "audio" && (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-white text-center p-8">
            <div className="w-32 h-32 mx-auto mb-6 bg-primary/20 rounded-full flex items-center justify-center">
              <Volume2 className="w-16 h-16" />
            </div>
            <p className="text-2xl">
              {language === "nl"
                ? "Audio-opname"
                : "Audio recording"}
            </p>
          </div>
          <audio
            ref={audioRef}
            src={media.url}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => {
              setIsPlaying(false);
              onPlayStateChange?.(false);
            }}
          />
        </div>
      )}

      {/* Controls als overlay onderaan */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-center gap-6">
            {media.type === "video" ? (
              <button
                onClick={toggleMute}
                className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                aria-label={
                  isMuted
                    ? language === "nl"
                      ? "Geluid aan"
                      : "Unmute"
                    : language === "nl"
                      ? "Geluid uit"
                      : "Mute"
                }
              >
                {isMuted ? (
                  <VolumeX className="w-8 h-8 text-white" />
                ) : (
                  <Volume2 className="w-8 h-8 text-white" />
                )}
              </button>
            ) : (
              <div className="w-16 h-16"></div>
            )}

            <button
              onClick={togglePlayPause}
              className="w-20 h-20 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center transition-colors shadow-lg"
              aria-label={
                isPlaying
                  ? language === "nl"
                    ? "Pauzeer"
                    : "Pause"
                  : language === "nl"
                    ? "Afspelen"
                    : "Play"
              }
            >
              {isPlaying ? (
                <Pause className="w-10 h-10 text-white" />
              ) : (
                <Play className="w-10 h-10 text-white ml-1" />
              )}
            </button>

            <div className="w-16 h-16"></div>
          </div>

          <div className="w-full">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-3 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary"
              aria-label={
                language === "nl" ? "Tijdlijn" : "Timeline"
              }
              style={{
                background: (() => {
                  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
                  return `linear-gradient(to right, #E30613 0%, #E30613 ${pct}%, rgba(255,255,255,0.2) ${pct}%, rgba(255,255,255,0.2) 100%)`;
                })(),
              }}
            />
            <div className="flex justify-between text-white text-lg mt-2">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}