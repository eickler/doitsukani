import { atom } from "jotai";

export interface Progress {
  text: string;
  currentStep: number;
  lastStep: number;
}

export const progressAtom = atom<Progress>({
  text: "",
  currentStep: 0,
  lastStep: 0,
});

export const readProgressAtom = atom((get) => get(progressAtom));
export const writeProgressAtom = atom(null, (_get, set, update: Progress) => {
  set(progressAtom, () => ({ ...update }));
});

export type SetProgress = (value: Progress) => void;
