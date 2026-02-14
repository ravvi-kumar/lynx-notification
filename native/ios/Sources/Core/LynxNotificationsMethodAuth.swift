import Foundation

public enum LynxNotificationsMethodAuth {
  public static func verify(module: String) -> Bool {
    module == "LynxNotificationsModule"
  }
}
