import Foundation
import UserNotifications

/// Identificatori azioni notifica
enum NotificaAzione {
    static let categoriaSveglia = "SVEGLIA_RACCOLTA"
    static let posticipa = "POSTICIPA"
    static let interrompi = "INTERROMPI"
    static let threadId = "raccolta-rifiuti"
}

@MainActor
final class NotificationManager: NSObject, ObservableObject {
    static let shared = NotificationManager()

    @Published var autorizzazione: UNAuthorizationStatus = .notDetermined

    private let centro = UNUserNotificationCenter.current()
    private let prefissoId = "sveglia-raccolta-"

    override init() {
        super.init()
    }

    func configura() {
        centro.delegate = NotificationDelegate.shared
        registraCategorie()
        Task { await aggiornaStatoAutorizzazione() }
    }

    func richiediAutorizzazione() async -> Bool {
        do {
            let ok = try await centro.requestAuthorization(options: [.alert, .sound, .badge])
            await aggiornaStatoAutorizzazione()
            return ok
        } catch {
            print("Errore autorizzazione notifiche: \(error)")
            return false
        }
    }

    func aggiornaStatoAutorizzazione() async {
        let settings = await centro.notificationSettings()
        autorizzazione = settings.authorizationStatus
    }

    private func registraCategorie() {
        let posticipa = UNNotificationAction(
            identifier: NotificaAzione.posticipa,
            title: "Posticipa",
            options: []
        )
        let interrompi = UNNotificationAction(
            identifier: NotificaAzione.interrompi,
            title: "Interrompi",
            options: [.destructive]
        )
        let categoria = UNNotificationCategory(
            identifier: NotificaAzione.categoriaSveglia,
            actions: [posticipa, interrompi],
            intentIdentifiers: [],
            options: [.customDismissAction]
        )
        centro.setNotificationCategories([categoria])
    }

    /// Programma le sveglie come notifiche one-shot per le prossime N settimane.
    /// Così le eccezioni (salta / orario diverso per una sola settimana) funzionano
    /// correttamente anche a app chiusa, senza duplicati.
    func sincronizzaSveglieConFinestra(impostazioni: ImpostazioniApp, settimane: Int = 8) async {
        await rimuoviSveglieProgrammate()

        let calendario = Calendar.current
        let oggi = calendario.startOfDay(for: Date())

        for config in impostazioni.configurazioni where config.sveglia.attiva && config.haRaccolta {
            for settimana in 0..<settimane {
                guard let dataRaccolta = calendario.date(
                    byAdding: .day,
                    value: offsetGiorni(finoA: config.giorno, da: oggi) + settimana * 7,
                    to: oggi
                ) else { continue }

                let eccezione = impostazioni.eccezioni.first {
                    $0.giornoRaccolta == config.giorno
                        && calendario.isDate($0.dataRaccolta, inSameDayAs: dataRaccolta)
                }

                if eccezione?.saltata == true {
                    continue
                }

                let momento = eccezione?.momentoAlternativo ?? config.sveglia.momento
                let ora = eccezione?.oraAlternativa ?? config.sveglia.ora
                let minuto = eccezione?.minutoAlternativo ?? config.sveglia.minuto

                var svegliaTmp = config.sveglia
                svegliaTmp.momento = momento
                svegliaTmp.ora = ora
                svegliaTmp.minuto = minuto

                let giornoSuono = svegliaTmp.giornoSuono(perRaccolta: config.giorno)
                let dataSuono = dataSuonoEffettiva(
                    dataRaccolta: dataRaccolta,
                    giornoSuono: giornoSuono,
                    giornoRaccolta: config.giorno,
                    ora: ora,
                    minuto: minuto
                )

                guard dataSuono > Date() else { continue }

                let id = "\(prefissoId)shot-\(config.giorno.rawValue)-\(isoGiorno(dataRaccolta))"
                let contenuto = creaContenuto(
                    per: config,
                    eccezione: eccezione,
                    minutiPosticipo: impostazioni.minutiPosticipo
                )
                let components = calendario.dateComponents(
                    [.year, .month, .day, .hour, .minute],
                    from: dataSuono
                )
                let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
                let request = UNNotificationRequest(identifier: id, content: contenuto, trigger: trigger)

                do {
                    try await centro.add(request)
                } catch {
                    print("Errore one-shot \(id): \(error)")
                }
            }
        }
    }

    private func rimuoviSveglieProgrammate() async {
        let pendenti = await centro.pendingNotificationRequests()
        let ids = pendenti
            .map(\.identifier)
            .filter { $0.hasPrefix(prefissoId) }
        centro.removePendingNotificationRequests(withIdentifiers: ids)
    }

    private func offsetGiorni(finoA giorno: GiornoSettimana, da data: Date) -> Int {
        let calendario = Calendar.current
        let weekday = calendario.component(.weekday, from: data)
        return (giorno.rawValue - weekday + 7) % 7
    }

    private func dataSuonoEffettiva(
        dataRaccolta: Date,
        giornoSuono: GiornoSettimana,
        giornoRaccolta: GiornoSettimana,
        ora: Int,
        minuto: Int
    ) -> Date {
        let calendario = Calendar.current
        var data = dataRaccolta
        if giornoSuono != giornoRaccolta {
            data = calendario.date(byAdding: .day, value: -1, to: dataRaccolta) ?? dataRaccolta
        }
        var components = calendario.dateComponents([.year, .month, .day], from: data)
        components.hour = ora
        components.minute = minuto
        return calendario.date(from: components) ?? data
    }

    private func creaContenuto(
        per config: ConfigurazioneGiorno,
        eccezione: EccezioneSveglia?,
        minutiPosticipo: Int
    ) -> UNMutableNotificationContent {
        let content = UNMutableNotificationContent()
        let materiali = config.materiali.map(\.nome).joined(separator: ", ")
        content.title = "Raccolta \(config.giorno.nome)"
        content.body = "Conferisci: \(materiali)"
        content.sound = .default
        content.categoryIdentifier = NotificaAzione.categoriaSveglia
        content.threadIdentifier = NotificaAzione.threadId
        content.userInfo = [
            "giornoRaccolta": config.giorno.rawValue,
            "materiali": config.materiali.map(\.nome),
            "minutiPosticipo": minutiPosticipo
        ]
        if let eccezione {
            content.userInfo["eccezioneId"] = eccezione.id.uuidString
        }
        content.interruptionLevel = .timeSensitive
        return content
    }

    private func isoGiorno(_ date: Date) -> String {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: date)
    }

    /// Posticipa la sveglia corrente di N minuti (funziona anche a app chiusa via azione notifica).
    func posticipa(userInfo: [AnyHashable: Any], minuti: Int) async {
        let content = UNMutableNotificationContent()
        let materiali = (userInfo["materiali"] as? [String])?.joined(separator: ", ") ?? "rifiuti"
        let giornoRaw = userInfo["giornoRaccolta"] as? Int
        let nomeGiorno = giornoRaw.flatMap { GiornoSettimana(rawValue: $0)?.nome } ?? ""
        content.title = "Posticipo — Raccolta \(nomeGiorno)"
        content.body = "Conferisci: \(materiali)"
        content.sound = .default
        content.categoryIdentifier = NotificaAzione.categoriaSveglia
        content.userInfo = userInfo as [AnyHashable: Any]
        content.interruptionLevel = .timeSensitive

        let trigger = UNTimeIntervalNotificationTrigger(
            timeInterval: TimeInterval(max(60, minuti * 60)),
            repeats: false
        )
        let id = "\(prefissoId)posticipo-\(UUID().uuidString)"
        let request = UNNotificationRequest(identifier: id, content: content, trigger: trigger)
        do {
            try await centro.add(request)
        } catch {
            print("Errore posticipo: \(error)")
        }
    }
}
