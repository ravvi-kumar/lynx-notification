import Foundation

public final class LynxNotificationsEventForwarder {
  private let module: LynxNotificationsModule

  public init(module: LynxNotificationsModule) {
    self.module = module
  }

  public func onForegroundNotificationReceived(notification: [String: Any]) {
    module.emitNotificationReceived(notification: notification)
  }

  public func onNotificationResponse(response: [String: Any]) {
    module.emitNotificationResponse(response: response)
  }

  public func onTokenRefreshed(token: String) {
    module.emitTokenRefreshed(token: PushToken(type: "fcm", data: token))
  }
}
