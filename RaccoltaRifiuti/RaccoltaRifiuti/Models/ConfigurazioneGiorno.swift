import Foundation
import SwiftUI

struct ConfigurazioneGiorno: Identifiable, Codable, Hashable {
    var id: GiornoSettimana { giorno }
    var giorno: GiornoSettimana
    var materiali: [Materiale]
    var coloreSfondoHex: String
    var sveglia: SvegliaConfig

    init(
        giorno: GiornoSettimana,
        materiali: [Materiale] = [],
        coloreSfondoHex: String? = nil,
        sveglia: SvegliaConfig = SvegliaConfig()
    ) {
        self.giorno = giorno
        self.materiali = materiali
        self.coloreSfondoHex = coloreSfondoHex ?? Self.hexDefault(per: giorno)
        self.sveglia = sveglia
    }

    var haRaccolta: Bool { !materiali.isEmpty }

    var coloreSfondo: Color {
        Color(hex: coloreSfondoHex) ?? giorno.coloreSfondoDefault
    }

    var nomiMateriali: String {
        guard haRaccolta else { return "Nessuna raccolta" }
        return materiali.map(\.nome).joined(separator: " · ")
    }

    private static func hexDefault(per giorno: GiornoSettimana) -> String {
        switch giorno {
        case .domenica: return "#EDE6F5"
        case .lunedi: return "#E0EDFA"
        case .martedi: return "#E0F2E6"
        case .mercoledi: return "#FAF2E0"
        case .giovedi: return "#F2E6E0"
        case .venerdi: return "#E6F0F2"
        case .sabato: return "#F5EBE0"
        }
    }
}

struct ImpostazioniApp: Codable, Hashable {
    /// Se true, la home mostra oggi; altrimenti mostra domani.
    var mostraOggiPerOggi: Bool
    var configurazioni: [ConfigurazioneGiorno]
    var eccezioni: [EccezioneSveglia]
    var materialiPersonalizzati: [Materiale]
    /// Minuti di posticipo predefinito
    var minutiPosticipo: Int

    init(
        mostraOggiPerOggi: Bool = false,
        configurazioni: [ConfigurazioneGiorno] = ImpostazioniApp.esempio(),
        eccezioni: [EccezioneSveglia] = [],
        materialiPersonalizzati: [Materiale] = [],
        minutiPosticipo: Int = 10
    ) {
        self.mostraOggiPerOggi = mostraOggiPerOggi
        self.configurazioni = configurazioni
        self.eccezioni = eccezioni
        self.materialiPersonalizzati = materialiPersonalizzati
        self.minutiPosticipo = minutiPosticipo
    }

    func configurazione(per giorno: GiornoSettimana) -> ConfigurazioneGiorno {
        configurazioni.first(where: { $0.giorno == giorno })
            ?? ConfigurazioneGiorno(giorno: giorno)
    }

    mutating func aggiorna(_ config: ConfigurazioneGiorno) {
        if let idx = configurazioni.firstIndex(where: { $0.giorno == config.giorno }) {
            configurazioni[idx] = config
        } else {
            configurazioni.append(config)
        }
    }

    /// Configurazione di esempio al primo avvio (modificabile).
    static func esempio() -> [ConfigurazioneGiorno] {
        [
            ConfigurazioneGiorno(giorno: .domenica, materiali: []),
            ConfigurazioneGiorno(
                giorno: .lunedi,
                materiali: [.organico],
                sveglia: SvegliaConfig(attiva: true, ora: 20, minuto: 30, momento: .seraPrecedente)
            ),
            ConfigurazioneGiorno(
                giorno: .martedi,
                materiali: [.plastica, .vetro],
                sveglia: SvegliaConfig(attiva: true, ora: 3, minuto: 5, momento: .mattinaGiornoConferimento)
            ),
            ConfigurazioneGiorno(
                giorno: .mercoledi,
                materiali: [.carta],
                sveglia: SvegliaConfig(attiva: true, ora: 20, minuto: 0, momento: .seraPrecedente)
            ),
            ConfigurazioneGiorno(giorno: .giovedi, materiali: []),
            ConfigurazioneGiorno(
                giorno: .venerdi,
                materiali: [.indifferenziato],
                sveglia: SvegliaConfig(attiva: true, ora: 7, minuto: 0, momento: .mattinaGiornoConferimento)
            ),
            ConfigurazioneGiorno(
                giorno: .sabato,
                materiali: [.organico],
                sveglia: SvegliaConfig(attiva: false, ora: 20, minuto: 30, momento: .seraPrecedente)
            )
        ]
    }
}
