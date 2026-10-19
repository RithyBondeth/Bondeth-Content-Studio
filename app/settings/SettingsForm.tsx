"use client";

import {
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  Eye,
  EyeOff,
  ImageIcon,
  Images,
  Mic,
  PenLine,
  PlugZap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import { PROVIDERS, type ProviderId } from "../../pipeline/providers";
import type { VoiceSummary } from "../../src/lib/voice";
import type {
  KeyView,
  SettingsInput,
  SettingsView,
} from "../../studio/server/settings";
import {
  listVoicesAction,
  saveSettingsAction,
  testSettingsAction,
} from "../actions";
import { AiTag } from "../_components/AiChoice";
import { useToast } from "../_components/Toast";
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  Input,
  Select,
  cx,
} from "../_components/ui";

/** Where to get a key, for each service. */
const KEY_LINKS: Partial<Record<ProviderId, string>> & Record<string, string> =
  {
    anthropic: "https://platform.claude.com/settings/keys",
    openai: "https://platform.openai.com/api-keys",
    gemini: "https://aistudio.google.com/apikey",
    openrouter: "https://openrouter.ai/keys",
    groq: "https://console.groq.com/keys",
    deepseek: "https://platform.deepseek.com/api_keys",
    mistral: "https://console.mistral.ai/api-keys",
    xai: "https://console.x.ai",
    together: "https://api.together.ai/settings/api-keys",
    elevenLabs: "https://elevenlabs.io/app/settings/api-keys",
    pexels: "https://www.pexels.com/api/",
  };

const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

type Outcome = { ok: boolean; message: string };

/** Saving and testing one section, with the outcome of the last test. */
const useSection = (onSaved: (view: SettingsView) => void) => {
  const notify = useToast();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const save = async (input: SettingsInput, title = "Saved") => {
    setSaving(true);
    const result = await saveSettingsAction(input);
    setSaving(false);
    if (!result.ok) {
      notify({
        tone: "error",
        title: "Couldn't save",
        description: result.error,
      });
      return false;
    }
    onSaved(result.data);
    setOutcome(null);
    // The header and every page read the new settings on their next render.
    router.refresh();
    notify({ tone: "success", title });
    return true;
  };

  const test = async (input: SettingsInput) => {
    setTesting(true);
    setOutcome(null);
    const result = await testSettingsAction(input);
    setTesting(false);
    setOutcome(
      result.ok
        ? { ok: true, message: result.data }
        : { ok: false, message: result.error },
    );
  };

  return { saving, testing, outcome, setOutcome, save, test };
};

const Section = ({
  id,
  icon,
  title,
  description,
  connected,
  children,
}: {
  id: string;
  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
  connected: boolean;
  children: ReactNode;
}) => (
  <section
    id={id}
    aria-labelledby={`${id}-title`}
    className="scroll-mt-24 rounded-2xl target:ring-2 target:ring-accent/50"
  >
    <Card className="flex flex-col gap-5 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/12 text-accent-bright ring-1 ring-accent/20 ring-inset">
          {icon}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2
              id={`${id}-title`}
              className="flex items-center gap-2 text-lg font-medium tracking-tight"
            >
              {title}
            </h2>
            {connected ? (
              <Badge tone="success">
                <CheckCircle2 className="size-3" aria-hidden />
                Set up
              </Badge>
            ) : (
              <Badge>Not set up</Badge>
            )}
          </div>
          <p className="text-[13px] leading-relaxed text-muted">
            {description}
          </p>
        </div>
      </div>
      {children}
    </Card>
  </section>
);

const KeyLink = ({ href, children }: { href?: string; children: ReactNode }) =>
  href ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-medium text-accent-bright underline-offset-4 hover:underline"
    >
      {children}
      <ExternalLink className="size-3" aria-hidden />
    </a>
  ) : null;

/**
 * A masked key field. A saved key is never sent to the browser, only its
 * last characters, so the field starts empty and typing replaces the key.
 */
const KeyField = ({
  label,
  saved,
  value,
  onChange,
  onRemove,
  removing,
  getKeyHref,
  optional = false,
}: {
  label: string;
  saved: KeyView;
  value: string;
  onChange: (value: string) => void;
  onRemove: () => void;
  removing?: boolean;
  getKeyHref?: string;
  optional?: boolean;
}) => {
  const id = useId();
  const [shown, setShown] = useState(false);
  const tail = saved.masked?.replace(/•/g, "");
  const ending = tail ? ` ending in ${tail}` : "";
  const hint = saved.masked ? (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span>
        {saved.source === "env"
          ? `Using the key${ending} from .env. Paste a key here to use a different one.`
          : `Saved key${ending}. Paste a new one to replace it.`}
      </span>
      {saved.source === "settings" ? (
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          className="font-medium text-danger underline-offset-4 hover:underline disabled:opacity-50"
        >
          Remove key
        </button>
      ) : null}
    </span>
  ) : (
    <span>
      {optional ? "Optional. " : null}
      {getKeyHref ? (
        <>
          <KeyLink href={getKeyHref}>Get a key</KeyLink>, then paste it here.
        </>
      ) : (
        "Paste it here."
      )}
    </span>
  );

  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <div className="relative">
        <Input
          id={id}
          type={shown ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={saved.masked ?? "Paste your key"}
          autoComplete="off"
          spellCheck={false}
          className="pr-11 font-mono"
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? "Hide key" : "Show key"}
          className="absolute inset-y-0 right-0 grid w-10 place-items-center text-faint transition-colors hover:text-text"
        >
          {shown ? (
            <EyeOff className="size-4" aria-hidden />
          ) : (
            <Eye className="size-4" aria-hidden />
          )}
        </button>
      </div>
    </Field>
  );
};

const Actions = ({
  canSave,
  saving,
  testing,
  canTest = true,
  onSave,
  onTest,
  outcome,
}: {
  canSave: boolean;
  saving: boolean;
  testing: boolean;
  canTest?: boolean;
  onSave: () => void;
  onTest: () => void;
  outcome: Outcome | null;
}) => (
  <div className="flex flex-col gap-3">
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="primary"
        onClick={onSave}
        loading={saving}
        disabled={!canSave}
      >
        Save
      </Button>
      <Button
        onClick={onTest}
        loading={testing}
        disabled={!canTest}
        icon={<PlugZap className="size-4" aria-hidden />}
      >
        Test connection
      </Button>
    </div>
    <div aria-live="polite">
      {outcome ? (
        <div
          className={cx(
            "flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm leading-relaxed",
            outcome.ok
              ? "border-success/25 bg-success/8 text-success"
              : "border-danger/25 bg-danger/8 text-danger",
          )}
        >
          {outcome.ok ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          ) : (
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          )}
          <p className="min-w-0 flex-1">{outcome.message}</p>
        </div>
      ) : null}
    </div>
  </div>
);

const AiSection = ({
  view,
  onSaved,
}: {
  view: SettingsView["ai"];
  onSaved: (view: SettingsView) => void;
}) => {
  const [provider, setProvider] = useState(view.provider);
  const current = view.providers[provider];
  const [model, setModel] = useState(current.model);
  const [baseUrl, setBaseUrl] = useState(current.baseUrl);
  const [apiKey, setApiKey] = useState("");
  const section = useSection((next) => {
    onSaved(next);
    setApiKey("");
  });
  const preset = PROVIDERS[provider];
  const modelId = useId();
  const providerId = useId();
  const baseUrlId = useId();

  const pick = (next: ProviderId) => {
    setProvider(next);
    setModel(view.providers[next].model);
    setBaseUrl(view.providers[next].baseUrl);
    setApiKey("");
    section.setOutcome(null);
  };

  const input = (extra: Partial<SettingsInput> = {}): SettingsInput =>
    ({
      section: "ai",
      provider,
      model,
      baseUrl,
      apiKey: apiKey || undefined,
      ...extra,
    }) as SettingsInput;

  const changed =
    provider !== view.provider ||
    model !== current.model ||
    baseUrl !== current.baseUrl ||
    Boolean(apiKey.trim());
  const keyless = preset.keyless && provider !== "custom";
  const active = view.providers[view.provider];

  const baseUrlField = (
    <Field
      label={provider === "custom" ? "Address" : "Custom address"}
      htmlFor={baseUrlId}
      hint={
        provider === "custom"
          ? "Your provider's OpenAI-compatible address, usually ending in /v1."
          : "Only needed to go through a proxy. Leave it empty to use the usual address."
      }
    >
      <Input
        id={baseUrlId}
        value={baseUrl}
        onChange={(event) => setBaseUrl(event.target.value)}
        placeholder={current.defaultBaseUrl || "https://example.com/v1"}
        spellCheck={false}
        className="font-mono"
      />
    </Field>
  );

  return (
    <Section
      id="ai"
      icon={<PenLine className="size-4" aria-hidden />}
      title={
        <>
          AI writing <AiTag />
        </>
      }
      description={
        <>
          Plans your series and writes scripts and posts. Claude is the default;
          any OpenAI-compatible service works too.
          {view.provider !== provider ? (
            <>
              {" "}
              Right now {PROVIDERS[view.provider].name} is in use; saving
              switches to {preset.name}.
            </>
          ) : null}
        </>
      }
      connected={active.ready}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Provider" htmlFor={providerId}>
          <Select
            id={providerId}
            value={provider}
            onChange={(event) => pick(event.target.value as ProviderId)}
          >
            {PROVIDER_IDS.map((id) => (
              <option key={id} value={id}>
                {id === "custom"
                  ? "Other (OpenAI-compatible)"
                  : PROVIDERS[id].name}
                {id === "anthropic" ? " (recommended)" : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Model"
          htmlFor={modelId}
          hint={
            current.defaultModel
              ? `Leave empty to use ${current.defaultModel}.`
              : `The ${preset.name} model to write with. Required.`
          }
        >
          <Input
            id={modelId}
            value={model}
            onChange={(event) => setModel(event.target.value)}
            placeholder={current.defaultModel || "Model name"}
            spellCheck={false}
            className="font-mono"
          />
        </Field>
      </div>

      {provider === "custom" ? baseUrlField : null}

      {keyless ? (
        <p className="text-[13px] leading-relaxed text-muted">
          {preset.name} runs on this computer, so it needs no key. Make sure
          it&apos;s running, then test the connection.
        </p>
      ) : (
        <KeyField
          label={`${preset.name} API key`}
          saved={current.key}
          value={apiKey}
          onChange={setApiKey}
          optional={provider === "custom"}
          getKeyHref={KEY_LINKS[provider]}
          removing={section.saving}
          onRemove={() =>
            void section.save(
              input({ clearKey: true, apiKey: undefined }),
              "Key removed",
            )
          }
        />
      )}

      {provider !== "custom" ? (
        <details className="group text-sm">
          <summary className="cursor-pointer text-[13px] text-faint select-none hover:text-muted">
            Advanced
          </summary>
          <div className="pt-3">{baseUrlField}</div>
        </details>
      ) : null}

      <Actions
        canSave={changed}
        saving={section.saving}
        testing={section.testing}
        onSave={() => void section.save(input())}
        onTest={() => void section.test(input())}
        outcome={section.outcome}
      />
    </Section>
  );
};

const VoiceSection = ({
  view,
  onSaved,
}: {
  view: SettingsView["elevenLabs"];
  onSaved: (view: SettingsView) => void;
}) => {
  const [apiKey, setApiKey] = useState("");
  const [voiceId, setVoiceId] = useState(view.voiceId);
  const [voices, setVoices] = useState<VoiceSummary[] | null>(null);
  const section = useSection((next) => {
    onSaved(next);
    setApiKey("");
  });
  const voiceFieldId = useId();
  const hasKey = Boolean(view.key.masked);

  // The voice list needs a working key, so it loads once one is saved.
  useEffect(() => {
    if (!hasKey) return;
    let cancelled = false;
    void listVoicesAction(true).then((result) => {
      if (!cancelled) setVoices(result.ok ? result.data : null);
    });
    return () => {
      cancelled = true;
    };
  }, [hasKey, view.key.masked]);

  const input = (extra: Partial<SettingsInput> = {}): SettingsInput =>
    ({
      section: "elevenLabs",
      voiceId,
      apiKey: apiKey || undefined,
      ...extra,
    }) as SettingsInput;

  const fallback = view.defaultVoiceId
    ? `The voice from .env (${view.defaultVoiceId})`
    : "ElevenLabs' default voice (George)";

  return (
    <Section
      id="voice"
      icon={<Mic className="size-4" aria-hidden />}
      title={
        <>
          AI voice-over <AiTag />
        </>
      }
      description="ElevenLabs reads your scripts aloud with natural voices. Without it, you can record or upload your own narration."
      connected={hasKey}
    >
      <KeyField
        label="ElevenLabs API key"
        saved={view.key}
        value={apiKey}
        onChange={setApiKey}
        getKeyHref={KEY_LINKS.elevenLabs}
        removing={section.saving}
        onRemove={() =>
          void section.save(
            input({ clearKey: true, apiKey: undefined }),
            "Key removed",
          )
        }
      />
      <Field
        label="Default voice"
        htmlFor={voiceFieldId}
        hint="Used for new videos. Each project and video can still pick its own."
      >
        {voices ? (
          <Select
            id={voiceFieldId}
            value={voiceId}
            onChange={(event) => setVoiceId(event.target.value)}
          >
            <option value="">{fallback}</option>
            {voiceId && !voices.some((v) => v.id === voiceId) ? (
              <option value={voiceId}>{voiceId}</option>
            ) : null}
            {voices.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.name}
              </option>
            ))}
          </Select>
        ) : (
          <Input
            id={voiceFieldId}
            value={voiceId}
            onChange={(event) => setVoiceId(event.target.value)}
            placeholder={
              hasKey ? "Voice ID" : "Save a key to choose from your voices"
            }
            spellCheck={false}
            className="font-mono"
          />
        )}
      </Field>
      <Actions
        canSave={Boolean(apiKey.trim()) || voiceId !== view.voiceId}
        saving={section.saving}
        testing={section.testing}
        onSave={() => void section.save(input())}
        onTest={() => void section.test(input())}
        outcome={section.outcome}
      />
    </Section>
  );
};

const KeyOnlySection = ({
  id,
  name,
  view,
  onSaved,
  ...rest
}: {
  id: "openai" | "pexels";
  name: string;
  view: { key: KeyView };
  onSaved: (view: SettingsView) => void;
} & Omit<Parameters<typeof Section>[0], "connected" | "children" | "id">) => {
  const [apiKey, setApiKey] = useState("");
  const section = useSection((next) => {
    onSaved(next);
    setApiKey("");
  });
  const input = (clearKey = false): SettingsInput => ({
    section: id,
    apiKey: clearKey ? undefined : apiKey || undefined,
    clearKey,
  });
  return (
    <Section
      id={id === "openai" ? "images" : "stock"}
      connected={Boolean(view.key.masked)}
      {...rest}
    >
      <KeyField
        label={`${name} API key`}
        saved={view.key}
        value={apiKey}
        onChange={setApiKey}
        optional={id === "pexels"}
        getKeyHref={KEY_LINKS[id]}
        removing={section.saving}
        onRemove={() => void section.save(input(true), "Key removed")}
      />
      <Actions
        canSave={Boolean(apiKey.trim())}
        saving={section.saving}
        testing={section.testing}
        onSave={() => void section.save(input())}
        onTest={() => void section.test(input())}
        outcome={section.outcome}
      />
    </Section>
  );
};

export const SettingsForm = ({
  initial,
  fromSetup,
}: {
  initial: SettingsView;
  fromSetup: boolean;
}) => {
  const [view, setView] = useState(initial);
  return (
    <div className="flex flex-col gap-5">
      {fromSetup ? (
        <Alert tone="info">
          Paste your key below, test it, and save. Then close this tab and go
          back to your work: it picks up the new key by itself, no restart
          needed.
        </Alert>
      ) : null}
      <AiSection view={view.ai} onSaved={setView} />
      <VoiceSection view={view.elevenLabs} onSaved={setView} />
      <KeyOnlySection
        id="openai"
        name="OpenAI"
        view={view.openai}
        onSaved={setView}
        icon={<ImageIcon className="size-4" aria-hidden />}
        title={
          <>
            AI images <AiTag />
          </>
        }
        description="OpenAI draws illustrations for image scenes from a short description. Without it, pick stock photos or upload your own."
      />
      <KeyOnlySection
        id="pexels"
        name="Pexels"
        view={view.pexels}
        onSaved={setView}
        icon={<Images className="size-4" aria-hidden />}
        title="Stock photos"
        description="Free stock photos come from Openverse with no key. Add a Pexels key to search Pexels' library instead."
      />
      <p className="text-xs leading-relaxed text-faint">
        Keys are saved in{" "}
        <code className="font-mono">.studio/settings.json</code> in this folder,
        which is never shared or committed. You can also set them in{" "}
        <code className="font-mono">.env</code>; anything saved here takes
        priority.
      </p>
    </div>
  );
};
