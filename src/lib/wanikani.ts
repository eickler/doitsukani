import {
  WKAssignment,
  WKCollection,
  WKStudyMaterial,
  WKSubject,
  WKVocabulary,
} from "@bachmacintosh/wanikani-api-types";
import axios from "axios";
import Bottleneck from "bottleneck";
import { SetProgress } from "./progressreporter";

import translationsJson from "../translations.json";

type Translations = {
  [key: string]: string[];
};
const translations: Translations = translationsJson;

/*
  Kindness settings for the Wanikani server. (Hard limit is 60 requests per minute.)
*/
const API_LIMITS = {
  minTime: 1100,
  maxConcurrent: 1,
};

export const getDataPages = async (
  token: string,
  api: string,
  task: string,
  setProgress?: SetProgress
) => {
  let nextUrl = `https://api.wanikani.com/v2/${api}`;
  let page = 0;
  const result = [];
  const limiter = new Bottleneck(API_LIMITS);

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

    const progress = {
      text: task,
      currentStep: ++page,
      lastStep: collection.total_count / collection.pages.per_page,
    };
    setProgress?.(progress);

    nextUrl = response.data.pages.next_url;
  }
  return result;
};

export const getVocabulary = async (
  token: string,
  setProgress?: SetProgress
) => {
  const subjects = (await getDataPages(
    token,
    "subjects",
    "Getting vocabulary...",
    setProgress
  )) as WKSubject[];
  const onlyVocabulary = (subject: WKSubject) =>
    subject.object === "vocabulary";
  const result = subjects.filter(onlyVocabulary) as WKVocabulary[];
  return result;
};

export const getAssignments = async (
  token: string,
  burned: boolean = false,
  setProgress?: SetProgress
) => {
  return (await getDataPages(
    token,
    `assignments?burned=${burned}`,
    "Getting assignments...",
    setProgress
  )) as WKAssignment[];
};

export const getUnburnedVocabulary = async (
  token: string,
  setProgress?: SetProgress
) => {
  const vocabs = await getVocabulary(token, setProgress);
  const burned = await getAssignments(token, true, setProgress);
  const burnedSubjects = new Set(burned.map((b) => b.data.subject_id));
  return vocabs.filter((v) => !burnedSubjects.has(v.id));
};

export const getStudyMaterials = async (
  token: string,
  setProgress?: SetProgress
) => {
  return (await getDataPages(
    token,
    "study_materials?subject_types=vocabulary",
    "Getting study materials...",
    setProgress
  )) as WKStudyMaterial[];
};

export interface WKStudyMaterialCreate {
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

export interface WKStudyMaterialUpdate {
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

export const newMaterialNotIn = (
  old: WKStudyMaterial,
  newMaterial: Map<number, WKStudyMaterialCreate>
) => {
  const newMaterialData = newMaterial.get(old.data.subject_id);
  return (
    newMaterialData &&
    !newMaterialData.synonyms.every((s) =>
      old.data.meaning_synonyms.includes(s)
    )
  );
};

export const mergeSynonyms = (master: string[], updated: string[]) => {
  const result = [...master];
  for (const synonym of updated) {
    if (!result.includes(synonym)) {
      result.push(synonym);
    }
  }
  return result.slice(0, 8);
};

export const newMaterialWithoutOld = (
  oldM: WKStudyMaterial[],
  newM: WKStudyMaterialCreate[]
): WKStudyMaterialCreate[] => {
  const oldMap = new Map<number, WKStudyMaterial>();
  oldM.forEach((m) => oldMap.set(m.data.subject_id, m));
  return newM.filter((m) => !oldMap.has(m.subject));
};

export const oldMaterialRequiringUpdate = (
  oldM: WKStudyMaterial[],
  newM: WKStudyMaterialCreate[]
): WKStudyMaterialUpdate[] => {
  const newMaterialMap = new Map<number, WKStudyMaterialCreate>();
  newM.forEach((m) => newMaterialMap.set(m.subject, m));
  return oldM
    .filter((old) => newMaterialNotIn(old, newMaterialMap))
    .map((old) => {
      return {
        id: old.id,
        synonyms: mergeSynonyms(
          old.data.meaning_synonyms,
          newMaterialMap.get(old.data.subject_id)!.synonyms
        ),
      };
    });
};

export const delta = (
  oldM: WKStudyMaterial[],
  newM: WKStudyMaterialCreate[]
) => {
  const toCreate = newMaterialWithoutOld(oldM, newM);
  const toUpdate = oldMaterialRequiringUpdate(oldM, newM);
  return { toCreate, toUpdate };
};

export const writeStudyMaterials = async (
  token: string,
  newMaterial: WKStudyMaterialCreate[],
  setProgress?: SetProgress
) => {
  const oldMaterial = await getStudyMaterials(token);
  const { toCreate, toUpdate } = delta(oldMaterial, newMaterial);

  let step = 0;
  const totalSteps = toCreate.length + toUpdate.length;
  const eta = new Date(Date.now() + totalSteps * API_LIMITS.minTime);
  const etaString = eta.toLocaleTimeString([], { timeStyle: "short" });
  const etaText = `Updating study materials... (ETA ~${etaString})`;

  const limiter = new Bottleneck(API_LIMITS);
  for (const material of toCreate) {
    await createStudyMaterials(token, limiter, material);
    setProgress?.({
      text: etaText,
      currentStep: ++step,
      lastStep: totalSteps,
    });
  }

  for (const material of toUpdate) {
    await updateSynonyms(token, limiter, material);
    setProgress?.({
      text: etaText,
      currentStep: ++step,
      lastStep: totalSteps,
    });
  }
};

export const upload = async (apiToken: string, setProgress?: SetProgress) => {
  const vocab = await getUnburnedVocabulary(apiToken, setProgress);
  const studyMaterials = vocab
    .filter((v) => translations[v.id])
    .map((v) => {
      return { subject: v.id, synonyms: translations[v.id] };
    });
  await writeStudyMaterials(apiToken, studyMaterials, setProgress);
};
