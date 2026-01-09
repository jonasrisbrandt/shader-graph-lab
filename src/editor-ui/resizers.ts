type AppResizerOptions = {
  app: HTMLElement;
  resizer: HTMLElement;
  editorRoot: HTMLElement;
  renderRoot: HTMLElement;
  minWidth?: number;
  storageKey?: string;
};

export function setupAppResizer(options: AppResizerOptions) {
  const minWidth = options.minWidth ?? 320;
  const storageKey = options.storageKey ?? "sgl:editorSplit";
  let isDragging = false;
  let activePointerId: number | null = null;

  const applyWidth = (nextWidth: number) => {
    const rect = options.app.getBoundingClientRect();
    const maxWidth = Math.max(minWidth, rect.width - minWidth);
    const clamped = Math.min(Math.max(nextWidth, minWidth), maxWidth);
    options.editorRoot.style.flex = `0 0 ${Math.round(clamped)}px`;
    options.renderRoot.style.flex = "1 1 0";
    return clamped;
  };

  const loadStoredWidth = () => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const value = Number.parseFloat(raw);
      if (!Number.isFinite(value)) return;
      applyWidth(value);
    } catch {
      return;
    }
  };

  const saveStoredWidth = (value: number) => {
    try {
      window.localStorage.setItem(storageKey, String(Math.round(value)));
    } catch {
      return;
    }
  };

  loadStoredWidth();

  const onPointerMove = (event: PointerEvent) => {
    if (!isDragging) return;
    const rect = options.app.getBoundingClientRect();
    const next = applyWidth(event.clientX - rect.left);
    saveStoredWidth(next);
  };

  const onPointerUp = () => {
    if (!isDragging) return;
    isDragging = false;
    document.body.classList.remove("is-resizing");
    if (activePointerId !== null) {
      options.resizer.releasePointerCapture?.(activePointerId);
    }
    activePointerId = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  };

  options.resizer.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    isDragging = true;
    document.body.classList.add("is-resizing");
    activePointerId = event.pointerId;
    options.resizer.setPointerCapture?.(event.pointerId);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  });
}
