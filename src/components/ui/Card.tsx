import type { ReactNode } from "react";

// One shared card so every widget looks the same.
// Use: <Card><h2>title</h2>...</Card>
export default function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`bento-card p-5 ${className}`}>{children}</section>;
}
