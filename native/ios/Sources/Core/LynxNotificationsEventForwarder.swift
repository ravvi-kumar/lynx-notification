import Foundation

public final class LynxNotificationsEventForwarder {
  private let module: LynxNotificationsModule

  public init(module: LynxNotificationsModule) {
    self.module = module
  }

  public func onForegroundNotificationReceived(notification: [String: Any]) {
    LynxNotificationsLogger.debug("Forwarding foreground notification event to Lynx module.")
    module.emitNotificationReceived(notification: notification)
  }

  public func onNotificationResponse(response: [String: Any]) {
    LynxNotificationsLogger.debug("Forwarding notification response event to Lynx module.")
    module.emitNotificationResponse(response: response)
  }

  public func onTokenRefreshed(token: String) {
    LynxNotificationsLogger.debug("Forwarding token refresh event to Lynx module.")
    module.emitTokenRefreshed(token: PushToken(type: "fcm", data: token))
  }
}
