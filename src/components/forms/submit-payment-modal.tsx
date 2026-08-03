"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle, Upload, Loader2, Copy, Check,
  ArrowRight, Shield, Star, Crown, X, ArrowLeft, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadFileDirect } from "@/lib/utils/upload-client";

interface SubmitPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onFinalSubmit: (payload: {
    plan: "starter" | "basic" | "featured";
    amountPaise: number;
    screenshotUrl: string;
  }) => Promise<void>;
  isSubmitting: boolean;
  submitError: string;
  submitSuccess?: boolean;
}

interface Plan {
  id: "starter" | "basic" | "featured";
  name: string;
  priceNumber: number;
  displayPrice: string;
  badge?: string;
  icon: React.ReactNode;
  features: string[];
  highlight?: boolean;
}

const UPI_ID = "shubhamsutar81981-3@okhdfcbank";
const PAYEE_NAME = "Shubham Sutar";

export function SubmitPaymentModal({
  isOpen,
  onClose,
  userId,
  onFinalSubmit,
  isSubmitting,
  submitError,
  submitSuccess,
}: SubmitPaymentModalProps) {
  // ── All hooks at top — no conditionals ────────────────────────────────────
  const [step, setStep] = useState<"select" | "pay" | "upload" | "done">("select");
  const [selectedPlanId, setSelectedPlanId] = useState<Plan["id"]>("starter");
  const [copied, setCopied] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Advance to done when server action succeeds
  useEffect(() => {
    if (submitSuccess) setStep("done");
  }, [submitSuccess]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep("select");
      setScreenshotUrl("");
      setUploadError("");
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const plans: Plan[] = [
    {
      id: "starter",
      name: "Starter",
      priceNumber: 5,
      displayPrice: "₹5",
      badge: "🎁 Try Now",
      icon: <Star className="h-5 w-5" />,
      features: ["Standard listing", "24–72h review", "App analytics", "Community support"],
      highlight: false,
    },
    {
      id: "basic",
      name: "Standard",
      priceNumber: 99,
      displayPrice: "₹99",
      badge: "Popular",
      icon: <Star className="h-5 w-5" />,
      features: ["Standard listing", "24–72h review", "App analytics", "Community support"],
      highlight: true,
    },
    {
      id: "featured",
      name: "Featured",
      priceNumber: 199,
      displayPrice: "₹199",
      badge: "⭐ Recommended",
      icon: <Crown className="h-5 w-5" />,
      features: ["Homepage featured placement", "6–12h review priority", "Premium analytics", "Badge on listing"],
      highlight: false,
    },
  ];

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? plans[0];
  const amountPaise = selectedPlan.priceNumber * 100;
  const upiIntentUri = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${selectedPlan.priceNumber}&cu=INR`;
  const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiIntentUri)}`;

  const copyUpi = async () => {
    await navigator.clipboard.writeText(UPI_ID).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) { setUploadError("Please upload an image file"); return; }
    if (file.size > 10 * 1024 * 1024) { setUploadError("File too large. Max 10MB."); return; }
    setUploadError("");
    setUploading(true);
    const result = await uploadFileDirect(file, "app-screenshots", userId);
    setUploading(false);
    if (result.error) { setUploadError(result.error); return; }
    setScreenshotUrl(result.url!);
  };

  const handleCompleteSubmit = async () => {
    if (!screenshotUrl || isSubmitting) return;
    await onFinalSubmit({ plan: selectedPlan.id, amountPaise, screenshotUrl });
    // step advances to "done" via useEffect watching submitSuccess
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-3xl rounded-3xl border border-white/10 bg-night-900 p-6 shadow-2xl sm:p-8"
      >
        {step !== "done" && (
          <button type="button" onClick={onClose} disabled={isSubmitting}
            className="absolute right-5 top-5 rounded-full bg-white/5 p-2 text-secondary-400 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        )}

        <AnimatePresence mode="wait">

          {/* ── STEP 1: SELECT PLAN ────────── */}
          {step === "select" && (
            <motion.div key="select" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="mb-6 text-center">
                <span className="badge-kiwi">Step 1 of 3</span>
                <h2 className="mt-2 font-heading text-2xl font-bold">Select Publishing Plan</h2>
                <p className="mt-1 text-sm text-secondary-400">Choose your listing plan to proceed with submission</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {plans.map((plan) => (
                  <button key={plan.id} type="button" onClick={() => setSelectedPlanId(plan.id)}
                    className={`relative rounded-2xl border p-5 text-left transition-all ${
                      selectedPlanId === plan.id
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30 shadow-glow"
                        : "border-white/10 bg-white/3 hover:border-primary/25"
                    }`}>
                    {plan.badge && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold text-night-900 whitespace-nowrap">
                        {plan.badge}
                      </span>
                    )}
                    <div className="flex items-center gap-2 text-primary mb-2 mt-1">
                      {plan.icon}
                      <span className="font-heading font-semibold">{plan.name}</span>
                    </div>
                    <div className="mb-3">
                      <span className="font-heading text-3xl font-bold">{plan.displayPrice}</span>
                    </div>
                    <ul className="space-y-1.5">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-1.5 text-xs text-secondary-300">
                          <CheckCircle className="mt-0.5 h-3 w-3 shrink-0 text-primary" />{f}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-5">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button onClick={() => setStep("pay")} className="gap-2">
                  Proceed to Payment ({selectedPlan.displayPrice}) <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: PAY VIA UPI ────────── */}
          {step === "pay" && (
            <motion.div key="pay" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="mb-4 text-center">
                <span className="badge-kiwi">Step 2 of 3</span>
                <h2 className="mt-2 font-heading text-2xl font-bold">Pay via UPI</h2>
                <p className="mt-1 text-sm text-secondary-400">Scan QR or pay to UPI ID using any app</p>
              </div>

              <div className="mx-auto max-w-sm rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center">
                <p className="text-xs uppercase tracking-wider text-secondary-400">Selected Plan</p>
                <p className="text-lg font-bold">{selectedPlan.name} Plan</p>
                <div className="mt-2 inline-flex items-baseline gap-1 rounded-full border border-primary/30 bg-primary/10 px-5 py-1.5">
                  <span className="font-heading text-2xl font-bold text-primary">{selectedPlan.displayPrice}</span>
                  <span className="text-xs text-secondary-400">fixed amount</span>
                </div>

                <div className="mx-auto my-4 h-52 w-52 overflow-hidden rounded-2xl border-4 border-primary/30 bg-white p-2 shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCodeApiUrl} alt="UPI QR Code" className="h-full w-full object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/upi-qr.png"; }} />
                </div>

                <div className="flex items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2">
                  <span className="truncate font-mono text-xs font-semibold text-primary">{UPI_ID}</span>
                  <button type="button" onClick={copyUpi}
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-primary/20 px-2 py-1 text-xs font-bold text-primary hover:bg-primary/30">
                    {copied ? <><Check className="h-3 w-3" />Copied</> : <><Copy className="h-3 w-3" />Copy</>}
                  </button>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5">
                <Button variant="secondary" onClick={() => setStep("select")} className="gap-1">
                  <ArrowLeft className="h-4 w-4" /> Change Plan
                </Button>
                <Button onClick={() => setStep("upload")} className="gap-2">
                  I&apos;ve Paid — Upload Proof <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: UPLOAD PROOF ────────── */}
          {step === "upload" && (
            <motion.div key="upload" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="mb-4 text-center">
                <span className="badge-kiwi">Step 3 of 3</span>
                <h2 className="mt-2 font-heading text-2xl font-bold">Upload Payment Proof</h2>
                <p className="mt-1 text-sm text-secondary-400">
                  Upload screenshot showing payment of {selectedPlan.displayPrice} to {UPI_ID}
                </p>
              </div>

              <div onClick={() => inputRef.current?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                  screenshotUrl ? "border-primary/40 bg-primary/5" : "border-white/15 bg-white/3 hover:border-primary/30"
                }`}>
                <input ref={inputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="text-sm text-secondary-400">Uploading screenshot...</p>
                  </div>
                ) : screenshotUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative h-40 w-28 overflow-hidden rounded-xl border-2 border-primary/30 shadow-lg">
                      <Image src={screenshotUrl} alt="Payment proof" fill className="object-cover" sizes="112px" />
                    </div>
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                      <CheckCircle className="h-4 w-4" /> Screenshot uploaded
                    </p>
                    <p className="text-[11px] text-secondary-500">Tap to replace</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm font-medium">Click to upload payment screenshot</p>
                    <p className="text-xs text-secondary-500">PNG, JPG · Max 10MB</p>
                  </div>
                )}
              </div>

              {uploadError && <p className="mt-2 text-xs text-center text-red-400">{uploadError}</p>}
              {submitError && (
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" /><span>{submitError}</span>
                </div>
              )}

              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5">
                <Button variant="secondary" onClick={() => setStep("pay")} disabled={isSubmitting}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={handleCompleteSubmit} disabled={!screenshotUrl || isSubmitting} className="gap-2">
                  {isSubmitting
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Submitting App...</>
                    : <><Shield className="h-4 w-4" />Submit App for Review</>}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 4: SUCCESS ────────── */}
          {step === "done" && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-4 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary ring-4 ring-primary/30">
                <CheckCircle className="h-10 w-10" />
              </div>
              <h2 className="font-heading text-2xl font-bold">App Submitted Successfully! 🎉</h2>
              <p className="mt-2 mx-auto max-w-md text-sm text-secondary-300">
                Your app and payment screenshot have been submitted. Our team will verify your payment and review your application before publishing.
              </p>

              <div className="mt-6 mx-auto max-w-sm space-y-2 text-left rounded-2xl border border-white/10 bg-white/3 p-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-secondary-400">Plan:</span>
                  <span className="font-semibold">{selectedPlan.name} ({selectedPlan.displayPrice})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-400">Status:</span>
                  <span className="font-semibold text-yellow-400">Pending Review</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary-400">Payment:</span>
                  <span className="font-semibold text-yellow-400">Pending Verification</span>
                </div>
              </div>

              <Button className="mt-8 w-full" onClick={() => { onClose(); window.location.href = "/dashboard/developer/apps"; }}>
                Go to Developer Dashboard
              </Button>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}
