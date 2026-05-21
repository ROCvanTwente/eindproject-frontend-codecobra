import { useCallback, useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Gauge,
} from "lucide-react";
import { Stop, Language } from "../types";
import { MediaPlayer } from "./MediaPlayer";
import { loadSettings } from "../data/settings";

interface StopDetailProps {
  stop: Stop;
  language: Language;
  onBackToScanner: () => void;
  currentStopNumber: number;
  totalStops: number;
  isLastStop: boolean;
}

// Totale scroll-duur in seconden voor de play-knop (zonder TTS) op normale snelheid
const SCROLL_DURATION_S = 28;
const INTERVAL_MS = 16; // ~60fps

type SpeedKey = "slow" | "normal" | "fast";
const SPEED_PRESETS: Record<
  SpeedKey,
  { scrollMul: number; ttsRate: number; nl: string; en: string }
> = {
  slow: {
    scrollMul: 1.5,
    ttsRate: 0.75,
    nl: "Langzaam",
    en: "Slow",
  },
  normal: {
    scrollMul: 1.0,
    ttsRate: 0.9,
    nl: "Normaal",
    en: "Normal",
  },
  fast: {
    scrollMul: 0.65,
    ttsRate: 1.1,
    nl: "Snel",
    en: "Fast",
  },
};
const SPEED_STORAGE_KEY = "gieterij-text-speed";

export function StopDetail({
  stop,
  language,
  onBackToScanner,
  currentStopNumber,
  totalStops,
  isLastStop,
}: StopDetailProps) {
  const [isScrollPlaying, setIsScrollPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speed, setSpeed] = useState<SpeedKey>(() => {
    if (typeof window === "undefined") return "normal";
    const adm = loadSettings();
    if (adm.textSpeed && SPEED_PRESETS[adm.textSpeed])
      return adm.textSpeed;
    const saved = window.localStorage.getItem(
      SPEED_STORAGE_KEY,
    ) as SpeedKey | null;
    return saved && SPEED_PRESETS[saved] ? saved : "normal";
  });
  const speedRef = useRef<SpeedKey>(speed);
  useEffect(() => {
    speedRef.current = speed;
    try {
      window.localStorage.setItem(SPEED_STORAGE_KEY, speed);
    } catch {}
  }, [speed]);

  // De zichtbare container (overflow:hidden) en de bewegende content-div
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Huidige Y-offset in pixels (positief = content omhoog geschoven)
  const yRef = useRef(0);

  // Lopend interval-handle
  const intervalRef = useRef<ReturnType<
    typeof setInterval
  > | null>(null);

  // ── hulpfuncties ─────────────────────────────────────────────────────────

  /** Schrijf de translateY direct naar de DOM — geen React state-update nodig. */
  const applyY = useCallback((y: number) => {
    if (contentRef.current) {
      contentRef.current.style.transform = `translateY(-${y}px)`;
    }
  }, []);

  /** Maximale offset = hoogte content − hoogte container. */
  const getMaxOffset = useCallback((): number => {
    const cont = containerRef.current;
    const inner = contentRef.current;
    if (!cont || !inner) return 0;
    return Math.max(0, inner.offsetHeight - cont.clientHeight);
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /**
   * Start tijdgebaseerde animatie via setInterval.
   * Hervat vanaf de huidige positie als eerder gepauzeerd.
   */
  const startAutoScroll = () => {
    stopAutoScroll();

    const maxOffset = getMaxOffset();
    if (maxOffset <= 0) return;

    // Als al onderaan → opnieuw van boven beginnen
    if (yRef.current >= maxOffset - 1) {
      yRef.current = 0;
      applyY(0);
    }

    const remaining = maxOffset - yRef.current;
    const duration =
      SCROLL_DURATION_S *
      SPEED_PRESETS[speedRef.current].scrollMul;
    const framesNeeded =
      (duration * 1000 * (remaining / maxOffset)) / INTERVAL_MS;
    const stepPx = remaining / framesNeeded;

    intervalRef.current = setInterval(() => {
      yRef.current += stepPx;

      if (yRef.current >= maxOffset) {
        yRef.current = maxOffset;
        applyY(maxOffset);
        stopAutoScroll();
        setIsScrollPlaying(false);
        return;
      }

      applyY(yRef.current);
    }, INTERVAL_MS);
  };

  // ── reset bij nieuwe stop ─────────────────────────────────────────────────

  useEffect(() => {
    stopAutoScroll();
    setIsScrollPlaying(false);
    yRef.current = 0;
    applyY(0);
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [stop.id, stopAutoScroll, applyY]);

  // ── cleanup bij unmount ───────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      stopAutoScroll();
      if (window.speechSynthesis)
        window.speechSynthesis.cancel();
    };
  }, [stopAutoScroll]);

  // ── handlers ──────────────────────────────────────────────────────────────

  const handleMediaPlayStateChange = (isPlaying: boolean) => {
    if (!isPlaying && isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  /** Play/Pause-knop rechtsonder. */
  const handleScrollPlayPause = () => {
    const newState = !isScrollPlaying;
    setIsScrollPlaying(newState);

    if (newState) {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
      startAutoScroll();
    } else {
      stopAutoScroll();
    }
  };

  /** TTS-knop linksonder — gesynchroniseerd via onboundary. */
  const handleTextToSpeech = () => {
    if (!window.speechSynthesis) {
      alert(
        language === "nl"
          ? "Voorlezen wordt niet ondersteund door je browser"
          : "Text-to-speech is not supported by your browser",
      );
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsScrollPlaying(false);
      stopAutoScroll();
      return;
    }

    // Stop play-scroll, begin opnieuw bovenaan
    stopAutoScroll();
    yRef.current = 0;
    applyY(0);

    const textToRead = `${stop.title[language]}. ${stop.description[language]}`;
    const totalChars = textToRead.length;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = language === "nl" ? "nl-NL" : "en-US";
    utterance.rate = SPEED_PRESETS[speedRef.current].ttsRate;
    const admSettings = loadSettings();
    if (!admSettings.ttsEnabled) return;
    const voices = window.speechSynthesis.getVoices();
    const wantMale = admSettings.voiceGender === "male";
    const voice = voices.find(
      (v) =>
        v.lang.startsWith(language === "nl" ? "nl" : "en") &&
        (wantMale
          ? /male|man|daniel|alex|george/i
          : /female|vrouw|zira|samantha|karen|kathleen/i
        ).test(v.name),
    );
    if (voice) utterance.voice = voice;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onboundary = (event: SpeechSynthesisEvent) => {
      const maxOffset = getMaxOffset();
      if (maxOffset <= 0) return;
      const fraction = Math.min(
        event.charIndex / totalChars,
        1,
      );
      yRef.current = fraction * maxOffset;
      applyY(yRef.current);
    };

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsScrollPlaying(true);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsScrollPlaying(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsScrollPlaying(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleBackClick = () => {
    stopAutoScroll();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsScrollPlaying(false);
    setIsSpeaking(false);
    onBackToScanner();
  };

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Terugknop linksboven */}
      <button
        onClick={handleBackClick}
        className="fixed top-3 left-3 bg-white px-3 sm:px-6 py-2 sm:py-4 rounded-xl hover:bg-gray-100 transition-colors shadow-xl z-50 border-2 border-primary text-primary flex items-center gap-1 sm:gap-2"
        aria-label={
          language === "nl"
            ? "Terug naar scanner"
            : "Back to scanner"
        }
      >
        <ArrowLeft className="w-5 h-5 sm:w-7 sm:h-7" />
        <span className="text-base sm:text-2xl font-bold">
          {language === "nl" ? "Terug" : "Back"}
        </span>
      </button>

      {/* Media sectie — bovenste 2/3 */}
      <div className="relative h-2/3 flex-shrink-0 bg-black">
        {stop.media ? (
          <div className="w-full h-full">
            <MediaPlayer
              media={stop.media}
              language={language}
              onPlayStateChange={handleMediaPlayStateChange}
            />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <p className="text-2xl text-gray-500">
              {language === "nl"
                ? "Geen media beschikbaar"
                : "No media available"}
            </p>
          </div>
        )}

        {/* Stop-nummerbadge */}
        <div className="absolute top-3 right-3 sm:top-6 sm:right-6 bg-white text-primary rounded-full px-3 sm:px-6 py-1.5 sm:py-3 shadow-lg border-2 border-primary">
          <span className="text-base sm:text-2xl font-bold">
            {currentStopNumber} / {totalStops}
          </span>
        </div>
      </div>

      {/* Tekst sectie — onderste 1/3, overflow hidden, inhoud beweegt via transform */}
      <div
        ref={containerRef}
        className="flex-1 bg-black relative overflow-hidden"
      >
        {/* Snelheids-regelaar bovenaan tekstsectie */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 sm:gap-2 bg-white/10 backdrop-blur-sm rounded-full px-2 sm:px-3 py-1 sm:py-2 border border-white/20">
          <Gauge className="w-4 h-4 sm:w-5 sm:h-5 text-white/80" />
          {(Object.keys(SPEED_PRESETS) as SpeedKey[]).map(
            (key) => (
              <button
                key={key}
                onClick={() => setSpeed(key)}
                className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-base transition-colors ${
                  speed === key
                    ? "bg-white text-primary"
                    : "text-white/80 hover:bg-white/10"
                }`}
                aria-pressed={speed === key}
              >
                {SPEED_PRESETS[key][language]}
              </button>
            ),
          )}
        </div>

        {/* TTS-knop links */}
        <button
          onClick={handleTextToSpeech}
          className={`fixed bottom-4 left-4 sm:bottom-8 sm:left-8 p-4 sm:p-6 rounded-full shadow-2xl z-50 transition-colors border-2 ${
            isSpeaking
              ? "bg-primary text-white border-primary animate-pulse"
              : "bg-white text-primary border-primary hover:bg-gray-100"
          }`}
          aria-label={
            isSpeaking
              ? language === "nl"
                ? "Stop voorlezen"
                : "Stop reading"
              : language === "nl"
                ? "Voorlezen"
                : "Read aloud"
          }
        >
          {isSpeaking ? (
            <VolumeX className="w-6 h-6 sm:w-8 sm:h-8" />
          ) : (
            <Volume2 className="w-6 h-6 sm:w-8 sm:h-8" />
          )}
        </button>

        {/* Play/Pause-knop rechts */}
        <button
          onClick={handleScrollPlayPause}
          className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 bg-white text-primary p-4 sm:p-6 rounded-full shadow-2xl z-50 hover:bg-gray-100 transition-colors border-2 border-primary"
          aria-label={
            isScrollPlaying
              ? language === "nl"
                ? "Pauzeren"
                : "Pause"
              : language === "nl"
                ? "Afspelen"
                : "Play"
          }
        >
          {isScrollPlaying ? (
            <Pause className="w-6 h-6 sm:w-8 sm:h-8" />
          ) : (
            <Play
              className="w-6 h-6 sm:w-8 sm:h-8"
              fill="currentColor"
            />
          )}
        </button>

        {/* Bewegende content — transform wordt direct op dit element gezet */}
        <div
          ref={contentRef}
          className="p-5 sm:p-8 pt-14 sm:pt-16 w-full text-center will-change-transform"
        >
          <h1 className="text-3xl sm:text-5xl mb-6 sm:mb-12 leading-tight text-white font-bold">
            {stop.title[language]}
          </h1>

          <p className="text-xl sm:text-3xl leading-relaxed sm:leading-loose text-white/90 mb-10 sm:mb-16 max-w-3xl mx-auto">
            {stop.description[language]}
          </p>

          {isLastStop ? (
            <div className="bg-green-500/20 rounded-3xl p-6 sm:p-12 border-4 border-green-400 max-w-2xl mx-auto mb-10 sm:mb-16">
              <h3 className="text-2xl sm:text-4xl text-green-300 text-center mb-3 sm:mb-6 font-bold">
                {language === "nl"
                  ? "✓ Rondleiding voltooid"
                  : "✓ Tour completed"}
              </h3>
              <p className="text-xl sm:text-3xl text-green-200 text-center leading-relaxed">
                {language === "nl"
                  ? "Bedankt voor je bezoek aan De Gieterij!"
                  : "Thank you for visiting De Gieterij!"}
              </p>
            </div>
          ) : (
            <div className="bg-[#0066B3]/30 rounded-3xl p-6 sm:p-12 border-4 border-[#0066B3] max-w-2xl mx-auto mb-10 sm:mb-16">
              <p className="text-xl sm:text-3xl text-blue-100 text-center leading-relaxed sm:leading-loose">
                {language === "nl"
                  ? "Ga terug en scan de volgende QR-code"
                  : "Go back and scan the next QR code"}
              </p>
            </div>
          )}

          {/* Extra ruimte zodat de laatste regel ook volledig omhoog kan */}
          <div className="h-48" />
        </div>
      </div>
    </div>
  );
}