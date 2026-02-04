import { useEffect, useReducer } from "react";
import { uiUpdater, UiUpdaterEvents } from "../ui-updater";

export function useUpdater(...eventNames: UiUpdaterEvents[]) {
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    eventNames.forEach((eventName) => uiUpdater.on(eventName, forceUpdate));

    return () => {
      eventNames.forEach((eventName) => uiUpdater.off(eventName, forceUpdate));
    };
  }, [eventNames]);
}
