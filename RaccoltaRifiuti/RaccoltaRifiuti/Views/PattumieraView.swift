import SwiftUI

/// Pattumiera disegnata in SwiftUI (colore + stile).
struct PattumieraView: View {
    let materiale: Materiale
    var dimensione: CGFloat = 120

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                switch materiale.stile {
                case .standard:
                    pattumieraStandard
                case .classica:
                    pattumieraClassica
                case .moderna:
                    pattumieraModerna
                case .circolare:
                    pattumieraCircolare
                }
            }
            .frame(width: dimensione, height: dimensione * 1.15)

            Text(materiale.nome)
                .font(.system(.headline, design: .rounded))
                .foregroundStyle(.primary)
                .multilineTextAlignment(.center)
                .lineLimit(2)
                .minimumScaleFactor(0.8)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Pattumiera \(materiale.nome)")
    }

    private var pattumieraStandard: some View {
        VStack(spacing: 0) {
            Capsule()
                .fill(materiale.colore.opacity(0.9))
                .frame(width: dimensione * 0.72, height: dimensione * 0.12)
            RoundedRectangle(cornerRadius: dimensione * 0.12, style: .continuous)
                .fill(materiale.colore)
                .frame(width: dimensione * 0.62, height: dimensione * 0.78)
                .overlay {
                    Image(systemName: iconaSistema)
                        .font(.system(size: dimensione * 0.28, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.95))
                }
                .shadow(color: materiale.colore.opacity(0.35), radius: 6, y: 3)
        }
    }

    private var pattumieraClassica: some View {
        VStack(spacing: 2) {
            RoundedRectangle(cornerRadius: 4)
                .fill(materiale.colore.opacity(0.85))
                .frame(width: dimensione * 0.78, height: dimensione * 0.14)
            TrapezoidShape()
                .fill(materiale.colore)
                .frame(width: dimensione * 0.7, height: dimensione * 0.8)
                .overlay {
                    Image(systemName: iconaSistema)
                        .font(.system(size: dimensione * 0.26, weight: .bold))
                        .foregroundStyle(.white)
                }
        }
    }

    private var pattumieraModerna: some View {
        RoundedRectangle(cornerRadius: dimensione * 0.18, style: .continuous)
            .fill(
                LinearGradient(
                    colors: [materiale.colore.opacity(0.85), materiale.colore],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .frame(width: dimensione * 0.58, height: dimensione * 0.95)
            .overlay(alignment: .top) {
                Capsule()
                    .fill(.white.opacity(0.35))
                    .frame(width: dimensione * 0.28, height: 6)
                    .padding(.top, 10)
            }
            .overlay {
                Image(systemName: iconaSistema)
                    .font(.system(size: dimensione * 0.28, weight: .semibold))
                    .foregroundStyle(.white)
            }
    }

    private var pattumieraCircolare: some View {
        Circle()
            .fill(materiale.colore)
            .frame(width: dimensione * 0.85, height: dimensione * 0.85)
            .overlay {
                Image(systemName: iconaSistema)
                    .font(.system(size: dimensione * 0.32, weight: .bold))
                    .foregroundStyle(.white)
            }
            .overlay {
                Circle()
                    .strokeBorder(.white.opacity(0.35), lineWidth: 4)
                    .padding(6)
            }
    }

    private var iconaSistema: String {
        switch materiale.tipoPredefinito {
        case .carta: return "doc.fill"
        case .plastica: return "drop.fill"
        case .vetro: return "circle.hexagongrid.fill"
        case .organico: return "leaf.fill"
        case .indifferenziato: return "trash.fill"
        case .none: return "shippingbox.fill"
        }
    }
}

private struct TrapezoidShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let inset = rect.width * 0.08
        path.move(to: CGPoint(x: inset, y: 0))
        path.addLine(to: CGPoint(x: rect.width - inset, y: 0))
        path.addLine(to: CGPoint(x: rect.width, y: rect.height))
        path.addLine(to: CGPoint(x: 0, y: rect.height))
        path.closeSubpath()
        return path
    }
}
