/** Moods of the bundled music beds. The script step picks one per video. */
export const MUSIC_MOODS = ["calm", "upbeat", "curious"] as const;
export type MusicMood = (typeof MUSIC_MOODS)[number];

export type MusicTrack = {
  mood: MusicMood;
  label: string;
  description: string;
  /** Path inside public/. */
  src: string;
};

/** Loopable beds in public/music/, synthesized by pipeline/music.ts. */
export const MUSIC_TRACKS: Record<MusicMood, MusicTrack> = {
  calm: {
    mood: "calm",
    label: "Calm",
    description: "Slow, warm pads",
    src: "music/calm.wav",
  },
  upbeat: {
    mood: "upbeat",
    label: "Upbeat",
    description: "Bright plucks and a light beat",
    src: "music/upbeat.wav",
  },
  curious: {
    mood: "curious",
    label: "Curious",
    description: "Mellow minor-key mallets",
    src: "music/curious.wav",
  },
};

/** The music volume a new spec starts with. Matches the schema default. */
export const DEFAULT_MUSIC_VOLUME = 0.15;

/** The bundled bed with this src, if it is one. */
export const findBundledTrack = (src: string): MusicTrack | undefined =>
  Object.values(MUSIC_TRACKS).find((track) => track.src === src);

/** Audio formats an uploaded track can be in, by file extension. */
export const MUSIC_UPLOAD_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
};

export const MAX_MUSIC_UPLOAD_BYTES = 50 * 1024 * 1024;

/** Lower-case extension of an uploadable audio file, or null if the format isn't supported. */
export const musicUploadExtension = (fileName: string): string | null => {
  const extension = /\.([a-z0-9]+)$/i.exec(fileName)?.[1]?.toLowerCase();
  return extension && extension in MUSIC_UPLOAD_TYPES ? extension : null;
};

const UPLOAD_PREFIX = "music-";

/**
 * File name an upload is stored under, next to the video's voice-overs:
 * "music-<name>-<hash>.<ext>". The name keeps the track recognisable in the
 * editor, and the content hash keeps different files with the same name apart.
 */
export const musicUploadFileName = (
  fileName: string,
  hash: string,
): string | null => {
  const extension = musicUploadExtension(fileName);
  if (!extension) return null;
  const name =
    fileName
      .slice(0, -(extension.length + 1))
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40)
      .replace(/-+$/, "") || "track";
  return `${UPLOAD_PREFIX}${name}-${hash.slice(0, 10)}.${extension}`;
};

/** A readable name for an uploaded track, from the file name it was stored under. */
export const uploadedTrackLabel = (src: string): string => {
  const file = src.split("/").pop() ?? src;
  const match = /^music-(.+)-[0-9a-f]{10}\.[a-z0-9]+$/.exec(file);
  return (match?.[1] ?? file).replace(/-/g, " ");
};
