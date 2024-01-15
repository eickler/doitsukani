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
  const [error, setError] = useState("");
  const [maxSteps, setMaxSteps] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  // State for Progress component

  const progressReporter: ProgressReporter = {
    setMaxSteps: (max: number) => setMaxSteps(max),
    nextStep: () => setCurrentStep(currentStep + 1),
  };

  const handleUpload = async () => {
    setUploading(true);
    setError("");

    try {
      const vocab = await getUnburnedVocabulary(apiToken);
      const studyMaterials = vocab.map((v) => {
        return { subject: v.id, synonyms: translations[v.id] };
      });
      await writeStudyMaterials(apiToken, studyMaterials, progressReporter);
      setError("Done!");
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        if (error.response.status === 401) {
          setError("Please check the API token, it seems invalid.");
        } else if (error.response.status === 403) {
          setError(
            'Please check if the API token. Did you tick "study_material:create" and "study_materials:update"?'
          );
        } else if (error.response.status === 429) {
          setError(
            "Too many requests. Please do not use Wanikani and Doitsukani in parallel while uploading."
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
      <div className="container mx-auto flex flex-col">
        <img
          src={logo}
          className="logo w-24 h24 mx-auto"
          alt="Doitsukani logo"
        />
        <h1 className="text-3xl">Doitsukani</h1>
        <p>German translations for Wanikani.</p>
        <Tooltip>
          <TooltipTrigger asChild>
            <Input
              type="text"
              placeholder="Enter Wanikani API token"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              className="w-64 mt-10 mx-auto"
            />
          </TooltipTrigger>
          <TooltipContent>
            <ul className="w-96 m-4 text-left list-disc">
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
          className="mt-4 mx-auto"
          onClick={handleUpload}
          disabled={!apiToken || uploading}
        >
          {uploading ? "Uploading..." : "Upload Translations"}
        </Button>
        {uploading && (
          <Progress className="mt-4" max={maxSteps} value={currentStep} />
        )}
        {error && <p className="mt-4">{error}</p>}
      </div>
    </TooltipProvider>
  );
}

export default App;
