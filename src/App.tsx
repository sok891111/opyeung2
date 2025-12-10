import React, { useEffect, useState } from "react";
import { PageTurnCardStack, SwipeCard } from "./components/PageTurnCardStack";
import { sampleCards } from "./data/cards";
import { fetchCards } from "./lib/supabaseCards";

function App() {
  const [cards, setCards] = useState<SwipeCard[]>(sampleCards);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data, error } = await fetchCards();
      if (!mounted) return;
      if (!error && data.length > 0) {
        setCards(data);
      } else {
        setCards(sampleCards);
      }
      setLoading(false);
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen w-screen bg-black">
      {loading ? (
        <div className="flex h-screen w-screen items-center justify-center text-white/70">Loading...</div>
      ) : (
        <PageTurnCardStack cards={cards} />
      )}
    </div>
  );
}

export default App;

