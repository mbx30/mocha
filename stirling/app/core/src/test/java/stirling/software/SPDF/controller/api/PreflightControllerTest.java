package stirling.software.SPDF.controller.api;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.lang.reflect.Method;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;

import stirling.software.SPDF.model.api.general.PreflightRequest;
import stirling.software.common.service.CustomPDFDocumentFactory;
import stirling.software.common.service.PdfMetadataService;
import stirling.software.common.util.TempFileManager;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PreflightControllerTest {

    private static final float BLEED_PT = 0.125f * 72f;

    private PdfMetadataService pdfMetadataService;
    private TempFileManager tempFileManager;
    private CustomPDFDocumentFactory pdfDocumentFactory;
    private PreflightController controller;

    @BeforeEach
    void setUp() {
        pdfMetadataService = mock(PdfMetadataService.class);
        tempFileManager = mock(TempFileManager.class);
        pdfDocumentFactory = new CustomPDFDocumentFactory(pdfMetadataService, tempFileManager);
        controller = new PreflightController(pdfDocumentFactory, tempFileManager);
    }

    private void stubTempFiles() throws Exception {
        when(tempFileManager.createTempFile(anyString()))
                .thenAnswer(
                        inv ->
                                File.createTempFile(
                                        "preflight-test-", inv.getArgument(0, String.class)));
        when(tempFileManager.createManagedTempFile(anyString()))
                .thenAnswer(
                        inv ->
                                new stirling.software.common.util.TempFile(
                                        tempFileManager, inv.getArgument(0, String.class)));
        doAnswer(
                        inv -> {
                            inv.getArgument(0, File.class).delete();
                            return null;
                        })
                .when(tempFileManager)
                .deleteTempFile(any(File.class));
    }

    @Test
    void pageAlreadyHasBleed_falseForRawLetterSize() throws Exception {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.LETTER);
            doc.addPage(page);
            assertFalse(invokePageAlreadyHasBleed(page, BLEED_PT));
        }
    }

    @Test
    void pageAlreadyHasBleed_trueForLetterPlusBleed() throws Exception {
        try (PDDocument doc = new PDDocument()) {
            PDPage page =
                    new PDPage(
                            new PDRectangle(
                                    PDRectangle.LETTER.getWidth() + 2 * BLEED_PT,
                                    PDRectangle.LETTER.getHeight() + 2 * BLEED_PT));
            doc.addPage(page);
            assertTrue(invokePageAlreadyHasBleed(page, BLEED_PT));
        }
    }

    @Test
    void printPreflight_expandsLetterPageByBleed() throws Exception {
        stubTempFiles();

        byte[] inputPdf;
        try (PDDocument doc = new PDDocument()) {
            doc.addPage(new PDPage(PDRectangle.LETTER));
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            doc.save(baos);
            inputPdf = baos.toByteArray();
        }

        MockMultipartFile file =
                new MockMultipartFile(
                        "fileInput", "card.pdf", MediaType.APPLICATION_PDF_VALUE, inputPdf);

        PreflightRequest request = new PreflightRequest();
        request.setFileInput(file);
        request.setBleedSizeInches(0.125f);
        request.setAddCropMarks(false);

        ResponseEntity<Resource> response = controller.printPreflight(request);
        assertNotNull(response.getBody());
        assertTrue(response.getStatusCode().is2xxSuccessful());

        byte[] outputBytes = response.getBody().getInputStream().readAllBytes();
        try (PDDocument out = Loader.loadPDF(outputBytes)) {
            assertEquals(1, out.getNumberOfPages());
            PDRectangle media = out.getPage(0).getMediaBox();
            float expectedW = PDRectangle.LETTER.getWidth() + 2 * BLEED_PT;
            float expectedH = PDRectangle.LETTER.getHeight() + 2 * BLEED_PT;
            assertEquals(expectedW, media.getWidth(), 1.0f);
            assertEquals(expectedH, media.getHeight(), 1.0f);
        }
    }

    @Test
    void printPreflight_passesThroughWhenBleedAlreadyPresent() throws Exception {
        stubTempFiles();

        byte[] inputPdf;
        try (PDDocument doc = new PDDocument()) {
            doc.addPage(
                    new PDPage(
                            new PDRectangle(
                                    PDRectangle.LETTER.getWidth() + 2 * BLEED_PT,
                                    PDRectangle.LETTER.getHeight() + 2 * BLEED_PT)));
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            doc.save(baos);
            inputPdf = baos.toByteArray();
        }

        MockMultipartFile file =
                new MockMultipartFile(
                        "fileInput", "preflighted.pdf", MediaType.APPLICATION_PDF_VALUE, inputPdf);

        PreflightRequest request = new PreflightRequest();
        request.setFileInput(file);
        request.setBleedSizeInches(0.125f);

        ResponseEntity<Resource> response = controller.printPreflight(request);
        byte[] outputBytes = response.getBody().getInputStream().readAllBytes();
        try (PDDocument out = Loader.loadPDF(outputBytes)) {
            assertEquals(1, out.getNumberOfPages());
            PDRectangle media = out.getPage(0).getMediaBox();
            assertEquals(PDRectangle.LETTER.getWidth() + 2 * BLEED_PT, media.getWidth(), 1.0f);
        }
    }

    private boolean invokePageAlreadyHasBleed(PDPage page, float bleedPt) throws Exception {
        Method m =
                PreflightController.class.getDeclaredMethod(
                        "pageAlreadyHasBleed", PDPage.class, float.class);
        m.setAccessible(true);
        return (Boolean) m.invoke(controller, page, bleedPt);
    }
}
