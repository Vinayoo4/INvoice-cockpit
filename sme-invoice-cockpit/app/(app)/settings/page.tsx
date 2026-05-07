"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/components/AuthProvider";
import { PageHeader } from "@/app/components/PageHeader";

type Business = {
  id: string;
  name: string;
  gstin?: string;
  address?: string;
  country: string;
  timezone: string;
};

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [form, setForm] = useState({
    name: "",
    gstin: "",
    address: "",
    country: "IN",
    timezone: "Asia/Kolkata",
    whatsappNumber: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/business"),
      fetch("/api/auth/me"),
    ])
      .then(async ([bizRes, meRes]) => {
        const bizData = await bizRes.json();
        const meData = await meRes.json();
        if (!bizRes.ok) throw new Error(bizData.error ?? "Failed to load settings");
        if (!meRes.ok) throw new Error(meData.error ?? "Failed to load profile");
        return { bizData, meData };
      })
      .then(({ bizData, meData }) => {
        const b: Business = bizData.business;
        setBusiness(b);
        setForm({
          name: b.name,
          gstin: b.gstin ?? "",
          address: b.address ?? "",
          country: b.country,
          timezone: b.timezone,
          whatsappNumber: meData.user?.whatsappNumber ?? "",
        });
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load settings");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setSaving(true);
    try {
      const res = await fetch("/api/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          gstin: form.gstin,
          address: form.address,
          country: form.country,
          timezone: form.timezone,
        }),
      });
      const businessData = await res.json();

      if (!res.ok) {
        setError(businessData.error ?? "Failed to save business settings");
      } else {
        const profileRes = await fetch("/api/auth/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ whatsappNumber: form.whatsappNumber }),
        });
        const profileData = await profileRes.json();
        if (!profileRes.ok) {
          setError(profileData.error ?? "Failed to save WhatsApp number");
        } else {
          setBusiness(businessData.business);
          setSuccess(true);
          await refresh();
          setTimeout(() => setSuccess(false), 3000);
        }
      }
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-6 w-6 rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <PageHeader title="Settings" />

      {/* Account info */}
      <div className="card mb-6">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Account</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Email</span>
            <span className="text-white">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Role</span>
            <span className="text-white capitalize">{user?.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Business ID</span>
            <span className="text-xs font-mono text-slate-500">
              {business?.id}
            </span>
          </div>
        </div>
      </div>

      {/* Business settings */}
      <form onSubmit={handleSubmit} className="card space-y-4">
        <h2 className="text-sm font-semibold text-slate-300">Business Details</h2>

        <div>
          <label className="label">Business Name *</label>
          <input
            className="input"
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="label">GSTIN</label>
          <input
            className="input"
            type="text"
            placeholder="22AAAAA0000A1Z5"
            value={form.gstin}
            onChange={(e) => setForm((f) => ({ ...f, gstin: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Address</label>
          <textarea
            className="input resize-none"
            rows={2}
            placeholder="Street, City, State, PIN"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Country</label>
            <input
              className="input"
              type="text"
              placeholder="IN"
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Timezone</label>
            <select
              className="input"
              value={form.timezone}
              onChange={(e) =>
                setForm((f) => ({ ...f, timezone: e.target.value }))
              }
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST)</option>
              <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">WhatsApp Number</label>
          <input
            className="input"
            type="tel"
            placeholder="+919999999999"
            value={form.whatsappNumber}
            onChange={(e) =>
              setForm((f) => ({ ...f, whatsappNumber: e.target.value }))
            }
          />
          <p className="text-xs text-slate-500 mt-1">
            Used to map incoming WhatsApp commands to your business.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm text-emerald-400 bg-emerald-900/20 border border-emerald-800 rounded-lg px-3 py-2">
            ✓ Settings saved successfully!
          </p>
        )}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </form>

      {/* Integrations info */}
      <div className="card mt-6">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">
          Integrations
        </h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <span className="text-lg">💬</span>
            <div>
              <p className="text-white font-medium">WhatsApp Cloud API</p>
              <p className="text-slate-400 text-xs mt-0.5">
                Set{" "}
                <code className="bg-slate-800 px-1 rounded text-slate-300">
                  WA_PHONE_NUMBER_ID
                </code>
                ,{" "}
                <code className="bg-slate-800 px-1 rounded text-slate-300">
                  WA_ACCESS_TOKEN
                </code>
                , and{" "}
                <code className="bg-slate-800 px-1 rounded text-slate-300">
                  WA_WEBHOOK_VERIFY_TOKEN
                </code>{" "}
                in <code className="bg-slate-800 px-1 rounded text-slate-300">.env.local</code>.
                Webhook URL:{" "}
                <code className="bg-slate-800 px-1 rounded text-slate-300">
                  /api/webhooks/whatsapp
                </code>
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-lg">📱</span>
            <div>
              <p className="text-white font-medium">Meta (Instagram / FB)</p>
              <p className="text-slate-400 text-xs mt-0.5">
                Set{" "}
                <code className="bg-slate-800 px-1 rounded text-slate-300">
                  META_WEBHOOK_VERIFY_TOKEN
                </code>{" "}
                and point Meta webhook to{" "}
                <code className="bg-slate-800 px-1 rounded text-slate-300">
                  /api/webhooks/meta
                </code>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
