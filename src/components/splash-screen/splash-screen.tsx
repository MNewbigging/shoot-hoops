import { game } from "../../game";
import { useUpdater } from "../use-updater";
import "./splash-screen.scss";

export function SplashScreen() {
  useUpdater("loaded");

  return (
    <div className="splash-screen">
      <div className="title">🏀 Shoot Hoops 🏀</div>

      <div className="controls">
        <div>WASD - Move</div>
        <div>Mouse - Look</div>
        <div>LMB - Throw</div>
        <div>RMB - Pickup</div>
        <div>Wheel - Arc</div>
        <div>Tip: Hold LMB to charge</div>
      </div>

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
