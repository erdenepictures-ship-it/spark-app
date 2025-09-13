'use client';

import { useEffect } from 'react';
import {
  ref,
  onDisconnect,
  set,
  update,
  serverTimestamp,
} from 'firebase/database';
import { rtdb } from '@/lib/firebase';

export function usePresenceWriter(uid: string | null, throttleMs = 2500) {
  useEffect(() => {
    if (!uid) return;

    const presRef = ref(rtdb, `presence/${uid}`);

    // 🚀 Initial seed
    set(presRef, {
      uid,
      state: 'online',
      updatedAt: serverTimestamp(),
      agent: navigator.userAgent,
    }).catch(() => {});

    // 📡 onDisconnect cleanup
    onDisconnect(presRef)
      .update({
        state: 'offline',
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      .catch(() => {});

    const insecure = !self.isSecureContext;
    if (insecure) {
      update(presRef, {
        note: 'insecure_origin_http',
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    }

    // ⏳ Faster fallback
    const fallbackTimer = setTimeout(() => {
      update(presRef, {
        lat: 47.918,
        lng: 106.917,
        acc: 9999,
        note: 'fallback',
        state: 'online',
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    }, 2000); // ← 2s fallback

    if (!('geolocation' in navigator)) {
      update(presRef, {
        note: 'geolocation_unavailable',
        updatedAt: serverTimestamp(),
      }).catch(() => {});
      return () => clearTimeout(fallbackTimer);
    }

    // 🔐 Check permission
    if ('permissions' in navigator && (navigator as any).permissions?.query) {
      (navigator as any).permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((p: any) => {
          update(presRef, {
            perm: p.state,
            updatedAt: serverTimestamp(),
          }).catch(() => {});
        })
        .catch(() => {});
    }

    // 📍 One-time position
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(fallbackTimer);
        const { latitude, longitude, accuracy } = pos.coords;
        update(presRef, {
          lat: Number(latitude),
          lng: Number(longitude),
          acc: Number(accuracy ?? 0),
          note: insecure ? 'insecure_origin_http' : null,
          state: 'online',
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      },
      (err) => {
        clearTimeout(fallbackTimer);
        console.error('Geo error:', err); // ✅ DEBUG
        update(presRef, {
          note: `geo_err_${err.code}`,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      },
      {
        enableHighAccuracy: true,
        timeout: 30000, // ⬅️ increased timeout
        maximumAge: 0,
      }
    );

    // 🔁 Watch position
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
          hdg: typeof heading === 'number' ? heading : null,
          spd: typeof speed === 'number' ? speed : null,
          note: null,
          state: 'online',
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      },
      (err) => {
        console.error('Watch geo error:', err); // ✅ DEBUG
        update(presRef, {
          note: `geo_err_${err.code}`,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      },
      {
        enableHighAccuracy: true,
        timeout: 30000, // ⬅️ same here
        maximumAge: 0,
      }
    );

    return () => {
      clearTimeout(fallbackTimer);
      navigator.geolocation.clearWatch(watchId);
      update(presRef, {
        state: 'offline',
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    };
  }, [uid, throttleMs]);
}
