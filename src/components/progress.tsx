import { useAtom } from "jotai";
import { readProgressAtom } from "../lib/progressreporter";
import { Progress as ProgressBar } from "@/components/ui/progress";

export const ProgressReport = () => {
  const [progress] = useAtom(readProgressAtom);

  return (
    <>
      <p className="mt-6 text-xs">{progress.text}</p>
      <ProgressBar
        className="mx-auto mt-2 w-80"
        value={(100 * progress.currentStep) / progress.lastStep}
      />
    </>
  );
};
