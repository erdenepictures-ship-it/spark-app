// app/chats/page.tsx
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { usePresenceWriter } from "@/lib/usePresenceWriter";

const ActiveUsersMap = dynamic(() => import("@/components/ActiveUsersMap"), { ssr: false });

export default function ChatsPage() {
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u?.uid) return setUid(u.uid);
      const id = await getUidWithStickyFallback();
      setUid(id);
    });
    return () => unsub();
  }, []);

  // ✅ unconditionally call hook
  usePresenceWriter(uid);

  if (!uid) return <div className="p-4">Loading…</div>;

  return (
    <main className="w-screen h-screen">
      <ActiveUsersMap uid={uid} />
    </main>
  );
}

/* reuse the same helpers from main page or import them from a shared util */
async function getUidWithStickyFallback(): Promise<string> {
  if (localStorage.getItem("authFallback") === "1") return ensureLocalUid();
  try {
    const cred = await signInAnonymously(auth);
    return cred.user.uid;
  } catch {
    localStorage.setItem("authFallback", "1");
    return ensureLocalUid();
  }
}
function ensureLocalUid(): string {
  let id = localStorage.getItem("debugUid");
  if (!id) {
    id = self.crypto?.randomUUID?.() || "local-" + Math.random().toString(36).slice(2);
    localStorage.setItem("debugUid", id);
  }
  return id;
}
