import Foundation
import SwiftUI

enum GiornoSettimana: Int, CaseIterable, Codable, Identifiable, Hashable {
    case domenica = 1
    case lunedi = 2
    case martedi = 3
    case mercoledi = 4
    case giovedi = 5
    case venerdi = 6
    case sabato = 7

    var id: Int { rawValue }

    /// Ordine UI: domenica → sabato (come Calendar.current.firstWeekday = 1)
    static var ordineSettimana: [GiornoSettimana] {
        [.domenica, .lunedi, .martedi, .mercoledi, .giovedi, .venerdi, .sabato]
    }

    var nome: String {
        switch self {
        case .domenica: return "Domenica"
        case .lunedi: return "Lunedì"
        case .martedi: return "Martedì"
        case .mercoledi: return "Mercoledì"
        case .giovedi: return "Giovedì"
        case .venerdi: return "Venerdì"
        case .sabato: return "Sabato"
        }
    }

    var nomeBreve: String {
        switch self {
        case .domenica: return "Dom"
        case .lunedi: return "Lun"
        case .martedi: return "Mar"
        case .mercoledi: return "Mer"
        case .giovedi: return "Gio"
        case .venerdi: return "Ven"
        case .sabato: return "Sab"
        }
    }

    /// Colore di sfondo predefinito per il giorno
    var coloreSfondoDefault: Color {
        switch self {
        case .domenica: return Color(red: 0.93, green: 0.90, blue: 0.96)
        case .lunedi: return Color(red: 0.88, green: 0.93, blue: 0.98)
        case .martedi: return Color(red: 0.88, green: 0.95, blue: 0.90)
        case .mercoledi: return Color(red: 0.98, green: 0.95, blue: 0.88)
        case .giovedi: return Color(red: 0.95, green: 0.90, blue: 0.88)
        case .venerdi: return Color(red: 0.90, green: 0.94, blue: 0.95)
        case .sabato: return Color(red: 0.96, green: 0.92, blue: 0.88)
        }
    }

    static func da(data: Date, calendario: Calendar = .current) -> GiornoSettimana {
        let weekday = calendario.component(.weekday, from: data)
        return GiornoSettimana(rawValue: weekday) ?? .domenica
    }
}
