import { Language } from "../../types";
import {
  AdminSettings,
  ManualSection,
} from "../../data/settings";
import { ManualEditor } from "./ManualEditor";

interface Props {
  language: Language;
  settings: AdminSettings;
  onChange: (
    patch: Partial<AdminSettings>,
    log?: { action: string; target: string },
  ) => void;
}

export function SectionManualUser({
  language,
  settings,
  onChange,
}: Props) {
  const update = (manualUser: ManualSection[]) =>
    onChange(
      { manualUser },
      { action: "update-manual-user", target: "user" },
    );

  return (
    <ManualEditor
      language={language}
      title={
        language === "nl"
          ? "Handleiding bezoeker"
          : "User manual"
      }
      sections={settings.manualUser}
      onChange={update}
    />
  );
}