"use client";

export default function AuthTest() {
  return (
    <pre style={{ padding: 16, whiteSpace: "pre-wrap" }}>
      {"API key loaded? "}
      {String(!!process.env.NEXT_PUBLIC_FIREBASE_API_KEY)}
      {"\nAuth domain: "}
      {process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}
      {"\nApp ID present? "}
      {String(!!process.env.NEXT_PUBLIC_FIREBASE_APP_ID)}
    </pre>
  );
}
