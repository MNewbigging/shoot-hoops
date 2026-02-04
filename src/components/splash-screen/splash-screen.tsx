import { game } from "../../game";
import { useUpdater } from "../use-updater";
import "./splash-screen.scss";

export function SplashScreen() {
  useUpdater("loaded");

  return (
    <div className="splash-screen">
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
      Start
    </div>
  );
}
