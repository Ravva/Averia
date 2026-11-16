"use client";

import payloads from "@/lib/seed/payloads.json";
import type { Payload } from "@/lib/types";
import { Section } from "@/components/dashboard/section";
import {
  AbsentCard,
  CategoriesCard,
  GroupsCard,
  KpiBand,
  MarksCard,
  StrongWeak,
  SubjectsCard,
} from "@/components/dashboard/current";
import { RankingTable, SubjectsTable } from "@/components/dashboard/tables";

export default function PreviewPage() {
  const key = Object.keys(payloads)[0];
  const payload = (payloads as Record<string, { curr: Payload }>)[key].curr;
  return (
    <main className="p-8">
      <div className="scene-panel mb-4 grid min-h-[330px] items-end gap-7 p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:p-12">
        <div className="relative z-10 max-w-[700px]">
          <h2 className="text-[clamp(2.3rem,5vw,5rem)] leading-[1.05] font-bold tracking-[-.035em]">Весь класс.<br />Вся картина.</h2>
        </div>
      </div>
      <KpiBand payload={payload} />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <MarksCard payload={payload} />
        <CategoriesCard payload={payload} />
      </div>
      <Section title="Сильные и слабые предметы" note="по среднему баллу">
        <StrongWeak payload={payload} />
      </Section>
      <div className="mt-4">
        <SubjectsCard payload={payload} />
      </div>
      <Section title="По предметам" note="качество — доля оценок 4 и 5">
        <SubjectsTable payload={payload} />
      </Section>
      <Section title="Рейтинг учеников" note="нажмите на строку — карточка ученика">
        <RankingTable payload={payload} onSelect={() => {}} />
      </Section>
      <Section title="Группы внимания">
        <GroupsCard payload={payload} />
      </Section>
      <div className="mt-4">
        <AbsentCard payload={payload} />
      </div>
    </main>
  );
}
