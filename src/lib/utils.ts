import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names, resolving conflicting Tailwind utilities in favour of the
 * last one passed. Standard shadcn/ui helper; components added via the shadcn
 * CLI expect it at this path.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
