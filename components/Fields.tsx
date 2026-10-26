"use client";

import { useEffect, useRef, type SelectHTMLAttributes } from "react";
import { CaretDown, MagnifyingGlass, X, type Icon } from "@phosphor-icons/react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & { icon?: Icon; wrapClassName?: string };

/**
 * A native <select> (so keyboard, screen readers and mobile pickers keep working)
 * dressed to match the app. Browsers that support customizable selects also get a
 * themed option list; see `.select` in globals.css.
 */
export function Select({ icon: Glyph, wrapClassName, children, ...props }: SelectProps) {
  return (
    <span className={`select-wrap${Glyph ? " has-icon" : ""}${wrapClassName ? ` ${wrapClassName}` : ""}`}>
      {Glyph && <Glyph className="select-icon" size={16} weight="bold" aria-hidden />}
      <select className="select" {...props}>
        {children}
      </select>
      <CaretDown className="select-caret" size={14} weight="bold" aria-hidden />
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
    <div className="search">
      <MagnifyingGlass className="search-icon" size={16} weight="bold" aria-hidden />
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
          className="search-clear"
          aria-label="Clear search"
          onClick={() => {
            onChange("");
            input.current?.focus();
          }}
        >
          <X size={14} weight="bold" aria-hidden />
        </button>
      ) : (
        <kbd className="search-hint" aria-hidden>
          /
        </kbd>
      )}
    </div>
  );
}
