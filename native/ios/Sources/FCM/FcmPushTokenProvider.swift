import Foundation

public final class FcmPushTokenProvider: PushTokenProvider {
  public typealias TokenFetcher = () throws -> String

  private let tokenFetcher: TokenFetcher?

  public init(tokenFetcher: TokenFetcher? = nil) {
    self.tokenFetcher = tokenFetcher
  }

  public func getToken() throws -> PushToken {
    guard let tokenFetcher else {
      throw NotificationError(
        code: "ERR_PROVIDER_UNCONFIGURED",
        message: "FCM provider requires Firebase token fetcher wiring."
      )
    }

    let token = try tokenFetcher()
    if token.isEmpty {
      throw NotificationError(
        code: "ERR_PROVIDER_UNCONFIGURED",
        message: "FCM token was empty."
      )
    }

    return PushToken(type: "fcm", data: token)
  }
}
