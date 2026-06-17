// deepgram.ts
// Text-to-speech via Deepgram's Aura-2 voices.
// We POST the text to Deepgram's /v1/speak REST endpoint, save the returned
// MP3 to the cache directory and play it back with react-native-sound.
import RNFS from "react-native-fs";
import Sound from "react-native-sound";

import { VoiceGender, loadPronunciationRules, PronunciationRule } from "./settings";
import { Language } from "../types";

const DEEPGRAM_API_KEY = "7cb9f560536c92f2187f896737fb11f5d4a3678f";
const DEEPGRAM_SPEAK_URL = "https://api.deepgram.com/v1/speak";

// Models chosen per language + gender.
const VOICE_MODELS: Record<string, string> = {
  "en-male": "aura-2-aries-en",
  "en-female": "aura-2-asteria-en",
  "nl-male": "aura-2-sander-nl",
  "nl-female": "aura-2-daphne-nl",
};

export function getDeepgramModel(language: Language, gender: VoiceGender): string {
  return VOICE_MODELS[`${language}-${gender}`] ?? VOICE_MODELS["en-female"];
}

// Pronunciation rules are managed in the backend (GET /api/tts/all) and cached
// for the lifetime of the app session.
let rulesPromise: Promise<PronunciationRule[]> | null = null;

function getPronunciationRules(): Promise<PronunciationRule[]> {
  if (!rulesPromise) {
    rulesPromise = loadPronunciationRules().catch((error) => {
      console.error("Failed to load pronunciation rules:", error);
      rulesPromise = null; // allow a retry on the next call
      return [];
    });
  }
  return rulesPromise;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Wrap mispronounced words in Deepgram's inline IPA markup, e.g.
 * \{"word": "Hengelo", "pronounce": "ˈhɛŋəloʊ"\}. Only rules whose language
 * matches the requested voice language are applied.
 */
function applyPronunciations(
  text: string,
  language: Language,
  rules: PronunciationRule[],
): string {
  let result = text;
  for (const rule of rules) {
    if (!rule.word || rule.language?.toLowerCase() !== language) continue;
    // Stored IPA may include surrounding slashes (e.g. "/ˈxiːtəraɪ/").
    const ipa = rule.pronunciationText?.replace(/^\/+|\/+$/g, "").trim();
    if (!ipa) continue;
    const pattern = new RegExp(`\\b${escapeRegExp(rule.word)}\\b`, "gi");
    result = result.replace(
      pattern,
      (match) => `\\{"word": "${match}", "pronounce": "${ipa}"\\}`,
    );
  }
  return result;
}

const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    result += B64_CHARS[b0 >> 2];
    result += B64_CHARS[((b0 & 3) << 4) | (b1 >> 4)];
    result += i + 1 < bytes.length ? B64_CHARS[((b1 & 15) << 2) | (b2 >> 6)] : "=";
    result += i + 2 < bytes.length ? B64_CHARS[b2 & 63] : "=";
  }
  return result;
}

async function fetchAudioBase64(text: string, model: string): Promise<string> {
  const url = `${DEEPGRAM_SPEAK_URL}?model=${encodeURIComponent(model)}&encoding=mp3`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Token ${DEEPGRAM_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    throw new Error(`Deepgram TTS failed: ${res.status}`);
  }

  const buffer = await res.arrayBuffer();
  return arrayBufferToBase64(buffer);
}

// Allow the audio to play even when the device is in silent mode (iOS).
Sound.setCategory("Playback");

export interface SpeakHandlers {
  onStart?: () => void;
  onFinish?: () => void;
  onError?: (error: unknown) => void;
}

let activeSound: Sound | null = null;

/** Stop and release any audio that is currently playing. */
export function stopSpeaking(): void {
  if (activeSound) {
    const sound = activeSound;
    activeSound = null;
    sound.stop(() => sound.release());
  }
}

/** Update playback speed of the currently playing audio. */
export function setPlaybackSpeed(speed: number): void {
  activeSound?.setSpeed(speed);
}

/**
 * Synthesize `text` with the Deepgram voice for the given language/gender and
 * play it back at `speed` (1 = normal). Resolves once playback has started.
 */
export async function speak(
  text: string,
  language: Language,
  gender: VoiceGender,
  speed: number,
  handlers: SpeakHandlers = {},
): Promise<void> {
  try {
    stopSpeaking();

    const model = getDeepgramModel(language, gender);
    const rules = await getPronunciationRules();
    const spokenText = applyPronunciations(text, language, rules);
    const base64 = await fetchAudioBase64(spokenText, model);
    const path = `${RNFS.CachesDirectoryPath}/deepgram-tts.mp3`;
    await RNFS.writeFile(path, base64, "base64");

    await new Promise<void>((resolve, reject) => {
      const sound = new Sound(path, "", (loadError) => {
        if (loadError) {
          reject(loadError);
          return;
        }
        activeSound = sound;
        sound.setSpeed(speed);
        handlers.onStart?.();
        resolve();
        sound.play(() => {
          sound.release();
          if (activeSound === sound) activeSound = null;
          handlers.onFinish?.();
        });
      });
    });
  } catch (error) {
    handlers.onError?.(error);
    handlers.onFinish?.();
    throw error;
  }
}
