import translations from "./translations.json";
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

function App() {
  const [apiToken, setApiToken] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  /* Move all logic elsehwere! */
  const handleUpload = () => {q
    setUploading(true);
    setError("");

    /*
        const fetchUploadedTranslations = async () => {
      try {
        const response = await fetch("https://api.wanikani.com/v2/study_materials", {
          headers: {
            Authorization: `Bearer ${apiToken}`,
          },
        });
        const data = await response.json();
        const studyMaterials = data.data;
        const uploadedTranslations = studyMaterials.map((studyMaterial) => studyMaterial.data.meaning_synonyms);
        setUploadedTranslations(uploadedTranslations);
      } catch (error) {
        setError("Failed to fetch uploaded translations. Please check your API token.");
      }
    };
    */

    const uploadPromises = translations.map(([subjectId, meaningSynonyms]) => {
      const data = {
        study_material: {
          subject_id: subjectId,
          meaning_synonyms: meaningSynonyms,
        },
      };

      return fetch("https://api.wanikani.com/v2/study_materials", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    });

    Promise.all(uploadPromises)
      .then((responses) => {
        setUploading(false);
        const errorResponses = responses.filter((response) => !response.ok);
        if (errorResponses.length > 0) {
          setError(
            "Something went wrong. Please check your API token. " +
              errorResponses
          );
        }
      })
      .catch((error) => {
        setUploading(false);
        setError("Something went wrong. Please check your API token. " + error);
      });
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
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Upload Translations"}
        </Button>
        {uploading && <Progress className="mt-4" />}
        {error && <p className="mt-4">{error}</p>}
      </div>
    </TooltipProvider>
  );
}

export default App;
