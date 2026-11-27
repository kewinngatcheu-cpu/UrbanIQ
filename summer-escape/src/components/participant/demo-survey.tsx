"use client";

import { useState } from "react";
import { Survey } from "@/components/survey/survey";
import { ProfileView } from "@/components/results/profile-view";
import { Reveal } from "@/components/results/reveal";
import { computeCouple, computeIndividual } from "@/lib/engine/results";
import { PERSONAS } from "@/lib/demo";
import type { Answers } from "@/lib/survey/answers";
import { Button } from "@/components/ui";

/** Demo: the questionnaire runs fully in the browser – nothing is sent or stored on the server. */
export function DemoSurvey() {
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [partner, setPartner] = useState<string | null>(null);

  if (answers && partner) {
    return <Reveal view={computeCouple(answers, PERSONAS[partner].answers)} demoLabel={`Du × Beispielprofil „${PERSONAS[partner].label}“`} />;
  }
  if (answers) {
    return (
      <>
        <ProfileView view={computeIndividual(answers)} name="Du" backHref="/demo" demo />
        <div className="mx-auto max-w-5xl px-5 pb-24 sm:px-8">
          <div className="rounded-[2rem] bg-mist p-7">
            <p className="eyebrow text-sand-deep">Demo</p>
            <h2 className="mt-3 font-display text-3xl font-light">Mit einem Beispielprofil matchen</h2>
            <div className="mt-6 flex flex-wrap gap-3">
              {Object.entries(PERSONAS).map(([k, p]) => (
                <Button key={k} variant="outline" onClick={() => { setPartner(k); window.scrollTo({ top: 0 }); }}>
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }
  return <Survey mode="demo" initial={{}} onSubmitted={(a) => { setAnswers(a); window.scrollTo({ top: 0 }); }} />;
}
