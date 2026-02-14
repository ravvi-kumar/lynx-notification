package io.lynx.notifications.core;

import java.util.HashMap;
import java.util.Map;

public final class NotificationPermissions {
  private final String status;
  private final boolean granted;
  private final boolean canAskAgain;

  public NotificationPermissions(String status, boolean granted, boolean canAskAgain) {
    this.status = status;
    this.granted = granted;
    this.canAskAgain = canAskAgain;
  }

  public Map<String, Object> toMap() {
    Map<String, Object> map = new HashMap<>();
    map.put("status", status);
    map.put("granted", granted);
    map.put("canAskAgain", canAskAgain);
    return map;
  }
}
