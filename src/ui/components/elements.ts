import type { UiBadge } from "./ui-badge";
import type { UiButton } from "./ui-button";
import type { UiIconButton } from "./ui-icon-button";
import type { UiSelect } from "./ui-select";

declare global {
  interface HTMLElementTagNameMap {
    "ui-badge": UiBadge;
    "ui-button": UiButton;
    "ui-icon-button": UiIconButton;
    "ui-select": UiSelect;
  }
}

export {};
