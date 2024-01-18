const VOCAB_FILE = "tools/vocab.json";

import * as fs from "fs";
import { getVocabulary } from "../src/lib/wanikani";

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

export const getWanikaniVocab = async (token: string | undefined) => {
  if (token) {
    return fetchData(token);
  } else {
    return readVocab();
  }
};
