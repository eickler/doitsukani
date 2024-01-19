import * as fs from "fs";

/**
 * Parse an EDICT2 file and polish it for upload to Wanikani.
 */

/**
 * Parse a single line of an EDICT2 file and add all meanings to the dictionary.
 * This tries to cope with a number of oddities in the original Wadoku file.
 */
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
      japaneseWord = japaneseWord.replace(/…/, "〜");
      /*
        Split up the translations by the "/" and apply numerous fixes.
        * There are some definitions attached straight to the translations, that do not make a lot of sense to have.
        * There are whitespaces around translations.
        * There are alternative UTF-8 whitespaces that we align.
        * There are too long words that we can't store in Wanikani.
        * There is one empty word :-/
      */
      const germanMeanings = germanTranslations
        .split("/")
        .map((meaning) => meaning.trim().replace(/\p{Zs}/gu, " "))
        .map(utfTruncate)
        .filter((meaning) => meaning.length > 0);

      /*
        Merge with existing meanings.
        There are also a couple of double mentions, so let's remove them as well.
        A double mention can also have a different case, but we need to preserve the case.
      */
      const existingMeanings = dictionary.get(japaneseWord) || [];
      const uniqueMeaningsMap = new Map(
        [...existingMeanings, ...germanMeanings].map((meaning) => [
          meaning.toLowerCase(),
          meaning,
        ])
      );
      const uniqueMeanings = Array.from(uniqueMeaningsMap.values());

      dictionary.set(japaneseWord, uniqueMeanings);
    });
  }
};

/**
 * Wanikani has a limit of 64 bytes for the synonym field documented (see also below).
 * However, since it regularly errors out on less than 64 bytes UTF, I am giving it a gratituous safety margin.
 */
const MAX_LENGTH = 50;

/**
 * This function truncates a string to fit the limit if needed.
 * If it is truncated, a tilde is added at the end to indicate the truncation.
 * We also replace occurrences of the ellipsis character with a tilde since it
 * is three bytes long.
 */
export const utfTruncate = (str: string): string => {
  let truncated = str.replace(/…/g, "~");
  let wasTruncated = false;
  while (Buffer.byteLength(truncated) > MAX_LENGTH) {
    truncated = truncated.slice(0, -1);
    wasTruncated = true;
  }
  if (wasTruncated) {
    truncated += "~";
  }
  return truncated;
};

/**
 * Wanikani has a limit of eight user synonyms per vocabulary item.
 */
const MAX_SYNONYMS = 8;

/**
 * There are words having a large number of meanings, which we can't
 * and probably don't want to store all in Wanikani. We apply a heuristic
 * that the longer the meaning, the less likely it is a concise or useful
 * translation. The shortest translations are stored individually up to
 * the Wanikani limit of eight translations. All meanings are capped to
 * fit into the 64 byte limit.
 * See https://community.wanikani.com/t/updates-to-synonyms-on-item-pages/53932
 * for a description of the API limitations for synonyms.
 */
export const condense = (meanings: string[]) => {
  return meanings.sort((a, b) => a.length - b.length).slice(0, MAX_SYNONYMS);
};

/**
 * Read an EDICT2 dictionary file and return a map of original word to translations.
 */
export const readDictionaryFile = (filePath: string): Map<string, string[]> => {
  const dictionary = new Map<string, string[]>();

  const fileContent = fs.readFileSync(filePath, "utf-8");
  const lines = fileContent.split("\n");

  lines.forEach((line) => parse(line, dictionary));
  dictionary.forEach((meanings, word) => {
    dictionary.set(word, condense(meanings));
  });
  return dictionary;
};
