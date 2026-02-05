import { game } from "../../game";
import { Controls } from "../controls/controls";
import { useUpdater } from "../use-updater";
import "./splash-screen.scss";

export function SplashScreen() {
  useUpdater("loaded");

  return (
    <div className="splash-screen">
      <div className="title">🏀 Shoot Hoops 🏀</div>

      <Controls />

      {!game.loaded && <LoadingText />}
      {game.loaded && <StartButton onClick={() => game.start()} />}
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
      START
    </div>
  );
}
