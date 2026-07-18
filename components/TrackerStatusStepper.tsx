import { Check } from "lucide-react";

export type TrackerOrderStatus = "created" | "dispatched" | "in_transit" | "delivered" | "cancelled";

export type TrackerDriverEventKind = "on_break" | "about_to_reach" | "reached" | "unloading" | "delivery_claimed";

export interface TrackerOrderEvent {
  id: string;
  order_id: string;
  status: TrackerOrderStatus;
  note: string;
  location: string;
  created_at: string;
  reported_by: "company" | "driver";
  event_kind: TrackerDriverEventKind | "";
}

export const DRIVER_EVENT_KIND_LABELS: Record<TrackerDriverEventKind, string> = {
  on_break: "On Break",
  about_to_reach: "About to Reach",
  reached: "Reached",
  unloading: "Unloading",
  delivery_claimed: "Delivered",
};

export const STATUS_LABELS: Record<TrackerOrderStatus, string> = {
  created: "Created",
  dispatched: "Dispatched",
  in_transit: "In Transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const STATUS_STYLES: Record<TrackerOrderStatus, string> = {
  created: "bg-gray-100 text-gray-600",
  dispatched: "bg-amber-100 text-amber-700",
  in_transit: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

const STATUS_STEPS: TrackerOrderStatus[] = ["created", "dispatched", "in_transit", "delivered"];

interface Props {
  status: TrackerOrderStatus;
  events: TrackerOrderEvent[];
}

// Ported from bogie-tracker-panel/components/StatusStepper.tsx (separate
// Next.js app, so cross-import isn't possible) — kept visually identical,
// with mockData types swapped for the real dashboard API response shape.
export default function TrackerStatusStepper({ status, events }: Props) {
  if (status === "cancelled") {
    return (
      <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-center">
        <p className="text-red-600 font-bold text-sm">This order was cancelled</p>
      </div>
    );
  }

  const currentIdx = STATUS_STEPS.indexOf(status);
  const eventsFor = (s: TrackerOrderStatus) => events.filter(e => e.status === s);

  return (
    <div className="space-y-0">
      {STATUS_STEPS.map((step, i) => {
        const done = i <= currentIdx;
        const stepEvents = eventsFor(step);
        const isLast = i === STATUS_STEPS.length - 1;
        return (
          <div key={step} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                done ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-400"
              }`}>
                {done ? <Check size={14} /> : <span className="text-xs font-bold">{i + 1}</span>}
              </div>
              {!isLast && <div className={`w-0.5 flex-1 min-h-[2rem] ${i < currentIdx ? "bg-indigo-600" : "bg-gray-100"}`} />}
            </div>
            <div className="pb-8 space-y-2">
              <p className={`text-sm font-bold ${done ? "text-gray-900" : "text-gray-400"}`}>{STATUS_LABELS[step]}</p>
              {stepEvents.length > 0 ? (
                stepEvents.map((ev, idx) => {
                  const isDriver = ev.reported_by === "driver";
                  return (
                    <div key={idx} className="text-xs text-gray-500 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span>{new Date(ev.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                        {isDriver && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600 text-[10px] font-bold uppercase tracking-wide">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                            Driver{ev.event_kind ? ` · ${DRIVER_EVENT_KIND_LABELS[ev.event_kind]}` : ""}
                          </span>
                        )}
                      </div>
                      {ev.location && <p>📍 {ev.location}</p>}
                      {ev.note && <p className="text-gray-400">{ev.note}</p>}
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-gray-300">Pending</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
