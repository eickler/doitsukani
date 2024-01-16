import translationsJson from "./translations.json";
import { useState } from "react";
import logo from "./assets/doitsukani.png";
import "./App.css";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Progress } from "./components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./components/ui/tooltip";
import {
  ProgressReporter,
  getUnburnedVocabulary,
  writeStudyMaterials,
} from "./lib/wanikani";
import { AxiosError } from "axios";

type Translations = {
  [key: string]: string[];
};
const translations: Translations = translationsJson;

function App() {
  const [apiToken, setApiToken] = useState("");
  const [uploading, setUploading] = useState(false);
  const [maxSteps, setMaxSteps] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [progressText, setProgressText] = useState("");
  const [error, setError] = useState("");

  const progressReporter: ProgressReporter = {
    setMaxSteps: (max: number) => setMaxSteps(max),
    nextStep: () => setCurrentStep((step) => step + 1),
    setText: (text: string) => setProgressText(text),
    reset: () => setCurrentStep(0),
  };

  const handleUpload = async () => {
    setUploading(true);
    setError("");

    try {
      const vocab = await getUnburnedVocabulary(apiToken, progressReporter);
      const studyMaterials = vocab
        .filter((v) => translations[v.id])
        .map((v) => {
          return { subject: v.id, synonyms: translations[v.id] };
        });
      await writeStudyMaterials(apiToken, studyMaterials, progressReporter);
      setError("Done!");
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        if (error.response.status === 401) {
          if (error.response.data?.error?.includes("grant permission")) {
            setError(
              'Please use an API token with "study_material:create" and "study_materials:update" permissions.'
            );
          } else {
            setError(
              "Could not connect to Wanikani, please check the API token."
            );
          }
        } else if (error.response.status === 422) {
          setError(
            `There is an issue with the data: ${error.response.data.error}`
          );
        } else if (error.response.status === 429) {
          setError(
            "Too many requests, try again later. Please do not use Wanikani and Doitsukani in parallel."
          );
        }
      } else {
        setError("Error: " + error);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="container mx-auto mt-10 w-96 flex flex-col">
        <img
          src={logo}
          className="mx-auto w-24 h24 logo"
          alt="Doitsukani logo"
        />
        <h1 className="text-3xl">Doitsukani</h1>
        <p>
          Add German to <a href="https://wanikani.com/">Wanikani</a>.
        </p>
        <Tooltip>
          <TooltipTrigger asChild>
            <Input
              type="text"
              placeholder="Enter Wanikani API token"
              value={apiToken}
              onFocus={() => setError("")}
              onChange={(e) => setApiToken(e.target.value)}
              className="mx-auto mt-10 w-80"
            />
          </TooltipTrigger>
          <TooltipContent>
            <ul className="m-4 text-left list-disc">
              <li>
                On the Wanikani dashboard, click on your profile and select "API
                Tokens".
              </li>
              <li>
                Click "Generate a new token" and check "study_materials:create"
                and "study_materials:update".
              </li>
              <li>Click "Generate token".</li>
              <li>Copy the text of the token here.</li>
            </ul>
          </TooltipContent>
        </Tooltip>
        <Button
          className="mx-auto mt-4 w-48"
          onClick={handleUpload}
          disabled={!apiToken || uploading}
        >
          {uploading ? "Uploading..." : "Upload Translations"}
        </Button>
        {uploading && (
          <>
            <p className="mt-6 text-xs">{progressText}</p>
            <Progress
              className="mx-auto mt-2 w-80"
              value={(100 * currentStep) / maxSteps}
            />
          </>
        )}
        {error && (
          <p className="mx-auto mt-4 font-medium text-red-400">{error}</p>
        )}
        <p className="mx-auto mt-4 text-xs">
          Please note that due to Wanikani's limitations, the upload can take a
          very long time. If you navigate away from this page, the upload will
          be cancelled. You can resume the upload by coming back to the page and
          entering the API token again.
        </p>
      </div>
    </TooltipProvider>
  );
}

export default App;
