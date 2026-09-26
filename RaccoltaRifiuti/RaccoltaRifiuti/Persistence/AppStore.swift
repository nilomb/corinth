import Foundation
import Combine
import SwiftUI

@MainActor
final class AppStore: ObservableObject {
    @Published private(set) var impostazioni: ImpostazioniApp
    @Published var dataRiferimento: Date = Date()

    private let calendario = Calendar.current
    private var timerGiorno: Timer?

    init() {
        impostazioni = PersistenceService.carica()
        avviaOsservazioneCambioData()
    }

    // MARK: - Giorno di riferimento home

    /// Giorno che la home dovrebbe mostrare (oggi o domani in base alle impostazioni).
    var giornoDaMostrare: Date {
        if impostazioni.mostraOggiPerOggi {
            return calendario.startOfDay(for: dataRiferimento)
        } else {
            return calendario.startOfDay(
                for: calendario.date(byAdding: .day, value: 1, to: dataRiferimento) ?? dataRiferimento
            )
        }
    }

    var giornoSettimanaDaMostrare: GiornoSettimana {
        GiornoSettimana.da(data: giornoDaMostrare, calendario: calendario)
    }

    var configurazioneGiornoAttuale: ConfigurazioneGiorno {
        impostazioni.configurazione(per: giornoSettimanaDaMostrare)
    }

    var deveMostrareRiepilogoAutomatico: Bool {
        !configurazioneGiornoAttuale.haRaccolta
    }

    var etichettaGiornoRiferimento: String {
        if impostazioni.mostraOggiPerOggi {
            return "Oggi"
        } else {
            return "Domani"
        }
    }

    // MARK: - Aggiornamenti

    func aggiornaImpostazioni(_ nuove: ImpostazioniApp) {
        impostazioni = nuove
        PersistenceService.salva(nuove)
        Task {
            await NotificationManager.shared.sincronizzaSveglieConFinestra(impostazioni: nuove)
        }
    }

    func aggiornaConfigurazione(_ config: ConfigurazioneGiorno) {
        var copy = impostazioni
        copy.aggiorna(config)
        aggiornaImpostazioni(copy)
    }

    func impostaMostraOggiPerOggi(_ valore: Bool) {
        var copy = impostazioni
        copy.mostraOggiPerOggi = valore
        aggiornaImpostazioni(copy)
    }

    func salvaEccezione(_ eccezione: EccezioneSveglia) {
        var copy = impostazioni
        copy.eccezioni.removeAll {
            $0.giornoRaccolta == eccezione.giornoRaccolta
                && calendario.isDate($0.dataRaccolta, inSameDayAs: eccezione.dataRaccolta)
        }
        copy.eccezioni.append(eccezione)
        aggiornaImpostazioni(copy)
    }

    func rimuoviEccezioniScadute() {
        let oggi = calendario.startOfDay(for: Date())
        var copy = impostazioni
        let prima = copy.eccezioni.count
        copy.eccezioni.removeAll { $0.dataRaccolta < oggi }
        if copy.eccezioni.count != prima {
            aggiornaImpostazioni(copy)
        }
    }

    func aggiungiMaterialePersonalizzato(_ materiale: Materiale) {
        var copy = impostazioni
        copy.materialiPersonalizzati.append(materiale)
        aggiornaImpostazioni(copy)
    }

    func materialiDisponibili() -> [Materiale] {
        Materiale.predefiniti + impostazioni.materialiPersonalizzati
    }

    /// Prossima data del giorno della settimana indicato (inclusa oggi se coincide).
    func prossimaData(di giorno: GiornoSettimana, da data: Date = Date()) -> Date {
        let start = calendario.startOfDay(for: data)
        for offset in 0..<7 {
            if let candidate = calendario.date(byAdding: .day, value: offset, to: start) {
                if GiornoSettimana.da(data: candidate, calendario: calendario) == giorno {
                    return candidate
                }
            }
        }
        return start
    }

    func dataPerFascia(_ giorno: GiornoSettimana) -> Date {
        // Settimana corrente: domenica → sabato intorno a oggi
        let oggi = calendario.startOfDay(for: dataRiferimento)
        let weekdayOggi = calendario.component(.weekday, from: oggi)
        let offsetADomenica = weekdayOggi - 1
        let domenica = calendario.date(byAdding: .day, value: -offsetADomenica, to: oggi) ?? oggi
        let offsetGiorno = giorno.rawValue - 1
        return calendario.date(byAdding: .day, value: offsetGiorno, to: domenica) ?? oggi
    }

    func aggiornaDataRiferimento() {
        dataRiferimento = Date()
        rimuoviEccezioniScadute()
    }

    private func avviaOsservazioneCambioData() {
        // Controlla a mezzanotte / ogni minuto se è cambiato il giorno
        timerGiorno = Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self else { return }
                let nuovo = self.calendario.startOfDay(for: Date())
                let attuale = self.calendario.startOfDay(for: self.dataRiferimento)
                if nuovo != attuale {
                    self.aggiornaDataRiferimento()
                }
            }
        }
    }

    func eccezione(per giorno: GiornoSettimana, dataRaccolta: Date) -> EccezioneSveglia? {
        impostazioni.eccezioni.first {
            $0.giornoRaccolta == giorno
                && calendario.isDate($0.dataRaccolta, inSameDayAs: dataRaccolta)
        }
    }
}
