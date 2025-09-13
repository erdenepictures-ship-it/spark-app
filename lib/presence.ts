// lib/usePresenceWriter.ts
"use client";

import { useEffect } from "react";
import { ref, onDisconnect, set, update, serverTimestamp } from "firebase/database";
import { rtdb } from "@/lib/firebase";

/**
 * Writes live location to /presence/{uid}
 * - Seeds online row immediately
 * - Detects insecure context on iOS/LAN (will cause fallback)
 * - Uses getCurrentPosition + watchPosition with throttling
 */
export function usePresenceWriter(uid: string | null, throttleMs = 2500) {
  useEffect(() => {
    if (!uid) return;

    const presRef = ref(rtdb, `presence/${uid}`);

    // seed row
    set(presRef, {
      uid,
      state: "online",
      updatedAt: serverTimestamp(),
      agent: navigator.userAgent,
    }).catch(() => {});

    // on disconnect -> offline
    onDisconnect(presRef)
      .update({ state: "offline", lastSeen: serverTimestamp() })
      .catch(() => {});

    // NOTE: iOS Safari requires HTTPS (not LAN IP). If not secure, you'll only see fallback.
    const insecure = !self.isSecureContext;
    if (insecure) {
      update(presRef, {
        note: "insecure_origin_http", // use HTTPS (e.g., ngrok https URL)
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    }

    // fallback after 4s if no real coords yet
    const fallbackTimer = setTimeout(() => {
      update(presRef, {
        lat: 47.918,
        lng: 106.917,
        acc: 9999,
        note: "fallback",
        state: "online",
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    }, 4000);

    if (!("geolocation" in navigator)) {
      update(presRef, {
        note: "geolocation_unavailable",
        updatedAt: serverTimestamp(),
      }).catch(() => {});
      return () => clearTimeout(fallbackTimer);
    }

    // try to prompt early (helps iOS)
    if ("permissions" in navigator && (navigator as any).permissions?.query) {
      (navigator as any).permissions
        .query({ name: "geolocation" as PermissionName })
        .then((p: any) =>
          update(presRef, { perm: p.state, updatedAt: serverTimestamp() }).catch(() => {})
        )
        .catch(() => {});
    }

    // one-shot seed (cancels fallback on success)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(fallbackTimer);
        const { latitude, longitude, accuracy } = pos.coords;
        update(presRef, {
          lat: Number(latitude),
          lng: Number(longitude),
          acc: Number(accuracy ?? 0),
          note: insecure ? "insecure_origin_http" : null,
          state: "online",
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      },
      (err) => {
        update(presRef, {
          note: `geo_err_${err.code}`,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
        // keep fallback
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );

    // continuous updates (throttled)
    let last = 0;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - last < throttleMs) return;
        last = now;

        const { latitude, longitude, accuracy, heading, speed } = pos.coords;
        update(presRef, {
          lat: Number(latitude),
          lng: Number(longitude),
          acc: Number(accuracy ?? 0),
          hdg: typeof heading === "number" ? heading : null,
          spd: typeof speed === "number" ? speed : null,
          note: null,
          state: "online",
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      },
      (err) => {
        update(presRef, {
          note: `geo_err_${err.code}`,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );

    return () => {
      clearTimeout(fallbackTimer);
      navigator.geolocation.clearWatch(watchId);
      update(presRef, { state: "offline", lastSeen: serverTimestamp() }).catch(() => {});
    };
  }, [uid, throttleMs]);
}
