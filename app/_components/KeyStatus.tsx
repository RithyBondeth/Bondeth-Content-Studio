import { KeyRound } from "lucide-react";
import Link from "next/link";
import type { KeyStatus as Status } from "../../studio/server/env";
import { cx } from "./ui";

const Dot = ({ ok, label }: { ok: boolean; label: string }) => (
  <span
    className="flex items-center gap-1.5"
    title={
      ok
        ? `${label} is connected`
        : `${label} isn't set up. Add its key in Settings`
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
  <Link
    href="/settings"
    className="hidden items-center gap-3 rounded-full border border-line bg-surface/60 py-1.5 pr-3.5 pl-3 text-xs transition-colors hover:border-line-strong sm:flex"
    aria-label="Connected services. Open Settings"
  >
    <KeyRound className="size-3.5 text-faint" aria-hidden />
    <Dot ok={status.ai} label={status.aiName} />
    <Dot ok={status.elevenLabs} label="ElevenLabs" />
    <Dot ok={status.openai} label="OpenAI images" />
  </Link>
);
