import { html } from "lit";
import { UiElement } from "./element";

export class UiBadge extends UiElement {
  static properties = {
    label: { type: String },
  };

  label = "";

  connectedCallback() {
    super.connectedCallback();
    if (!this.label && !this.querySelector(".ui-badge")) {
      const text = this.textContent?.trim();
      if (text) {
        this.label = text;
        this.textContent = "";
      }
    }
  }

  render() {
    return html`<span class="ui-badge">${this.label}</span>`;
  }
}

customElements.define("ui-badge", UiBadge);
