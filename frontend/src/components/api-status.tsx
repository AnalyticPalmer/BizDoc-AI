/**
 * BizDoctor AI API Status
 *
 * Displays the current connection status between the
 * frontend and the FastAPI backend.
 */

"use client";

import { useEffect, useState } from "react";

import { checkHealth } from "@/lib/api";

/* -------------------------------------------------------------------------- */
/*                              TYPES                                         */
/* -------------------------------------------------------------------------- */

type ApiStatus =
  | "checking"
  | "online"
  | "offline";

/* -------------------------------------------------------------------------- */
/*                              COMPONENT                                     */
/* -------------------------------------------------------------------------- */

export default function ApiStatus() {
  const [status, setStatus] =
    useState<ApiStatus>("checking");

  useEffect(() => {
    let mounted = true;

    const checkApiStatus = async () => {
      try {
        await checkHealth();

        if (mounted) {
          setStatus("online");
        }
      } catch {
        if (mounted) {
          setStatus("offline");
        }
      }
    };

    checkApiStatus();

    return () => {
      mounted = false;
    };
  }, []);

  /* ------------------------------------------------------------------------ */
  /*                              RENDER                                      */
  /* ------------------------------------------------------------------------ */

  if (status === "checking") {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400" />
        <span>Checking API...</span>
      </div>
    );
  }

  if (status === "online") {
    return (
      <div className="flex items-center gap-2 text-xs text-emerald-600">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        <span>API Online</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-red-600">
      <span className="h-2 w-2 rounded-full bg-red-500" />
      <span>API Offline</span>
    </div>
  );
}