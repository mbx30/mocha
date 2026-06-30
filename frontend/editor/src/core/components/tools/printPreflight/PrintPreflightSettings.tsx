import { Stack, NumberInput, Switch, Text, Group, Box } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { PrintPreflightParametersHook } from "@app/hooks/tools/printPreflight/usePrintPreflightParameters";

interface PrintPreflightSettingsProps {
  parameters: PrintPreflightParametersHook;
  disabled?: boolean;
}

const PrintPreflightSettings = ({
  parameters,
  disabled = false,
}: PrintPreflightSettingsProps) => {
  const { t } = useTranslation();

  return (
    <Stack gap="md">
      {/* Bleed diagram */}
      <Box>
        <Text size="sm" fw={500} mb="xs">
          {t("printPreflight.diagram.title", "What will be added")}
        </Text>
        <Box
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "1rem",
            background: "var(--mantine-color-gray-0)",
            borderRadius: "8px",
            border: "1px solid var(--mantine-color-gray-3)",
          }}
        >
          <svg
            width="180"
            height="140"
            viewBox="0 0 180 140"
            xmlns="http://www.w3.org/2000/svg"
            aria-label={t(
              "printPreflight.diagram.aria",
              "Bleed and crop marks diagram",
            )}
          >
            {/* Bleed area (outer) */}
            <rect
              x="10"
              y="10"
              width="160"
              height="120"
              fill="var(--mantine-color-blue-1)"
              stroke="var(--mantine-color-blue-5)"
              strokeWidth="1"
              strokeDasharray="4 2"
            />
            {/* Content / trim area (inner) */}
            <rect
              x="30"
              y="25"
              width="120"
              height="90"
              fill="var(--mantine-color-gray-1)"
              stroke="var(--mantine-color-gray-6)"
              strokeWidth="1"
            />
            {/* Corner crop marks — top-left */}
            <line
              x1="10"
              y1="25"
              x2="30"
              y2="25"
              stroke="black"
              strokeWidth="0.8"
            />
            <line
              x1="30"
              y1="10"
              x2="30"
              y2="25"
              stroke="black"
              strokeWidth="0.8"
            />
            {/* Corner crop marks — top-right */}
            <line
              x1="150"
              y1="25"
              x2="170"
              y2="25"
              stroke="black"
              strokeWidth="0.8"
            />
            <line
              x1="150"
              y1="10"
              x2="150"
              y2="25"
              stroke="black"
              strokeWidth="0.8"
            />
            {/* Corner crop marks — bottom-left */}
            <line
              x1="10"
              y1="115"
              x2="30"
              y2="115"
              stroke="black"
              strokeWidth="0.8"
            />
            <line
              x1="30"
              y1="115"
              x2="30"
              y2="130"
              stroke="black"
              strokeWidth="0.8"
            />
            {/* Corner crop marks — bottom-right */}
            <line
              x1="150"
              y1="115"
              x2="170"
              y2="115"
              stroke="black"
              strokeWidth="0.8"
            />
            <line
              x1="150"
              y1="115"
              x2="150"
              y2="130"
              stroke="black"
              strokeWidth="0.8"
            />
            {/* Labels */}
            <text
              x="90"
              y="72"
              textAnchor="middle"
              fontSize="9"
              fill="var(--mantine-color-gray-7)"
            >
              {t("printPreflight.diagram.content", "Content")}
            </text>
            <text
              x="90"
              y="82"
              textAnchor="middle"
              fontSize="7"
              fill="var(--mantine-color-gray-5)"
            >
              (trim size)
            </text>
            <text x="17" y="19" fontSize="7" fill="var(--mantine-color-blue-6)">
              {t("printPreflight.diagram.bleed", "Bleed")}
            </text>
          </svg>
        </Box>
      </Box>

      {/* Bleed size input */}
      <NumberInput
        label={t("printPreflight.options.bleedSize.label", "Bleed Size (inches)")}
        description={t(
          "printPreflight.options.bleedSize.desc",
          'Standard print bleed is 0.125 in (1/8"). Most print shops require this exact amount.',
        )}
        value={parameters.parameters.bleedSizeInches}
        onChange={(val) =>
          parameters.updateParameter("bleedSizeInches", Number(val) || 0.125)
        }
        min={0.0625}
        max={0.5}
        step={0.0625}
        decimalScale={4}
        suffix=" in"
        disabled={disabled}
      />

      {/* Crop marks toggle */}
      <Group justify="space-between" align="flex-start">
        <Stack gap={2}>
          <Text size="sm" fw={500}>
            {t("printPreflight.options.addCropMarks.label", "Add Crop Marks")}
          </Text>
          <Text size="xs" c="dimmed">
            {t(
              "printPreflight.options.addCropMarks.desc",
              "Corner lines showing where to cut after printing",
            )}
          </Text>
        </Stack>
        <Switch
          checked={parameters.parameters.addCropMarks}
          onChange={(e) =>
            parameters.updateParameter("addCropMarks", e.currentTarget.checked)
          }
          disabled={disabled}
        />
      </Group>
    </Stack>
  );
};

export default PrintPreflightSettings;
