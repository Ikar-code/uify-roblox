import type { UIElement } from "./types";

/** Returns true when the element references a parent that exists in the list. */
export function hasParent(elements: UIElement[], element: UIElement): boolean {
  return element.parentId !== null && elements.some((candidate) => candidate.id === element.parentId);
}

/**
 * Orders elements so each existing parent appears before its children, while
 * preserving the original order wherever possible. Orphaned parents and
 * parent cycles are tolerated so malformed project data cannot break export.
 */
export function orderedTree(elements: UIElement[]): UIElement[] {
  const byId = new Map<string, UIElement>();
  for (const element of elements) {
    if (!byId.has(element.id)) byId.set(element.id, element);
  }

  const ordered: UIElement[] = [];
  const state = new Map<string, "visiting" | "visited">();

  function visit(element: UIElement): void {
    const currentState = state.get(element.id);
    if (currentState === "visited" || currentState === "visiting") return;

    state.set(element.id, "visiting");
    const parent = element.parentId ? byId.get(element.parentId) : undefined;
    if (parent) visit(parent);
    state.set(element.id, "visited");
    ordered.push(element);
  }

  for (const element of elements) visit(element);
  return ordered;
}
