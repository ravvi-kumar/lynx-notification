import Foundation

public final class LynxNotificationsModule {
  public typealias MethodCallback = (NativeResult<Any?>) -> Void
  public typealias EventCallback = ([String: Any]) -> Void

  private let pushTokenProvider: PushTokenProvider
  private let scheduler: LocalNotificationScheduler

  public init(pushTokenProvider: PushTokenProvider, scheduler: LocalNotificationScheduler) {
    self.pushTokenProvider = pushTokenProvider
    self.scheduler = scheduler
  }

  public func getPermissions(_ callback: MethodCallback) {
    callback(.ok([
      "status": "undetermined",
      "granted": false,
      "canAskAgain": true,
    ]))
  }

  public func requestPermissions(_ callback: MethodCallback) {
    callback(.ok([
      "status": "granted",
      "granted": true,
      "canAskAgain": true,
    ]))
  }

  public func getPushToken(provider: String, callback: MethodCallback) {
    guard provider == "fcm" else {
      callback(.error(code: "ERR_PROVIDER_UNCONFIGURED", message: "Only fcm provider is configured in v1."))
      return
    }

    pushTokenProvider.getToken(callback)
  }

  public func scheduleNotification(request: [String: Any], callback: MethodCallback) {
    scheduler.schedule(request: request, callback: callback)
  }

  public func cancelScheduledNotification(id: String, callback: MethodCallback) {
    scheduler.cancel(id: id, callback: callback)
  }

  public func cancelAllScheduledNotifications(_ callback: MethodCallback) {
    scheduler.cancelAll(callback)
  }

  public func getLastNotificationResponse(_ callback: MethodCallback) {
    callback(.ok(nil))
  }

  public func startObservingEvents(_ callback: @escaping EventCallback) {
    // Hook native notification events and invoke callback(eventPayload)
    _ = callback
  }

  public func stopObservingEvents(_ callback: MethodCallback) {
    callback(.ok(nil))
  }
}

public protocol PushTokenProvider {
  func getToken(_ callback: @escaping LynxNotificationsModule.MethodCallback)
}

public protocol LocalNotificationScheduler {
  func schedule(request: [String: Any], callback: @escaping LynxNotificationsModule.MethodCallback)
  func cancel(id: String, callback: @escaping LynxNotificationsModule.MethodCallback)
  func cancelAll(_ callback: @escaping LynxNotificationsModule.MethodCallback)
}

public enum NativeResult<T> {
  case ok(T)
  case error(code: String, message: String)

  public func asDictionary() -> [String: Any] {
    switch self {
    case let .ok(value):
      return [
        "ok": true,
        "data": value as Any,
      ]
    case let .error(code, message):
      return [
        "ok": false,
        "error": [
          "code": code,
          "message": message,
        ],
      ]
    }
  }
}
