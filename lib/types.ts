export type UserProfile = {
uid: string;
displayName: string;
bio?: string;
photoURL?: string;
age?: number;
gender?: "male" | "female" | "other" | "prefer_not_say";
interests?: string[];
createdAt: number; // ms epoch
updatedAt: number; // ms epoch
};


export type LiveUser = {
uid: string;
lat: number;
lng: number;
acc?: number;
state?: "online" | "offline";
};


export type Wave = {
from: string; // uid
to: string; // uid
createdAt: number; // ms epoch
};


export type Chat = {
id: string;
participants: string[]; // 2 members for now
createdAt: number;
lastMessageAt?: number;
lastMessageText?: string;
};


export type Message = {
id: string;
chatId: string;
from: string;
text: string;
createdAt: number;
};