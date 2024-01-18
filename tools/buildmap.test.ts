import { describe, expect, it } from "vitest";
import { buildTranslations } from "./buildmap";

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
});
