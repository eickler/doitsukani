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

  const handleUpload = () => {};

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
