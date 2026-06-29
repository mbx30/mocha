package stirling.software.SPDF.model.api.general;

import io.swagger.v3.oas.annotations.media.Schema;

import lombok.Data;
import lombok.EqualsAndHashCode;

import stirling.software.common.model.api.PDFFile;

@Data
@EqualsAndHashCode(callSuper = true)
public class PreflightRequest extends PDFFile {

    @Schema(
            description =
                    "Bleed size in inches to add around all 4 edges. Standard print bleed is 0.125 inches.",
            type = "number",
            defaultValue = "0.125",
            requiredMode = Schema.RequiredMode.NOT_REQUIRED)
    private float bleedSizeInches = 0.125f;

    @Schema(
            description =
                    "Whether to add US-style crop marks at the trim corners. Crop marks show where to cut after printing.",
            defaultValue = "true",
            requiredMode = Schema.RequiredMode.NOT_REQUIRED)
    private boolean addCropMarks = true;
}
