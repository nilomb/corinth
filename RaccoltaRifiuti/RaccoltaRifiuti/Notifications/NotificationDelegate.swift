import Foundation
import UserNotifications

/// Delegate per gestire azioni Posticipa / Interrompi anche a app chiusa.
final class NotificationDelegate: NSObject, UNUserNotificationCenterDelegate {
    static let shared = NotificationDelegate()

    /// Mostra banner anche in foreground.
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .sound, .badge, .list]
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        let userInfo = response.notification.request.content.userInfo
        let minuti = (userInfo["minutiPosticipo"] as? Int) ?? 10

        switch response.actionIdentifier {
        case NotificaAzione.posticipa:
            await NotificationManager.shared.posticipa(userInfo: userInfo, minuti: minuti)
        case NotificaAzione.interrompi, UNNotificationDismissActionIdentifier:
            // Interrompe: non riprogramma. Eventuali posticipi pendenti restano;
            // rimuoviamo badge e notifiche consegnate correlate.
            center.removeDeliveredNotifications(
                withIdentifiers: [response.notification.request.identifier]
            )
        case UNNotificationDefaultActionIdentifier:
            // Tap sulla notifica: apre l'app (gestito dal sistema).
            break
        default:
            break
        }
    }
}
