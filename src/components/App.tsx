import { game } from "../game";
import "./app.scss";
import { PauseScreen } from "./pause/pause-screen";
import { useUpdater } from "./use-updater";
import { SplashScreen } from "./splash-screen/splash-screen";

export function App() {
  useUpdater("started", "pause-resume");

  return (
    <div className="app">
      {!game.started && <SplashScreen />}
      {game.paused && <PauseScreen />}
    </div>
  );
}
