import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };
  return (
    <div className="flex gap-2">
      <Button
        variant={i18n.language === "en" ? "default" : "outline"}
        size="sm"
        onClick={() => changeLanguage("en")}
      >
        {t("english")}
      </Button>
      <Button
        variant={i18n.language === "am" ? "default" : "outline"}
        size="sm"
        onClick={() => changeLanguage("am")}
      >
        {t("amharic")}
      </Button>
    </div>
  );
}
