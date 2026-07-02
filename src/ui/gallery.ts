import type { Preset } from "../presets/registry";

export interface GalleryHandlers {
  onSelect: (id: string) => void;
  /** Omit to hide the fork action entirely (e.g. forks can't be forked again). */
  onFork?: (id: string) => void;
}

/** Preset id -> thumbnail data URL. A preset with no entry falls back to the card's plain background. */
export type ThumbnailMap = ReadonlyMap<string, string>;

/** Renders the preset gallery (icon rail on desktop, filmstrip on mobile — same markup, CSS handles the layout switch). */
export function renderGallery(
  container: HTMLElement,
  presets: readonly Preset[],
  activeId: string,
  handlers: GalleryHandlers,
  customPresets: readonly Preset[] = [],
  thumbnails: ThumbnailMap = new Map(),
): void {
  container.innerHTML = "";

  for (const preset of presets) {
    container.appendChild(buildCard(preset, activeId, handlers, thumbnails.get(preset.id)));
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
  thumbnail?: string,
): HTMLElement {
  const card = document.createElement("div");
  card.className = "preset-card";

  const select = document.createElement("button");
  select.type = "button";
  select.className = "preset-card-select";
  select.setAttribute("aria-pressed", String(preset.id === activeId));
  select.title = `${preset.name} — ${preset.description}`;

  if (thumbnail) {
    const thumb = document.createElement("img");
    thumb.className = "preset-card-thumb";
    thumb.src = thumbnail;
    thumb.alt = "";
    thumb.setAttribute("aria-hidden", "true");
    select.appendChild(thumb);
  }

  const label = document.createElement("span");
  label.className = "preset-card-label";

  const name = document.createElement("span");
  name.className = "name";
  name.textContent = preset.name;

  const description = document.createElement("span");
  description.className = "description";
  description.textContent = preset.description;

  label.append(name, description);
  select.appendChild(label);
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
