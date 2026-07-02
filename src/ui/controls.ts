import { parseMetaNumber, type UniformDecl, type UniformType } from "../gl/uniforms";
import { hexToRgb, rgbToHex } from "./color";

export interface ControlsHandlers {
  onChange: (name: string, type: UniformType, value: number[]) => void;
}

/** Prior uniform values, keyed by name — carried across a hot-recompile so an in-progress edit doesn't reset every slider. */
export type ControlValues = ReadonlyMap<string, { type: UniformType; value: number[] }>;

/**
 * Builds the uniform control panel from parsed GLSL declarations. Only
 * float/int (rendered as sliders) and vec3 flagged `color` in its meta
 * comment are exposed today — that covers every shipped preset. A decl
 * without enough UI hints to render sensibly is skipped rather than
 * guessed at.
 *
 * `initialValues` overrides a decl's meta `default:` when present (same
 * name and type) — used when re-rendering after an edit-triggered
 * recompile so a slider the user already moved stays where they left it.
 */
export function renderControls(
  container: HTMLElement,
  decls: readonly UniformDecl[],
  handlers: ControlsHandlers,
  initialValues: ControlValues = new Map(),
): void {
  container.innerHTML = "";

  for (const decl of decls) {
    const prior = initialValues.get(decl.name);
    const override = prior && prior.type === decl.type ? prior.value : undefined;

    if (decl.type === "vec3" && decl.meta.color) {
      container.appendChild(renderColorControl(decl, handlers, override));
    } else if (decl.type === "float" || decl.type === "int") {
      container.appendChild(renderRangeControl(decl, handlers, override));
    }
  }
}

function renderColorControl(
  decl: UniformDecl,
  handlers: ControlsHandlers,
  override?: number[],
): HTMLElement {
  // Round-trip through hexToRgb even for the meta default so a malformed
  // hand-written `default:` comment shows the same sanitized swatch/readout
  // it actually renders with, instead of displaying raw invalid text.
  const defaultHex = override ? rgbToHex(override) : rgbToHex(hexToRgb(decl.meta.default ?? "#ffffff"));

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

function renderRangeControl(
  decl: UniformDecl,
  handlers: ControlsHandlers,
  override?: number[],
): HTMLElement {
  const min = parseMetaNumber(decl.meta.min, 0);
  const max = parseMetaNumber(decl.meta.max, 1);
  const step = parseMetaNumber(decl.meta.step, decl.type === "int" ? 1 : 0.01);
  const defaultValue = override ? override[0] : parseMetaNumber(decl.meta.default, min);

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

/** Strips the shader-convention leading "u" off a uniform name for display, e.g. "uSpeed" -> "Speed". */
export function displayName(uniformName: string): string {
  return uniformName.replace(/^u/, "");
}

/** Ints render without decimals; float/color channels render to 2 decimal places. */
export function formatValue(type: UniformType, value: number): string {
  return type === "int" ? String(Math.round(value)) : value.toFixed(2);
}
