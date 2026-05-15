"use client";

import type { ReactNode, ChangeEvent } from "react";
import { cn } from "@/components/ui/cn";

type SelectOption = { value: string; label: string };

type CommonProps = {
  label: string;
  name: string;
  value: string;
  mono?: boolean;
  small?: boolean;
  focused?: boolean;
  trailing?: ReactNode;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  type?: "text" | "password" | "email" | "url";
};

type TextProps = CommonProps & {
  multiline?: false;
  select?: false;
  onChange: (next: string) => void;
};

type MultilineProps = CommonProps & {
  multiline: true;
  select?: false;
  onChange: (next: string) => void;
};

type SelectProps = CommonProps & {
  select: true;
  multiline?: false;
  options: SelectOption[];
  onChange: (next: string) => void;
};

type FormFieldProps = TextProps | MultilineProps | SelectProps;

/**
 * Visual envelope: uppercase label, dark-bg input wrapper with border
 * (amber when `focused`), optional `trailing` slot on the right.
 *
 * Ported from `AdminCredentialForm`'s `FormField` (design source).
 */
export function FormField(props: FormFieldProps) {
  const {
    label,
    name,
    value,
    mono,
    small,
    focused,
    trailing,
    placeholder,
    required,
    disabled,
  } = props;

  const labelClass =
    "mb-1.5 block font-sans font-semibold uppercase text-text-3";
  const labelStyle = { fontSize: 10.5, letterSpacing: "0.12em" } as const;

  const wrapperClass = cn(
    "flex gap-2 rounded-[10px] border bg-bg",
    props.multiline ? "items-start px-3 py-2.5" : "items-center px-3 py-[11px]",
    focused ? "border-accent" : "border-border",
  );
  const wrapperStyle = focused
    ? { boxShadow: "0 0 0 3px rgba(200, 121, 65, 0.15)" }
    : undefined;
  const fontClass = mono ? "font-mono" : "font-sans";
  const sizeStyle = { fontSize: small ? 13 : 14 } as const;

  return (
    <div className="mb-3.5">
      <label htmlFor={name} className={labelClass} style={labelStyle}>
        {label}
      </label>
      <div className={wrapperClass} style={wrapperStyle}>
        {props.select ? (
          <select
            id={name}
            name={name}
            value={value}
            required={required}
            disabled={disabled}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              props.onChange(e.target.value)
            }
            className={cn(
              "flex-1 cursor-pointer appearance-none bg-transparent text-text outline-none",
              fontClass,
              disabled && "opacity-60",
            )}
            style={sizeStyle}
          >
            {props.options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-bg">
                {opt.label}
              </option>
            ))}
          </select>
        ) : props.multiline ? (
          <textarea
            id={name}
            name={name}
            value={value}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
              props.onChange(e.target.value)
            }
            className={cn(
              "min-h-[60px] flex-1 resize-y bg-transparent leading-[1.45] text-text outline-none placeholder:text-text-3",
              fontClass,
              disabled && "opacity-60",
            )}
            style={sizeStyle}
            rows={3}
          />
        ) : (
          <input
            id={name}
            name={name}
            type={props.type ?? "text"}
            value={value}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              props.onChange(e.target.value)
            }
            className={cn(
              "flex-1 bg-transparent text-text outline-none placeholder:text-text-3",
              fontClass,
              disabled && "opacity-60",
            )}
            style={sizeStyle}
          />
        )}
        {props.select ? (
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            className="text-text-3"
            aria-hidden="true"
          >
            <path
              d="M2 4l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          trailing
        )}
      </div>
    </div>
  );
}
