package io.lynx.notifications.core;

/**
 * Host integration helper.
 *
 * This class keeps Lynx SDK-specific registration calls outside the core module so
 * applications can adapt it to their current Lynx runtime wiring.
 */
public final class LynxNotificationsInstaller {
  private LynxNotificationsInstaller() {}

  public static void setDebugLoggingEnabled(boolean enabled) {
    LynxNotificationsLogger.setDebugEnabled(enabled);
  }

  public static void install(
      ModuleRegistrar moduleRegistrar,
      AuthValidatorRegistrar authValidatorRegistrar,
      LynxNotificationsModule module
  ) {
    moduleRegistrar.registerModule("LynxNotificationsModule", module);

    authValidatorRegistrar.registerValidator(moduleName ->
        LynxNotificationsAuthValidator.verify(moduleName)
    );
  }

  public interface ModuleRegistrar {
    void registerModule(String moduleName, Object moduleInstance);
  }

  public interface AuthValidatorRegistrar {
    void registerValidator(AuthValidator validator);
  }

  public interface AuthValidator {
    boolean verify(String moduleName);
  }
}
