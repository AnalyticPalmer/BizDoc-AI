"use client";

/**
 * BizDoctor Dataset Upload Workspace
 *
 * Flow:
 *
 * Home
 *   ↓
 * Upload Dataset
 *   ↓
 * Inspect Complete Dataset
 *   ↓
 * Confirm Column Mapping
 *   ↓
 * Analytics Workspace
 *
 * Important:
 * - The complete dataset stays on the backend.
 * - sessionStorage only stores the dataset reference,
 *   inspection metadata, mappings, and session settings.
 * - No analysis is executed from this component.
 */

import {
  useState,
  type ChangeEvent,
} from "react";

import { useRouter } from "next/navigation";

import {
  inspectDataset,
  type ColumnMapping,
  type DatasetInspectionResponse,
} from "@/lib/api";

import ColumnMappingReview from "./column-mapping-review";

const ANALYTICS_SESSION_KEY =
  "bizdoctor-analytics-session";

export default function UploadWorkspace() {
  const router = useRouter();

  const [file, setFile] =
    useState<File | null>(null);

  const [inspection, setInspection] =
    useState<DatasetInspectionResponse | null>(
      null,
    );

  const [isInspecting, setIsInspecting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  /**
   * Handles file selection.
   */
  const handleFileChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile =
      event.target.files?.[0] ?? null;

    setFile(selectedFile);
    setInspection(null);
    setError(null);
  };

  /**
   * Uploads the file and requests dataset inspection.
   */
  const handleInspect = async () => {
    if (!file) {
      setError(
        "Please select a CSV or Excel file first.",
      );

      return;
    }

    setIsInspecting(true);
    setError(null);

    try {
      const result =
        await inspectDataset(file);

      setInspection(result);
    } catch (inspectionError) {
      setError(
        inspectionError instanceof Error
          ? inspectionError.message
          : "Unable to inspect the uploaded dataset.",
      );
    } finally {
      setIsInspecting(false);
    }
  };

  /**
   * Called after the user confirms the column mappings.
   *
   * The complete dataset remains on the backend.
   *
   * We only store:
   * - dataset_id
   * - inspection metadata
   * - confirmed mappings
   * - selected currency
   *
   * The Analytics Workspace then uses this session
   * to run whichever analysis the user chooses.
   */
  const handleMappingsConfirmed = (
    mappings: ColumnMapping[],
  ) => {
    if (!inspection?.dataset_id) {
      setError(
        "The dataset session could not be found. Please upload the file again.",
      );

      return;
    }

    sessionStorage.setItem(
      ANALYTICS_SESSION_KEY,
      JSON.stringify({
        dataset_id: inspection.dataset_id,
        inspection,
        mappings,

        // Default currency for the analytics workspace.
        // The user can change this later.
        currency: "NGN",
      }),
    );

    /**
     * Continue automatically to Analytics.
     *
     * The user should never have to manually type
     * /analytics after confirming the mapping.
     */
    router.push("/analytics");
  };

  /**
   * Return to the main BizDoctor dashboard.
   */
  const handleBackToHome = () => {
    router.push("/");
  };

  return (
    <div className="space-y-8">
      {/* ------------------------------------------------ */}
      {/* Workspace Navigation */}
      {/* ------------------------------------------------ */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
            BizDoctor Workspace
          </p>

          <p className="mt-1 text-sm text-zinc-400">
            Upload and prepare your business dataset.
          </p>
        </div>

        <button
          type="button"
          onClick={handleBackToHome}
          className="inline-flex items-center justify-center gap-2 self-start rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
        >
          <ArrowLeftIcon />
          Back to Dashboard
        </button>
      </div>

      {/* ------------------------------------------------ */}
      {/* Progress Indicator */}
      {/* ------------------------------------------------ */}

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <ProgressStep
            number="1"
            label="Upload"
            active
          />

          <ProgressLine />

          <ProgressStep
            number="2"
            label="Map Columns"
            active={Boolean(inspection)}
          />

          <ProgressLine />

          <ProgressStep
            number="3"
            label="Analytics"
            active={false}
          />
        </div>
      </section>

      {/* ------------------------------------------------ */}
      {/* Upload Section */}
      {/* ------------------------------------------------ */}

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-xl">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
            Step 1
          </p>

          <h2 className="mt-2 text-2xl font-semibold text-white">
            Upload your business data
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Upload your sales, customer, inventory,
            or business operations data. BizDoctor
            will inspect the complete dataset before
            you choose an analysis.
          </p>
        </div>

        <div className="rounded-xl border border-dashed border-white/15 bg-black/20 p-8">
          <label
            htmlFor="business-file"
            className="flex cursor-pointer flex-col items-center justify-center text-center"
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400">
              <UploadIcon />
            </div>

            <span className="text-sm font-medium text-white">
              {file
                ? file.name
                : "Choose a CSV or Excel file"}
            </span>

            <span className="mt-2 text-xs text-zinc-500">
              CSV, XLSX or XLS • Maximum 25MB
            </span>

            <input
              id="business-file"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>
        </div>

        {file && (
          <div className="mt-5 flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-white">
                {file.name}
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                {(file.size / 1024 / 1024).toFixed(
                  2,
                )}{" "}
                MB
              </p>
            </div>

            <button
              type="button"
              onClick={handleInspect}
              disabled={isInspecting}
              className="rounded-lg bg-amber-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isInspecting
                ? "Inspecting..."
                : "Inspect Dataset"}
            </button>
          </div>
        )}
      </section>

      {/* ------------------------------------------------ */}
      {/* Error */}
      {/* ------------------------------------------------ */}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* ------------------------------------------------ */}
      {/* Inspection Results */}
      {/* ------------------------------------------------ */}

      {inspection && (
        <>
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-xl">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
                Dataset Inspection
              </p>

              <h2 className="mt-2 text-2xl font-semibold text-white">
                We found your data
              </h2>

              <p className="mt-2 text-sm text-zinc-400">
                BizDoctor has inspected the complete
                uploaded dataset.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <InspectionCard
                label="Rows"
                value={inspection.row_count.toLocaleString()}
              />

              <InspectionCard
                label="Columns"
                value={inspection.column_count.toLocaleString()}
              />

              <InspectionCard
                label="Completeness"
                value={`${inspection.completeness_percent}%`}
              />

              <InspectionCard
                label="Mapped Columns"
                value={`${inspection.mapping_summary.coverage_percent}%`}
              />
            </div>
          </section>

          {/* ------------------------------------------------ */}
          {/* Column Mapping */}
          {/* ------------------------------------------------ */}

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-xl">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
                Step 2
              </p>

              <h2 className="mt-2 text-2xl font-semibold text-white">
                Confirm your column mapping
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                BizDoctor has identified the likely
                meaning of your columns. Review the
                mappings before continuing to analytics.
              </p>
            </div>

            <ColumnMappingReview
              inspection={inspection}
              onConfirmed={
                handleMappingsConfirmed
              }
            />
          </section>
        </>
      )}
    </div>
  );
}

/**
 * Progress step.
 */
function ProgressStep({
  number,
  label,
  active = false,
}: {
  number: string;
  label: string;
  active?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
          active
            ? "bg-amber-400 text-black"
            : "bg-white/10 text-zinc-500"
        }`}
      >
        {number}
      </div>

      <span
        className={`text-sm font-medium ${
          active
            ? "text-white"
            : "text-zinc-500"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

/**
 * Progress connector.
 */
function ProgressLine() {
  return (
    <div className="hidden h-px flex-1 bg-white/10 sm:block" />
  );
}

/**
 * Dataset inspection summary card.
 */
function InspectionCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>

      <p className="mt-2 text-xl font-semibold text-white">
        {value}
      </p>
    </div>
  );
}

/**
 * Upload icon.
 */
function UploadIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 20h14" />
    </svg>
  );
}

/**
 * Back arrow icon.
 */
function ArrowLeftIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}