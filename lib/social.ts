// lib/social.ts
"use client";

import { db } from "@/lib/firebase";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";

export function pairKey(a: string, b: string) {
  return [a, b].sort().join("__");
}

export type WaveResult = { status: "WAVED" | "CHAT_READY"; chatId?: string };

export async function sendWaveAndMaybeOpenChat(args: {
  fromUid: string;
  toUid: string;
}): Promise<WaveResult> {
  const { fromUid, toUid } = args;
  const key = pairKey(fromUid, toUid);
  const waveRef = doc(db, "waves", key);
  const chatRef = doc(db, "chats", key);

  return runTransaction<WaveResult>(db, async (tx) => {
    const snap = await tx.get(waveRef);
    const now = serverTimestamp();

    let wavedBy: string[] = [];
    if (!snap.exists()) {
      tx.set(waveRef, {
        a: fromUid,
        b: toUid,
        wavedBy: [fromUid],
        updatedAt: now,
      });
      return { status: "WAVED" };
    } else {
      const data = snap.data() as any;
      wavedBy = Array.isArray(data?.wavedBy) ? [...new Set<string>(data.wavedBy)] : [];
      if (!wavedBy.includes(fromUid)) wavedBy.push(fromUid);
      tx.update(waveRef, { wavedBy, updatedAt: now });
    }

    if (wavedBy.includes(fromUid) && wavedBy.includes(toUid)) {
      const chatSnap = await tx.get(chatRef);
      if (!chatSnap.exists()) {
        tx.set(chatRef, {
          participants: [fromUid, toUid].sort(),
          createdAt: now,
          lastMessageAt: now,
          lastMessage: null,
        });
      } else {
        tx.update(chatRef, { lastMessageAt: now });
      }
      return { status: "CHAT_READY", chatId: key };
    }

    return { status: "WAVED" };
  });
}
