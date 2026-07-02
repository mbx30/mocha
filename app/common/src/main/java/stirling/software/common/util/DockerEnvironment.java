package stirling.software.common.util;

import java.nio.file.Files;
import java.nio.file.Path;

import lombok.experimental.UtilityClass;

/** Detects whether the JVM is running inside a Docker container. */
@UtilityClass
public class DockerEnvironment {

    /**
     * Optional JVM override for unit tests ({@code -Dstirling.runningInDocker=true|false}). When
     * unset, detection uses {@code /.dockerenv}.
     */
    private static final String OVERRIDE_PROPERTY = "stirling.runningInDocker";

    public static boolean isRunningInDocker() {
        String override = System.getProperty(OVERRIDE_PROPERTY);
        if (override != null) {
            return Boolean.parseBoolean(override);
        }
        return Files.exists(Path.of("/.dockerenv"));
    }
}
