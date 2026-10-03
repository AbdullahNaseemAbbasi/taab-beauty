import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "../components/ui/Typography.jsx";
import { Skeleton } from "../components/ui/Feedback.jsx";
import { InfoIcon } from "../components/ui/Icons.jsx";
import { statusLabel, statusTone } from "./helpers.js";

/* Runs an async loader and exposes { data, error, loading, reload }. */
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const latest = useRef(0);

  const run = useCallback(() => {
    const ticket = ++latest.current;
    setState((current) => ({ ...current, loading: true, error: null }));
    Promise.resolve()
      .then(loader)
      .then((data) => ticket === latest.current && setState({ data, error: null, loading: false }))
      .catch((error) => ticket === latest.current && setState((current) => ({ data: current.data, error, loading: false })));
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { ...state, reload: run };
}

export function PageTitle({ title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[26px] font-extrabold tracking-[-0.02em] text-navy sm:text-[30px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-ink">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Card({ title, action, className = "", children }) {
  return (
    <section className={`rounded-2xl border border-line bg-white p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="font-display text-[17px] font-extrabold text-navy">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, tone = "navy" }) {
  const tones = { navy: "text-navy", coral: "text-coral", teal: "text-teal", success: "text-success" };
  return (
    <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-ink-light">{label}</p>
      <p className={`mt-2 font-display text-[26px] font-extrabold leading-none sm:text-[30px] ${tones[tone]}`}>{value}</p>
      {hint && <p className="mt-2 text-[13px] text-ink">{hint}</p>}
    </div>
  );
}

export function StatusBadge({ status }) {
  return <Badge tone={statusTone(status)}>{statusLabel(status)}</Badge>;
}

export function Chips({ options, value, onChange, className = "" }) {
  return (
    <div className={`no-scrollbar flex gap-2 overflow-x-auto ${className}`} role="tablist">
      {options.map((option) => {
        const id = option.id ?? option;
        const label = option.label ?? option;
        const active = id === value;
        return (
          <button key={id} type="button" role="tab" aria-selected={active} onClick={() => onChange(id)} className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${active ? "bg-navy text-white" : "border border-line bg-white text-navy hover:border-navy"}`}>
            {label}
            {option.count > 0 && <span className={`ml-2 rounded-full px-1.5 text-[11px] ${active ? "bg-white/20" : "bg-coral text-white"}`}>{option.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* `card` renders each row as a stacked card on phones; the table shows from md up. */
export function DataTable({ columns, rows, rowKey = "id", onRowClick, card, empty = "Nothing here yet.", minWidth = "min-w-[720px]" }) {
  const keyOf = (row, index) => (typeof rowKey === "function" ? rowKey(row, index) : row[rowKey]);
  if (rows.length === 0) return <p className="rounded-2xl border border-dashed border-line bg-white px-6 py-12 text-center text-[15px] text-ink">{empty}</p>;
  return (
    <>
      {card && (
        <ul className="space-y-3 md:hidden">
          {rows.map((row, index) => (
            <li key={keyOf(row, index)}>
              {onRowClick ? (
                <button type="button" onClick={() => onRowClick(row)} className="block w-full rounded-2xl border border-line bg-white p-4 text-left text-[14px] text-navy active:bg-tint">
                  {card(row)}
                </button>
              ) : (
                <div className="rounded-2xl border border-line bg-white p-4 text-[14px] text-navy">{card(row)}</div>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className={`overflow-x-auto rounded-2xl border border-line bg-white ${card ? "hidden md:block" : ""}`}>
        <table className={`w-full ${minWidth} text-left text-[14px]`}>
          <thead>
            <tr className="border-b border-line bg-tint/70 text-[11px] font-bold uppercase tracking-wide text-ink-light">
              {columns.map((column) => (
                <th key={column.key} className={`px-4 py-3 ${column.align === "right" ? "text-right" : ""}`}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={keyOf(row, index)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-line last:border-0 ${onRowClick ? "cursor-pointer hover:bg-tint/60" : ""}`}
              >
                {columns.map((column) => (
                  <td key={column.key} className={`px-4 py-3 align-middle text-navy ${column.align === "right" ? "text-right" : ""} ${column.className || ""}`}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function Loading({ rows = 3 }) {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-16" />
      ))}
    </div>
  );
}

export function ErrorNote({ error, retry }) {
  if (!error) return null;
  return (
    <p role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-coral/40 bg-coral-50 p-4 text-[14px] text-navy">
      <InfoIcon className="size-5 shrink-0 text-coral" />
      <span className="flex-1">{error.message}</span>
      {retry && (
        <button type="button" onClick={retry} className="font-semibold text-teal hover:underline">
          Try again
        </button>
      )}
    </p>
  );
}

/* Wraps a page section with its loading and error states. */
export function Async({ state, rows, children }) {
  if (state.loading && !state.data) return <Loading rows={rows} />;
  if (state.error && !state.data) return <ErrorNote error={state.error} retry={state.reload} />;
  return (
    <>
      <ErrorNote error={state.error} retry={state.reload} />
      {children(state.data)}
    </>
  );
}
