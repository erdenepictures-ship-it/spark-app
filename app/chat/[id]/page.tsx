"use client";


import { useEffect, useRef, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, onSnapshot, collection, addDoc, serverTimestamp, orderBy, query } from "firebase/firestore";
import { useParams } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ChatRoomPage() {
const params = useParams();
const chatId = params?.chatId as string;
const [user] = useAuthState(auth);
const [messages, setMessages] = useState<any[]>([]);
const [text, setText] = useState("");
const listRef = useRef<HTMLDivElement>(null);

useEffect(() => {
if (!chatId) return;
const qRef = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"));
const unsub = onSnapshot(qRef, (snap) => {
const arr: any[] = [];
snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
setMessages(arr);
setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }), 50);
});
return () => unsub();
}, [chatId]);


const send = async () => {
if (!user || !chatId || !text.trim()) return;
await addDoc(collection(db, "chats", chatId, "messages"), {
from: user.uid,
text: text.trim(),
createdAt: serverTimestamp(),
});
setText("");
};
return (
<div className="max-w-2xl mx-auto h-[80vh] flex flex-col p-4">
<div ref={listRef} className="flex-1 overflow-y-auto space-y-2 p-2 border rounded-xl">
{messages.map((m) => (
<div key={m.id} className={`max-w-[75%] px-3 py-2 rounded-2xl ${m.from === user?.uid ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}>
{m.text}
</div>
))}
</div>
<div className="mt-3 flex gap-2">
<Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message" onKeyDown={(e) => e.key === "Enter" && send()} />
<Button onClick={send}>Send</Button>
</div>
</div>
);
}