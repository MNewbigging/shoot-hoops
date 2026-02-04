export type UiUpdaterEvents = "pause-resume";

type Callback = () => void;

class UiUpdater {
  private callbacks = new Map<UiUpdaterEvents, Set<Callback>>();

  on(event: UiUpdaterEvents, callback: Callback) {
    const callbacks = this.callbacks.get(event) ?? new Set<Callback>();
    callbacks.add(callback);
    this.callbacks.set(event, callbacks);
  }

  off(event: UiUpdaterEvents, callback: Callback) {
    const callbacks = this.callbacks.get(event);
    if (!callbacks) return;

    callbacks.delete(callback);
    this.callbacks.set(event, callbacks);
  }

  fire(event: UiUpdaterEvents) {
    const callbacks = this.callbacks.get(event);
    callbacks?.forEach((cb) => cb());
  }
}

export const uiUpdater = new UiUpdater();
