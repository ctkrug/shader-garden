import type { UniformDecl, UniformType } from "../gl/uniforms";
import { hexToRgb } from "./color";

export interface ControlsHandlers {
  onChange: (name: string, type: UniformType, value: number[]) => void;
}

/**
 * Builds the uniform control panel from parsed GLSL declarations. Only
 * float/int (rendered as sliders) and vec3 flagged `color` in its meta
 * comment are exposed today — that covers every shipped preset. A decl
 * without enough UI hints to render sensibly is skipped rather than
 * guessed at.
 */
export function renderControls(
  container: HTMLElement,
  decls: readonly UniformDecl[],
  handlers: ControlsHandlers,
): void {
  container.innerHTML = "";

  for (const decl of decls) {
    if (decl.type === "vec3" && decl.meta.color) {
      container.appendChild(renderColorControl(decl, handlers));
    } else if (decl.type === "float" || decl.type === "int") {
      container.appendChild(renderRangeControl(decl, handlers));
    }
  }
}

function renderColorControl(decl: UniformDecl, handlers: ControlsHandlers): HTMLElement {
  const defaultHex = decl.meta.default ?? "#ffffff";

  const field = document.createElement("div");
  field.className = "control";

  const label = document.createElement("label");
  const labelText = document.createElement("span");
  labelText.textContent = displayName(decl.name);
  const readout = document.createElement("span");
  readout.className = "readout";
  readout.textContent = defaultHex;
  label.append(labelText, readout);

  const input = document.createElement("input");
  input.type = "color";
  input.value = defaultHex;
  input.setAttribute("aria-label", displayName(decl.name));
  input.addEventListener("input", () => {
    readout.textContent = input.value;
    handlers.onChange(decl.name, "vec3", hexToRgb(input.value));
  });

  field.append(label, input);
  handlers.onChange(decl.name, "vec3", hexToRgb(defaultHex));

  return field;
}

function renderRangeControl(decl: UniformDecl, handlers: ControlsHandlers): HTMLElement {
  const min = Number(decl.meta.min ?? 0);
  const max = Number(decl.meta.max ?? 1);
  const step = Number(decl.meta.step ?? (decl.type === "int" ? 1 : 0.01));
  const defaultValue = Number(decl.meta.default ?? min);

  const field = document.createElement("div");
  field.className = "control";

  const label = document.createElement("label");
  const labelText = document.createElement("span");
  labelText.textContent = displayName(decl.name);
  const readout = document.createElement("span");
  readout.className = "readout";
  readout.textContent = formatValue(decl.type, defaultValue);
  label.append(labelText, readout);

  const input = document.createElement("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(defaultValue);
  input.setAttribute("aria-label", displayName(decl.name));
  input.addEventListener("input", () => {
    const value = Number(input.value);
    readout.textContent = formatValue(decl.type, value);
    handlers.onChange(decl.name, decl.type, [value]);
  });

  field.append(label, input);
  handlers.onChange(decl.name, decl.type, [defaultValue]);

  return field;
}

function displayName(uniformName: string): string {
  return uniformName.replace(/^u/, "");
}

function formatValue(type: UniformType, value: number): string {
  return type === "int" ? String(Math.round(value)) : value.toFixed(2);
}
