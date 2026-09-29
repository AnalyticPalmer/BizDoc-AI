/**
 * BizDoctor AI analysis configuration.
 *
 * Defines:
 * - Available analysis types
 * - Display information
 * - Required canonical fields
 * - Dataset availability rules
 * - Missing-field messages
 */

import type { ColumnMapping } from "./api";

/* -------------------------------------------------------------------------- */
/*                              ANALYSIS TYPES                                */
/* -------------------------------------------------------------------------- */

export type AnalysisType =
  | "sales"
  | "customer"
  | "churn"
  | "profitability"
  | "inventory"
  | "expiry"
  | "forecast"
  | "full_report";

/* -------------------------------------------------------------------------- */
/*                         ANALYSIS DEFINITION                                */
/* -------------------------------------------------------------------------- */

export interface AnalysisDefinition {
  id: AnalysisType;

  name: string;

  shortDescription: string;

  description: string;

  icon: string;

  requiredFields: string[];
}

/**
 * Functions in this file accept either:
 *
 * - an AnalysisType
 * - an AnalysisDefinition
 *
 * This keeps older Analytics UI code compatible.
 */
export type AnalysisReference =
  | AnalysisType
  | AnalysisDefinition;

/* -------------------------------------------------------------------------- */
/*                          ANALYSIS DEFINITIONS                              */
/* -------------------------------------------------------------------------- */

export const ANALYSIS_DEFINITIONS: AnalysisDefinition[] = [
  {
    id: "sales",

    name: "Sales Analytics",

    shortDescription:
      "Understand revenue, orders and sales performance.",

    description:
      "Analyze revenue, order volume, units sold, average order value, top products and monthly sales performance.",

    icon: "trending-up",

    requiredFields: [
      "revenue",
    ],
  },

  {
    id: "customer",

    name: "Customer Intelligence",

    shortDescription:
      "Understand customer value and revenue concentration.",

    description:
      "Identify your most valuable customers, repeat customers and revenue concentration risks.",

    icon: "users",

    requiredFields: [
      "revenue",
      "customer_id",
      "customer_name",
    ],
  },

  {
    id: "churn",

    name: "Customer Churn",

    shortDescription:
      "Identify customers showing signs of disengagement.",

    description:
      "Analyze customer purchasing activity to identify customers who may be becoming inactive.",

    icon: "user-minus",

    requiredFields: [
      "transaction_date",
      "revenue",
    ],
  },

  {
    id: "profitability",

    name: "Profitability",

    shortDescription:
      "Find profitable, low-margin and loss-making products.",

    description:
      "Understand revenue, costs, gross profit and product-level margins so you can identify where money is being made or lost.",

    icon: "trending-up",

    requiredFields: [
      "revenue",
      "cost_price",
    ],
  },

  {
    id: "inventory",

    name: "Inventory Intelligence",

    shortDescription:
      "Monitor stock levels, velocity and replenishment needs.",

    description:
      "Identify stock-out risks, products running low, sales velocity and recommended replenishment quantities.",

    icon: "boxes",

    requiredFields: [
      "stock_quantity",
      "quantity",
      "product_name",
    ],
  },

  {
    id: "expiry",

    name: "Expiry Intelligence",

    shortDescription:
      "Identify expired and soon-to-expire inventory.",

    description:
      "Analyze expiry dates, stock exposure, batches and suppliers to identify inventory that may require immediate attention.",

    icon: "calendar-clock",

    requiredFields: [
      "expiry_date",
      "product_name",
    ],
  },

  {
    id: "forecast",

    name: "Sales Forecast",

    shortDescription:
      "Understand future sales trends.",

    description:
      "Analyze historical sales patterns to help identify future revenue and demand trends.",

    icon: "trending-up",

    requiredFields: [
      "transaction_date",
      "revenue",
    ],
  },

  {
    id: "full_report",

    name: "Full Business Report",

    shortDescription:
      "Generate a broad business health assessment.",

    description:
      "Combine available business intelligence into a comprehensive business performance report.",

    icon: "file-chart",

    requiredFields: [
      "revenue",
    ],
  },
];

/* -------------------------------------------------------------------------- */
/*                         SUPPORTED ANALYSES                                 */
/* -------------------------------------------------------------------------- */

export const SUPPORTED_ANALYSES: AnalysisType[] = [
  "sales",
  "customer",
  "profitability",
  "inventory",
  "expiry",
];

/* -------------------------------------------------------------------------- */
/*                         INTERNAL HELPERS                                  */
/* -------------------------------------------------------------------------- */

function normalizeAnalysisReference(
  analysis:
    AnalysisReference
): AnalysisType {
  if (
    typeof analysis === "string"
  ) {
    return analysis;
  }

  return analysis.id;
}

function getMappedFields(
  mappings: ColumnMapping[]
): Set<string> {
  return new Set(
    mappings
      .filter(
        (mapping) =>
          Boolean(
            mapping.canonical_field
          )
      )
      .map(
        (mapping) =>
          mapping.canonical_field as string
      )
  );
}

/* -------------------------------------------------------------------------- */
/*                       ANALYSIS AVAILABILITY                               */
/* -------------------------------------------------------------------------- */

export function isAnalysisAvailable(
  analysis:
    AnalysisReference,
  mappings: ColumnMapping[]
): boolean {
  const analysisType =
    normalizeAnalysisReference(
      analysis
    );

  const mappedFields =
    getMappedFields(
      mappings
    );

  switch (analysisType) {
    case "customer":
      return (
        mappedFields.has(
          "revenue"
        ) &&
        (
          mappedFields.has(
            "customer_id"
          ) ||
          mappedFields.has(
            "customer_name"
          )
        )
      );

    case "profitability":
      return (
        mappedFields.has(
          "revenue"
        ) &&
        (
          mappedFields.has(
            "cost_price"
          ) ||
          mappedFields.has(
            "profit"
          )
        )
      );

    case "inventory":
      return (
        mappedFields.has(
          "stock_quantity"
        ) &&
        mappedFields.has(
          "quantity"
        ) &&
        (
          mappedFields.has(
            "product_name"
          ) ||
          mappedFields.has(
            "product_id"
          )
        )
      );

    case "expiry":
      return (
        mappedFields.has(
          "expiry_date"
        ) &&
        (
          mappedFields.has(
            "product_name"
          ) ||
          mappedFields.has(
            "product_id"
          )
        )
      );

    case "full_report":
      return mappedFields.has(
        "revenue"
      );

    case "sales":
      return mappedFields.has(
        "revenue"
      );

    case "churn":
    case "forecast":
      return (
        mappedFields.has(
          "transaction_date"
        ) &&
        mappedFields.has(
          "revenue"
        )
      );

    default:
      return false;
  }
}

/* -------------------------------------------------------------------------- */
/*                         MISSING FIELD HELPERS                              */
/* -------------------------------------------------------------------------- */

export function getMissingFields(
  analysis:
    AnalysisReference,
  mappings: ColumnMapping[]
): string[] {
  const analysisType =
    normalizeAnalysisReference(
      analysis
    );

  const mappedFields =
    getMappedFields(
      mappings
    );

  switch (analysisType) {
    case "customer": {
      const missing: string[] = [];

      if (
        !mappedFields.has(
          "revenue"
        )
      ) {
        missing.push(
          "revenue"
        );
      }

      if (
        !mappedFields.has(
          "customer_id"
        ) &&
        !mappedFields.has(
          "customer_name"
        )
      ) {
        missing.push(
          "customer ID or customer name"
        );
      }

      return missing;
    }

    case "profitability": {
      const missing: string[] = [];

      if (
        !mappedFields.has(
          "revenue"
        )
      ) {
        missing.push(
          "revenue"
        );
      }

      if (
        !mappedFields.has(
          "cost_price"
        ) &&
        !mappedFields.has(
          "profit"
        )
      ) {
        missing.push(
          "cost price or profit"
        );
      }

      return missing;
    }

    case "inventory": {
      const missing: string[] = [];

      if (
        !mappedFields.has(
          "stock_quantity"
        )
      ) {
        missing.push(
          "stock quantity"
        );
      }

      if (
        !mappedFields.has(
          "quantity"
        )
      ) {
        missing.push(
          "quantity sold"
        );
      }

      if (
        !mappedFields.has(
          "product_name"
        ) &&
        !mappedFields.has(
          "product_id"
        )
      ) {
        missing.push(
          "product name or product ID"
        );
      }

      return missing;
    }

    case "expiry": {
      const missing: string[] = [];

      if (
        !mappedFields.has(
          "expiry_date"
        )
      ) {
        missing.push(
          "expiry date"
        );
      }

      if (
        !mappedFields.has(
          "product_name"
        ) &&
        !mappedFields.has(
          "product_id"
        )
      ) {
        missing.push(
          "product name or product ID"
        );
      }

      return missing;
    }

    case "full_report":
    case "sales":
      return mappedFields.has(
        "revenue"
      )
        ? []
        : ["revenue"];

    case "churn":
    case "forecast": {
      const missing: string[] = [];

      if (
        !mappedFields.has(
          "transaction_date"
        )
      ) {
        missing.push(
          "transaction date"
        );
      }

      if (
        !mappedFields.has(
          "revenue"
        )
      ) {
        missing.push(
          "revenue"
        );
      }

      return missing;
    }

    default:
      return [];
  }
}

/* -------------------------------------------------------------------------- */
/*                    BACKWARD-COMPATIBLE HELPERS                            */
/* -------------------------------------------------------------------------- */

export function getMissingAnalysisFields(
  analysis:
    AnalysisReference,
  mappings: ColumnMapping[]
): string[] {
  return getMissingFields(
    analysis,
    mappings
  );
}

export function formatCanonicalField(
  field: string
): string {
  return field
    .replace(
      /_/g,
      " "
    )
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase()
    );
}

/* -------------------------------------------------------------------------- */
/*                          DISPLAY HELPERS                                   */
/* -------------------------------------------------------------------------- */

export function getAnalysisDefinition(
  analysisType: AnalysisType
): AnalysisDefinition {
  return (
    ANALYSIS_DEFINITIONS.find(
      (analysis) =>
        analysis.id ===
        analysisType
    ) ??
    ANALYSIS_DEFINITIONS[0]
  );
}

export function getAnalysisName(
  analysisType: AnalysisType
): string {
  return getAnalysisDefinition(
    analysisType
  ).name;
}