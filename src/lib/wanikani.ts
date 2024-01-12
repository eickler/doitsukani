import {
  WKAssignment,
  WKStudyMaterial,
  WKStudyMaterialData,
  WKSubject,
  WKVocabulary,
} from "@bachmacintosh/wanikani-api-types";
import axios from "axios";
import Bottleneck from "bottleneck";

/*
  Kindness settings for the Wanikani server. (Hard limit is 60 requests per minute.)
*/
const apiLimits = {
  minTime: 1000,
  maxConcurrent: 1,
};

export const getDataPages = async (token: string, api: string) => {
  let nextUrl = `https://api.wanikani.com/v2/${api}`;
  const result = [];
  const limiter = new Bottleneck(apiLimits);

  while (nextUrl) {
    const response = await limiter.schedule(() =>
      axios.get(nextUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    );
    result.push(...response.data.data);
    nextUrl = response.data.pages.next_url;
  }
  return result;
};

export const getVocabulary = async (token: string) => {
  const query = "subjects";
  const subjects = (await getDataPages(token, query)) as WKSubject[];
  const onlyVocabulary = (subject: WKSubject) =>
    subject.object === "vocabulary";
  const result = subjects.filter(onlyVocabulary) as WKVocabulary[];
  return result;
};

export const getAssignments = async (
  token: string,
  burned: boolean = false
) => {
  const query = `assignments?burned=${burned}`;
  return (await getDataPages(token, query)) as WKAssignment[];
};

export const getUnburnedVocabulary = async (token: string) => {
  const vocabs = await getVocabulary(token);
  const burned = await getAssignments(token, true);
  const burnedSubjects = new Set(burned.map((b) => b.data.subject_id));
  return vocabs.filter((v) => !burnedSubjects.has(v.id));
};

export const getStudyMaterials = async (token: string) => {
  const query = "study_materials";
  return (await getDataPages(token, query)) as WKStudyMaterial[];
};

export const createStudyMaterials = async (
  token: string,
  limiter: Bottleneck,
  material: WKStudyMaterialData
) => {
  return limiter.schedule(() =>
    axios.post(
      "https://api.wanikani.com/v2/study_materials",
      { study_material: material },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
  );
};

export const updateStudyMaterials = async (
  token: string,
  limiter: Bottleneck,
  material: WKStudyMaterial
) => {
  return limiter.schedule(() =>
    axios.put(
      `https://api.wanikani.com/v2/study_materials/${material.id}`,
      { study_material: material.data },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
  );
};

export const writeStudyMaterials = async (
  token: string,
  oldMaterial: WKStudyMaterial[],
  newMaterial: WKStudyMaterialData[]
) => {
  const oldMaterialMap = new Map<number, WKStudyMaterial>();
  oldMaterial.forEach((m) => oldMaterialMap.set(m.data.subject_id, m));
  const toCreate = newMaterial.filter((m) => !oldMaterialMap.has(m.subject_id));

  const newMaterialMap = new Map<number, WKStudyMaterialData>();
  newMaterial.forEach((m) => newMaterialMap.set(m.subject_id, m));
  const toUpdate = oldMaterial.filter((o) => {
    const newMaterialData = newMaterialMap.get(o.data.subject_id);
    if (newMaterialData) {
      return (
        JSON.stringify(o.data.meaning_synonyms.sort()) !==
        JSON.stringify(newMaterialData.meaning_synonyms.sort())
      );
    }
  });

  const limiter = new Bottleneck(apiLimits);
  const createPromises = toCreate.map((material) =>
    createStudyMaterials(token, limiter, material)
  );

  const updatePromises = toUpdate.map((old) => {
    const newMaterialData = newMaterialMap.get(old.data.subject_id);
    if (newMaterialData) {
      old.data.meaning_synonyms = [
        ...new Set([
          ...old.data.meaning_synonyms,
          ...newMaterialData.meaning_synonyms,
        ]),
      ];
      return updateStudyMaterials(token, limiter, old);
    }
  });

  // Can I return the limiter here to do progress reporting?
  await Promise.all([...createPromises, ...updatePromises]);
};

/*
  Remove the added study materials by marking them as hidden using a PUT request.
  */
