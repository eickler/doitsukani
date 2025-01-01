import { describe, expect, it } from "vitest";
import {
  WKStudyMaterialCreate,
  delta,
  mergeSynonyms,
  newMaterialWithoutOld,
  oldMaterialRequiringUpdate,
} from "./wanikani";
import {
  WKDatableString,
  WKStudyMaterial,
} from "@bachmacintosh/wanikani-api-types";

const createMaterial = (id: number, synonyms: string[]): WKStudyMaterial => {
  return {
    object: "study_material",
    id: 4711,
    url: "",
    data_updated_at: "" as WKDatableString,
    data: {
      subject_id: id,
      meaning_synonyms: synonyms,
      created_at: "" as WKDatableString,
      hidden: false,
      subject_type: "kana_vocabulary",
      meaning_note: null,
      reading_note: null,
    },
  };
};

describe("Material synchronsation", () => {
  it("should merge synonyms correclty", () => {
    expect(mergeSynonyms(["1", "2"], ["3", "4"])).toEqual(["1", "2", "3", "4"]);
    expect(mergeSynonyms(["1", "2"], ["2", "3"])).toEqual(["1", "2", "3"]);
    expect(mergeSynonyms(["1"], [])).toEqual(["1"]);
    expect(
      mergeSynonyms(["1", "2", "3", "4", "5", "6", "7"], ["8", "9"])
    ).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
    expect(
      mergeSynonyms([], ["1", "2", "3", "4", "5", "6", "7", "8", "9"])
    ).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
  });

  it("should find new materials", () => {
    const oldM = [createMaterial(1, [])];
    const newM = [
      { subject: 1, synonyms: [] },
      { subject: 2, synonyms: [] },
    ];

    const toCreate = newMaterialWithoutOld(oldM, newM);

    expect(toCreate.length).toEqual(1);
    expect(toCreate[0].subject).toEqual(2);
  });

  it("should determine new materials with empty existing materials", () => {
    const oldM: WKStudyMaterial[] = [];
    const newM = [
      { subject: 1, synonyms: [] },
      { subject: 2, synonyms: [] },
    ];

    const toCreate = newMaterialWithoutOld(oldM, newM);

    expect(toCreate.length).toEqual(2);
  });

  it("should determine empty new materials after finishing all updates", () => {
    const oldM = [createMaterial(1, [])];
    const newM: WKStudyMaterialCreate[] = [];

    const toCreate = newMaterialWithoutOld(oldM, newM);

    expect(toCreate.length).toEqual(0);
  });

  it("should determine material to update", () => {
    const oldM = [createMaterial(1, [])];
    const newM = [{ subject: 2, synonyms: [] }];

    const toUpdate = oldMaterialRequiringUpdate(oldM, newM);

    expect(toUpdate.length).toEqual(0);
  });

  it("should determine material to update ignoring case", () => {
    const oldM = [createMaterial(1, ["a"])];
    const newM = [{ subject: 1, synonyms: ["A"] }];

    const toUpdate = oldMaterialRequiringUpdate(oldM, newM);

    expect(toUpdate.length).toEqual(0);
  });

  it("should update existing materials ignoring case", () => {
    const oldM = [createMaterial(1, ["a", "B"])];
    const newM = [{ subject: 1, synonyms: ["b", "c"] }];

    const toUpdate = oldMaterialRequiringUpdate(oldM, newM);

    console.log(toUpdate);
    expect(toUpdate.length).toEqual(1);
    expect(toUpdate[0].id).toEqual(4711); // 4711 is the dummy ID from createMaterial
    expect(toUpdate[0].synonyms).toEqual(["a", "b", "c"]);
  });

  it("should calulate delta", () => {
    const oldM = [createMaterial(1, ["1", "2"])];
    const newM = [
      { subject: 1, synonyms: ["2", "3"] },
      { subject: 2, synonyms: ["4"] },
    ];

    const { toCreate, toUpdate } = delta(oldM, newM);

    expect(toCreate.length).toEqual(1);
    expect(toUpdate.length).toEqual(1);
  });
});
