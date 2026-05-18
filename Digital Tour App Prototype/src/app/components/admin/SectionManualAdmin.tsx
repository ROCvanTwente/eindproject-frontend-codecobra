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

export function SectionManualAdmin({
  language,
  settings,
  onChange,
}: Props) {
  const update = (manualAdmin: ManualSection[]) =>
    onChange(
      { manualAdmin },
      { action: "update-manual-admin", target: "admin" },
    );

  return (
    <ManualEditor
      language={language}
      title={
        language === "nl"
          ? "Handleiding beheer"
          : "Admin manual"
      }
      sections={settings.manualAdmin}
      onChange={update}
    />
  );
}