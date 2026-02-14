package io.lynx.notifications.core;

/**
 * Use with LynxViewBuilder.registerModuleAuthValidator on Lynx SDK >= 3.5.
 */
public final class LynxNotificationsAuthValidator {
  private LynxNotificationsAuthValidator() {}

  public static boolean verify(String moduleName) {
    return "LynxNotificationsModule".equals(moduleName);
  }
}
