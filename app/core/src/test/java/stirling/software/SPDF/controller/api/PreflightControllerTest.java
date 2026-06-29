package stirling.software.SPDF.controller.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import stirling.software.SPDF.model.api.general.PreflightRequest;
import stirling.software.common.service.CustomPDFDocumentFactory;
import stirling.software.common.util.TempFile;
import stirling.software.common.util.TempFileManager;

@ExtendWith(MockitoExtension.class)
class PreflightControllerTest {

    @TempDir Path tempDir;

    @Mock private CustomPDFDocumentFactory pdfDocumentFactory;
    @Mock private TempFileManager tempFileManager;

    @InjectMocks private PreflightController controller;

    @BeforeEach
    void setUp() throws Exception {
        lenient()
                .when(tempFileManager.createManagedTempFile(anyString()))
                .thenAnswer(
                        inv -> {
                            File f =
                                    Files.createTempFile(tempDir, "preflight-test-", ".pdf")
                                            .toFile();
                            TempFile tf = org.mockito.Mockito.mock(TempFile.class);
                            lenient().when(tf.getFile()).thenReturn(f);
                            lenient().when(tf.getPath()).thenReturn(f.toPath());
                            return tf;
                        });
    }

    @Test
    void printPreflight_preservesArtworkAspectRatio_whenCropBoxAspectDiffersFromMediaBox()
            throws Exception {
        MockMultipartFile input = createFixtureWithWideCropBoxAndSquareArtwork();
        stubFactory();

        PreflightRequest request = new PreflightRequest();
        request.setFileInput(input);
        request.setBleedSizeInches(0.125f);
        request.setAddCropMarks(false);

        ResponseEntity<Resource> response = controller.printPreflight(request);

        byte[] outputBytes = response.getBody().getInputStream().readAllBytes();
        try (PDDocument output = Loader.loadPDF(outputBytes)) {
            BufferedImage rendered = new PDFRenderer(output).renderImageWithDPI(0, 72);
            int[] bounds = findDarkPixelBounds(rendered);
            int shapeWidth = bounds[2] - bounds[0] + 1;
            int shapeHeight = bounds[3] - bounds[1] + 1;
            float ratio = (float) shapeWidth / shapeHeight;

            // The input artwork is a 100x100 square; output must remain square-ish, not stretched.
            assertThat(ratio)
                    .withFailMessage(
                            "Expected square-like output but got ratio=%s (w=%s, h=%s)",
                            ratio, shapeWidth, shapeHeight)
                    .isBetween(0.9f, 1.1f);
        }
    }

    private MockMultipartFile createFixtureWithWideCropBoxAndSquareArtwork() throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(new PDRectangle(600, 600));
            page.setCropBox(new PDRectangle(0, 150, 600, 300));
            doc.addPage(page);

            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.setNonStrokingColor(Color.BLACK);
                cs.addRect(250, 250, 100, 100);
                cs.fill();
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return new MockMultipartFile(
                    "fileInput",
                    "cropbox-fixture.pdf",
                    MediaType.APPLICATION_PDF_VALUE,
                    out.toByteArray());
        }
    }

    private void stubFactory() throws IOException {
        when(pdfDocumentFactory.load(any(MultipartFile.class)))
                .thenAnswer(inv -> Loader.loadPDF(((MultipartFile) inv.getArgument(0)).getBytes()));
        when(pdfDocumentFactory.createNewDocumentBasedOnOldDocument(any(PDDocument.class)))
                .thenAnswer(inv -> new PDDocument());
    }

    private int[] findDarkPixelBounds(BufferedImage image) {
        int minX = image.getWidth();
        int minY = image.getHeight();
        int maxX = -1;
        int maxY = -1;

        for (int y = 0; y < image.getHeight(); y++) {
            for (int x = 0; x < image.getWidth(); x++) {
                int rgb = image.getRGB(x, y);
                int red = (rgb >> 16) & 0xFF;
                int green = (rgb >> 8) & 0xFF;
                int blue = rgb & 0xFF;
                if (red < 30 && green < 30 && blue < 30) {
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }

        assertThat(maxX).isGreaterThanOrEqualTo(0);
        return new int[] {minX, minY, maxX, maxY};
    }
}
