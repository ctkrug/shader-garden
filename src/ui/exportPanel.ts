export interface ExportRequest {
  width: number;
  height: number;
  fps: number;
  durationSeconds: number;
}

export interface ExportPanelHandlers {
  onExport: (request: ExportRequest, onProgress: (stepsDone: number, stepsTotal: number) => void) => Promise<Blob>;
}

interface SizePreset {
  label: string;
  width: number;
  height: number;
}

const SIZE_PRESETS: readonly SizePreset[] = [
  { label: "Small · 320×180", width: 320, height: 180 },
  { label: "Medium · 480×270", width: 480, height: 270 },
  { label: "Large · 640×360", width: 640, height: 360 },
];

const FPS_OPTIONS = [10, 15, 20, 24];

/**
 * Renders the export controls once (unlike the uniform panel, this isn't
 * rebuilt per preset swap) and wires the export button to `handlers.onExport`,
 * driving its own progress bar / success-morph / download-link states.
 */
export function renderExportPanel(container: HTMLElement, handlers: ExportPanelHandlers): void {
  container.innerHTML = "";

  const sizeField = buildSelectField(
    "Size",
    "export-size",
    SIZE_PRESETS.map((preset, i) => ({ value: String(i), label: preset.label })),
    "1",
  );

  const durationField = buildRangeField("Length", "export-duration", { min: 1, max: 6, step: 1, value: 3, unit: "s" });
  const fpsField = buildSelectField(
    "FPS",
    "export-fps",
    FPS_OPTIONS.map((fps) => ({ value: String(fps), label: String(fps) })),
    "15",
  );

  const button = document.createElement("button");
  button.type = "button";
  button.className = "export-button";
  button.textContent = "Export GIF";

  const progress = document.createElement("div");
  progress.className = "export-progress";
  progress.hidden = true;
  progress.setAttribute("role", "status");
  progress.setAttribute("aria-live", "polite");

  const progressTrack = document.createElement("div");
  progressTrack.className = "export-progress-track";
  const progressFill = document.createElement("div");
  progressFill.className = "export-progress-fill";
  progressTrack.appendChild(progressFill);

  const progressLabel = document.createElement("span");
  progressLabel.className = "export-progress-label";
  progress.append(progressTrack, progressLabel);

  const downloadLink = document.createElement("a");
  downloadLink.className = "export-download";
  downloadLink.textContent = "Download GIF";
  downloadLink.download = "shader-garden.gif";
  downloadLink.hidden = true;

  container.append(sizeField.field, durationField.field, fpsField.field, button, progress, downloadLink);

  let lastObjectUrl: string | null = null;
  let successTimer: ReturnType<typeof setTimeout> | null = null;

  button.addEventListener("click", () => {
    void runExport();
  });

  async function runExport(): Promise<void> {
    const preset = SIZE_PRESETS[Number(sizeField.input.value)];
    const request: ExportRequest = {
      width: preset.width,
      height: preset.height,
      fps: Number(fpsField.input.value),
      durationSeconds: Number(durationField.input.value),
    };

    if (successTimer) clearTimeout(successTimer);
    button.classList.remove("success", "error");
    button.disabled = true;
    button.textContent = "Exporting…";
    downloadLink.hidden = true;
    progress.hidden = false;
    progressFill.style.width = "0%";
    progressLabel.textContent = "";

    try {
      const blob = await handlers.onExport(request, (stepsDone, stepsTotal) => {
        const pct = stepsTotal > 0 ? Math.round((stepsDone / stepsTotal) * 100) : 0;
        progressFill.style.width = `${pct}%`;
        progressLabel.textContent = `${pct}%`;
      });

      if (lastObjectUrl) URL.revokeObjectURL(lastObjectUrl);
      lastObjectUrl = URL.createObjectURL(blob);
      downloadLink.href = lastObjectUrl;
      downloadLink.hidden = false;

      button.textContent = "✓ Exported";
      button.classList.add("success");
      successTimer = setTimeout(() => {
        button.textContent = "Export GIF";
        button.classList.remove("success");
      }, 2000);
    } catch {
      button.textContent = "Export failed";
      button.classList.add("error");
      successTimer = setTimeout(() => {
        button.textContent = "Export GIF";
        button.classList.remove("error");
      }, 2000);
    } finally {
      button.disabled = false;
      progress.hidden = true;
    }
  }
}

function buildSelectField(
  labelText: string,
  className: string,
  options: readonly { value: string; label: string }[],
  defaultValue: string,
): { field: HTMLElement; input: HTMLSelectElement } {
  const field = document.createElement("div");
  field.className = "control";

  const label = document.createElement("label");
  const text = document.createElement("span");
  text.textContent = labelText;
  label.append(text);

  const select = document.createElement("select");
  select.className = className;
  select.setAttribute("aria-label", labelText);
  for (const option of options) {
    const optionEl = document.createElement("option");
    optionEl.value = option.value;
    optionEl.textContent = option.label;
    select.appendChild(optionEl);
  }
  select.value = defaultValue;

  field.append(label, select);
  return { field, input: select };
}

function buildRangeField(
  labelText: string,
  className: string,
  { min, max, step, value, unit }: { min: number; max: number; step: number; value: number; unit: string },
): { field: HTMLElement; input: HTMLInputElement } {
  const field = document.createElement("div");
  field.className = "control";

  const label = document.createElement("label");
  const text = document.createElement("span");
  text.textContent = labelText;
  const readout = document.createElement("span");
  readout.className = "readout";
  readout.textContent = `${value}${unit}`;
  label.append(text, readout);

  const input = document.createElement("input");
  input.type = "range";
  input.className = className;
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.setAttribute("aria-label", labelText);
  input.addEventListener("input", () => {
    readout.textContent = `${input.value}${unit}`;
  });

  field.append(label, input);
  return { field, input };
}
