import { useStore } from "./store";
import { translator } from "./i18n";

/** Translate UI text into the user's chosen language. */
export function useT() {
  const { language } = useStore();
  return translator(language);
}
