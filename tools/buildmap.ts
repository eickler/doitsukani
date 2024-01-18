#!/usr/bin/env vite-node --script

import * as fs from "fs";
import { readDictionaryFile } from "./edict2parser";
import { getWanikaniVocab } from "./wkvocab";

const TOKEN = process.env.API_TOKEN;

const DICTIONARY_FILE = "tools/wadokudict2";
const TRANSLATIONS_FILE = "src/translations.json";
const MISSES_FILE = "tools/misses.json";

export const buildTranslations = (
  dictionary: Map<string, string[]>,
  vocab: Map<string, number>
) => {
  const translations = new Map<number, string[]>();
  const untranslated: string[] = [];

  vocab.forEach((id, word) => {
    const meanings = dictionary.get(word);
    if (meanings) {
      translations.set(id, meanings);
    } else {
      untranslated.push(word);
    }
  });

  return { translations, untranslated };
};

const writeTranslations = (translations: Map<number, string[]>) => {
  const translationsObject = Object.fromEntries(translations.entries());
  const translationsJSON = JSON.stringify(translationsObject);
  fs.writeFileSync(TRANSLATIONS_FILE, translationsJSON);
};

const writeUntranslated = (untranslated: string[]) => {
  const untranslatedJSON = JSON.stringify(untranslated);
  fs.writeFileSync(MISSES_FILE, untranslatedJSON);
};

export const translateVocabulary = async () => {
  const dictionary = readDictionaryFile(DICTIONARY_FILE);
  const vocab = await getWanikaniVocab(TOKEN);
  const { translations, untranslated } = buildTranslations(dictionary, vocab);
  writeTranslations(translations);
  writeUntranslated(untranslated);
};

if (process.argv.length > 2) {
  console.log("Creating translations...");
  translateVocabulary();
  console.log("Done.");
}
