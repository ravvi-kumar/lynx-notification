import Foundation

public enum LynxNotificationsLogger {
  private static var debugEnabled = false

  public static func setDebugEnabled(_ enabled: Bool) {
    debugEnabled = enabled
  }

  public static func isDebugEnabled() -> Bool {
    debugEnabled
  }

  public static func debug(_ message: String) {
    guard debugEnabled else {
      return
    }
    NSLog("[LynxNotifications][DEBUG] %@", message)
  }

  public static func error(_ message: String) {
    guard debugEnabled else {
      return
    }
    NSLog("[LynxNotifications][ERROR] %@", message)
  }
}
