import type { Preset } from "../presets/registry";

export interface GalleryHandlers {
  onSelect: (id: string) => void;
  /** Omit to hide the fork action entirely (e.g. forks can't be forked again). */
  onFork?: (id: string) => void;
}

/** Renders the preset gallery (icon rail on desktop, filmstrip on mobile — same markup, CSS handles the layout switch). */
export function renderGallery(
  container: HTMLElement,
  presets: readonly Preset[],
  activeId: string,
  handlers: GalleryHandlers,
  customPresets: readonly Preset[] = [],
): void {
  container.innerHTML = "";

  for (const preset of presets) {
    container.appendChild(buildCard(preset, activeId, handlers));
  }

  if (customPresets.length > 0) {
    const divider = document.createElement("div");
    divider.className = "gallery-divider";
    divider.textContent = "Custom";
    container.appendChild(divider);

    for (const preset of customPresets) {
      container.appendChild(buildCard(preset, activeId, { onSelect: handlers.onSelect }));
    }
  }
}

function buildCard(
  preset: Preset,
  activeId: string,
  handlers: GalleryHandlers,
): HTMLElement {
  const card = document.createElement("div");
  card.className = "preset-card";

  const select = document.createElement("button");
  select.type = "button";
  select.className = "preset-card-select";
  select.setAttribute("aria-pressed", String(preset.id === activeId));

  const name = document.createElement("span");
  name.className = "name";
  name.textContent = preset.name;

  const description = document.createElement("span");
  description.className = "description";
  description.textContent = preset.description;

  select.append(name, description);
  select.addEventListener("click", () => handlers.onSelect(preset.id));
  card.appendChild(select);

  if (handlers.onFork) {
    const fork = document.createElement("button");
    fork.type = "button";
    fork.className = "preset-card-fork";
    fork.textContent = "⑂";
    fork.setAttribute("aria-label", `Fork ${preset.name}`);
    fork.title = `Fork ${preset.name} into an editable copy`;
    fork.addEventListener("click", (event) => {
      event.stopPropagation();
      handlers.onFork?.(preset.id);
    });
    card.appendChild(fork);
  }

  return card;
}
