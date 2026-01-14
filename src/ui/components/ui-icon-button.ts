import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import { UiElement } from "./element";
import { getIconSvg } from "../icons";

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

  render() {
    const accessibleLabel = this.label || undefined;
    const iconSvg = this.icon ? getIconSvg(this.icon) : "";
    return html`<button
      class="ui-button ui-icon-button"
      data-variant="icon"
      data-size=${this.size}
      ?disabled=${this.disabled}
      type=${this.type}
      aria-label=${ifDefined(accessibleLabel)}
      title=${ifDefined(accessibleLabel)}
    >
      <span class="ui-icon" aria-hidden="true">${unsafeSVG(iconSvg)}</span>
    </button>`;
  }
}

customElements.define("ui-icon-button", UiIconButton);
