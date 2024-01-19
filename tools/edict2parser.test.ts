import { describe, expect, it } from "vitest";
import { condense, parse } from "./edict2parser";

describe("EDICT2 parser", () => {
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
    expect(dictionaryMap.get("〜倒れ")).toBeDefined();
    expect(dictionaryMap.get("〜倒れ")?.length).toEqual(2);
    expect(dictionaryMap.get("〜倒れ")?.[0]).toEqual(
      expect.stringContaining("durch den vorstehenden")
    );
  });

  it("should eliminate duplicates in a line regardless of case", () => {
    const dictionaryMap = new Map<string, string[]>();
    const line = "陰気 [いんき] /schwermut/Schwermut/";

    parse(line, dictionaryMap);

    expect(dictionaryMap.get("陰気")).toEqual(["Schwermut"]);
  });

  it("should eliminate blanks in translations", () => {
    const dictionaryMap = new Map<string, string[]>();
    const line = "陰気 [いんき] /Schwermut /";

    parse(line, dictionaryMap);

    expect(dictionaryMap.get("陰気")).toEqual(["Schwermut"]);
  });

  it("should eliminate duplicates across lines", () => {
    const dictionaryMap = new Map<string, string[]>();
    const line1 = "陰気 [いんき] /Schwermut/Trübsinn/";
    const line2 = "陰気 [いんき] /Düsterheit/Schwermut /";

    parse(line1, dictionaryMap);
    parse(line2, dictionaryMap);

    expect(dictionaryMap.get("陰気")).toEqual([
      "Schwermut",
      "Trübsinn",
      "Düsterheit",
    ]);
  });

  it("should match unicode whitespaces and normal whitespaces", () => {
    const dictionaryMap = new Map<string, string[]>();
    const line = "陰気 [いんき] /Trüb sinn/Trüb sinn/Düster　heit/Düster heit/";

    parse(line, dictionaryMap);

    expect(dictionaryMap.get("陰気")).toEqual(["Trüb sinn", "Düster heit"]);
  });
});

describe("Synonym condensing", () => {
  it("should limit the number of synonyms", () => {
    const meanings = [
      "Logik einer Angelegenheit",
      "Grund",
      "Umstände",
      "Bedeutung",
      "Schwermut",
      "Trübsinn",
      "Düsterheit",
      "Dunkelheit",
      "Finsternis",
    ];

    const condensed = condense(meanings);

    expect(condensed.length).toEqual(8);
    expect(condensed).not.toContain("Logik einer Angelegenheit");
  });

  it("should truncate long synonyms with UTF-8 characters correctly", () => {
    const meanings = [
      "Zeichen mit mehreren Bytes (…) in UTF-8 Codierung",
      "Zeichen mit mehreren Bytes (あ) in UTF-8 Codierung",
    ];
    const condensed = condense(meanings);
    expect(condensed[0].endsWith("~")).toBeFalsy();
    expect(condensed[1].endsWith("~")).toBeTruthy();
  });
});
