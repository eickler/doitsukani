import { useState } from "react";
import { useAtom } from "jotai";
import { AxiosError } from "axios";

import "./App.css";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./components/ui/tooltip";

import { upload } from "./lib/wanikani";
import { ProgressReport } from "./components/progress";
import { writeProgressAtom } from "./lib/progressreporter";

function App() {
  const [apiToken, setApiToken] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [, setProgress] = useAtom(writeProgressAtom);

  const handleUpload = async () => {
    setUploading(true);
    setError("");

    try {
      await upload(apiToken, setProgress);
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
            "Too many requests, try again later. Note: Do not use Wanikani and Doitsukani in parallel."
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
          src="doitsukani.webp"
          className="mx-auto w-24 logo"
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
        {uploading && <ProgressReport />}
        {error && (
          <p className="mx-auto mt-4 font-medium text-red-400">{error}</p>
        )}
        <p className="mx-auto mt-4 mb-4 text-xs">
          Due to Wanikani's server limitations, the upload can take more than
          one hour. Please do not use Wanikani at the same time. If you navigate
          away from this page, the upload will be stopped. You can resume the
          upload by returning to this page and entering the API token again.
          <br />
          <i>Note: This service is provide as-is and without any warranty.</i>
        </p>
      </div>
    </TooltipProvider>
  );
}

export default App;
