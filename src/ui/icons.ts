import home from "lucide-static/icons/home.svg?raw";
import menu from "lucide-static/icons/menu.svg?raw";
import edit from "lucide-static/icons/pencil.svg?raw";

const icons = {
  home,
  edit,
  menu,
} as const;

export type IconName = keyof typeof icons;

export function getIconSvg(name: string): string {
  return (icons as Record<string, string>)[name] ?? "";
}
