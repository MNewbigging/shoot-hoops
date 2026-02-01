import { useEffect, useState } from "react";
import { game } from "../game";
import "./app.scss";

export function App() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // When loaded, will re-render and show start button
    const onLoad = () => {
      setLoaded(true);
    };

    // Call load at start
    game.load(onLoad);
  }, []);

  function onStart() {
    game.start();
  }

  return (
    <div className="app">
      {!loaded && <LoadingText />}
      {loaded && <StartButton onClick={onStart} />}
    </div>
  );
}

function LoadingText() {
  return <div className="loading-text">Loading...</div>;
}

interface StartButtonProps {
  onClick: () => void;
}

function StartButton({ onClick }: StartButtonProps) {
  return (
    <div className="start-button" onClick={onClick}>
      Start
    </div>
  );
}
