"use client";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { ArrowLeft, RefreshCw } from "lucide-react";
import TrackerStatusStepper, { STATUS_STYLES, type TrackerOrderEvent, type TrackerOrderStatus } from "../../../../../../components/TrackerStatusStepper";

const API = process.env.NEXT_PUBLIC_API_URL || "https://gogobackend-production.up.railway.app";

interface TrackerOrder {
  id: string;
  company_id: string;
  booked_for_company_name: string;
  booked_for_phone: string;
  dispatch_from: string;
  dispatch_to: string;
  transporter_name: string;
  transporter_phone: string;
  driver_id: string | null;
  driver_name: string;
  driver_phone: string;
  vehicle_number: string;
  eway_bill_number: string;
  eway_bill_file_url: string;
  status: TrackerOrderStatus;
  public_tracking_token: string;
  created_at: string;
  consignee_name: string | null;
  material: string | null;
  quantity: string | null;
  dispatch_datetime: string | null;
  documents_enclosed: string | null;
  signature_url: string | null;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  const isEmpty = value === null || value === undefined || value === "";
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900 text-right">{isEmpty ? "—" : value}</span>
    </div>
  );
}

export default function TrackerOrderDetailPage() {
  const { id, orderId } = useParams<{ id: string; orderId: string }>();
  const router = useRouter();

  const [order,  setOrder]  = useState<TrackerOrder | null>(null);
  const [events, setEvents] = useState<TrackerOrderEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("access_token") : "");
  const headers = { Authorization: `Bearer ${token()}` };

  const load = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/gogoo/dashboard/tracker/companies/${id}/orders/${orderId}`, { headers });
      setOrder(data?.order || null);
      setEvents(data?.events || []);
    } catch {
      toast.error("Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [id, orderId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-5">
        <div className="h-8 bg-gray-100 rounded w-32" />
        <div className="h-32 bg-gray-100 rounded-2xl" />
        <div className="h-48 bg-gray-100 rounded-2xl" />
      </div>
    );
  }
  if (!order) {
    return (
      <div className="text-center py-20">
        <p className="text-4xl mb-4">🔍</p>
        <p className="text-lg font-semibold text-gray-900 mb-2">Order not found</p>
        <button onClick={() => router.push(`/dashboard/tracker-companies/${id}`)} className="text-orange-500 text-sm font-semibold">
          ← Back to Company
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <Toaster position="top-right" />

      <button onClick={() => router.push(`/dashboard/tracker-companies/${id}`)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-orange-500 transition font-medium">
        <ArrowLeft size={16} /> Back to Company
      </button>

      {/* ── Order Header ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h2 className="text-xl font-bold text-gray-900">{order.booked_for_company_name}</h2>
              <span className={`text-xs font-bold px-2 py-1 rounded-full capitalize ${STATUS_STYLES[order.status]}`}>
                {order.status.replace("_", " ")}
              </span>
            </div>
            <p className="text-sm text-gray-500">{order.booked_for_phone}</p>
          </div>
          <button onClick={load} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition">
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* ── Tracking Timeline ── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
        <h3 className="text-base font-bold text-gray-900 mb-5">Tracking Timeline</h3>
        <TrackerStatusStepper status={order.status} events={events} />
      </div>

      {/* ── Proof of Delivery ── */}
      {order.signature_url && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
          <h3 className="text-base font-bold text-gray-900 mb-4">Proof of Delivery</h3>
          {/* eslint-disable-next-line @next/next/no-img-element -- signature comes from Cloudinary/local uploads, not a next/image-configured domain */}
          <img
            src={order.signature_url.startsWith("http") ? order.signature_url : `${API}${order.signature_url}`}
            alt="Delivery signature"
            className="w-full max-w-md rounded-xl border border-gray-100 bg-gray-50"
          />
        </div>
      )}

      {/* ── Order Details ── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">Order Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-1">
          <div>
            <p className="text-[11px] font-bold text-orange-500 uppercase tracking-wider mb-1">Route</p>
            <Field label="Dispatch From" value={order.dispatch_from} />
            <Field label="Dispatch To" value={order.dispatch_to} />
            <Field label="Vehicle Number" value={order.vehicle_number} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-orange-500 uppercase tracking-wider mb-1">Driver</p>
            <Field label="Driver Name" value={order.driver_name} />
            <Field label="Driver Phone" value={order.driver_phone} />
            <Field label="Transporter" value={order.transporter_name} />
            <Field label="Transporter Phone" value={order.transporter_phone} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-orange-500 uppercase tracking-wider mb-1">Dispatch Details</p>
            <Field label="Consignee" value={order.consignee_name} />
            <Field label="Material" value={order.material} />
            <Field label="Quantity" value={order.quantity} />
            <Field label="Dispatch Date & Time" value={order.dispatch_datetime ? fmtDate(order.dispatch_datetime) : null} />
            <Field label="Documents Enclosed" value={order.documents_enclosed} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-orange-500 uppercase tracking-wider mb-1">E-Way Bill</p>
            <Field label="E-Way Bill No." value={order.eway_bill_number} />
            <Field label="Document" value={order.eway_bill_file_url ? (
              <a href={order.eway_bill_file_url.startsWith("http") ? order.eway_bill_file_url : `${API}${order.eway_bill_file_url}`}
                target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">View</a>
            ) : null} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-orange-500 uppercase tracking-wider mb-1">Meta</p>
            <Field label="Created" value={fmtDate(order.created_at)} />
            <Field label="Public Tracking Token" value={order.public_tracking_token} />
          </div>
        </div>
      </div>
    </div>
  );
}
