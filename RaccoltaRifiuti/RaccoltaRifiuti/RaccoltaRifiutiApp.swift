import SwiftUI
import UserNotifications

@main
struct RaccoltaRifiutiApp: App {
    @StateObject private var store = AppStore()

    init() {
        NotificationManager.shared.configura()
    }

    var body: some Scene {
        WindowGroup {
            HomeView()
                .environmentObject(store)
                .task {
                    let status = await UNUserNotificationCenter.current().notificationSettings()
                    if status.authorizationStatus == .notDetermined {
                        _ = await NotificationManager.shared.richiediAutorizzazione()
                    }
                    await NotificationManager.shared.sincronizzaSveglieConFinestra(
                        impostazioni: store.impostazioni
                    )
                }
        }
    }
}
