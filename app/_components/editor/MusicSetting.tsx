"use client";

import { Music, Upload } from "lucide-react";
import { useId, useRef, useState } from "react";
import {
  DEFAULT_MUSIC_VOLUME,
  findBundledTrack,
  MUSIC_TRACKS,
  MUSIC_UPLOAD_TYPES,
  uploadedTrackLabel,
} from "../../../src/lib/music";
import type { VideoSpecInput } from "../../../src/spec/schema";
import { useToast } from "../Toast";
import { Button, Select } from "../ui";

type MusicValue = VideoSpecInput["music"];

const UPLOAD = "__upload__";
const ACCEPT = [
  ...Object.keys(MUSIC_UPLOAD_TYPES).map((extension) => `.${extension}`),
  "audio/*",
].join(",");

/** Picks background music for the video (a bundled bed or an upload) and its volume. */
export const MusicSetting = ({
  slug,
  index,
  music,
  onChange,
}: {
  slug: string;
  index: number;
  music: MusicValue;
  onChange: (music: MusicValue) => void;
}) => {
  const notify = useToast();
  const trackId = useId();
  const volumeId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  // Remember the uploaded track, so switching to a bed and back doesn't lose it.
  const [uploaded, setUploaded] = useState<string | null>(
    music && !findBundledTrack(music.src) ? music.src : null,
  );
  // Remember the volume while music is off.
  const [lastVolume, setLastVolume] = useState(
    music?.volume ?? DEFAULT_MUSIC_VOLUME,
  );
  const volume = music?.volume ?? lastVolume;

  const pick = (src: string) => {
    if (src === UPLOAD) {
      fileInput.current?.click();
      return;
    }
    onChange(src ? { src, volume } : undefined);
  };

  const upload = async (file: File) => {
    setUploading(true);
    const form = new FormData();
    form.set("slug", slug);
    form.set("index", String(index));
    form.set("file", file);
    try {
      const response = await fetch("/api/music", {
        method: "POST",
        body: form,
      });
      const result = (await response.json()) as {
        src?: string;
        error?: string;
      };
      if (!response.ok || !result.src) {
        throw new Error(result.error ?? `Upload failed (${response.status}).`);
      }
      setUploaded(result.src);
      onChange({ src: result.src, volume });
      notify({ tone: "success", title: "Music uploaded" });
    } catch (error) {
      notify({
        tone: "error",
        title: "Couldn't upload the music",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface/60 p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-raised text-accent-bright">
          <Music className="size-4" aria-hidden />
        </span>
        <span>
          <label htmlFor={trackId} className="block text-sm font-medium">
            Music
          </label>
          <span className="block text-xs text-faint">
            Plays under the whole video and dips while the narrator speaks
          </span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Select
          id={trackId}
          value={music?.src ?? ""}
          disabled={uploading}
          onChange={(event) => pick(event.target.value)}
        >
          <option value="">None</option>
          {Object.values(MUSIC_TRACKS).map((track) => (
            <option key={track.src} value={track.src}>
              {track.label}: {track.description.toLowerCase()}
            </option>
          ))}
          {uploaded ? (
            <option value={uploaded}>
              Your track: {uploadedTrackLabel(uploaded)}
            </option>
          ) : null}
          <option value={UPLOAD}>Upload a track…</option>
        </Select>
        <Button
          variant="secondary"
          size="md"
          loading={uploading}
          icon={<Upload className="size-4" aria-hidden />}
          onClick={() => fileInput.current?.click()}
          aria-label="Upload a music track"
          title="Upload a music track (MP3, WAV, M4A, AAC or OGG)"
        />
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }}
        />
      </div>

      <div className="flex items-center gap-3">
        <label htmlFor={volumeId} className="text-[13px] text-muted">
          Volume
        </label>
        <input
          id={volumeId}
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          disabled={!music}
          onChange={(event) => {
            const next = Number(event.target.value);
            setLastVolume(next);
            if (music) onChange({ ...music, volume: next });
          }}
          className="h-1.5 flex-1 cursor-pointer accent-accent disabled:cursor-not-allowed disabled:opacity-45"
        />
        <span className="w-10 text-right font-mono text-xs text-faint">
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  );
};
