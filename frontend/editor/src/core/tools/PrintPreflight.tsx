import { useTranslation } from "react-i18next";
import { createToolFlow } from "@app/components/tools/shared/createToolFlow";
import PrintPreflightSettings from "@app/components/tools/printPreflight/PrintPreflightSettings";
import { usePrintPreflightParameters } from "@app/hooks/tools/printPreflight/usePrintPreflightParameters";
import { usePrintPreflightOperation } from "@app/hooks/tools/printPreflight/usePrintPreflightOperation";
import { useBaseTool } from "@app/hooks/tools/shared/useBaseTool";
import { BaseToolProps, ToolComponent } from "@app/types/tool";
import { usePrintPreflightTips } from "@app/components/tooltips/usePrintPreflightTips";

const PrintPreflight = (props: BaseToolProps) => {
  const { t } = useTranslation();
  const tips = usePrintPreflightTips();

  const base = useBaseTool(
    "printPreflight",
    usePrintPreflightParameters,
    usePrintPreflightOperation,
    props,
  );

  return createToolFlow({
    files: {
      selectedFiles: base.selectedFiles,
      isCollapsed: base.hasResults,
    },
    steps: [
      {
        title: t("printPreflight.steps.settings", "Settings"),
        isCollapsed: base.settingsCollapsed,
        onCollapsedClick: base.settingsCollapsed
          ? base.handleSettingsReset
          : undefined,
        tooltip: tips,
        content: (
          <PrintPreflightSettings
            parameters={base.params}
            disabled={base.endpointLoading}
          />
        ),
      },
    ],
    executeButton: {
      text: t("printPreflight.submit", "Prepare for Print"),
      isVisible: !base.hasResults,
      loadingText: t("loading"),
      onClick: base.handleExecute,
      endpointEnabled: base.endpointEnabled,
      paramsValid: base.params.validateParameters(),
    },
    review: {
      isVisible: base.hasResults,
      operation: base.operation,
      title: t("printPreflight.results.title", "Print-Ready File"),
      onFileClick: base.handleThumbnailClick,
      onUndo: base.handleUndo,
    },
  });
};

export default PrintPreflight as ToolComponent;
