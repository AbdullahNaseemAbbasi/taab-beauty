import { orderStatuses, terminalStatuses } from "../../data/misc.js";
import { formatDate } from "../../lib/format.js";
import { CheckIcon } from "../ui/Icons.jsx";

export default function OrderTimeline({ order }) {
  const reached = new Set(order.timeline.map((entry) => entry.status));
  const terminal = terminalStatuses[order.status];
  const latestByStatus = Object.fromEntries(order.timeline.map((entry) => [entry.status, entry]));

  return (
    <div>
      {terminal && (
        <p className="mb-5 rounded-xl bg-coral-50 px-4 py-3 text-[14px] font-semibold text-coral">
          This order is marked as {terminal.toLowerCase()}.
        </p>
      )}
      <ol className="relative space-y-6 border-l-2 border-line pl-6">
        {orderStatuses.map((step) => {
          const done = reached.has(step.id);
          const entry = latestByStatus[step.id];
          const current = order.status === step.id;
          return (
            <li key={step.id} className="relative">
              <span
                className={`absolute top-0.5 -left-[31px] grid size-5 place-items-center rounded-full border-2 ${
                  done ? "border-teal bg-teal text-white" : "border-line bg-white"
                } ${current ? "ring-4 ring-teal/20" : ""}`}
              >
                {done && <CheckIcon className="size-3" />}
              </span>
              <p className={`text-[15px] font-semibold ${done ? "text-navy" : "text-ink-light"}`}>{entry?.label || step.label}</p>
              {entry && (
                <>
                  <p className="text-[13px] text-ink">
                    {formatDate(entry.at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {entry.tracking && (
                      <span className="ml-2 rounded-full bg-tint px-2 py-0.5 text-[12px] font-semibold text-navy">Tracking {entry.tracking}</span>
                    )}
                  </p>
                  {entry.note && <p className="mt-1 text-[13px] text-ink-light">{entry.note}</p>}
                </>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
