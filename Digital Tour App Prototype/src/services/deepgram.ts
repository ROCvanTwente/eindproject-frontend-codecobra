// deepgram.ts
// Browser-side Deepgram TTS used to preview pronunciation rules in the admin UI.
// We POST the (optionally IPA-annotated) text to Deepgram's /v1/speak endpoint
// and play the returned MP3 with an <audio> element.

const DEEPGRAM_API_KEY =
  import.meta.env?.VITE_DEEPGRAM_API_KEY ?? "7cb9f560536c92f2187f896737fb11f5d4a3678f";
const DEEPGRAM_SPEAK_URL = "https://api.deepgram.com/v1/speak";

type DgLang = "nl" | "en";

// Female Aura-2 voice per language (used for previewing).
const FEMALE_MODELS: Record<DgLang, string> = {
  nl: "aura-2-daphne-nl",
  en: "aura-2-asteria-en",
};

let currentAudio: HTMLAudioElement | null = null;

/** Stop any preview that is currently playing. */
export function stopDeepgramPreview(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}

/**
 * Speak `word`, applying `ipa` as a Deepgram pronunciation override.
 * Note: Deepgram pronunciation control is English/Spanish only — for Dutch the
 * IPA is ignored and the voice uses its default pronunciation.
 */
export async function previewPronunciation(
  word: string,
  ipa: string,
  lang: DgLang,
): Promise<void> {
  stopDeepgramPreview();

  const model = FEMALE_MODELS[lang] ?? FEMALE_MODELS.en;
  // Stored IPA may include surrounding slashes (e.g. "/ˈxiːtəraɪ/").
  const cleanIpa = ipa?.replace(/^\/+|\/+$/g, "").trim();
  const text = cleanIpa
    ? `{"word": "${word}", "pronounce": "${cleanIpa}"}`
    : word;

  const res = await fetch(
    `${DEEPGRAM_SPEAK_URL}?model=${encodeURIComponent(model)}&encoding=mp3`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    },
  );

  if (!res.ok) {
    throw new Error(`Deepgram TTS failed: ${res.status}`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  currentAudio = audio;
  audio.onended = () => {
    URL.revokeObjectURL(url);
    if (currentAudio === audio) currentAudio = null;
  };
  await audio.play();
}
