package io.lynx.notifications.core;

import java.util.HashMap;
import java.util.Map;

public final class NativeResult {
  private NativeResult() {}

  public static Map<String, Object> ok(Object data) {
    Map<String, Object> envelope = new HashMap<>();
    envelope.put("ok", true);
    envelope.put("data", data);
    return envelope;
  }

  public static Map<String, Object> error(String code, String message) {
    Map<String, Object> error = new HashMap<>();
    error.put("code", code);
    error.put("message", message);

    Map<String, Object> envelope = new HashMap<>();
    envelope.put("ok", false);
    envelope.put("error", error);
    return envelope;
  }
}
