import { useEffect, useReducer } from "react";
import { uiUpdater, UiUpdaterEvents } from "../ui-updater";

export function useUpdater(event: UiUpdaterEvents) {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    uiUpdater.on(event, forceUpdate);

    return () => {
      uiUpdater.off(event, forceUpdate);
    };
  }, [event]);
}
