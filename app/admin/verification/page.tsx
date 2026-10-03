"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, guardRoute } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard-shell";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { fmtNgnFull } from "@/lib/format";

const NAV = [
  { href: "/admin/operations", label: "Operations" },
  { href: "/admin/verification", label: "Verification" },
  { href: "/admin/finance", label: "Finance" },
  { href: "/admin/support", label: "Support" },
];

interface EquipmentPending {
  id: string;
  slug: string;
  merchantName: string;
  name: string;
  category: string;
  brand: string;
  model: string;
  year: number;
  condition: string;
  locationState: string;
  locationCity: string;
  listingType: string;
  merchantRentalRate: number;
  salePrice: number | null;
  verificationStatus: string;
  createdAt: string;
  images: string[];
}

export default function VerificationDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingEquipment, setPendingEquipment] = useState<EquipmentPending[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentPending | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionNote, setRejectionNote] = useState("");

  useEffect(() => {
    const s = getSession();
    const redirect = guardRoute("VERIFICATION_ADMIN", s);
    if (redirect) {
      router.replace(redirect);
      return;
    }
    setUser(s);
    loadPendingEquipment();
  }, [router]);

  const loadPendingEquipment = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/admin/equipment/pending", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();
      if (result.success) {
        setPendingEquipment(result.data || []);
      }
    } catch (error) {
      console.error("Failed to load pending equipment:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (equipmentId: string) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/admin/equipment/${equipmentId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to approve equipment");
      }

      toast.success("Equipment approved and published!");
      setSelectedEquipment(null);
      loadPendingEquipment();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (equipmentId: string) => {
    if (!rejectionNote.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setActionLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/admin/equipment/${equipmentId}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: rejectionNote }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to reject equipment");
      }

      toast.success("Equipment rejected. Merchant has been notified.");
      setSelectedEquipment(null);
      setRejectionNote("");
      loadPendingEquipment();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestMoreInfo = async (equipmentId: string) => {
    if (!rejectionNote.trim()) {
      toast.error("Please specify what information is needed");
      return;
    }

    setActionLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/admin/equipment/${equipmentId}/request-info`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: rejectionNote }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to request information");
      }

      toast.success("Information request sent to merchant");
      setSelectedEquipment(null);
      setRejectionNote("");
      loadPendingEquipment();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (!user) return <div className="min-h-screen bg-canvas" />;

  return (
    <DashboardShell user={user} nav={NAV} title="Equipment Verification">
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="card-surface rounded-xl p-5">
          <div className="text-2xl font-black">{pendingEquipment.length}</div>
          <div className="text-sm text-ink-muted">Pending Verification</div>
        </div>
        <div className="card-surface rounded-xl p-5">
          <div className="text-2xl font-black text-success">
            {pendingEquipment.filter(e => e.verificationStatus === "VERIFIED").length}
          </div>
          <div className="text-sm text-ink-muted">Verified Today</div>
        </div>
        <div className="card-surface rounded-xl p-5">
          <div className="text-2xl font-black text-warn">
            {pendingEquipment.filter(e => e.verificationStatus === "MORE_INFORMATION_REQUIRED").length}
          </div>
          <div className="text-sm text-ink-muted">Needs More Info</div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-ink-muted">Loading equipment...</div>
      ) : pendingEquipment.length === 0 ? (
        <div className="card-surface rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">✅</div>
          <div className="font-bold text-lg">All Caught Up!</div>
          <div className="text-sm text-ink-muted mt-1">
            No equipment pending verification right now.
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Equipment List */}
          <div className="space-y-3">
            {pendingEquipment.map((eq) => (
              <motion.div
                key={eq.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`card-surface rounded-xl p-4 cursor-pointer transition ${
                  selectedEquipment?.id === eq.id ? "ring-2 ring-cheesco-yellow" : ""
                }`}
                onClick={() => setSelectedEquipment(eq)}
              >
                <div className="flex gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={eq.images[0] || "/placeholder.jpg"}
                    alt={eq.name}
                    className="h-20 w-28 shrink-0 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{eq.name}</div>
                    <div className="text-xs text-ink-faint mt-0.5">
                      {eq.brand} {eq.model} • {eq.year}
                    </div>
                    <div className="text-xs text-ink-muted mt-1">
                      {eq.merchantName} • {eq.locationCity}, {eq.locationState}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <span className="rounded-full bg-warn/20 text-warn px-2 py-0.5 text-[10px] font-bold">
                        {eq.verificationStatus}
                      </span>
                      <span className="rounded-full bg-card-raised px-2 py-0.5 text-[10px] font-bold text-ink-muted">
                        {eq.listingType.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Equipment Details & Actions */}
          <div className="sticky top-20">
            {selectedEquipment ? (
              <motion.div
                key={selectedEquipment.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="card-surface rounded-xl p-6"
              >
                <h2 className="text-xl font-black mb-4">{selectedEquipment.name}</h2>

                {/* Image Gallery */}
                <div className="mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedEquipment.images[0]}
                    alt={selectedEquipment.name}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  {selectedEquipment.images.length > 1 && (
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      {selectedEquipment.images.slice(1, 5).map((img, idx) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={idx}
                          src={img}
                          alt={`${selectedEquipment.name} ${idx + 2}`}
                          className="h-16 w-full object-cover rounded"
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-3 text-sm mb-6">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-ink-faint">Category</div>
                      <div className="font-medium">{selectedEquipment.category}</div>
                    </div>
                    <div>
                      <div className="text-ink-faint">Condition</div>
                      <div className="font-medium">{selectedEquipment.condition.replace(/_/g, " ")}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-ink-faint">Location</div>
                      <div className="font-medium">
                        {selectedEquipment.locationCity}, {selectedEquipment.locationState}
                      </div>
                    </div>
                    <div>
                      <div className="text-ink-faint">Merchant</div>
                      <div className="font-medium">{selectedEquipment.merchantName}</div>
                    </div>
                  </div>

                  {selectedEquipment.merchantRentalRate && (
                    <div>
                      <div className="text-ink-faint">Merchant Rate</div>
                      <div className="font-bold text-lg">
                        ₦{fmtNgnFull(selectedEquipment.merchantRentalRate)}/day
                      </div>
                      <div className="text-xs text-ink-muted">
                        Suggested: ₦{fmtNgnFull(selectedEquipment.merchantRentalRate * 1.15)}/day (15% margin)
                      </div>
                    </div>
                  )}

                  {selectedEquipment.salePrice && (
                    <div>
                      <div className="text-ink-faint">Sale Price</div>
                      <div className="font-bold text-lg">₦{fmtNgnFull(selectedEquipment.salePrice)}</div>
                    </div>
                  )}
                </div>

                {/* Verification Actions */}
                <div className="space-y-3">
                  <button
                    onClick={() => handleApprove(selectedEquipment.id)}
                    disabled={actionLoading}
                    className="w-full rounded-lg bg-success px-4 py-3 font-bold text-white hover:bg-success/90 disabled:opacity-50"
                  >
                    ✅ Approve & Publish
                  </button>

                  <div className="border-t border-line-soft pt-3">
                    <textarea
                      value={rejectionNote}
                      onChange={(e) => setRejectionNote(e.target.value)}
                      placeholder="Reason for rejection or information needed..."
                      rows={3}
                      className="w-full bg-canvas-deep border border-line-soft rounded-lg px-4 py-2 text-sm outline-none focus:border-cheesco-yellow/60 resize-none"
                    />

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleRequestMoreInfo(selectedEquipment.id)}
                        disabled={actionLoading || !rejectionNote.trim()}
                        className="rounded-lg bg-warn/20 text-warn px-4 py-2 text-sm font-bold hover:bg-warn/30 disabled:opacity-50"
                      >
                        📩 Request Info
                      </button>
                      <button
                        onClick={() => handleReject(selectedEquipment.id)}
                        disabled={actionLoading || !rejectionNote.trim()}
                        className="rounded-lg bg-danger/20 text-danger px-4 py-2 text-sm font-bold hover:bg-danger/30 disabled:opacity-50"
                      >
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-xs text-ink-faint">
                  Submitted: {new Date(selectedEquipment.createdAt).toLocaleDateString()}
                </div>
              </motion.div>
            ) : (
              <div className="card-surface rounded-xl p-12 text-center">
                <div className="text-4xl mb-3">👈</div>
                <div className="font-bold">Select Equipment</div>
                <div className="text-sm text-ink-muted mt-1">
                  Click on an item to review and verify
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
