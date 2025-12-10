import { getSupabaseClient } from "./supabaseClient";
import { SwipeCard } from "../components/PageTurnCardStack";

export const fetchCards = async (): Promise<{ data: SwipeCard[]; error: Error | null }> => {
  const client = getSupabaseClient();
  if (!client) return { data: [], error: new Error("Supabase client not configured") };

  const { data, error } = await client
    .from("cards")
    .select("id,name,age,city,about,image,tag,instagram_url")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return { data: [], error: error ? new Error(error.message) : new Error("No data") };
  }

  const mapped: SwipeCard[] = data.map((row) => ({
    id: String(row.id),
    name: row.name ?? "",
    age: Number(row.age ?? 0),
    city: row.city ?? "",
    about: row.about ?? "",
    image: row.image ?? "",
    tag: row.tag ?? undefined,
    instagramUrl: row.instagram_url ?? undefined
  }));

  return { data: mapped, error: null };
};

