import { KeyRound } from "lucide-react";
import type { KeyStatus as Status } from "../../studio/server/env";
import { cx } from "./ui";

const Dot = ({ ok, label }: { ok: boolean; label: string }) => (
  <span
    className="flex items-center gap-1.5"
    title={
      ok ? `${label} is connected` : `${label} key missing. Add it to .env`
    }
  >
    <span
      className={cx(
        "size-1.5 rounded-full",
        ok ? "bg-success shadow-[0_0_8px] shadow-success" : "bg-faint",
      )}
    />
    <span className={ok ? "text-muted" : "text-faint"}>{label}</span>
  </span>
);

export const KeyStatus = ({ status }: { status: Status }) => (
  <div
    className="hidden items-center gap-3 rounded-full border border-line bg-surface/60 py-1.5 pr-3.5 pl-3 text-xs sm:flex"
    aria-label="Connected services"
  >
    <KeyRound className="size-3.5 text-faint" aria-hidden />
    <Dot ok={status.claude} label="Claude" />
    <Dot ok={status.elevenLabs} label="ElevenLabs" />
    <Dot ok={status.openai} label="OpenAI images" />
  </div>
);
