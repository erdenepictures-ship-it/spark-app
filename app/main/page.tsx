"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timeout")), timeoutMs);
    promise
      .then((res) => {
        clearTimeout(timeout);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timeout);
        reject(err);
      });
  });
}

const ActiveUsersMap = dynamic(() => import("../../components/ActiveUsersMap"), {
  ssr: false,
});

export default function Page() {
  const [uid, setUid] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u?.uid) {
        setUid(u.uid);
        return;
      }

      try {
        const cred = await withTimeout(signInAnonymously(auth), 8000);
        setUid(cred.user.uid);
      } catch (err) {
        setNote("Auth failed. Please check internet or allow location/auth access.");
      }
    });

    return () => unsub();
  }, []);

  return (
    <main className="w-screen h-screen">
      {uid ? (
        <ActiveUsersMap uid={uid} />
      ) : note ? (
        <div className="text-center p-4 text-red-500">{note}</div>
      ) : (
        <div className="text-center p-4 text-gray-500">Loading...</div>
      )}
    </main>
  );
}
