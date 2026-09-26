import Foundation
import SwiftUI
import UIKit

enum StilePattumiera: String, CaseIterable, Codable, Identifiable {
    case standard
    case classica
    case moderna
    case circolare

    var id: String { rawValue }

    var nome: String {
        switch self {
        case .standard: return "Standard"
        case .classica: return "Classica"
        case .moderna: return "Moderna"
        case .circolare: return "Circolare"
        }
    }
}

struct Materiale: Identifiable, Codable, Hashable {
    var id: UUID
    var nome: String
    var tipoPredefinito: TipoMaterialePredefinito?
    var coloreHex: String
    var stile: StilePattumiera

    init(
        id: UUID = UUID(),
        nome: String,
        tipoPredefinito: TipoMaterialePredefinito? = nil,
        coloreHex: String? = nil,
        stile: StilePattumiera = .standard
    ) {
        self.id = id
        self.nome = nome
        self.tipoPredefinito = tipoPredefinito
        self.coloreHex = coloreHex ?? tipoPredefinito?.coloreHexDefault ?? "#6B7280"
        self.stile = stile
    }

    var colore: Color {
        Color(hex: coloreHex) ?? .gray
    }

    static let carta = Materiale(nome: "Carta", tipoPredefinito: .carta)
    static let plastica = Materiale(nome: "Plastica", tipoPredefinito: .plastica)
    static let vetro = Materiale(nome: "Vetro", tipoPredefinito: .vetro)
    static let organico = Materiale(nome: "Organico", tipoPredefinito: .organico)
    static let indifferenziato = Materiale(nome: "Indifferenziato", tipoPredefinito: .indifferenziato)

    static let predefiniti: [Materiale] = [
        .carta, .plastica, .vetro, .organico, .indifferenziato
    ]
}

enum TipoMaterialePredefinito: String, Codable, CaseIterable {
    case carta
    case plastica
    case vetro
    case organico
    case indifferenziato

    var coloreHexDefault: String {
        switch self {
        case .carta: return "#2563EB"
        case .plastica: return "#EAB308"
        case .vetro: return "#16A34A"
        case .organico: return "#92400E"
        case .indifferenziato: return "#6B7280"
        }
    }

    var nome: String {
        switch self {
        case .carta: return "Carta"
        case .plastica: return "Plastica"
        case .vetro: return "Vetro"
        case .organico: return "Organico"
        case .indifferenziato: return "Indifferenziato"
        }
    }
}

extension Color {
    init?(hex: String) {
        var cleaned = hex.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        if cleaned.hasPrefix("#") { cleaned.removeFirst() }
        guard cleaned.count == 6, let value = UInt64(cleaned, radix: 16) else { return nil }
        let r = Double((value >> 16) & 0xFF) / 255
        let g = Double((value >> 8) & 0xFF) / 255
        let b = Double(value & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }

    func toHex() -> String? {
        #if canImport(UIKit)
        let ui = UIColor(self)
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        guard ui.getRed(&r, green: &g, blue: &b, alpha: &a) else { return nil }
        return String(format: "#%02X%02X%02X", Int(r * 255), Int(g * 255), Int(b * 255))
        #else
        return nil
        #endif
    }
}
