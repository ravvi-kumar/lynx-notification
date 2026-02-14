// swift-tools-version: 5.9
import PackageDescription

let package = Package(
  name: "LynxNotifications",
  platforms: [
    .iOS(.v16),
    .macOS(.v13),
  ],
  products: [
    .library(
      name: "LynxNotificationsCore",
      targets: ["LynxNotificationsCore"]
    ),
    .library(
      name: "LynxNotificationsFCM",
      targets: ["LynxNotificationsFCM"]
    ),
  ],
  targets: [
    .target(
      name: "LynxNotificationsCore",
      path: "Sources/Core"
    ),
    .target(
      name: "LynxNotificationsFCM",
      dependencies: ["LynxNotificationsCore"],
      path: "Sources/FCM"
    ),
    .testTarget(
      name: "LynxNotificationsCoreTests",
      dependencies: ["LynxNotificationsCore"],
      path: "Tests/Core"
    ),
  ]
)
