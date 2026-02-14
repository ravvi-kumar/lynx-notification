import Foundation

public final class LynxNotificationsModule {
  public typealias MethodCallback = ([String: Any]) -> Void
  public typealias EventCallback = ([String: Any]) -> Void

  private let permissionProvider: NotificationPermissionProvider
  private let pushProviders: PushTokenProviderRegistry
  private let scheduler: LocalNotificationScheduler

  private var eventCallback: EventCallback?
  private var lastNotificationResponse: [String: Any]?

  public init(
    permissionProvider: NotificationPermissionProvider,
    pushProviders: PushTokenProviderRegistry,
    scheduler: LocalNotificationScheduler
  ) {
    self.permissionProvider = permissionProvider
    self.pushProviders = pushProviders
    self.scheduler = scheduler
  }

  public func getPermissions(_ callback: @escaping MethodCallback) {
    permissionProvider.getPermissions { result in
      switch result {
      case let .success(permissions):
        callback(NativeResult.ok(permissions.toDictionary).asDictionary())
      case let .failure(error):
        LynxNotificationsLogger.error("getPermissions failed with code=\(error.code) message=\(error.message)")
        callback(error.toNativeResult.asDictionary())
      }
    }
  }

  public func requestPermissions(_ callback: @escaping MethodCallback) {
    permissionProvider.requestPermissions { result in
      switch result {
      case let .success(permissions):
        LynxNotificationsLogger.debug("requestPermissions resolved.")
        callback(NativeResult.ok(permissions.toDictionary).asDictionary())
      case let .failure(error):
        LynxNotificationsLogger.error("requestPermissions failed with code=\(error.code) message=\(error.message)")
        callback(error.toNativeResult.asDictionary())
      }
    }
  }

  public func getPushToken(provider: String, callback: @escaping MethodCallback) {
    guard let tokenProvider = pushProviders.get(provider) else {
      LynxNotificationsLogger.error("getPushToken failed: provider \"\(provider)\" is not registered.")
      callback(
        NativeResult<Any?>.error(
          code: "ERR_PROVIDER_UNCONFIGURED",
          message: "No push provider registered for \(provider)."
        ).asDictionary()
      )
      return
    }

    tokenProvider.getToken { result in
      switch result {
      case let .success(token):
        LynxNotificationsLogger.debug("getPushToken succeeded for provider \"\(provider)\".")
        callback(NativeResult.ok(token.toDictionary).asDictionary())
      case let .failure(error):
        LynxNotificationsLogger.error(
          "getPushToken failed for provider \"\(provider)\" with code=\(error.code) message=\(error.message)"
        )
        callback(error.toNativeResult.asDictionary())
      }
    }
  }

  public func scheduleNotification(request: [String: Any], callback: @escaping MethodCallback) {
    scheduler.schedule(request: request) { result in
      switch result {
      case let .success(id):
        LynxNotificationsLogger.debug("scheduleNotification succeeded with id=\(id)")
        callback(NativeResult.ok(id).asDictionary())
      case let .failure(error):
        LynxNotificationsLogger.error(
          "scheduleNotification failed with code=\(error.code) message=\(error.message)"
        )
        callback(error.toNativeResult.asDictionary())
      }
    }
  }

  public func cancelScheduledNotification(id: String, callback: @escaping MethodCallback) {
    scheduler.cancel(id: id) { result in
      switch result {
      case .success:
        callback(NativeResult<Any?>.ok(nil).asDictionary())
      case let .failure(error):
        LynxNotificationsLogger.error(
          "cancelScheduledNotification failed with code=\(error.code) message=\(error.message)"
        )
        callback(error.toNativeResult.asDictionary())
      }
    }
  }

  public func cancelAllScheduledNotifications(_ callback: @escaping MethodCallback) {
    scheduler.cancelAll { result in
      switch result {
      case .success:
        callback(NativeResult<Any?>.ok(nil).asDictionary())
      case let .failure(error):
        LynxNotificationsLogger.error(
          "cancelAllScheduledNotifications failed with code=\(error.code) message=\(error.message)"
        )
        callback(error.toNativeResult.asDictionary())
      }
    }
  }

  public func getLastNotificationResponse(_ callback: MethodCallback) {
    callback(NativeResult.ok(lastNotificationResponse).asDictionary())
  }

  public func startObservingEvents(_ callback: @escaping EventCallback) {
    eventCallback = callback
    LynxNotificationsLogger.debug("startObservingEvents registered.")
    callback(NativeResult<Any?>.ok(nil).asDictionary())
  }

  public func stopObservingEvents(_ callback: MethodCallback) {
    eventCallback = nil
    LynxNotificationsLogger.debug("stopObservingEvents completed.")
    callback(NativeResult<Any?>.ok(nil).asDictionary())
  }

  public func emitNotificationReceived(notification: [String: Any]) {
    guard let callback = eventCallback else {
      LynxNotificationsLogger.debug("notification_received dropped because observer is not registered.")
      return
    }

    callback([
      "type": "notification_received",
      "notification": notification,
    ])
  }

  public func emitNotificationResponse(response: [String: Any]) {
    guard let callback = eventCallback else {
      LynxNotificationsLogger.debug("notification_response dropped because observer is not registered.")
      return
    }

    lastNotificationResponse = response

    callback([
      "type": "notification_response",
      "response": response,
    ])
  }

  public func emitTokenRefreshed(token: PushToken) {
    guard let callback = eventCallback else {
      LynxNotificationsLogger.debug("token_refreshed dropped because observer is not registered.")
      return
    }

    callback([
      "type": "token_refreshed",
      "token": token.toDictionary,
    ])
  }

  public static func createDefault(fcmProvider: PushTokenProvider) -> LynxNotificationsModule {
    let providers = PushTokenProviderRegistry()
    providers.register(name: "fcm", provider: fcmProvider)

    return LynxNotificationsModule(
      permissionProvider: NoopPermissionProvider(),
      pushProviders: providers,
      scheduler: InMemoryLocalNotificationScheduler()
    )
  }
}

public protocol NotificationPermissionProvider {
  func getPermissions(_ completion: @escaping (Result<NotificationPermissions, NotificationError>) -> Void)
  func requestPermissions(_ completion: @escaping (Result<NotificationPermissions, NotificationError>) -> Void)
}

public final class NoopPermissionProvider: NotificationPermissionProvider {
  public init() {}

  public func getPermissions(_ completion: @escaping (Result<NotificationPermissions, NotificationError>) -> Void) {
    completion(.success(NotificationPermissions(status: "undetermined", granted: false, canAskAgain: true)))
  }

  public func requestPermissions(_ completion: @escaping (Result<NotificationPermissions, NotificationError>) -> Void) {
    completion(.success(NotificationPermissions(status: "granted", granted: true, canAskAgain: true)))
  }
}

public final class RuntimeNotificationPermissionProvider: NotificationPermissionProvider {
  public typealias PermissionStateReader = () -> (granted: Bool, canAskAgain: Bool)
  public typealias PermissionRequestLauncher = (@escaping (Result<Bool, Error>) -> Void) -> Void

  private let stateReader: PermissionStateReader
  private let requestLauncher: PermissionRequestLauncher?

  public init(
    stateReader: @escaping PermissionStateReader,
    requestLauncher: PermissionRequestLauncher? = nil
  ) {
    self.stateReader = stateReader
    self.requestLauncher = requestLauncher
  }

  public func getPermissions(_ completion: @escaping (Result<NotificationPermissions, NotificationError>) -> Void) {
    let state = stateReader()
    completion(.success(snapshot(granted: state.granted, canAskAgain: state.canAskAgain)))
  }

  public func requestPermissions(_ completion: @escaping (Result<NotificationPermissions, NotificationError>) -> Void) {
    guard let requestLauncher else {
      let state = stateReader()
      completion(.success(snapshot(granted: state.granted, canAskAgain: state.canAskAgain)))
      return
    }

    requestLauncher { result in
      switch result {
      case let .success(granted):
        let state = self.stateReader()
        completion(.success(self.snapshot(granted: granted, canAskAgain: state.canAskAgain)))
      case let .failure(error):
        completion(.failure(NotificationError.from(error)))
      }
    }
  }

  private func snapshot(granted: Bool, canAskAgain: Bool) -> NotificationPermissions {
    if granted {
      return NotificationPermissions(status: "granted", granted: true, canAskAgain: canAskAgain)
    }

    if canAskAgain {
      return NotificationPermissions(status: "undetermined", granted: false, canAskAgain: true)
    }

    return NotificationPermissions(status: "denied", granted: false, canAskAgain: false)
  }
}

public final class NotificationPermissions {
  public let status: String
  public let granted: Bool
  public let canAskAgain: Bool

  public init(status: String, granted: Bool, canAskAgain: Bool) {
    self.status = status
    self.granted = granted
    self.canAskAgain = canAskAgain
  }

  public var toDictionary: [String: Any] {
    [
      "status": status,
      "granted": granted,
      "canAskAgain": canAskAgain,
    ]
  }
}

public protocol PushTokenProvider {
  func getToken(_ completion: @escaping (Result<PushToken, NotificationError>) -> Void)
}

public final class PushTokenProviderRegistry {
  private var providers: [String: PushTokenProvider] = [:]

  public init() {}

  public func register(name: String, provider: PushTokenProvider) {
    providers[name] = provider
  }

  public func get(_ name: String) -> PushTokenProvider? {
    providers[name]
  }
}

public final class PushToken {
  public let type: String
  public let data: String

  public init(type: String, data: String) {
    self.type = type
    self.data = data
  }

  public var toDictionary: [String: Any] {
    [
      "type": type,
      "data": data,
    ]
  }
}

public protocol LocalNotificationScheduler {
  func schedule(request: [String: Any], completion: @escaping (Result<String, NotificationError>) -> Void)
  func cancel(id: String, completion: @escaping (Result<Void, NotificationError>) -> Void)
  func cancelAll(_ completion: @escaping (Result<Void, NotificationError>) -> Void)
}

public final class InMemoryLocalNotificationScheduler: LocalNotificationScheduler {
  private var scheduledRequests: [String: [String: Any]] = [:]

  public init() {}

  public func schedule(
    request: [String: Any],
    completion: @escaping (Result<String, NotificationError>) -> Void
  ) {
    do {
      let id = try validateAndSchedule(request: request)
      completion(.success(id))
    } catch {
      completion(.failure(NotificationError.from(error)))
    }
  }

  public func cancel(id: String, completion: @escaping (Result<Void, NotificationError>) -> Void) {
    do {
      if id.isEmpty {
        throw NotificationError(code: "ERR_INVALID_ARGUMENT", message: "Scheduled notification id must not be empty.")
      }

      scheduledRequests.removeValue(forKey: id)
      completion(.success(()))
    } catch {
      completion(.failure(NotificationError.from(error)))
    }
  }

  public func cancelAll(_ completion: @escaping (Result<Void, NotificationError>) -> Void) {
    scheduledRequests.removeAll()
    completion(.success(()))
  }

  private func validateAndSchedule(request: [String: Any]) throws -> String {
    if let trigger = request["trigger"], !(trigger is NSNull), !(trigger is [String: Any]) {
      throw NotificationError(code: "ERR_INVALID_ARGUMENT", message: "Notification trigger must be null or object.")
    }

    if let trigger = request["trigger"] as? [String: Any], let type = trigger["type"] as? String {
      if type == "date" {
        guard let date = trigger["date"] as? NSNumber else {
          throw NotificationError(code: "ERR_INVALID_ARGUMENT", message: "Date trigger requires numeric date.")
        }

        if date.doubleValue <= Date().timeIntervalSince1970 * 1000 {
          throw NotificationError(code: "ERR_INVALID_ARGUMENT", message: "Date trigger must be in the future.")
        }
      }

      if type == "timeInterval" {
        guard let seconds = trigger["seconds"] as? NSNumber, seconds.doubleValue > 0 else {
          throw NotificationError(code: "ERR_INVALID_ARGUMENT", message: "Time interval trigger requires seconds > 0.")
        }
      }
    }

    let id = "notification-\(UUID().uuidString.lowercased())"
    scheduledRequests[id] = request
    return id
  }
}

public struct NotificationError: Error {
  public let code: String
  public let message: String

  public init(code: String, message: String) {
    self.code = code
    self.message = message
  }

  public static func from(_ error: Error) -> NotificationError {
    if let value = error as? NotificationError {
      return value
    }

    let message = error.localizedDescription.isEmpty
      ? "Native notifications error"
      : error.localizedDescription

    return NotificationError(code: "ERR_NATIVE_FAILURE", message: message)
  }

  public var toNativeResult: NativeResult<Any?> {
    .error(code: code, message: message)
  }
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
