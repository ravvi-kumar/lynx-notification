homepage = ENV.fetch('LYNX_NOTIFICATIONS_HOMEPAGE', 'https://lynxjs.org')
source_git = ENV.fetch('LYNX_NOTIFICATIONS_IOS_SOURCE_GIT', 'https://github.com/lynx-family/lynx-notifications.git')
author_name = ENV.fetch('LYNX_NOTIFICATIONS_AUTHOR_NAME', 'Lynx Notifications Team')
author_email = ENV.fetch('LYNX_NOTIFICATIONS_AUTHOR_EMAIL', 'oss@lynxjs.org')

Pod::Spec.new do |spec|
  spec.name         = 'LynxNotificationsFCM'
  spec.version      = '0.1.0-alpha'
  spec.summary      = 'FCM adapter for Lynx notifications.'
  spec.homepage     = homepage
  spec.license      = { :type => 'Apache-2.0' }
  spec.authors      = { author_name => author_email }
  spec.source       = { :git => source_git, :tag => spec.version.to_s }
  spec.platform     = :ios, '16.0'
  spec.source_files = 'Sources/FCM/**/*.{h,m,mm,swift}'
  spec.dependency   'LynxNotificationsCore'
  spec.dependency   'FirebaseMessaging'
end
