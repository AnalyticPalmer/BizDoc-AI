"use client";

import { useEffect, useState } from "react";

import { getApiHealth } from "@/lib/api";

type ApiStatus = "checking" | "online" | "offline";

export default function ApiStatus() {
  const [status, setStatus] = useState<ApiStatus>("checking");

  useEffect(() => {
    let active = true;

    async function checkApi() {
      try {
        await getApiHealth();

        if (active) {
          setStatus("online");
        }
      } catch (error) {
        console.error("BizDoctor API connection failed:", error);

        if (active) {
          setStatus("offline");
        }
      }
    }

    checkApi();

    return () => {
      active = false;
    };
  }, []);

  const config = {
    checking: {
      text: "Checking API",
      dot: "bg-amber-500",
      textColor: "text-amber-700",
      background: "bg-amber-50",
    },
    online: {
      text: "API Connected",
      dot: "bg-emerald-500",
      textColor: "text-emerald-700",
      background: "bg-emerald-50",
    },
    offline: {
      text: "API Offline",
      dot: "bg-red-500",
      textColor: "text-red-700",
      background: "bg-red-50",
    },
  }[status];

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium ${config.background} ${config.textColor}`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${config.dot}`} />
      {config.text}
    </div>
  );
}