import { html } from "lit";
import { UiElement } from "./element";

export type UiSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export class UiSelect extends UiElement {
  static properties = {
    value: { type: String },
    disabled: { type: Boolean, reflect: true },
    options: { attribute: false },
  };

  value = "";
  disabled = false;
  options: UiSelectOption[] = [];

  private onChange = (event: Event) => {
    const select = event.currentTarget as HTMLSelectElement;
    this.value = select.value;
  };

  render() {
    return html`<select
      class="ui-select"
      .value=${this.value}
      ?disabled=${this.disabled}
      @change=${this.onChange}
    >
      ${this.options.map(
        (option) =>
          html`<option
            value=${option.value}
            ?disabled=${option.disabled}
            ?selected=${option.value === this.value}
          >
            ${option.label}
          </option>`
      )}
    </select>`;
  }
}

customElements.define("ui-select", UiSelect);
