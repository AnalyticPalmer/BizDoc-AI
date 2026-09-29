"use client";

/**
 * BizDoctor Analytics Workspace
 *
 * Flow:
 *
 *     Dataset Upload
 *           ↓
 *     Dataset Inspection
 *           ↓
 *     Column Mapping
 *           ↓
 *     Analytics Workspace
 *           ↓
 *     Selected Analysis
 *           ↓
 *     Backend Analysis Engine
 *           ↓
 *     Dedicated Dashboard Report
 *
 * The uploaded dataset is NOT uploaded again.
 *
 * The backend stores the complete dataset and returns
 * a dataset_id. This page sends that dataset_id together
 * with the confirmed column mappings to the selected
 * analysis endpoint.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ANALYSIS_DEFINITIONS,
  formatCanonicalField,
  getMissingAnalysisFields,
  isAnalysisAvailable,
  type AnalysisDefinition,
  type AnalysisType,
} from "@/lib/analysis";

import {
  analyzeDataset,
  ApiError,
  DEFAULT_CURRENCY,
  type ColumnMapping,
  type CurrencyCode,
  type DatasetInspectionResponse,
} from "@/lib/api";

/**
 * Analysis engines currently implemented by the backend.
 *
 * Inventory is now fully supported.
 */
const SUPPORTED_ANALYSES: AnalysisType[] = [
  "sales",
  "customer",
  "profitability",
  "inventory",
];

/**
 * Session structure saved by the upload workspace.
 */
interface AnalyticsSession {
  dataset_id: string;
  inspection: DatasetInspectionResponse;
  mappings: ColumnMapping[];

  /**
   * Currency selected for the analysis.
   *
   * Older sessions may not contain this value,
   * so DEFAULT_CURRENCY is used as a fallback.
   */
  currency?: CurrencyCode;
}

/**
 * Safely retrieve the current analytics session.
 */
function getAnalyticsSession(): AnalyticsSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedSession = window.sessionStorage.getItem(
    "bizdoctor-analytics-session",
  );

  if (!storedSession) {
    return null;
  }

  try {
    const parsedSession = JSON.parse(
      storedSession,
    ) as AnalyticsSession;

    if (
      !parsedSession.dataset_id ||
      !parsedSession.inspection ||
      !Array.isArray(parsedSession.mappings)
    ) {
      return null;
    }

    return parsedSession;
  } catch {
    window.sessionStorage.removeItem(
      "bizdoctor-analytics-session",
    );

    return null;
  }
}

/**
 * Check whether the backend currently supports
 * the selected analysis.
 */
function isAnalysisSupported(
  analysisType: AnalysisType,
): boolean {
  return SUPPORTED_ANALYSES.includes(analysisType);
}

export default function AnalyticsPage() {
  const router = useRouter();

  /**
   * Analytics session loaded from sessionStorage.
   */
  const [session, setSession] =
    useState<AnalyticsSession | null>(null);

  /**
   * Tracks whether the browser has finished
   * loading the session.
   */
  const [isSessionLoaded, setIsSessionLoaded] =
    useState(false);

  /**
   * Selected analysis.
   */
  const [selectedAnalysis, setSelectedAnalysis] =
    useState<AnalysisType>("sales");

  /**
   * Analysis execution state.
   */
  const [isRunning, setIsRunning] = useState(false);

  /**
   * User-facing API error.
   */
  const [error, setError] = useState<string | null>(null);

  /**
   * Load the analytics session after the component
   * has mounted in the browser.
   */
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const storedSession = getAnalyticsSession();

      setSession(storedSession);
      setIsSessionLoaded(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  /**
   * Stable loading state.
   */
  if (!isSessionLoaded) {
    return (
      <main className="min-h-screen bg-[#09090b] px-6 py-16 text-white">
        <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400">
              <SpinnerIcon />
            </div>

            <h1 className="mt-5 text-xl font-semibold">
              Loading analytics workspace
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Preparing your dataset and analysis options...
            </p>
          </div>
        </div>
      </main>
    );
  }

  /**
   * If no dataset session exists, return the user
   * to the upload workflow.
   */
  if (!session) {
    return (
      <main className="min-h-screen bg-[#09090b] px-6 py-16 text-white">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400">
              <UploadIcon />
            </div>

            <h1 className="mt-6 text-2xl font-semibold">
              No dataset selected
            </h1>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-400">
              Upload and map a business dataset before
              selecting an analytics report.
            </p>

            <button
              type="button"
              onClick={() => router.push("/upload")}
              className="mt-6 rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-amber-300"
            >
              Upload Dataset
            </button>
          </div>
        </div>
      </main>
    );
  }

  /**
   * Use the selected currency from the upload session.
   *
   * Older sessions that do not have a currency
   * automatically fall back to NGN.
   */
  const currency =
    session.currency ?? DEFAULT_CURRENCY;

  /**
   * Build the availability map.
   *
   * "Available" means the dataset contains the
   * required fields.
   *
   * Backend support is checked separately.
   */
  const analysisAvailability = new Map(
    ANALYSIS_DEFINITIONS.map((analysis) => [
      analysis.id,
      isAnalysisAvailable(
        analysis,
        session.mappings,
      ),
    ]),
  );

  /**
   * Find the currently selected analysis.
   */
  const selectedDefinition =
    ANALYSIS_DEFINITIONS.find(
      (analysis) =>
        analysis.id === selectedAnalysis,
    ) ?? ANALYSIS_DEFINITIONS[0];

  /**
   * Determine which fields are missing.
   */
  const missingFields =
    getMissingAnalysisFields(
      selectedDefinition,
      session.mappings,
    );

  /**
   * Determine whether the selected analysis is
   * supported by the backend.
   */
  const selectedAnalysisSupported =
    isAnalysisSupported(selectedAnalysis);

  /**
   * Determine whether the dataset has the required
   * fields for the selected analysis.
   */
  const selectedAnalysisAvailable =
    analysisAvailability.get(
      selectedAnalysis,
    ) ?? false;

  /**
   * Run the selected analysis.
   *
   * The complete dataset stays on the backend.
   *
   * We only send:
   *
   *     dataset_id
   *     confirmed column mappings
   *     currency
   */
  const handleRunAnalysis = async () => {
    if (!session) {
      router.push("/upload");
      return;
    }

    if (isRunning) {
      return;
    }

    /**
     * Validate required data fields.
     */
    if (
      !selectedAnalysisAvailable ||
      missingFields.length > 0
    ) {
      return;
    }

    /**
     * Prevent unsupported analyses from being
     * sent to the backend.
     */
    if (!selectedAnalysisSupported) {
      setError(
        `${selectedDefinition.name} is not available yet. This analysis engine is coming soon.`,
      );
      return;
    }

    setError(null);
    setIsRunning(true);

    try {
      /**
       * Run the selected backend analysis.
       */
      const result = await analyzeDataset({
        analysisType: selectedAnalysis,
        datasetId: session.dataset_id,
        mappings: session.mappings,
        currency,
      });

      /**
       * Save the computed result for the dedicated
       * dashboard report.
       */
      window.sessionStorage.setItem(
        "bizdoctor-dashboard-session",
        JSON.stringify({
          analysisType: selectedAnalysis,
          datasetId: session.dataset_id,
          result,
          currency,
          filename: session.inspection.filename,
          rowCount: session.inspection.row_count,
          columnCount: session.inspection.column_count,
        }),
      );

      /**
       * Keep the selected analysis available as a
       * lightweight navigation reference.
       */
      window.sessionStorage.setItem(
        "bizdoctor-selected-analysis",
        JSON.stringify({
          analysis_type: selectedAnalysis,
          dataset_id: session.dataset_id,
          currency,
        }),
      );

      /**
       * Open the dedicated analytics dashboard.
       */
      router.push("/dashboard");
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        setError(
          requestError.detail ||
            "BizDoctor could not complete the analysis.",
        );
      } else {
        setError(
          "Something went wrong while running the analysis. Please try again.",
        );
      }

      setIsRunning(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#09090b] px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <header className="mb-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Analytics Workspace
              </div>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                What would you like to analyse?
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                Choose an analytics report for{" "}
                <span className="font-medium text-zinc-200">
                  {session.inspection.filename}
                </span>
                . Your uploaded dataset will be reused
                across the analysis reports.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <p className="text-xs text-zinc-500">
                Dataset
              </p>

              <p className="mt-1 text-sm font-medium text-white">
                {session.inspection.row_count.toLocaleString()}{" "}
                rows · {session.inspection.column_count}{" "}
                columns
              </p>

              <p className="mt-1 text-xs text-zinc-600">
                Currency: {currency}
              </p>
            </div>
          </div>
        </header>

        {/* Main Workspace */}
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Analysis List */}
          <section>
            <div className="grid gap-4 sm:grid-cols-2">
              {ANALYSIS_DEFINITIONS.map(
                (analysis) => {
                  const available =
                    analysisAvailability.get(
                      analysis.id,
                    ) ?? false;

                  const supported =
                    isAnalysisSupported(
                      analysis.id,
                    );

                  const selected =
                    selectedAnalysis ===
                    analysis.id;

                  return (
                    <AnalysisCard
                      key={analysis.id}
                      analysis={analysis}
                      available={available}
                      supported={supported}
                      selected={selected}
                      mappings={session.mappings}
                      onSelect={() => {
                        if (
                          available &&
                          supported &&
                          !isRunning
                        ) {
                          setError(null);
                          setSelectedAnalysis(
                            analysis.id,
                          );
                        }
                      }}
                    />
                  );
                },
              )}
            </div>
          </section>

          {/* Selected Analysis Panel */}
          <aside className="h-fit rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl lg:sticky lg:top-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400">
              <AnalysisIcon
                icon={selectedDefinition.icon}
              />
            </div>

            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Selected Analysis
            </p>

            <h2 className="mt-2 text-2xl font-semibold text-white">
              {selectedDefinition.name}
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {selectedDefinition.description}
            </p>

            {/* Data Requirements */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Data requirements
              </p>

              {missingFields.length === 0 ? (
                <div className="mt-4 flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400">
                    <CheckIcon />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-emerald-300">
                      Ready to analyse
                    </p>

                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      Your dataset contains the required
                      fields for this analysis.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-400/10 text-red-400">
                      <LockIcon />
                    </div>

                    <div>
                      <p className="text-sm font-medium text-red-300">
                        Additional data required
                      </p>

                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        Map the following fields before
                        running this analysis:
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {missingFields.map(
                      (field) => (
                        <span
                          key={field}
                          className="rounded-lg border border-red-400/10 bg-red-400/5 px-2.5 py-1.5 text-xs text-red-300"
                        >
                          {formatCanonicalField(
                            field,
                          )}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Backend Availability */}
            {!selectedAnalysisSupported && (
              <div className="mt-4 rounded-2xl border border-amber-400/10 bg-amber-400/[0.04] p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400/10 text-amber-400">
                    <SparkleIcon />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-amber-300">
                      Coming soon
                    </p>

                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      This analysis engine is not available
                      yet.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-4 rounded-2xl border border-red-400/10 bg-red-400/[0.04] p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-400/10 text-red-400">
                    <AlertIcon />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-red-300">
                      Analysis failed
                    </p>

                    <p className="mt-1 text-xs leading-5 text-zinc-400">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Run Button */}
            <button
              type="button"
              onClick={handleRunAnalysis}
              disabled={
                missingFields.length > 0 ||
                !selectedAnalysisSupported ||
                isRunning
              }
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3.5 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-zinc-500"
            >
              {isRunning ? (
                <>
                  <SpinnerIcon />
                  Analysing dataset...
                </>
              ) : (
                <>
                  Run Analysis
                  <ArrowIcon />
                </>
              )}
            </button>

            <p className="mt-4 text-center text-xs leading-5 text-zinc-600">
              The complete uploaded dataset will be analysed.
              You do not need to upload it again.
            </p>
          </aside>
        </div>
      </div>
    </main>
  );
}

/**
 * Individual analysis selection card.
 */
function AnalysisCard({
  analysis,
  available,
  supported,
  selected,
  mappings,
  onSelect,
}: {
  analysis: AnalysisDefinition;
  available: boolean;
  supported: boolean;
  selected: boolean;
  mappings: ColumnMapping[];
  onSelect: () => void;
}) {
  const missingFields =
    getMissingAnalysisFields(
      analysis,
      mappings,
    );

  const selectable =
    available && supported;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!selectable}
      className={`group relative overflow-hidden rounded-3xl border p-6 text-left transition ${
        selected
          ? "border-amber-400/50 bg-amber-400/[0.06] shadow-[0_0_40px_rgba(251,191,36,0.06)]"
          : selectable
            ? "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]"
            : "cursor-not-allowed border-white/5 bg-white/[0.015] opacity-60"
      }`}
    >
      {selected && (
        <div className="absolute right-5 top-5 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-black">
          <CheckIcon />
        </div>
      )}

      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
          selectable
            ? "bg-amber-400/10 text-amber-400"
            : "bg-white/5 text-zinc-600"
        }`}
      >
        <AnalysisIcon icon={analysis.icon} />
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold text-white">
          {analysis.name}
        </h3>

        <p className="mt-2 text-sm leading-6 text-zinc-500">
          {analysis.shortDescription}
        </p>
      </div>

      <div className="mt-5">
        {!supported ? (
          <span className="inline-flex items-center gap-2 rounded-lg bg-amber-400/5 px-2.5 py-1.5 text-xs font-medium text-amber-500">
            <SparkleIcon />
            Coming soon
          </span>
        ) : available ? (
          <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-400/10 px-2.5 py-1.5 text-xs font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Ready
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs font-medium text-zinc-500">
            <LockIcon />

            {missingFields.length > 0
              ? `Requires ${formatCanonicalField(
                  missingFields[0],
                )}`
              : "Unavailable"}
          </span>
        )}
      </div>
    </button>
  );
}

/**
 * Analysis icon component.
 */
function AnalysisIcon({
  icon,
}: {
  icon: string;
}) {
  if (icon === "users") {
    return (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }

  if (icon === "user-minus") {
    return (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="9" cy="7" r="4" />
        <path d="M3 21v-2a6 6 0 0 1 12 0v2" />
        <path d="M19 8v6" />
        <path d="M16 11h6" />
      </svg>
    );
  }

  if (icon === "trending-up") {
    return (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    );
  }

  if (icon === "boxes") {
    return (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m21 8-9-5-9 5 9 5 9-5Z" />
        <path d="m3 8 9 5 9-5" />
        <path d="M3 8v8l9 5 9-5V8" />
        <path d="M12 13v8" />
      </svg>
    );
  }

  if (icon === "sparkles") {
    return (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m12 3-1.5 5.5L5 10l5.5 1.5L12 17l1.5-5.5L19 10l-5.5-1.5L12 3Z" />
        <path d="m19 15-.75 2.75L15.5 18.5l2.75.75L19 15Z" />
      </svg>
    );
  }

  if (icon === "file-chart") {
    return (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
        <path d="M8 17v-4" />
        <path d="M12 17v-7" />
        <path d="M16 17v-2" />
      </svg>
    );
  }

  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" y1="19" x2="20" y2="19" />
      <polyline points="4 15 8 11 12 14 20 5" />
    </svg>
  );
}

/**
 * Check icon.
 */
function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/**
 * Lock icon.
 */
function LockIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        width="18"
        height="11"
        x="3"
        y="11"
        rx="2"
      />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

/**
 * Arrow icon.
 */
function ArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
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
 * Spinner icon.
 */
function SpinnerIcon() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  );
}

/**
 * Alert icon.
 */
function AlertIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.3 3.7 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

/**
 * Small sparkle icon used for roadmap/coming-soon states.
 */
function SparkleIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 3-1.5 6.5L4 11l6.5 1.5L12 19l1.5-6.5L20 11l-6.5-1.5L12 3Z" />
    </svg>
  );
}