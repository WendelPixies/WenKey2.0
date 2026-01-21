import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toTitleCase(str: string | null | undefined) {
  if (!str) return "";
  const exceptions = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'com', 'o', 'a', 'os', 'as', 'um', 'uma', 'por', 'pelo', 'pela', 'pelos', 'pelas'];
  return str
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((word, index) => {
      if (index > 0 && exceptions.includes(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}
