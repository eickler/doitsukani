import { describe, expect, it } from "vitest";
import { condense, parse, buildTranslations } from "./buildmap";

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
    expect(dictionaryMap.get("…倒れ")).toBeDefined();
    expect(dictionaryMap.get("…倒れ")?.length).toEqual(2);
    expect(dictionaryMap.get("…倒れ")?.[0]).toEqual(
      expect.stringContaining("durch den vorstehenden")
    );
  });

  it("should eliminate duplicates in a line", () => {
    const dictionaryMap = new Map<string, string[]>();
    const line = "陰気 [いんき] /Schwermut/Schwermut/";

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
      // This is 64 bytes long, but the three-byte ellipsis is replaced by a tilde and no truncation happens.
      "Zeichensätze enthalten oft Zeichen mit mehreren Bytes wie: … ",
      // This is 64 bytes and will be truncated to 63 bytes with a tilde.
      "Zeichensätze enthalten oft Zeichen mit mehreren Bytes wie: あ ",
    ];
    const condensed = condense(meanings);
    expect(condensed[0].endsWith("~")).toBeFalsy();
    expect(condensed[1].endsWith("~")).toBeTruthy();
  });
});

describe("Vocabulary translation", () => {
  it("should translate a vobulary word using the dicionary", () => {
    const vocab = new Map<string, number>();
    vocab.set("陰気", 1);
    vocab.set("訳しにくい", 2);
    const dictionary = new Map<string, string[]>();
    dictionary.set("陰気", ["Schwermut", "Trübsinn", "Düsterheit"]);

    const { translations, untranslated } = buildTranslations(dictionary, vocab);

    expect(translations.get(1)).toEqual([
      "Schwermut",
      "Trübsinn",
      "Düsterheit",
    ]);
    expect(untranslated).toEqual(["訳しにくい"]);
  });

  it("should match tildes and ellipses correctly", () => {
    const vocab = new Map<string, number>();
    vocab.set("〜円", 1);
    const dictionary = new Map<string, string[]>();
    dictionary.set("…円", ["… Yen", "…¥"]);

    const { translations, untranslated } = buildTranslations(dictionary, vocab);

    expect(translations.get(1)).toEqual(["… Yen", "…¥"]);
    expect(untranslated.length).toEqual(0);
  });
});
