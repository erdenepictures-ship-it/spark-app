'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import { ref, onValue, update, serverTimestamp, remove } from 'firebase/database';
import { rtdb } from '@/lib/firebase';
import { WaveButton } from './WaveButton';

type Props = { uid: string };

type LiveUser = {
  uid: string;
  lat: number;
  lng: number;
  acc?: number;
  updatedAt?: number;
  state?: string;
};

const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function Recenter({ center, follow }: { center: LatLngExpression; follow: boolean }) {
  const map = useMap();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const blockFollowRef = useRef(false);

  useEffect(() => {
    const onMove = () => {
      if (follow) {
        blockFollowRef.current = true;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          blockFollowRef.current = false;
        }, 8000);
      }
    };
    map.on('dragstart', onMove);
    return () => {
      map.off('dragstart', onMove);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [map, follow]);

  useEffect(() => {
    if (follow && !blockFollowRef.current) {
      map.setView(center);
    }
  }, [center, follow, map]);

  return null;
}

export default function ActiveUsersMap({ uid }: Props) {
  const [myPos, setMyPos] = useState<LatLngExpression | null>(null);
  const [msg, setMsg] = useState('Locating…');
  const [users, setUsers] = useState<LiveUser[]>([]);
  const [follow, setFollow] = useState(true);
  const watchId = useRef<number | null>(null);
  const seededOnce = useRef(false);

  // 🔁 Read all users from Firebase
  useEffect(() => {
    const presenceRef = ref(rtdb, 'presence');
    const off = onValue(presenceRef, (snap) => {
      const val = snap.val() as Record<string, any> | null;
      const live: LiveUser[] = [];
      if (val) {
        for (const key of Object.keys(val)) {
          const u = val[key];
          if (typeof u?.lat === 'number' && typeof u?.lng === 'number') {
            live.push({
              uid: key,
              lat: u.lat,
              lng: u.lng,
              acc: u.acc,
              updatedAt: u.updatedAt,
              state: u.state,
            });
          }
        }
      }
      setUsers(live);
    });
    return () => off();
  }, []);

  const writePresence = (lat: number, lng: number, acc?: number | null) =>
    update(ref(rtdb, `presence/${uid}`), {
      lat,
      lng,
      acc: Number(acc ?? 0),
      updatedAt: serverTimestamp(),
      state: 'online',
      uid,
    }).catch(() => {});

  const seedPosition = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const lat = Number(latitude);
        const lng = Number(longitude);
        setMyPos([lat, lng]);
        setMsg(`Accuracy: ${Math.round(accuracy)}m`);
        writePresence(lat, lng, accuracy);
        seededOnce.current = true;
      },
      (err) => {
        setMsg(`Geo error: ${err.message}`);
      },
      {
        enableHighAccuracy: false,
        timeout: 3000,
        maximumAge: 60000,
      }
    );
  };

  const nudge = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const lat = Number(latitude);
        const lng = Number(longitude);
        setMyPos([lat, lng]);
        setMsg(`Accuracy: ${Math.round(accuracy)}m`);
        writePresence(lat, lng, accuracy);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
    );
  };

  // 🛰 Track location
  useEffect(() => {
    if (!navigator.geolocation) {
      setMsg('Geolocation not available');
      return;
    }

    seedPosition();

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const lat = Number(latitude);
        const lng = Number(longitude);
        setMyPos([lat, lng]);
        setMsg(`Accuracy: ${Math.round(accuracy)}m`);
        writePresence(lat, lng, accuracy);
      },
      (err) => setMsg(`Geo error: ${err.message}`),
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );

    const fallback = setTimeout(() => {
      if (!seededOnce.current && !myPos) seedPosition();
    }, 2000);

    const vis = () => {
      if (document.visibilityState === 'visible') nudge();
    };
    document.addEventListener('visibilitychange', vis);

    return () => {
      clearTimeout(fallback);
      document.removeEventListener('visibilitychange', vis);
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
      remove(ref(rtdb, `presence/${uid}`)).catch(() => {});
    };
  }, [uid]);

  const center = useMemo<LatLngExpression>(
    () => myPos || ([47.9185, 106.9177] as LatLngExpression),
    [myPos]
  );

  const others = useMemo(() => {
    const now = Date.now();
    return users
      .filter((u) => u.uid !== uid)
      .map((u) => {
        const updated = u.updatedAt ? u.updatedAt * 1 : 0;
        const isStale = now - updated > 30000; // 30 sec threshold
        return {
          ...u,
          state: isStale ? 'offline' : 'online',
        };
      })
      .filter((u) => u.state === 'online'); // comment this out if you want to show offline users too
  }, [users, uid]);

  return (
    <>
      <MapContainer center={center} zoom={15} scrollWheelZoom className="h-screen w-full z-0">
        <TileLayer
          attribution='© OpenStreetMap contributors & CARTO'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <Recenter center={center} follow={follow} />

        {myPos && (
          <Marker position={myPos} icon={defaultIcon}>
            <Popup>
              <p><strong>You</strong></p>
              <p>{msg}</p>
            </Popup>
          </Marker>
        )}

        {others.map((u) => (
          <Marker key={u.uid} position={[u.lat, u.lng]} icon={defaultIcon}>
            <Popup>
              <p><strong>User:</strong> {u.uid.slice(0, 6)}</p>
              {typeof u.acc === 'number' && <p>{u.acc.toFixed(0)}m</p>}
              <p>🟢 Online</p>
              <div className="mt-2">
                <WaveButton currentUid={uid} otherUid={u.uid} />
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <div className="fixed top-2 right-2 z-[1000] bg-black/70 text-white text-xs rounded px-2 py-1 flex gap-2 items-center">
        <button
          onClick={nudge}
          className="bg-white text-black px-2 py-1 rounded hover:opacity-90 active:opacity-80"
        >
          Fix Location
        </button>
        <span className="opacity-80">{msg}</span>
      </div>
    </>
  );
}
