import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { UiElement } from "./element";

export class UiButton extends UiElement {
  static properties = {
    label: { type: String },
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    disabled: { type: Boolean, reflect: true },
    active: { type: Boolean, reflect: true },
    type: { type: String },
  };

  label = "";
  variant = "default";
  size = "md";
  disabled = false;
  active = false;
  type = "button";

  connectedCallback() {
    super.connectedCallback();
    if (!this.label && !this.querySelector(".ui-button")) {
      const text = this.textContent?.trim();
      if (text) {
        this.label = text;
        this.textContent = "";
      }
    }
  }

  render() {
    const isTab = this.variant === "tab";
    const ariaSelected = isTab ? String(this.active) : undefined;
    return html`<button
      class="ui-button"
      data-variant=${this.variant}
      data-size=${this.size}
      data-active=${ifDefined(this.active ? "true" : undefined)}
      ?disabled=${this.disabled}
      type=${this.type}
      role=${ifDefined(isTab ? "tab" : undefined)}
      aria-selected=${ifDefined(ariaSelected)}
    >
      ${this.label}
    </button>`;
  }
}

customElements.define("ui-button", UiButton);
