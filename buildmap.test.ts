import { describe, expect, it } from "vitest";
import { processVocab, parse } from "./buildmap";

describe("processEntries", () => {
  it("should filter out non-vocabulary entries", () => {
    const result = new Map<string, number>();
    const entries = [
      { object: "vocabulary", id: 1, data: { characters: "一" } },
      { object: "kanji", id: 3, data: { characters: "三" } },
    ];

    processVocab(entries, result);

    expect(result.size).toEqual(1);
    expect(result.get("一")).toEqual(1);
  });

  it("should map the entries to the expected format", () => {
    const result = new Map<string, number>();
    const entries = [
      { object: "vocabulary", id: 1, data: { characters: "一" } },
      { object: "vocabulary", id: 2, data: { characters: "二" } },
    ];
    processVocab(entries, result);

    expect(result.size).toEqual(2);
    expect(result.get("一")).toEqual(1);
    expect(result.get("二")).toEqual(2);
  });
});

describe("parse", () => {
  it("should parse a standard edict2 line", () => {
    const dictionaryMap = new Map<string, string[]>();
    const line =
      "訳合い;訳合 [わけあい] /Logik einer Angelegenheit/Grund/Umstände/Bedeutung/";

    parse(line, dictionaryMap);

    expect(dictionaryMap.size).toEqual(2);
    expect(dictionaryMap.get("訳合")).toEqual(dictionaryMap.get("訳合"));
    expect(dictionaryMap.get("訳合い")).toEqual([
      "Logik einer Angelegenheit",
      "Grund",
      "Umstände",
      "Bedeutung",
    ]);
  });

  it("should parse a standard edict2 line with usage hint", () => {
    const dictionaryMap = new Map<string, string[]>();
    const line =
      " …倒れ […だおれ] an Ren’yōkei eines Verbes/durch den vorstehenden Vorgang sein Vermögen verlieren/etw., das besser aussieht, als es in Wirklichkeit ist/";

    parse(line, dictionaryMap);

    expect(dictionaryMap.size).toEqual(1);
    expect(dictionaryMap.get("…倒れ")).toBeDefined();
    expect(dictionaryMap.get("…倒れ")?.length).toEqual(2);
    expect(dictionaryMap.get("…倒れ")?.[0]).toEqual(
      expect.stringContaining("durch den vorstehenden")
    );
  });
});
