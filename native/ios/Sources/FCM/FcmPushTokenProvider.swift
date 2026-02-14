import Foundation

public final class FcmPushTokenProvider: PushTokenProvider {
  public init() {}

  public func getToken(_ callback: @escaping LynxNotificationsModule.MethodCallback) {
    callback(.error(code: "ERR_PROVIDER_UNCONFIGURED", message: "FCM provider template requires Firebase integration."))
  }
}
