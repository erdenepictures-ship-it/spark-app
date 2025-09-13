'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

type Props = {
  currentUid: string;
  otherUid: string;
};

export function WaveButton({ currentUid, otherUid }: Props) {
  const [hasWaved, setHasWaved] = useState(false);
  const [otherWaved, setOtherWaved] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);

  const router = useRouter();

  const waveId = `${currentUid}_${otherUid}`;
  const reverseWaveId = `${otherUid}_${currentUid}`;
  const chatDocId = [currentUid, otherUid].sort().join('_');

  // 🔁 Listen for wave reply + chat room
  useEffect(() => {
    const waveRef = doc(db, 'waves', reverseWaveId);
    const chatRef = doc(db, 'chat', chatDocId);

    const unsubWave = onSnapshot(waveRef, (snap) => {
      const data = snap.data();
      if (snap.exists() && data?.to === currentUid) {
        setOtherWaved(true);
      } else {
        setOtherWaved(false);
      }
    });

    const unsubChat = onSnapshot(chatRef, (snap) => {
      if (snap.exists()) {
        setChatId(chatDocId);
      }
    });

    return () => {
      unsubWave();
      unsubChat();
    };
  }, [currentUid, otherUid]);

  // ✋ Send wave
  const sendWave = async () => {
    if (hasWaved || chatId) return;

    await setDoc(doc(db, 'waves', waveId), {
      from: currentUid,
      to: otherUid,
      timestamp: serverTimestamp(),
    });

    setHasWaved(true);
  };

  // 💬 Create chat room
  const startChat = async () => {
    const chatRef = doc(db, 'chat', chatDocId);
    const snap = await getDoc(chatRef);

    if (!snap.exists()) {
      await setDoc(chatRef, {
        users: [currentUid, otherUid],
        createdAt: serverTimestamp(),
      });
    }

    router.push(`/chat/${chatDocId}`);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Show wave button */}
      {!hasWaved && !chatId && (
        <button
          onClick={sendWave}
          className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:opacity-90"
        >
          👋 Wave
        </button>
      )}

      {/* Waiting for reply */}
      {hasWaved && !otherWaved && !chatId && (
        <p className="text-xs text-gray-500">
          👋 Wave sent! Waiting for reply...
        </p>
      )}

      {/* Show chat button after both waved */}
      {hasWaved && otherWaved && !chatId && (
        <button
          onClick={startChat}
          className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:opacity-90"
        >
          💬 Chat now
        </button>
      )}

      {/* Already has chat */}
      {chatId && (
        <button
          onClick={() => router.push(`/chat/${chatId}`)}
          className="text-sm px-3 py-1 bg-black text-white rounded hover:opacity-90"
        >
          💬 Open Chat
        </button>
      )}
    </div>
  );
}
