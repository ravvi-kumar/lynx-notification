package io.lynx.notifications.core;

import java.util.HashMap;
import java.util.Map;

public final class PushToken {
  private final String type;
  private final String data;

  public PushToken(String type, String data) {
    this.type = type;
    this.data = data;
  }

  public Map<String, Object> toMap() {
    Map<String, Object> map = new HashMap<>();
    map.put("type", type);
    map.put("data", data);
    return map;
  }
}
