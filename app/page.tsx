"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signInAnonymously,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();

  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false); // optional UX

  // Watch auth state → redirect to /main when signed in
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user ? user.uid : null);
      if (user) router.replace("/main");
    });
    return () => unsub();
  }, [router]);

  // ---------- Auth handlers ----------
  const handleAnonymousLogin = async () => {
    try {
      setLoading(true);
      await signInAnonymously(auth);
      // onAuthStateChanged will redirect
    } catch (err) {
      console.error("Anonymous login failed:", err);
      alert("Anonymous login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will redirect
    } catch (err: any) {
      console.error("Google login failed:", err);
      alert("Google login failed: " + (err?.message ?? "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    try {
      setLoading(true);
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      // onAuthStateChanged will redirect
    } catch (err: any) {
      console.error("Email auth failed:", err);
      alert("Error: " + (err?.message ?? "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // ---------- UI ----------
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="p-6 space-y-6">
          <h1 className="text-2xl font-bold text-center">Seen Login</h1>

          {!uid ? (
            <div className="space-y-4">
              {/* Email + Password */}
              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  className="w-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-60"
                  onClick={handleEmailAuth}
                  disabled={loading}
                >
                  {isRegister ? "Register" : "Login"}
                </Button>

                <p
                  onClick={() => setIsRegister(!isRegister)}
                  className="text-xs text-center text-gray-600 cursor-pointer hover:underline"
                >
                  {isRegister
                    ? "Already have an account? Login"
                    : "Don't have an account? Register"}
                </p>
              </div>

              {/* Guest */}
              <Button
                className="w-full bg-black text-white hover:bg-gray-800 disabled:opacity-60"
                onClick={handleAnonymousLogin}
                disabled={loading}
              >
                Continue as Guest
              </Button>

              {/* Google */}
              <Button
                className="w-full bg-red-500 text-white hover:bg-red-600 disabled:opacity-60"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                Sign in with Google
              </Button>
            </div>
          ) : (
            <div className="space-y-4 text-center">
              <p className="text-sm text-gray-600">UID: {uid}</p>
              <Button
                className="w-full bg-gray-300 hover:bg-gray-400"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
