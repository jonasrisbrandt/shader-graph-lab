import { LitElement } from "lit";

export class UiElement extends LitElement {
  protected createRenderRoot() {
    return this;
  }
}
