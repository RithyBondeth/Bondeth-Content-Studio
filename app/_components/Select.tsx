"use client";

import { Check, ChevronDown } from "lucide-react";
import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { cx } from "./ui";

export type SelectOption = {
  value: string;
  label: string;
  /** A second, quieter line under the label. */
  hint?: string;
  /** A small tag beside the label, such as "Recommended". */
  tag?: string;
  /** A heading the option is listed under. */
  group?: string;
  disabled?: boolean;
};

type OptionProps = {
  value?: string | number;
  children?: ReactNode;
  disabled?: boolean;
  "data-hint"?: string;
  "data-tag"?: string;
};

/** The text inside an `<option>`, which may be split into several pieces. */
const textOf = (node: ReactNode): string =>
  Children.toArray(node)
    .map((child) =>
      typeof child === "string" || typeof child === "number"
        ? String(child)
        : isValidElement<{ children?: ReactNode }>(child)
          ? textOf(child.props.children)
          : "",
    )
    .join("");

/** Reads `<option>` and `<optgroup>` children, so callers can keep writing them. */
const optionsFrom = (children: ReactNode, group?: string): SelectOption[] =>
  Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child)) return [];
    const element = child as ReactElement<
      OptionProps & { label?: string; children?: ReactNode }
    >;
    if (element.type === Fragment)
      return optionsFrom(element.props.children, group);
    if (element.type === "optgroup")
      return optionsFrom(element.props.children, element.props.label);
    if (element.type !== "option") return [];
    const label = textOf(element.props.children);
    return [
      {
        value: String(element.props.value ?? label),
        label,
        hint: element.props["data-hint"],
        tag: element.props["data-tag"],
        group,
        disabled: element.props.disabled,
      },
    ];
  });

type SelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "value" | "defaultValue" | "children"
> & {
  value?: string | number;
  defaultValue?: string | number;
  /** `<option>` / `<optgroup>` children, or `options` for hints and tags. */
  children?: ReactNode;
  options?: SelectOption[];
  /** Shown before the selected label, e.g. an icon in a pill. */
  icon?: ReactNode;
  /** Drop the field styling; `className` styles the button instead. */
  bare?: boolean;
  placeholder?: string;
};

const fieldClass =
  "flex h-10 items-center gap-2 rounded-xl border border-line bg-bg/60 pr-3 pl-3.5 text-left text-sm text-text transition-colors hover:border-line-strong focus-visible:border-accent focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-60 aria-expanded:border-accent aria-expanded:ring-4 aria-expanded:ring-accent/15";

/** Fields fill their container unless the caller gives them a width. */
const widthClass = (className?: string) =>
  /(^|\s)w-/.test(className ?? "") ? "" : "w-full";

/**
 * A dropdown in the studio's own style, in place of the browser's. Takes the
 * same props as a `<select>` (`value`, `onChange`, `<option>` children), and
 * `onChange` receives an event-like object with `target.value`.
 */
export const Select = ({
  value,
  defaultValue,
  onChange,
  children,
  options: given,
  icon,
  bare = false,
  placeholder = "Choose…",
  disabled,
  className,
  id,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  title,
}: SelectProps) => {
  const options = given ?? optionsFrom(children);
  const [own, setOwn] = useState(
    String(defaultValue ?? options[0]?.value ?? ""),
  );
  const current = value !== undefined ? String(value) : own;
  const selected = options.find((option) => option.value === current);

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [place, setPlace] = useState<{
    left: number;
    width: number;
    top?: number;
    bottom?: number;
    maxHeight: number;
  } | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const listId = useId();
  const autoId = useId();
  const buttonId = id ?? autoId;

  const choose = (option: SelectOption) => {
    if (option.disabled) return;
    if (value === undefined) setOwn(option.value);
    onChange?.({
      target: { value: option.value },
      currentTarget: { value: option.value },
    } as ChangeEvent<HTMLSelectElement>);
    setOpen(false);
    button.current?.focus();
  };

  // Place the list under the button, or above it when there's more room there.
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const rect = button.current?.getBoundingClientRect();
      if (!rect) return;
      const below = window.innerHeight - rect.bottom - 12;
      const above = rect.top - 12;
      const up = below < 240 && above > below;
      setPlace({
        left: Math.min(
          rect.left,
          window.innerWidth - Math.max(rect.width, 220) - 8,
        ),
        width: Math.max(rect.width, 220),
        ...(up
          ? { bottom: window.innerHeight - rect.top + 6 }
          : { top: rect.bottom + 6 }),
        maxHeight: Math.min(320, up ? above : below),
      });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open]);

  // Close on a click anywhere else.
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!button.current?.contains(target) && !list.current?.contains(target))
        setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  // Keep the highlighted option in view.
  useEffect(() => {
    if (!open || active < 0) return;
    list.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const show = () => {
    if (disabled) return;
    setActive(Math.max(0, options.indexOf(selected as SelectOption)));
    setOpen(true);
  };

  const step = (from: number, by: number) => {
    for (let i = 1; i <= options.length; i++) {
      const next = (from + by * i + options.length) % options.length;
      if (!options[next]?.disabled) return next;
    }
    return from;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        show();
      }
      return;
    }
    if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape") event.preventDefault();
      setOpen(false);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => step(index, 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => step(index, -1));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(step(-1, 1));
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(step(options.length, -1));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const option = options[active];
      if (option) choose(option);
    } else if (event.key.length === 1) {
      // Typing jumps to the first option that starts with the letters typed.
      const now = Date.now();
      typed.current.text =
        (now - typed.current.at < 700 ? typed.current.text : "") +
        event.key.toLowerCase();
      typed.current.at = now;
      const match = options.findIndex(
        (option) =>
          !option.disabled &&
          option.label.toLowerCase().startsWith(typed.current.text),
      );
      if (match >= 0) setActive(match);
    }
  };

  let lastGroup: string | undefined;

  return (
    <>
      <button
        ref={button}
        id={buttonId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={
          open && active >= 0 ? `${listId}-${active}` : undefined
        }
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        title={title}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
        className={cx(
          bare ? "" : fieldClass,
          bare ? "" : widthClass(className),
          "cursor-pointer",
          className,
        )}
      >
        {icon}
        <span
          className={cx("min-w-0 flex-1 truncate", !selected && "text-faint")}
        >
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cx(
            "size-4 shrink-0 text-faint transition-transform",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open && place
        ? createPortal(
            <ul
              ref={list}
              id={listId}
              role="listbox"
              aria-labelledby={buttonId}
              className="animate-rise-in fixed z-[100] overflow-y-auto rounded-xl border border-line-strong bg-raised p-1 shadow-2xl shadow-black/40"
              style={place}
            >
              {options.map((option, index) => {
                const heading =
                  option.group && option.group !== lastGroup
                    ? option.group
                    : null;
                lastGroup = option.group;
                const isSelected = option.value === current;
                return (
                  <Fragment key={`${option.value}-${index}`}>
                    {heading ? (
                      <li
                        role="presentation"
                        className="px-2.5 pt-2.5 pb-1 text-[11px] font-medium tracking-wide text-faint uppercase"
                      >
                        {heading}
                      </li>
                    ) : null}
                    <li
                      id={`${listId}-${index}`}
                      data-index={index}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={option.disabled || undefined}
                      onPointerEnter={() => setActive(index)}
                      onClick={() => choose(option)}
                      className={cx(
                        "flex cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 text-sm",
                        index === active && "bg-hover",
                        option.disabled && "cursor-not-allowed opacity-45",
                      )}
                    >
                      <span
                        className={cx(
                          "mt-1.5 size-2 shrink-0 rounded-[2px]",
                          isSelected ? "bg-accent-bright" : "bg-line-strong",
                        )}
                        aria-hidden
                      />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex items-center gap-2">
                          <span
                            className={cx(
                              "min-w-0",
                              isSelected
                                ? "font-medium text-text"
                                : "text-text/90",
                            )}
                          >
                            {option.label}
                          </span>
                          {option.tag ? (
                            <span className="shrink-0 rounded-md bg-accent/12 px-1.5 py-px text-[10px] font-medium text-accent-bright ring-1 ring-accent/25 ring-inset">
                              {option.tag}
                            </span>
                          ) : null}
                        </span>
                        {option.hint ? (
                          <span className="text-xs leading-relaxed text-muted">
                            {option.hint}
                          </span>
                        ) : null}
                      </span>
                      {isSelected ? (
                        <Check
                          className="mt-0.5 size-4 shrink-0 text-accent-bright"
                          aria-hidden
                        />
                      ) : null}
                    </li>
                  </Fragment>
                );
              })}
            </ul>,
            document.body,
          )
        : null}
    </>
  );
};
