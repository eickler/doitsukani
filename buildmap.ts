#!/usr/bin/env vite-node --script

import * as fs from "fs";
import { getVocabulary } from "./src/lib/wanikani";

const TOKEN = process.env.API_TOKEN;

const VOCAB_FILE = "vocab.json";

const writeVocab = (vocabMap: Map<string, number>) => {
  const vocabObject = Object.fromEntries(vocabMap.entries());
  const json = JSON.stringify(vocabObject);
  fs.writeFileSync(VOCAB_FILE, json);
};

const readVocab = (): Map<string, number> => {
  const vocabJSON = fs.readFileSync(VOCAB_FILE, "utf8");
  const vocabObject = JSON.parse(vocabJSON);
  const vocabEntries: [string, number][] = Object.entries(vocabObject);
  return new Map<string, number>(vocabEntries);
};

const fetchData = async (token: string) => {
  const vocabulary = await getVocabulary(token);
  const vocabIdMap = new Map<string, number>();
  vocabulary.forEach((vocab) => {
    if (vocab.object === "vocabulary") {
      vocabIdMap.set(vocab.data.characters, vocab.id);
    }
  });
  // Update the offline copy.
  writeVocab(vocabIdMap);
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
  Wanikani has a limit of 64 bytes for the synonym field. This function
  truncates a string to fit the limit. If it is truncated, an ellipsis is added
  to indicate the truncation. Since an ellipsis is 3 bytes long, we need to truncate
  to 61 bytes to fit the limit.
*/
const MAX_LENGTH = 61;

const utfTruncate = (str: string): string => {
  let truncated = str;
  let wasTruncated = false;
  while (Buffer.byteLength(truncated) > MAX_LENGTH) {
    truncated = truncated.slice(0, -1);
    wasTruncated = true;
  }
  if (wasTruncated) {
    truncated += "…";
  }
  return truncated;
};

/*
  There are words having a large number of meanings, which we don't want to
  store individually in Wanikani. We apply a heuristic that the longer the
  meaning, the less likely it is a concise or useful translation. The shortest
  translations are stored individually, the rest is condensed into a single
  translation. All meanings are capped to fit into the 64 byte limit.
 */
const condense = (meanings: string[]) => {
  const sortedMeanings = meanings.sort((a, b) => a.length - b.length);
  const result = sortedMeanings.slice(0, 3);
  const remaining = sortedMeanings.slice(3);
  if (remaining.length > 0) {
    result.push(remaining.join(";"));
  }
  return result.map(utfTruncate);
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
  if (TOKEN) {
    vocab = await fetchData(TOKEN);
  } else {
    // Use offline data instead.
    vocab = readVocab();
  }
  const { translations, untranslated } = buildTranslations(dictionary, vocab);

  const translationsObject = Object.fromEntries(translations.entries());
  const translationsJSON = JSON.stringify(translationsObject);
  fs.writeFileSync("src/translations.json", translationsJSON);

  const untranslatedJSON = JSON.stringify(untranslated);
  fs.writeFileSync("misses.json", untranslatedJSON);
};

if (process.argv.length > 2) {
  console.log("Creating translations...");
  buildMap();
}
