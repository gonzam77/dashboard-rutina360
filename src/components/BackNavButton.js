"use client";

import { useRouter } from "next/navigation";

export default function BackNavButton({
  fallbackHref,
  allowHistoryBack = true,
  children = "Volver",
  className = "",
}) {
  const router = useRouter();

  function handleBack() {
    // If there is browser history, return to the exact previous view.
    if (allowHistoryBack && typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }

  return (
    <button type="button" onClick={handleBack} className={className}>
      {children}
    </button>
  );
}
