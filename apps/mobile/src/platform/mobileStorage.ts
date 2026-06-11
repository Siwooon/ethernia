import AsyncStorage from "@react-native-async-storage/async-storage";
import { GameStorage } from "@/shared/platform/storage";

export const mobileStorage: GameStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
  removeItem: (key) => AsyncStorage.removeItem(key)
};
