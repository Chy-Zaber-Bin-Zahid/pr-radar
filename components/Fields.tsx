"use client";

import { useEffect, useRef, type SelectHTMLAttributes } from "react";
import { CaretDown, MagnifyingGlass, X, type Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/ui";

const FIELD =
  "min-h-9 rounded-lg border border-line-strong bg-surface text-sm text-fg shadow-1 transition hover:border-muted focus:border-accent focus:outline-hidden focus:ring-3 focus:ring-accent/20";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { icon?: Icon; block?: boolean };

/**
 * A native <select> (so keyboard, screen readers and mobile pickers keep working)
 * dressed to match the app. The `select` class hooks up the themed option list in globals.css.
 */
export function Select({ icon: Glyph, block, className, children, ...props }: SelectProps) {
  return (
    <span className={cn("group relative min-w-0 items-center", block ? "flex w-full" : "inline-flex")}>
      {Glyph && (
        <Glyph
          className="pointer-events-none absolute left-3 z-10 text-muted transition-colors group-focus-within:text-fg"
          size={16}
          weight="bold"
          aria-hidden
        />
      )}
      <select
        className={cn(
          "select w-full min-w-[200px] truncate pr-9 font-medium max-md:min-h-11 max-md:text-md pointer-coarse:min-h-11",
          FIELD,
          Glyph ? "pl-9" : "pl-3",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <CaretDown
        className="pointer-events-none absolute right-3 z-10 text-muted transition-colors group-hover:text-fg group-focus-within:text-fg"
        size={14}
        weight="bold"
        aria-hidden
      />
    </span>
  );
}

const isTyping = (el: Element | null) =>
  !!el && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || (el as HTMLElement).isContentEditable);

/** Search box with a clear button, Esc to clear, and "/" to jump to it from anywhere. */
export function SearchField({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || isTyping(document.activeElement)) return;
      e.preventDefault();
      input.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="group relative flex items-center max-md:flex-[1_1_100%]">
      <MagnifyingGlass
        className="pointer-events-none absolute left-3 z-10 text-muted transition-colors group-focus-within:text-fg"
        size={16}
        weight="bold"
        aria-hidden
      />
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        ref={input}
        id={id}
        type="search"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className={cn(
          FIELD,
          "w-[280px] px-9 placeholder:text-muted max-md:min-h-11 max-md:w-full max-md:text-md [&::-webkit-search-cancel-button]:appearance-none",
        )}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.preventDefault();
            onChange("");
          }
        }}
      />
      {value ? (
        <button
          type="button"
          className="absolute right-[5px] grid size-[26px] place-items-center rounded-md text-muted transition hover:bg-surface-2 hover:text-fg pointer-coarse:right-0 pointer-coarse:size-11"
          aria-label="Clear search"
          onClick={() => {
            onChange("");
            input.current?.focus();
          }}
        >
          <X size={14} weight="bold" aria-hidden />
        </button>
      ) : (
        <kbd
          className="pointer-events-none absolute right-2 grid h-5 min-w-5 place-items-center rounded-[5px] border border-line-strong bg-surface-2 px-[5px] font-mono text-xs leading-none text-muted transition-opacity group-focus-within:opacity-0 pointer-coarse:hidden"
          aria-hidden
        >
          /
        </kbd>
      )}
    </div>
  );
}
