"use client";

import { useEffect } from "react";
import { clearSavedSignupDraft } from "@/lib/signup-draft";

export function AccountReady({ signupId, destination, ready = true }: { signupId: string; destination: string; ready?: boolean }) {
  useEffect(() => {
    try {
      // Normal and co-parent drafts have different keys. Clear only the draft
      // for this saved profile, never another tab's or family member's. A
      // satellite handoff is safe before authentication: the server confirmed
      // the row exists and its setup URL preserves the ID on the primary.
      clearSavedSignupDraft(window.localStorage, signupId);
    } catch { /* private browsing/storage unavailable */ }
    // A full navigation reads the newly activated session on the server.
    window.location.replace(destination);
  }, [signupId, destination]);
  return <p className="p-6">{ready ? "Login ready." : "Your profile is saved."} <a href={destination}>Continue →</a></p>;
}
