"use client";

import { useActionState, useState, useRef, useEffect } from "react";
import {
  Loader2, Upload, X, CheckCircle, FileText, Image as ImageIcon, ArrowRight, ShieldCheck
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { submitAppAction } from "@/lib/actions/apps";
import { uploadFileDirect } from "@/lib/utils/upload-client";
import { extractApkPackageName } from "@/lib/utils/apk-parser";
import { createClient } from "@/lib/supabase/client";
import { SubmitPaymentModal } from "@/components/forms/submit-payment-modal";
import type { Category } from "@/types";

interface AppSubmissionFormProps {
  categories: Category[];
  isAdmin?: boolean;
}

function FileUploadZone({
  label, accept, hint, onUpload, uploading, uploadedUrl, fileName,
}: {
  label: string;
  accept: string;
  hint: string;
  onUpload: (file: File) => Promise<void>;
  uploading: boolean;
  uploadedUrl: string;
  fileName: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await onUpload(file);
  };

  const isImage = accept.includes("image");

  return (
    <div>
      <label className="mb-2 block text-sm font-medium">{label}</label>
      <div
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
          uploadedUrl
            ? "border-primary/40 bg-primary/5"
            : "border-white/15 bg-white/3 hover:border-primary/30 hover:bg-primary/3"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleChange}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-secondary-400">Uploading...</p>
          </div>
        ) : uploadedUrl && isImage ? (
          <div className="flex flex-col items-center gap-2">
            <div className="relative h-20 w-20 overflow-hidden rounded-xl">
              <Image src={uploadedUrl} alt="Uploaded" fill className="object-cover" sizes="80px" />
            </div>
            <p className="text-xs text-primary flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" /> {fileName}
            </p>
            <p className="text-xs text-secondary-500">Click to change</p>
          </div>
        ) : uploadedUrl ? (
          <div className="flex flex-col items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            <p className="text-xs text-primary flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" /> {fileName}
            </p>
            <p className="text-xs text-secondary-500">Click to change</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {isImage ? (
              <ImageIcon className="h-8 w-8 text-secondary-500" />
            ) : (
              <Upload className="h-8 w-8 text-secondary-500" />
            )}
            <p className="text-sm text-secondary-400">Click to upload</p>
            <p className="text-xs text-secondary-600">{hint}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ScreenshotsUpload({
  screenshots,
  onAdd,
  onRemove,
  uploading,
}: {
  screenshots: { url: string; name: string }[];
  onAdd: (files: FileList | File[]) => Promise<void>;
  onRemove: (i: number) => void;
  uploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <label className="mb-2 block text-sm font-medium">
        Screenshots <span className="text-secondary-500 text-xs">(select up to 8 images at once)</span>
      </label>
      <div className="flex flex-wrap gap-3">
        {screenshots.map((ss, i) => (
          <div key={i} className="relative">
            <div className="relative h-28 w-16 overflow-hidden rounded-xl ring-1 ring-white/10">
              <Image src={ss.url} alt={`Screenshot ${i + 1}`} fill className="object-cover" sizes="64px" />
            </div>
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute -right-1.5 -top-1.5 rounded-full bg-red-500 p-0.5 text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {screenshots.length < 8 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex h-28 w-16 flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/15 text-secondary-500 transition-all hover:border-primary/30 hover:text-primary"
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={async (e) => {
                const files = e.target.files;
                if (files && files.length > 0) await onAdd(files);
                e.target.value = "";
              }}
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-1">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-[9px] text-primary font-medium">Uploading</span>
              </div>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                <span className="mt-1 text-[10px]">Add Photos</span>
              </>
            )}
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-secondary-500">PNG/JPG, max 5MB each. You can select multiple images at once.</p>
    </div>
  );
}

export function AppSubmissionForm({ categories, isAdmin = false }: AppSubmissionFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(submitAppAction, {});

  // Current user ID
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
      }
    });
  }, []);

  // Modal & Selected Plan State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [validationError, setValidationError] = useState("");

  // Submitted plan payload values
  const [chosenPlan, setChosenPlan] = useState<"basic" | "featured" | "starter">("basic");
  const [chosenAmountPaise, setChosenAmountPaise] = useState(9900);
  const [paymentScreenshotUrl, setPaymentScreenshotUrl] = useState("");

  // File upload state
  const [apkUrl, setApkUrl] = useState("");
  const [apkPath, setApkPath] = useState("");
  const [apkName, setApkName] = useState("");
  const [packageName, setPackageName] = useState("");
  const [apkSizeBytes, setApkSizeBytes] = useState(0);
  const [apkUploading, setApkUploading] = useState(false);
  const [apkError, setApkError] = useState("");
  const [apkProgress, setApkProgress] = useState(0);

  const [iconUrl, setIconUrl] = useState("");
  const [iconUploading, setIconUploading] = useState(false);
  const [iconError, setIconError] = useState("");
  const [iconName, setIconName] = useState("");

  const [bannerUrl, setBannerUrl] = useState("");
  const [bannerUploading, setBannerUploading] = useState(false);
  const [bannerName, setBannerName] = useState("");

  const [screenshots, setScreenshots] = useState<{ url: string; name: string }[]>([]);
  const [ssUploading, setSsUploading] = useState(false);

  const uploadApk = async (file: File) => {
    setApkUploading(true);
    setApkError("");
    setApkProgress(10);

    // Extract package name from APK ZIP
    const extractedPkg = await extractApkPackageName(file);
    if (extractedPkg) {
      setPackageName(extractedPkg);
    }

    const result = await uploadFileDirect(file, "app-apks", userId);
    setApkProgress(100);
    setApkUploading(false);
    setApkProgress(0);
    if (result.error) { setApkError(result.error); return; }
    setApkUrl(result.url!);
    setApkPath(result.path!);
    setApkName(file.name);
    setApkSizeBytes(result.sizeBytes ?? file.size);
  };

  const uploadIcon = async (file: File) => {
    setIconUploading(true);
    setIconError("");
    const result = await uploadFileDirect(file, "app-icons", userId);
    setIconUploading(false);
    if (result.error) { setIconError(result.error); return; }
    setIconUrl(result.url!);
    setIconName(file.name);
  };

  const uploadBanner = async (file: File) => {
    setBannerUploading(true);
    const result = await uploadFileDirect(file, "app-banners", userId);
    setBannerUploading(false);
    if (result.error) return;
    setBannerUrl(result.url!);
    setBannerName(file.name);
  };

  const addScreenshots = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).slice(0, 8 - screenshots.length);
    if (fileArray.length === 0) return;
    setSsUploading(true);

    const uploads = await Promise.all(
      fileArray.map(async (file) => {
        const result = await uploadFileDirect(file, "app-screenshots", userId);
        if (result.url) {
          return { url: result.url, name: file.name };
        }
        return null;
      })
    );

    const validUploads = uploads.filter(
      (u): u is { url: string; name: string } => u !== null
    );

    setScreenshots((prev) => [...prev, ...validUploads]);
    setSsUploading(false);
  };

  const removeScreenshot = (i: number) => {
    setScreenshots((prev) => prev.filter((_, idx) => idx !== i));
  };

  // Open modal if form fields are valid
  const handleOpenModal = () => {
    setValidationError("");
    if (!apkUrl) {
      setValidationError("Please upload your app's APK file first.");
      return;
    }
    if (!iconUrl) {
      setValidationError("Please upload your app's icon image first.");
      return;
    }
    if (!formRef.current?.checkValidity()) {
      formRef.current?.reportValidity();
      return;
    }

    if (isAdmin) {
      // Admin bypasses payment modal directly
      formRef.current?.requestSubmit();
      return;
    }

    setIsModalOpen(true);
  };

  // Called when developer completes modal (Step 3 -> Step 4)
  const handleFinalSubmitFromModal = async (payload: {
    plan: "basic" | "featured" | "starter";
    amountPaise: number;
    screenshotUrl: string;
  }) => {
    setChosenPlan(payload.plan);
    setChosenAmountPaise(payload.amountPaise);
    setPaymentScreenshotUrl(payload.screenshotUrl);

    // Wait for state to sync and trigger form submission
    setTimeout(() => {
      if (formRef.current) {
        const formData = new FormData(formRef.current);
        formData.set("publishing_plan", payload.plan);
        formData.set("payment_amount_paise", payload.amountPaise.toString());
        formData.set("payment_screenshot_url", payload.screenshotUrl);
        formAction(formData);
      }
    }, 100);
  };

  return (
    <>
      <form ref={formRef} action={formAction} className="space-y-8">
        {/* Hidden fields for uploaded files */}
        <input type="hidden" name="package_name" value={packageName} />
        <input type="hidden" name="apk_url" value={apkUrl} />
        <input type="hidden" name="apk_path" value={apkPath} />
        <input type="hidden" name="apk_size_bytes" value={apkSizeBytes} />
        <input type="hidden" name="icon_url" value={iconUrl} />
        <input type="hidden" name="banner_url" value={bannerUrl} />
        <input type="hidden" name="screenshots" value={JSON.stringify(screenshots.map((s) => s.url))} />
        <input type="hidden" name="publishing_plan" value={chosenPlan} />
        <input type="hidden" name="payment_amount_paise" value={chosenAmountPaise} />
        <input type="hidden" name="payment_screenshot_url" value={paymentScreenshotUrl} />

        {(state.error || validationError) && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {state.error || validationError}
          </div>
        )}

        {/* ── App Info ─────────────────────────────────────────────── */}
        <Card>
          <h2 className="mb-6 font-heading text-lg font-semibold">App Information</h2>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  App Name <span className="text-red-400">*</span>
                </label>
                <Input name="name" placeholder="My Awesome App" required maxLength={100} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Category <span className="text-red-400">*</span>
                </label>
                <Select name="category_id" required>
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">
                Short Description <span className="text-red-400">*</span>
              </label>
              <Input name="short_description" placeholder="One-liner tagline (max 200 chars)" required maxLength={200} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">
                Full Description <span className="text-red-400">*</span>
              </label>
              <Textarea name="full_description" placeholder="Detailed description of your app..." rows={5} required minLength={50} maxLength={5000} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Version <span className="text-red-400">*</span>
                </label>
                <Input name="version" placeholder="1.0.0" required maxLength={20} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Tags</label>
                <Input name="tags" placeholder="utility, free, offline (comma separated)" />
              </div>
            </div>
          </div>
        </Card>

        {/* ── File Uploads ──────────────────────────────────────────── */}
        <Card>
          <h2 className="mb-6 font-heading text-lg font-semibold">App Files & Assets</h2>
          <div className="space-y-6">
            <div>
              <FileUploadZone
                label="APK File *"
                accept=".apk"
                hint=".apk only · max 150 MB · uploads directly to storage"
                onUpload={uploadApk}
                uploading={apkUploading}
                uploadedUrl={apkUrl}
                fileName={apkName}
              />
              {apkUploading && apkProgress > 0 && (
                <div className="mt-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300 animate-pulse"
                      style={{ width: `${apkProgress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-primary">Uploading directly to storage...</p>
                </div>
              )}
              {apkError && <p className="mt-1 text-xs text-red-400">{apkError}</p>}
              {!apkUrl && !apkUploading && (
                <p className="mt-1 text-xs text-secondary-500">APK required · uploads go directly from your browser to storage (fast)</p>
              )}
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <FileUploadZone
                  label="App Icon *"
                  accept="image/*"
                  hint="512×512 PNG recommended · max 2 MB"
                  onUpload={uploadIcon}
                  uploading={iconUploading}
                  uploadedUrl={iconUrl}
                  fileName={iconName}
                />
                {iconError && <p className="mt-1 text-xs text-red-400">{iconError}</p>}
              </div>

              <FileUploadZone
                label="Banner Image (optional)"
                accept="image/*"
                hint="1024×500 PNG recommended · max 5 MB"
                onUpload={uploadBanner}
                uploading={bannerUploading}
                uploadedUrl={bannerUrl}
                fileName={bannerName}
              />
            </div>

            <ScreenshotsUpload
              screenshots={screenshots}
              onAdd={addScreenshots}
              onRemove={removeScreenshot}
              uploading={ssUploading}
            />
          </div>
        </Card>

        {/* ── Links ─────────────────────────────────────────────────── */}
        <Card>
          <h2 className="mb-6 font-heading text-lg font-semibold">Links & Contact</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Developer Website</label>
              <Input name="developer_website" type="url" placeholder="https://yourwebsite.com" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Privacy Policy URL</label>
              <Input name="privacy_policy_url" type="url" placeholder="https://yourwebsite.com/privacy" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Support Email</label>
              <Input name="support_email" type="email" placeholder="support@yourapp.com" />
            </div>
          </div>
        </Card>

        {/* ── Submit CTA ────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-sm text-secondary-500">
            By submitting, you agree to AppHub&apos;s developer policies.
          </p>
          <Button
            type="button"
            size="lg"
            onClick={handleOpenModal}
            disabled={pending || !apkUrl || !iconUrl}
            className="gap-2 shrink-0"
          >
            {pending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
            ) : isAdmin ? (
              <><ShieldCheck className="h-4 w-4" /> Publish Instantly (Admin)</>
            ) : (
              <>Submit for Review <ArrowRight className="h-4 w-4" /></>
            )}
          </Button>
        </div>
        {(!apkUrl || !iconUrl) && (
          <p className="text-xs text-yellow-400">
            ⚠ Please upload the APK file and app icon before submitting.
          </p>
        )}
      </form>

      {/* Payment & Submission Modal */}
      <SubmitPaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={userId}
        onFinalSubmit={handleFinalSubmitFromModal}
        isSubmitting={pending}
        submitError={state.error ?? ""}
      />
    </>
  );
}
