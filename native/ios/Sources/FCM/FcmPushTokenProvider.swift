import Foundation
import LynxNotificationsCore
#if canImport(FirebaseMessaging)
import FirebaseMessaging
#endif

public final class FcmPushTokenProvider: PushTokenProvider {
  public typealias TokenFetcher = (@escaping (Result<String, Error>) -> Void) -> Void

  private let tokenFetcher: TokenFetcher?

  public init(tokenFetcher: TokenFetcher? = nil) {
    if let tokenFetcher {
      self.tokenFetcher = tokenFetcher
      return
    }

    #if canImport(FirebaseMessaging)
    self.tokenFetcher = { completion in
      Messaging.messaging().token { token, error in
        if let error {
          completion(.failure(error))
          return
        }

        completion(.success(token ?? ""))
      }
    }
    #else
    self.tokenFetcher = nil
    #endif
  }

  public func getToken(_ completion: @escaping (Result<PushToken, NotificationError>) -> Void) {
    guard let tokenFetcher else {
      LynxNotificationsLogger.error("FCM token fetch failed: token fetcher is not configured.")
      completion(.failure(NotificationError(
        code: "ERR_PROVIDER_UNCONFIGURED",
        message: "FCM provider requires Firebase token fetcher wiring."
      )))
      return
    }

    tokenFetcher { result in
      switch result {
      case let .success(token):
        if token.isEmpty {
          LynxNotificationsLogger.error("FCM token fetch failed: Firebase returned an empty token.")
          completion(.failure(NotificationError(
            code: "ERR_PROVIDER_UNCONFIGURED",
            message: "FCM token was empty."
          )))
          return
        }

        LynxNotificationsLogger.debug("FCM token fetch succeeded.")
        completion(.success(PushToken(type: "fcm", data: token)))
      case let .failure(error):
        LynxNotificationsLogger.error("FCM token fetch failed with native error: \(error.localizedDescription)")
        completion(.failure(NotificationError.from(error)))
      }
    }
  }
}
