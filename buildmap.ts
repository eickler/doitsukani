#!/usr/bin/env vite-node --script

import * as fs from "fs";
import { getVocabulary } from "./src/lib/wanikani";

const token = process.env.API_TOKEN;

const fetchData = async (token: string) => {
  const vocabulary = await getVocabulary(token);
  const vocabIdMap = new Map<string, number>();
  vocabulary.forEach((vocab) => {
    if (vocab.object === "vocabulary") {
      vocabIdMap.set(vocab.data.characters, vocab.id);
    }
  });

  // Update the offline data
  const json = JSON.stringify(Array.from(vocabIdMap.entries()));
  fs.writeFileSync("vocab.json", json);
  return vocabIdMap;
};

export const parse = (line: string, dictionary: Map<string, string[]>) => {
  /*
    There are numerous entries in the original dictionary file not matching
    the pattern, but these are actually broken in the source.
  */
  const match = /\s*(.+) \[[^/]+\/(.*)\//.exec(line);
  if (match) {
    const [, japaneseWords, germanTranslations] = match;
    const japaneseWordList = japaneseWords.split(";");

    japaneseWordList.forEach((japaneseWord) => {
      const germanMeanings = germanTranslations.split("/");
      const existingMeanings = dictionary.get(japaneseWord) || [];
      /*
        In the conversion from JMDict/XML format to EDICT2 format,
        definitions are attached straight to the translation.
        This results in a broken text. Also, the meanings that require
        definitions are usually not the ones we want to include here.
        So we just discard them.
      */
      const filteredMeanings = existingMeanings.filter(
        (meaning) => !/[a-z][A-Z0-9]/.test(meaning)
      );
      /*
        There are also a couple of double mentions, so let's remove them as well.
      */
      const uniqueMeanings = [
        ...new Set([...filteredMeanings, ...germanMeanings]),
      ];
      dictionary.set(japaneseWord, uniqueMeanings);
    });
  }
};

/*
  There are words having a large number of meanings, which we don't want to
  store individually in Wanikani. We apply a heuristic that the longer the
  meaning, the less likely it is a concise or useful translation. The shortest
  translations are stored individually, the rest is condensed into a single
  translation.
 */
const condense = (meanings: string[]) => {
  const sortedMeanings = meanings.sort((a, b) => a.length - b.length);
  const firstThree = sortedMeanings.slice(0, 3);
  const remaining = sortedMeanings.slice(3);
  if (remaining.length > 0) {
    firstThree.push(remaining.join("; "));
  }
  return firstThree;
};

const readDictionaryFile = (filePath: string): Map<string, string[]> => {
  const dictionary = new Map<string, string[]>();

  const fileContent = fs.readFileSync(filePath, "utf-8");
  const lines = fileContent.split("\n");

  lines.forEach((line) => parse(line, dictionary));
  dictionary.forEach((meanings, word) => {
    dictionary.set(word, condense(meanings));
  });
  return dictionary;
};

const buildTranslations = (
  dictionary: Map<string, string[]>,
  vocab: Map<string, number>
) => {
  const translations = new Map<number, string[]>();
  const untranslated: string[] = [];

  vocab.forEach((id, word) => {
    // Wadoku uses an ellipsis character instead of a tilde.
    word = word.replace(/〜/, "…");
    const meanings = dictionary.get(word);
    if (meanings) {
      translations.set(id, meanings);
    } else {
      untranslated.push(word);
    }
  });

  return { translations, untranslated };
};

export const buildMap = async () => {
  const dictionary = readDictionaryFile("wadokudict2");
  let vocab = new Map<string, number>();
  if (token) {
    vocab = await fetchData(token);
  } else {
    // Use offline data
    vocab = new Map<string, number>(
      JSON.parse(fs.readFileSync("vocab.json", "utf8"))
    );
  }
  const { translations, untranslated } = buildTranslations(dictionary, vocab);

  const translationsJSON = JSON.stringify(Array.from(translations.entries()));
  fs.writeFileSync("src/translations.json", translationsJSON);

  const untranslatedJSON = JSON.stringify(untranslated);
  fs.writeFileSync("misses.json", untranslatedJSON);
};

if (process.argv.length > 2) {
  console.log("Creating translations...");
  buildMap();
}
