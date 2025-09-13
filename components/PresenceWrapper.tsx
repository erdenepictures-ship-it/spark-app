'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { usePresenceWriter } from '@/lib/usePresenceWriter';

export default function PresenceWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? null);
    });
    return () => unsub();
  }, []);

  usePresenceWriter(uid);

  return <>{children}</>;
}
