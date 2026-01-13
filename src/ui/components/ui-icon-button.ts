import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { UiElement } from "./element";

export class UiIconButton extends UiElement {
  static properties = {
    icon: { type: String },
    label: { type: String },
    size: { type: String },
    disabled: { type: Boolean, reflect: true },
    type: { type: String },
  };

  icon = "";
  label = "";
  size = "md";
  disabled = false;
  type = "button";

  connectedCallback() {
    super.connectedCallback();
    if (!this.icon && !this.querySelector(".ui-icon-button")) {
      const text = this.textContent?.trim();
      if (text) {
        this.icon = text;
        this.textContent = "";
      }
    }
  }

  render() {
    const accessibleLabel = this.label || undefined;
    return html`<button
      class="ui-button ui-icon-button"
      data-variant="icon"
      data-size=${this.size}
      ?disabled=${this.disabled}
      type=${this.type}
      aria-label=${ifDefined(accessibleLabel)}
      title=${ifDefined(accessibleLabel)}
    >
      <span class="ui-icon" aria-hidden="true">${this.icon}</span>
    </button>`;
  }
}

customElements.define("ui-icon-button", UiIconButton);
