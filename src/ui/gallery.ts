import type { Preset } from "../presets/registry";

export interface GalleryHandlers {
  onSelect: (id: string) => void;
}

/** Renders the preset gallery (icon rail on desktop, filmstrip on mobile — same markup, CSS handles the layout switch). */
export function renderGallery(
  container: HTMLElement,
  presets: readonly Preset[],
  activeId: string,
  handlers: GalleryHandlers,
): void {
  container.innerHTML = "";

  for (const preset of presets) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "preset-card";
    card.setAttribute("aria-pressed", String(preset.id === activeId));

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = preset.name;

    const description = document.createElement("span");
    description.className = "description";
    description.textContent = preset.description;

    card.append(name, description);
    card.addEventListener("click", () => handlers.onSelect(preset.id));

    container.appendChild(card);
  }
}
