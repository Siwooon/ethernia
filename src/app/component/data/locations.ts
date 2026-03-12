import { LocationTheme } from "@/app/component/types/game";

export const LOCATION_THEMES: LocationTheme[] = [
  "forest",
  "ruins",
  "swamp",
  "crypt",
  "mountain",
  "village",
  "cathedral",
  "cavern",
  "ashlands",
];

export const LOCATION_LABELS: Record<LocationTheme, string> = {
  forest: "Forêt",
  ruins: "Ruines",
  swamp: "Marais",
  crypt: "Crypte",
  mountain: "Montagne",
  village: "Village",
  cathedral: "Cathédrale",
  cavern: "Caverne",
  ashlands: "Cendres",
};

export const LOCATION_IMAGES: Record<LocationTheme, string> = {
  forest: "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=400",
  ruins: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=400",
  swamp: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=400",
  crypt: "https://images.unsplash.com/photo-1519074069444-1ba4fff66d16?q=80&w=400",
  mountain: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=400",
  village: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=400",
  cathedral: "https://images.unsplash.com/photo-1520637836862-4d197d17c90a?q=80&w=400",
  cavern: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=400",
  ashlands: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=400",
};