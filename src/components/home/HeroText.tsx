"use client";

import { EXPERIMENTS } from "@/config/experiments";
import { HOME } from "@/config/home";
import { getVariant } from "@/lib/experiments";
import { useAssignments, useMessageReady } from "@/lib/hooks";

/** Título del hero; respeta experimentos de mensaje sin parpadeo. */
export function HeroText() {
  const assignments = useAssignments();
  const ready = useMessageReady();
  let title = HOME.hero.title;
  let subtitle = HOME.hero.subtitle;
  if (assignments) {
    for (const exp of EXPERIMENTS) {
      if (!exp.enabled || exp.type !== "message") continue;
      const v = getVariant(exp, assignments);
      if (v?.hero?.title) title = v.hero.title;
      if (v?.hero?.subtitle) subtitle = v.hero.subtitle;
    }
  }
  return (
    <div className={`transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"}`}>
      <h1 className="display max-w-xl">{title}</h1>
      <p className="mt-5 max-w-md text-base leading-relaxed text-ink/75 sm:text-lg">{subtitle}</p>
    </div>
  );
}
