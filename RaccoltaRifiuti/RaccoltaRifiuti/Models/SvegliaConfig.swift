import Foundation

enum MomentoAvviso: String, Codable, CaseIterable, Identifiable {
    /// Suona la mattina del giorno di conferimento
    case mattinaGiornoConferimento
    /// Suona la sera precedente al giorno di conferimento
    case seraPrecedente

    var id: String { rawValue }

    var titolo: String {
        switch self {
        case .mattinaGiornoConferimento: return "Mattina del giorno di conferimento"
        case .seraPrecedente: return "Sera precedente"
        }
    }

    var descrizione: String {
        switch self {
        case .mattinaGiornoConferimento:
            return "La sveglia suona la mattina del giorno in cui devi conferire."
        case .seraPrecedente:
            return "La sveglia suona la sera prima, così prepari i sacchi in anticipo."
        }
    }
}

struct SvegliaConfig: Codable, Hashable, Identifiable {
    var id: UUID
    var attiva: Bool
    /// Ora componente (0–23)
    var ora: Int
    /// Minuto componente (0–59)
    var minuto: Int
    var momento: MomentoAvviso

    init(
        id: UUID = UUID(),
        attiva: Bool = false,
        ora: Int = 20,
        minuto: Int = 30,
        momento: MomentoAvviso = .seraPrecedente
    ) {
        self.id = id
        self.attiva = attiva
        self.ora = min(23, max(0, ora))
        self.minuto = min(59, max(0, minuto))
        self.momento = momento
    }

    var orarioFormattato: String {
        String(format: "%02d:%02d", ora, minuto)
    }

    var dateComponentsOrario: DateComponents {
        DateComponents(hour: ora, minute: minuto)
    }

    /// Giorno della settimana in cui deve squillare, dato il giorno di raccolta.
    func giornoSuono(perRaccolta giornoRaccolta: GiornoSettimana) -> GiornoSettimana {
        switch momento {
        case .mattinaGiornoConferimento:
            return giornoRaccolta
        case .seraPrecedente:
            let precedente = giornoRaccolta.rawValue == 1 ? 7 : giornoRaccolta.rawValue - 1
            return GiornoSettimana(rawValue: precedente) ?? .sabato
        }
    }

    func testoQuandoSuona(giornoRaccolta: GiornoSettimana) -> String {
        let giornoSuono = giornoSuono(perRaccolta: giornoRaccolta)
        switch momento {
        case .mattinaGiornoConferimento:
            return "Suona \(giornoSuono.nome) alle \(orarioFormattato) (giorno di conferimento)"
        case .seraPrecedente:
            return "Suona \(giornoSuono.nome) alle \(orarioFormattato) (sera prima di \(giornoRaccolta.nome))"
        }
    }
}

/// Eccezione: modifica di una sola occorrenza senza alterare la programmazione abituale.
struct EccezioneSveglia: Codable, Hashable, Identifiable {
    var id: UUID
    /// Giorno di raccolta a cui si riferisce
    var giornoRaccolta: GiornoSettimana
    /// Data del giorno di raccolta (solo giorno, senza ora)
    var dataRaccolta: Date
    /// Se true, questa occorrenza è saltata
    var saltata: Bool
    /// Orario alternativo (nil = usa orario abituale se non saltata)
    var oraAlternativa: Int?
    var minutoAlternativo: Int?
    var momentoAlternativo: MomentoAvviso?

    init(
        id: UUID = UUID(),
        giornoRaccolta: GiornoSettimana,
        dataRaccolta: Date,
        saltata: Bool = false,
        oraAlternativa: Int? = nil,
        minutoAlternativo: Int? = nil,
        momentoAlternativo: MomentoAvviso? = nil
    ) {
        self.id = id
        self.giornoRaccolta = giornoRaccolta
        self.dataRaccolta = Calendar.current.startOfDay(for: dataRaccolta)
        self.saltata = saltata
        self.oraAlternativa = oraAlternativa
        self.minutoAlternativo = minutoAlternativo
        self.momentoAlternativo = momentoAlternativo
    }
}
