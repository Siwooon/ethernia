import { EtherniaRunSave } from "./gameTypes";
import { buildRunSaveSnapshot, normalizeLoadedRun } from "./gameState";

export function toRunSave(input: EtherniaRunSave): EtherniaRunSave {
  return buildRunSaveSnapshot(input);
}

export function fromRunSave(savedRun: EtherniaRunSave): EtherniaRunSave {
  return normalizeLoadedRun(savedRun);
}
