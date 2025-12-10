import React from "react";
import { PageTurnCardStack } from "./components/PageTurnCardStack";
import { sampleCards } from "./data/cards";

function App() {
  return (
    <div className="min-h-screen w-screen bg-black">
      <PageTurnCardStack cards={sampleCards} />
    </div>
  );
}

export default App;

