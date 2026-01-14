type ErrorOverlay = {
  show: (error: unknown) => void;
  clear: () => void;
  element: HTMLDivElement;
};

function formatError(error: unknown) {
  if (error instanceof Error) {
    const stack = error.stack ? `\n${error.stack}` : "";
    return `${error.message}${stack}`;
  }
  return String(error);
}

export function createErrorOverlay(): ErrorOverlay {
  const overlay = document.createElement("div");
  overlay.id = "error-overlay";
  overlay.setAttribute("role", "alert");
  overlay.setAttribute("aria-live", "assertive");

  const header = document.createElement("div");
  header.className = "overlay-header";
  header.textContent = "ShaderLoom Error";

  const message = document.createElement("pre");
  message.className = "overlay-message";

  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.className = "overlay-dismiss";
  dismiss.textContent = "Dismiss";
  dismiss.addEventListener("click", () => {
    overlay.classList.remove("is-visible");
  });

  overlay.append(header, message, dismiss);
  document.body.appendChild(overlay);

  return {
    element: overlay,
    show: (error: unknown) => {
      message.textContent = formatError(error);
      overlay.classList.add("is-visible");
    },
    clear: () => {
      overlay.classList.remove("is-visible");
      message.textContent = "";
    },
  };
}
