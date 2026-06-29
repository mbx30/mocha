import { useTranslation } from "react-i18next";
import {
  useToolOperation,
  ToolType,
} from "@app/hooks/tools/shared/useToolOperation";
import { createStandardErrorHandler } from "@app/utils/toolErrorHandler";
import {
  PrintPreflightParameters,
  defaultParameters,
} from "@app/hooks/tools/printPreflight/usePrintPreflightParameters";

export const buildPrintPreflightFormData = (
  parameters: PrintPreflightParameters,
  file: File,
): FormData => {
  const formData = new FormData();
  formData.append("fileInput", file);
  formData.append("bleedSizeInches", parameters.bleedSizeInches.toString());
  formData.append("addCropMarks", parameters.addCropMarks.toString());
  return formData;
};

export const printPreflightOperationConfig = {
  toolType: ToolType.singleFile,
  buildFormData: buildPrintPreflightFormData,
  operationType: "printPreflight",
  endpoint: "/api/v1/general/print-preflight",
  defaultParameters,
} as const;

export const usePrintPreflightOperation = () => {
  const { t } = useTranslation();

  return useToolOperation<PrintPreflightParameters>({
    ...printPreflightOperationConfig,
    filePrefix: t("printPreflight.filenamePrefix", "mocha_export") + "_",
    getErrorMessage: createStandardErrorHandler(
      t(
        "printPreflight.error.failed",
        "An error occurred while processing the PDF for print.",
      ),
    ),
  });
};
