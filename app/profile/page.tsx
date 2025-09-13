"use client";


import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
const [user] = useAuthState(auth);
const [form, setForm] = useState<Partial<UserProfile>>({});
const [loading, setLoading] = useState(false);


useEffect(() => {
const load = async () => {
if (!user) return;
const ref = doc(db, "users", user.uid);
const snap = await getDoc(ref);
if (snap.exists()) setForm(snap.data() as any);
else setForm({ displayName: user.displayName || "", photoURL: user.photoURL || "" });
};
load();
}, [user]);

const save = async () => {
if (!user) return;
setLoading(true);
const ref = doc(db, "users", user.uid);
const payload: UserProfile = {
uid: user.uid,
displayName: form.displayName || "",
bio: form.bio || "",
photoURL: form.photoURL || "",
age: form.age ? Number(form.age) : undefined,
gender: (form.gender as any) || undefined,
interests: (form.interests as any) || [],
createdAt: (form as any).createdAt || Date.now(),
updatedAt: Date.now(),
};
await setDoc(ref, payload, { merge: true });
setLoading(false);
alert("Profile saved");
};

return (
<div className="max-w-xl mx-auto p-6">
<Card>
<CardContent className="space-y-4 p-6">
<h1 className="text-2xl font-semibold">Your Profile</h1>
<Input
placeholder="Display name"
value={form.displayName || ""}
onChange={(e) => setForm((s) => ({ ...s, displayName: e.target.value }))}
/>
<Input
placeholder="Photo URL"
value={form.photoURL || ""}
onChange={(e) => setForm((s) => ({ ...s, photoURL: e.target.value }))}
/>
<Textarea
placeholder="Bio"
value={form.bio || ""}
onChange={(e) => setForm((s) => ({ ...s, bio: e.target.value }))}
/>
<div className="flex gap-3">
<Input
type="number"
placeholder="Age"
value={form.age as any as string || ""}
onChange={(e) => setForm((s) => ({ ...s, age: Number(e.target.value) }))}
/>
<Input
placeholder="Gender (male/female/other)"
value={(form.gender as any) || ""}
onChange={(e) => setForm((s) => ({ ...s, gender: e.target.value as any }))}
/>
</div>
<Input
placeholder="Interests (comma separated)"
value={(form.interests || []).join(", ")}
onChange={(e) => setForm((s) => ({ ...s, interests: e.target.value.split(",").map(v => v.trim()).filter(Boolean) }))}
/>
<Button onClick={save} disabled={loading}>{loading ? "Saving..." : "Save Profile"}</Button>
</CardContent>
</Card>
</div>
);
}