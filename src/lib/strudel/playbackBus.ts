type Listener = (activeId: string | null) => void;

let activeId: string | null = null;
const listeners = new Set<Listener>();

export const playbackBus = {
  getActive(): string | null {
    return activeId;
  },
  setActive(id: string | null) {
    if (activeId === id) return;
    activeId = id;
    listeners.forEach((fn) => fn(activeId));
  },
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};
