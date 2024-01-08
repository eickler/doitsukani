import { useState } from "react";
import logo from "./assets/doitsukani.png";
import "./App.css";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Progress } from "./components/ui/progress";

function App() {
  const [apiToken, setApiToken] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = () => {};

  return (
    <div className="container mx-auto flex flex-col">
      <img src={logo} className="logo w-24 h24 mx-auto" alt="Doitsukani logo" />
      <h1 className="text-3xl">Doitsukani</h1>
      <Input
        type="text"
        placeholder="Enter Wanikani API token"
        value={apiToken}
        onChange={(e) => setApiToken(e.target.value)}
        className="w-64 mt-10 mx-auto"
      />
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
  );
}

export default App;
