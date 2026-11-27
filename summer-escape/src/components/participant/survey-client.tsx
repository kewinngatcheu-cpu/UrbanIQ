"use client";

import { useRouter } from "next/navigation";
import { Survey } from "@/components/survey/survey";
import type { Answers } from "@/lib/survey/answers";

export function LiveSurvey({ token, name, initial }: { token: string; name: string; initial: Answers }) {
  const router = useRouter();
  return (
    <Survey
      mode="live"
      token={token}
      name={name}
      initial={initial}
      onSubmitted={() => {
        router.replace(`/p/${token}?sent=1`);
        router.refresh();
      }}
    />
  );
}
