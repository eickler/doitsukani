import {
  WKAssignment,
  WKCollection,
  WKStudyMaterial,
  WKSubject,
  WKVocabulary,
} from "@bachmacintosh/wanikani-api-types";
import axios from "axios";
import Bottleneck from "bottleneck";

/*
  Wanikani API access methods.
  TODO: Remove/clean-up function.
*/

/*
  Kindness settings for the Wanikani server. (Hard limit is 60 requests per minute.)
*/
const apiLimits = {
  minTime: 1100,
  maxConcurrent: 1,
};

export interface ProgressReporter {
  setMaxSteps: (max: number) => void;
  nextStep: () => void;
  setText: (text: string) => void;
  reset: () => void;
}

export const getDataPages = async (
  token: string,
  api: string,
  progressReporter?: ProgressReporter
) => {
  let nextUrl = `https://api.wanikani.com/v2/${api}`;
  const result = [];
  const limiter = new Bottleneck(apiLimits);
  progressReporter?.reset();

  while (nextUrl) {
    const response = await limiter.schedule(() =>
      axios.get(nextUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    );
    const collection = response.data as WKCollection;
    result.push(...collection.data);

    const totalSteps = collection.total_count / collection.pages.per_page;
    progressReporter?.setMaxSteps(totalSteps);
    progressReporter?.nextStep();

    nextUrl = response.data.pages.next_url;
  }
  return result;
};

export const getVocabulary = async (
  token: string,
  progressReporter?: ProgressReporter
) => {
  progressReporter?.setText("Getting vocabulary...");
  const subjects = (await getDataPages(
    token,
    "subjects",
    progressReporter
  )) as WKSubject[];
  const onlyVocabulary = (subject: WKSubject) =>
    subject.object === "vocabulary";
  const result = subjects.filter(onlyVocabulary) as WKVocabulary[];
  return result;
};

export const getAssignments = async (
  token: string,
  burned: boolean = false,
  progressReporter?: ProgressReporter
) => {
  progressReporter?.setText("Getting assignments...");
  return (await getDataPages(
    token,
    `assignments?burned=${burned}`,
    progressReporter
  )) as WKAssignment[];
};

export const getUnburnedVocabulary = async (
  token: string,
  progressReporter?: ProgressReporter
) => {
  const vocabs = await getVocabulary(token, progressReporter);
  const burned = await getAssignments(token, true, progressReporter);
  const burnedSubjects = new Set(burned.map((b) => b.data.subject_id));
  return vocabs.filter((v) => !burnedSubjects.has(v.id));
};

export const getStudyMaterials = async (
  token: string,
  progressReporter?: ProgressReporter
) => {
  progressReporter?.setText("Getting study materials...");
  return (await getDataPages(
    token,
    "study_materials?subject_types=vocabulary",
    progressReporter
  )) as WKStudyMaterial[];
};

interface WKStudyMaterialCreate {
  subject: number;
  synonyms: string[];
}

export const createStudyMaterials = async (
  token: string,
  limiter: Bottleneck,
  material: WKStudyMaterialCreate
) => {
  return limiter.schedule(() =>
    axios.post(
      "https://api.wanikani.com/v2/study_materials",
      {
        study_material: {
          subject_id: material.subject,
          meaning_synonyms: material.synonyms,
        },
      },
      { headers: { Authorization: `Bearer ${token}` } }
    )
  );
};

interface WKStudyMaterialUpdate {
  id: number;
  synonyms: string[];
}

export const updateSynonyms = (
  token: string,
  limiter: Bottleneck,
  material: WKStudyMaterialUpdate
) => {
  return limiter.schedule(() =>
    axios.put(
      `https://api.wanikani.com/v2/study_materials/${material.id}`,
      { study_material: { meaning_synonyms: material.synonyms } },
      { headers: { Authorization: `Bearer ${token}` } }
    )
  );
};

export const writeStudyMaterials = async (
  token: string,
  newMaterial: WKStudyMaterialCreate[],
  progressReporter?: ProgressReporter
) => {
  const oldMaterial = await getStudyMaterials(token);
  const oldMaterialMap = new Map<number, WKStudyMaterial>();
  oldMaterial.forEach((m) => oldMaterialMap.set(m.data.subject_id, m));
  const toCreate = newMaterial.filter((m) => !oldMaterialMap.has(m.subject));

  const newMaterialMap = new Map<number, WKStudyMaterialCreate>();
  newMaterial.forEach((m) => newMaterialMap.set(m.subject, m));
  const toUpdate = oldMaterial.filter((o) => {
    const newMaterialData = newMaterialMap.get(o.data.subject_id);
    if (newMaterialData) {
      return (
        JSON.stringify(o.data.meaning_synonyms.sort()) !==
        JSON.stringify(newMaterialData.synonyms.sort())
      );
    }
  });

  progressReporter?.reset();
  progressReporter?.setText("Updating study materials...");
  progressReporter?.setMaxSteps(toCreate.length + toUpdate.length);

  const limiter = new Bottleneck(apiLimits);
  for (const material of toCreate) {
    await createStudyMaterials(token, limiter, material);
    progressReporter?.nextStep();
  }

  for (const material of toUpdate) {
    const newMaterialData = newMaterialMap.get(material.data.subject_id);
    if (newMaterialData) {
      await updateSynonyms(token, limiter, {
        id: material.id,
        synonyms: [
          ...new Set([
            ...material.data.meaning_synonyms,
            ...newMaterialData.synonyms,
          ]),
        ],
      });
      progressReporter?.nextStep();
    }
  }
};
