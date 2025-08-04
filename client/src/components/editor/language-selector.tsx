import { useState } from "react";
import { languages } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";

type LanguageSelectorProps = {
  currentLanguage: string;
  onSelect: (languageId: string) => void;
};

export function LanguageSelector({
  currentLanguage,
  onSelect,
}: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);

  // Get language info from API (in a real app you might want to fetch this)
  const { data: languageOptions } = useQuery({
    queryKey: ["/api/languages"],
    initialData: languages,
  });

  const selectedLanguage =
    languageOptions.find(lang => lang.id === currentLanguage) ||
    languageOptions[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center space-x-2 text-sm rounded px-2 py-1 bg-transparent"
        >
          <span className={`${selectedLanguage.iconColor} font-mono text-xs`}>
            {selectedLanguage.name}
          </span>
          <i className="ri-arrow-down-s-line text-muted-foreground"></i>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0">
        <div className="py-1">
          {languageOptions.map(language => (
            <button
              key={language.id}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center ${
                language.id === currentLanguage
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground"
              }`}
              onClick={() => {
                onSelect(language.id);
                setOpen(false);
              }}
            >
              <i className={`${language.icon} ${language.iconColor} mr-2`}></i>
              <span>{language.name}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
