import home from "lucide-static/icons/home.svg?raw";
import menu from "lucide-static/icons/menu.svg?raw";
import edit from "lucide-static/icons/pencil.svg?raw";
import chevronDown from "lucide-static/icons/chevron-down.svg?raw";
import chevronRight from "lucide-static/icons/chevron-right.svg?raw";
import file from "lucide-static/icons/file.svg?raw";
import folder from "lucide-static/icons/folder.svg?raw";

const icons = {
  chevronDown,
  chevronRight,
  file,
  folder,
  home,
  edit,
  menu,
} as const;

export type IconName = keyof typeof icons;

export function getIconSvg(name: string): string {
  return (icons as Record<string, string>)[name] ?? "";
}
