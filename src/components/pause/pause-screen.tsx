import { useEffect, useState } from "react";
import { game } from "../../game";
import { useUpdater } from "../use-updater";
import "./pause-screen.scss";

export function PauseScreen() {
  useUpdater("pause-resume");
  const [canResume, setCanResume] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCanResume(true);
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const resumeClasses = ["resume-button"];
  !canResume && resumeClasses.push("disabled");

  return (
    <div className="pause-screen">
      <div
        className={resumeClasses.join(" ")}
        onClick={(e) => {
          if (!canResume) return;
          e.stopPropagation();
          game.resume();
        }}
      >
        RESUME
      </div>
    </div>
  );
}
