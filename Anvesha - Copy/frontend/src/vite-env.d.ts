/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the backend API, e.g. https://anvesha-api.onrender.com. Empty = same origin (/api via the Vite proxy). */
  readonly VITE_API_URL?: string;
  /** Google Maps JavaScript API Key */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
