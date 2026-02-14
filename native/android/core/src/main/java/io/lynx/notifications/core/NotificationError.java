package io.lynx.notifications.core;

public class NotificationError extends Exception {
  private final String code;

  public NotificationError(String code, String message) {
    super(message);
    this.code = code;
  }

  public NotificationError(String code, String message, Throwable cause) {
    super(message, cause);
    this.code = code;
  }

  public String getCode() {
    return code;
  }

  public static NotificationError fromThrowable(Throwable throwable) {
    if (throwable instanceof NotificationError) {
      return (NotificationError) throwable;
    }

    String message = throwable.getMessage();
    if (message == null || message.isEmpty()) {
      message = "Native notifications error";
    }

    return new NotificationError("ERR_NATIVE_FAILURE", message, throwable);
  }
}
