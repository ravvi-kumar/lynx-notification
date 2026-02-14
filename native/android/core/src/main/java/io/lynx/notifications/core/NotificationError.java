package io.lynx.notifications.core;

public final class NotificationError extends Exception {
  private final String code;

  public NotificationError(String code, String message) {
    super(message);
    this.code = code;
  }

  public String getCode() {
    return code;
  }
}
