"use client";

import { useRouter } from "next/navigation";
import { HomeScreen } from "./HomeScreen";

/** Wires the home screen to the router: entering a room opens /room/:roomId. */
export function HomeRoute() {
  const router = useRouter();
  return <HomeScreen onEntered={(roomId) => router.push(`/room/${roomId}`)} />;
}
