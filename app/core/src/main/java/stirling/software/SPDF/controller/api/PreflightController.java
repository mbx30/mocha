package stirling.software.SPDF.controller.api;

import java.awt.Color;
import java.io.IOException;

import org.apache.pdfbox.multipdf.LayerUtility;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.graphics.form.PDFormXObject;
import org.apache.pdfbox.util.Matrix;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.multipart.MultipartFile;

import io.swagger.v3.oas.annotations.Operation;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import stirling.software.SPDF.model.api.general.PreflightRequest;
import stirling.software.common.annotations.AutoJobPostMapping;
import stirling.software.common.annotations.api.GeneralApi;
import stirling.software.common.enumeration.ResourceWeight;
import stirling.software.common.service.CustomPDFDocumentFactory;
import stirling.software.common.util.GeneralUtils;
import stirling.software.common.util.TempFileManager;
import stirling.software.common.util.WebResponseUtils;

@GeneralApi
@Slf4j
@RequiredArgsConstructor
public class PreflightController {

    // Standard print sizes in points (1 inch = 72 points)
    private static final float[][] STANDARD_SIZES_PT = {
        {8.5f * 72, 11f * 72}, // US Letter
        {11f * 72, 17f * 72}, // Tabloid / Ledger
        {13f * 72, 19f * 72}, // Super B / Large Format
        {5.5f * 72, 8.5f * 72}, // Half Letter
    };

    private final CustomPDFDocumentFactory pdfDocumentFactory;
    private final TempFileManager tempFileManager;

    @AutoJobPostMapping(
            value = "/print-preflight",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            resourceWeight = ResourceWeight.SMALL_WEIGHT)
    @Operation(
            summary = "Add bleed and crop marks for print production",
            description =
                    "Adds 0.125 inch bleed around all 4 edges of every page and optional US-style"
                            + " crop marks at trim corners. Detects files that already have bleed"
                            + " and passes them through unchanged. Input:PDF Output:PDF Type:SISO")
    public ResponseEntity<Resource> printPreflight(@ModelAttribute PreflightRequest request)
            throws IOException {

        MultipartFile file = request.getFileInput();
        float bleedPt = request.getBleedSizeInches() * 72f;
        boolean addCropMarks = request.isAddCropMarks();

        try (PDDocument sourceDocument = pdfDocumentFactory.load(file)) {
            // Tier-1 detection: size check against known standard sizes
            boolean allHaveBleed = true;
            for (int i = 0; i < sourceDocument.getNumberOfPages(); i++) {
                if (!pageAlreadyHasBleed(sourceDocument.getPage(i), bleedPt)) {
                    allHaveBleed = false;
                    break;
                }
            }

            if (allHaveBleed) {
                log.info(
                        "print-preflight: all pages appear to already have bleed — returning unchanged");
                return WebResponseUtils.pdfDocToWebResponse(
                        sourceDocument,
                        GeneralUtils.generateFilename(
                                file.getOriginalFilename(), "_preflighted.pdf"),
                        tempFileManager);
            }

            try (PDDocument outputDocument =
                    pdfDocumentFactory.createNewDocumentBasedOnOldDocument(sourceDocument)) {

                LayerUtility layerUtility = new LayerUtility(outputDocument);

                for (int i = 0; i < sourceDocument.getNumberOfPages(); i++) {
                    PDPage sourcePage = sourceDocument.getPage(i);
                    PDRectangle sourceMediaBox = sourcePage.getMediaBox();
                    PDRectangle sourceCropBox = sourcePage.getCropBox();
                    if (sourceCropBox == null) {
                        sourceCropBox = sourceMediaBox;
                    }

                    float trimW = sourceMediaBox.getWidth();
                    float trimH = sourceMediaBox.getHeight();
                    float sourceVisibleW = sourceCropBox.getWidth();
                    float sourceVisibleH = sourceCropBox.getHeight();

                    // New page size = trim size + bleed on all 4 sides
                    PDRectangle newBox = new PDRectangle(trimW + 2 * bleedPt, trimH + 2 * bleedPt);
                    PDPage newPage = new PDPage(newBox);
                    outputDocument.addPage(newPage);

                    // Normalize to visible CropBox space to avoid inherited non-uniform transforms
                    PDRectangle originalMediaBox = sourcePage.getMediaBox();
                    PDRectangle originalCropBox = sourcePage.getCropBox();
                    sourcePage.setMediaBox(sourceCropBox);
                    sourcePage.setCropBox(sourceCropBox);

                    PDFormXObject form;
                    try {
                        form = layerUtility.importPageAsForm(sourceDocument, i);
                    } finally {
                        sourcePage.setMediaBox(originalMediaBox);
                        sourcePage.setCropBox(originalCropBox);
                    }

                    try (PDPageContentStream cs =
                            new PDPageContentStream(
                                    outputDocument,
                                    newPage,
                                    PDPageContentStream.AppendMode.APPEND,
                                    true,
                                    true)) {

                        // Place source content with proportional fit (no X/Y warping).
                        float scaleX = trimW / sourceVisibleW;
                        float scaleY = trimH / sourceVisibleH;
                        float scale = Math.min(scaleX, scaleY);
                        float targetW = sourceVisibleW * scale;
                        float targetH = sourceVisibleH * scale;
                        float x = bleedPt + (trimW - targetW) / 2f;
                        float y = bleedPt + (trimH - targetH) / 2f;

                        cs.saveGraphicsState();
                        cs.transform(Matrix.getTranslateInstance(x, y));
                        cs.transform(Matrix.getScaleInstance(scale, scale));
                        cs.transform(
                                Matrix.getTranslateInstance(
                                        -sourceCropBox.getLowerLeftX(),
                                        -sourceCropBox.getLowerLeftY()));
                        cs.drawForm(form);
                        cs.restoreGraphicsState();

                        // Draw US-style crop marks at trim corners
                        if (addCropMarks) {
                            drawCropMarks(cs, trimW, trimH, bleedPt);
                        }
                    }
                }

                return WebResponseUtils.pdfDocToWebResponse(
                        outputDocument,
                        GeneralUtils.generateFilename(
                                file.getOriginalFilename(), "_preflighted.pdf"),
                        tempFileManager);
            }
        }
    }

    /**
     * Detects whether a page already has bleed by comparing its size to known standard print sizes
     * plus the expected bleed amount.
     */
    private boolean pageAlreadyHasBleed(PDPage page, float bleedPt) {
        PDRectangle box = page.getMediaBox();
        float w = box.getWidth();
        float h = box.getHeight();
        float tolerance = 2f; // 2pt tolerance for floating-point imprecision

        for (float[] size : STANDARD_SIZES_PT) {
            float expectedPortraitW = size[0] + 2 * bleedPt;
            float expectedPortraitH = size[1] + 2 * bleedPt;
            // Portrait orientation
            if (Math.abs(w - expectedPortraitW) < tolerance
                    && Math.abs(h - expectedPortraitH) < tolerance) {
                return true;
            }
            // Landscape orientation (swap W/H)
            if (Math.abs(w - expectedPortraitH) < tolerance
                    && Math.abs(h - expectedPortraitW) < tolerance) {
                return true;
            }
        }
        return false;
    }

    /**
     * Draws US-style crop marks at the four trim corners. Marks are drawn in the bleed area and
     * indicate where the guillotine cutter should cut.
     *
     * <p>PDF coordinate system has origin at bottom-left with Y increasing upward.
     */
    private void drawCropMarks(PDPageContentStream cs, float trimW, float trimH, float bleedPt)
            throws IOException {

        // Mark length fills the bleed area (from page edge to trim boundary)
        float markLength = bleedPt;

        cs.setLineWidth(0.5f);
        cs.setStrokingColor(Color.BLACK);

        // Trim boundary coordinates in the new (expanded) page coordinate system
        float left = bleedPt;
        float right = bleedPt + trimW;
        float bottom = bleedPt;
        float top = bleedPt + trimH;

        // Bottom-left corner
        // Horizontal: from page edge rightward to trim left edge
        cs.moveTo(0, bottom);
        cs.lineTo(left, bottom);
        cs.stroke();
        // Vertical: from page edge upward to trim bottom edge
        cs.moveTo(left, 0);
        cs.lineTo(left, bottom);
        cs.stroke();

        // Bottom-right corner
        // Horizontal: from trim right edge to page right edge
        cs.moveTo(right, bottom);
        cs.lineTo(right + markLength, bottom);
        cs.stroke();
        // Vertical: from page edge upward to trim bottom edge
        cs.moveTo(right, 0);
        cs.lineTo(right, bottom);
        cs.stroke();

        // Top-right corner
        // Horizontal: from trim right edge to page right edge
        cs.moveTo(right, top);
        cs.lineTo(right + markLength, top);
        cs.stroke();
        // Vertical: from trim top edge to page top edge
        cs.moveTo(right, top);
        cs.lineTo(right, top + markLength);
        cs.stroke();

        // Top-left corner
        // Horizontal: from page edge to trim left edge
        cs.moveTo(0, top);
        cs.lineTo(left, top);
        cs.stroke();
        // Vertical: from trim top edge to page top edge
        cs.moveTo(left, top);
        cs.lineTo(left, top + markLength);
        cs.stroke();
    }
}
