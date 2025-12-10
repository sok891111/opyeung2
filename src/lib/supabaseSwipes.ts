import { getSupabaseClient } from "./supabaseClient";
import { SwipeDirection } from "../types/swipe";

type RecordSwipeInput = {
  userId?: string;
  cardId: string;
  direction: SwipeDirection;
  sessionId?: string;
  deviceId?: string;
};

export const recordSwipe = async (input: RecordSwipeInput) => {
  const client = getSupabaseClient();
  if (!client) return { error: new Error("Supabase client not configured") };

  const conflictTarget = input.userId ? "user_id,card_id" : "device_id,card_id";

  const payload = {
    user_id: input.userId ?? null,
    card_id: input.cardId,
    direction: input.direction === "right" ? "like" : "nope",
    session_id: input.sessionId ?? null,
    device_id: input.deviceId ?? null
  };

  const { error } = await client.from("swipes").upsert(payload, { onConflict: conflictTarget });
  return { error };
};

