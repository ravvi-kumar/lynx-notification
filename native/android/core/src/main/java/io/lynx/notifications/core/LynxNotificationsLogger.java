package io.lynx.notifications.core;

/**
 * Lightweight logger for native notifications diagnostics.
 *
 * Logging is disabled by default and should be enabled only for debug/QA runs.
 */
public final class LynxNotificationsLogger {
  private static volatile boolean debugEnabled = false;

  private LynxNotificationsLogger() {}

  public static void setDebugEnabled(boolean enabled) {
    debugEnabled = enabled;
  }

  public static boolean isDebugEnabled() {
    return debugEnabled;
  }

  public static void debug(String message) {
    if (!debugEnabled) {
      return;
    }
    System.out.println("[LynxNotifications][DEBUG] " + message);
  }

  public static void error(String message) {
    if (!debugEnabled) {
      return;
    }
    System.err.println("[LynxNotifications][ERROR] " + message);
  }

  public static void error(String message, Throwable throwable) {
    if (!debugEnabled) {
      return;
    }
    System.err.println("[LynxNotifications][ERROR] " + message);
    if (throwable != null) {
      throwable.printStackTrace(System.err);
    }
  }
}
