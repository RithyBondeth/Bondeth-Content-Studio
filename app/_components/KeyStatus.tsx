import { Check, X } from "lucide-react";
import type { KeyStatus as Status } from "../../studio/server/env";

const Item = ({ ok, label }: { ok: boolean; label: string }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
      ok ? "border-success/30 text-success" : "border-line text-faint"
    }`}
    title={ok ? `${label} key found` : `${label} key missing. Add it to .env`}
  >
    {ok ? (
      <Check className="size-3" aria-hidden />
    ) : (
      <X className="size-3" aria-hidden />
    )}
    {label}
  </span>
);

export const KeyStatus = ({ status }: { status: Status }) => (
  <div className="flex items-center gap-2" aria-label="API keys">
    <Item ok={status.claude} label="Claude" />
    <Item ok={status.elevenLabs} label="ElevenLabs" />
  </div>
);
