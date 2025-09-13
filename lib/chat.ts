// lib/chat.ts
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export function twoPartyKey(a: string, b: string) {
  return [a, b].sort().join("__");
}

export async function ensureChatForPair(a: string, b: string): Promise<string> {
  const chatId = twoPartyKey(a, b);
  const chatRef = doc(db, "chats", chatId);
  const snapshot = await getDoc(chatRef);
  if (!snapshot.exists()) {
    await setDoc(chatRef, {
      participants: [a, b],
      createdAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
    });
  }
  return chatId;
}

export async function waveAndMaybeOpenChat(a: string, b: string): Promise<string | null> {
  const pairId = twoPartyKey(a, b);
  const waveRef = doc(db, "waves", pairId);

  await setDoc(
    waveRef,
    { wavers: arrayUnion(a), updatedAt: serverTimestamp() },
    { merge: true }
  );

  const after = await getDoc(waveRef);
  const wavers: string[] = Array.isArray(after.data()?.wavers) ? after.data()!.wavers : [];
  const mutual = wavers.includes(a) && wavers.includes(b);

  if (mutual) {
    const chatId = await ensureChatForPair(a, b);
    await updateDoc(waveRef, { matchedAt: serverTimestamp() });
    return chatId;
  }
  return null;
}
