"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Columns3,
  HelpCircle,
} from "lucide-react";

import type {
  ColumnMapping,
  DatasetInspectionResponse,
} from "@/lib/api";

type ColumnMappingReviewProps = {
  inspection: DatasetInspectionResponse;

  onConfirmed: (
    mappings: ColumnMapping[],
  ) => void;
};

const CANONICAL_FIELDS = [
  {
    value: "",
    label: "Do not use",
  },
  {
    value: "transaction_date",
    label: "Transaction Date",
  },
  {
    value: "order_id",
    label: "Order / Invoice ID",
  },
  {
    value: "customer_id",
    label: "Customer ID",
  },
  {
    value: "customer_name",
    label: "Customer Name",
  },
  {
    value: "product_id",
    label: "Product ID / SKU",
  },
  {
    value: "product_name",
    label: "Product Name",
  },
  {
    value: "category",
    label: "Category",
  },
  {
    value: "quantity",
    label: "Quantity",
  },
  {
    value: "unit_price",
    label: "Unit / Selling Price",
  },
  {
    value: "cost_price",
    label: "Cost / Buying Price",
  },
  {
    value: "revenue",
    label: "Revenue / Sales Amount",
  },
  {
    value: "discount",
    label: "Discount",
  },
  {
    value: "profit",
    label: "Profit",
  },
  {
    value: "stock_quantity",
    label: "Stock Quantity",
  },
  {
    value: "supplier",
    label: "Supplier",
  },
  {
    value: "branch",
    label: "Branch / Location",
  },
  {
    value: "payment_method",
    label: "Payment Method",
  },
  {
    value: "expiry_date",
    label: "Expiry Date",
  },
  {
    value: "batch_number",
    label: "Batch Number",
  },
];

export default function ColumnMappingReview({
  inspection,
  onConfirmed,
}: ColumnMappingReviewProps) {
  const [mappings, setMappings] =
    useState<ColumnMapping[]>(
      inspection.column_mappings,
    );

  const usedFields = useMemo(() => {
    return new Set(
      mappings
        .map(
          (mapping) =>
            mapping.canonical_field,
        )
        .filter(
          (field): field is string =>
            field !== null &&
            field !== "",
        ),
    );
  }, [mappings]);

  const mappedCount = mappings.filter(
    (mapping) =>
      mapping.canonical_field !== null,
  ).length;

  const unmappedCount =
    mappings.length - mappedCount;

  const coverage =
    mappings.length === 0
      ? 0
      : Math.round(
          (mappedCount / mappings.length) *
            100,
        );

  function updateMapping(
    originalColumn: string,
    value: string,
  ) {
    setMappings((currentMappings) =>
      currentMappings.map((mapping) => {
        if (
          mapping.original_column !==
          originalColumn
        ) {
          return mapping;
        }

        return {
          ...mapping,
          canonical_field:
            value === ""
              ? null
              : value,
          confidence: 1,
          match_type: "manual",
        };
      }),
    );
  }

  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-[#E4E7EC] bg-white">
      <div className="border-b border-[#E4E7EC] p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#3157F6]">
              <Columns3 size={21} />
            </div>

            <div>
              <h2 className="text-base font-semibold text-[#101828]">
                Confirm your data columns
              </h2>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-[#667085]">
                BizDoctor interpreted your
                spreadsheet automatically.
                Review the detected fields before
                we calculate business insights.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-full bg-[#ECFDF3] px-3 py-1.5 text-xs font-semibold text-[#027A48]">
            <CheckCircle2 size={14} />

            {coverage}% understood
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <SummaryCard
            label="Columns"
            value={mappings.length}
          />

          <SummaryCard
            label="Recognized"
            value={mappedCount}
          />

          <SummaryCard
            label="Needs review"
            value={unmappedCount}
            warning={unmappedCount > 0}
          />
        </div>
      </div>

      <div className="divide-y divide-[#F2F4F7]">
        {mappings.map((mapping) => {
          const isMapped =
            mapping.canonical_field !==
            null;

          return (
            <div
              key={mapping.original_column}
              className="grid gap-4 p-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:px-6"
            >
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.05em] text-[#98A2B3]">
                  Your column
                </p>

                <p className="mt-1 text-sm font-semibold text-[#344054]">
                  {mapping.original_column}
                </p>
              </div>

              <ArrowRight
                size={17}
                className="hidden text-[#98A2B3] sm:block"
              />

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <p className="text-xs font-medium uppercase tracking-[0.05em] text-[#98A2B3]">
                    BizDoctor field
                  </p>

                  {isMapped ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-[#039855]">
                      <Check size={12} />

                      {mapping.match_type ===
                      "manual"
                        ? "Confirmed"
                        : "Detected"}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-medium text-[#DC6803]">
                      <HelpCircle size={12} />

                      Review
                    </span>
                  )}
                </div>

                <select
                  value={
                    mapping.canonical_field ??
                    ""
                  }
                  onChange={(event) =>
                    updateMapping(
                      mapping.original_column,
                      event.target.value,
                    )
                  }
                  className="w-full rounded-xl border border-[#D0D5DD] bg-white px-3 py-2.5 text-sm text-[#344054] outline-none transition focus:border-[#3157F6] focus:ring-2 focus:ring-[#3157F6]/10"
                >
                  {CANONICAL_FIELDS.map(
                    (field) => {
                      const alreadyUsed =
                        field.value !== "" &&
                        field.value !==
                          mapping.canonical_field &&
                        usedFields.has(
                          field.value,
                        );

                      return (
                        <option
                          key={field.value}
                          value={field.value}
                          disabled={
                            alreadyUsed
                          }
                        >
                          {field.label}

                          {alreadyUsed
                            ? " — already used"
                            : ""}
                        </option>
                      );
                    },
                  )}
                </select>
              </div>
            </div>
          );
        })}
      </div>

      {unmappedCount > 0 && (
        <div className="mx-5 mb-5 flex gap-3 rounded-xl bg-[#FFFAEB] p-4 sm:mx-6">
          <AlertTriangle
            size={18}
            className="mt-0.5 shrink-0 text-[#DC6803]"
          />

          <div>
            <p className="text-sm font-semibold text-[#B54708]">
              {unmappedCount} column
              {unmappedCount === 1
                ? ""
                : "s"}{" "}
              needs review
            </p>

            <p className="mt-1 text-xs leading-5 text-[#B54708]">
              If the column contains notes or
              information BizDoctor does not need,
              leave it as “Do not use”.
              Otherwise choose the correct business
              field above.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col justify-between gap-4 border-t border-[#E4E7EC] p-5 sm:flex-row sm:items-center sm:px-6">
        <p className="max-w-xl text-xs leading-5 text-[#667085]">
          Confirming your columns prevents
          BizDoctor from calculating sales,
          inventory or customer metrics using
          the wrong data.
        </p>

        <button
          type="button"
          onClick={() =>
            onConfirmed(mappings)
          }
          className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#3157F6] px-5 text-sm font-semibold text-white transition hover:bg-[#2949D9]"
        >
          Confirm mappings

          <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div className="rounded-xl bg-[#F9FAFB] p-4">
      <p className="text-xs font-medium text-[#667085]">
        {label}
      </p>

      <p
        className={`mt-1 text-xl font-semibold ${
          warning
            ? "text-[#DC6803]"
            : "text-[#101828]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}