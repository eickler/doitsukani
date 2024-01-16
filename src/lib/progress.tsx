import { Progress as ProgressBar } from "@/components/ui/progress";

export interface Progress {
  text: string;
  step: number;
  max: number;
}

export const ProgressReport = ({ text, step, max }: Progress) => {
  return (
    <>
      <p className="mt-6 text-xs">{text}</p>
      <ProgressBar className="mx-auto mt-2 w-80" value={(100 * step) / max} />
    </>
  );
};
