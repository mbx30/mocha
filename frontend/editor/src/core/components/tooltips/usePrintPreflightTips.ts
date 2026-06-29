import { useTranslation } from "react-i18next";
import { TooltipContent } from "@app/types/tips";

export const usePrintPreflightTips = (): TooltipContent => {
  const { t } = useTranslation();

  return {
    header: {
      title: t(
        "printPreflight.tooltip.header.title",
        "Print Preflight Overview",
      ),
    },
    tips: [
      {
        title: t(
          "printPreflight.tooltip.description.title",
          "What does this do?",
        ),
        description: t(
          "printPreflight.tooltip.description.text",
          "Automatically prepares your PDF for professional printing by adding bleed and crop marks.",
        ),
        bullets: [
          t(
            "printPreflight.tooltip.description.bullet1",
            "Bleed: an extra border so nothing important gets cut off at the edge",
          ),
          t(
            "printPreflight.tooltip.description.bullet2",
            "Crop marks: small corner lines that show the printer where to cut",
          ),
        ],
      },
      {
        title: t("printPreflight.tooltip.bleed.title", "What is bleed?"),
        description: t(
          "printPreflight.tooltip.bleed.text",
          'When a design has color or images that go to the very edge of the page, printers need a little extra beyond the cut line — that extra is called bleed. 0.125 in (1/8") is the print industry standard.',
        ),
      },
    ],
  };
};
