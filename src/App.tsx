import React, { useEffect, useState } from "react";
import { PageTurnCardStack, SwipeCard } from "./components/PageTurnCardStack";
import { sampleCards } from "./data/cards";
import { fetchCards } from "./lib/supabaseCards";
import { useDeviceSession } from "./hooks/useDeviceSession";

function App() {
  const [cards, setCards] = useState<SwipeCard[]>(sampleCards);
  const [loading, setLoading] = useState(true);
  const identity = useDeviceSession();

  useEffect(() => {
    if (!identity) return; // identity가 준비될 때까지 대기

    let mounted = true;
    const load = async () => {
      const { data, error } = await fetchCards(identity.userId, identity.deviceId);
      if (!mounted) return;
      if (!error && data.length > 0) {
        // 최대 30개로 제한
        setCards(data.slice(0, 30));
      } else {
        setCards(sampleCards.slice(0, 30));
      }
      setLoading(false);
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [identity?.userId, identity?.deviceId]);

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

