package stirling.software.common.util;

/** Test-only helpers for {@link DockerEnvironment}. */
public final class DockerEnvironmentTestSupport {

    static final String OVERRIDE_PROPERTY = "stirling.runningInDocker";

    private DockerEnvironmentTestSupport() {}

    public static void runOutsideDocker(Runnable action) {
        String previous = System.getProperty(OVERRIDE_PROPERTY);
        try {
            System.setProperty(OVERRIDE_PROPERTY, "false");
            action.run();
        } finally {
            if (previous == null) {
                System.clearProperty(OVERRIDE_PROPERTY);
            } else {
                System.setProperty(OVERRIDE_PROPERTY, previous);
            }
        }
    }
}
