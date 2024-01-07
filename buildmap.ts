#!/usr/bin/env vite-node --script

import axios from "axios";
import * as fs from "fs";

const token = process.env.API_TOKEN;

const sleep = (milliseconds: number) => {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

export interface VocabularyEntry {
  object: string;
  data: {
    characters: string;
  };
  id: number;
}

export const processVocab = (
  entries: VocabularyEntry[],
  vocab: Map<string, number>
) => {
  entries.forEach((element) => {
    if (element.object === "vocabulary") {
      vocab.set(element.data.characters, element.id);
    }
  });
};

const fetchData = async () => {
  let nextUrl = "https://api.wanikani.com/v2/subjects";
  const vocab = new Map<string, number>();

  while (nextUrl) {
    console.log("Reading from ", nextUrl);
    const response = await axios.get(nextUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    processVocab(response.data.data, vocab);
    nextUrl = response.data.pages.next_url;
    await sleep(1000); // be kind to the server
  }
  //const json = JSON.stringify(Array.from(vocab.entries()));
  //fs.writeFileSync("vocab.json", json);
  return vocab;
};

export const parse = (line: string, dictionary: Map<string, string[]>) => {
  const match = /\s*(.+) \[[^/]+\/(.*)\//.exec(line);
  if (match) {
    const [, japaneseWords, germanTranslations] = match;
    const japaneseWordList = japaneseWords.split(";");

    japaneseWordList.forEach((japaneseWord) => {
      const germanMeanings = germanTranslations.split("/");
      const existingMeanings = dictionary.get(japaneseWord) || [];
      dictionary.set(japaneseWord, [...existingMeanings, ...germanMeanings]);
    });
  }
  // There are numerous entries in the original file that are not matching, but these are broken.
};

const readDictionaryFile = (filePath: string): Map<string, string[]> => {
  const dictionary = new Map<string, string[]>();

  const fileContent = fs.readFileSync(filePath, "utf-8");
  const lines = fileContent.split("\n");

  lines.forEach((line) => parse(line, dictionary));
  return dictionary;
};

const buildTranslations = (
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

export const buildMap = async () => {
  const dictionary = readDictionaryFile("wadokudict2");
  //const vocab = await fetchData();
  const vocab = new Map<string, number>(
    JSON.parse(fs.readFileSync("vocab.json", "utf8"))
  );
  const { translations, untranslated } = buildTranslations(dictionary, vocab);

  const translationsJSON = JSON.stringify(Array.from(translations.entries()));
  fs.writeFileSync("translations.json", translationsJSON);

  const untranslatedJSON = JSON.stringify(untranslated);
  fs.writeFileSync("misses.json", untranslatedJSON);
};

if (token) {
  buildMap();
  //console.log(readDictionaryFile("wadokudict2"));
}
