import SwiftUI

/// Riepilogo settimanale: portrait = 7 fasce orizzontali; landscape = 7 fasce verticali.
struct RiepilogoSettimanaleView: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.verticalSizeClass) private var verticalSizeClass

    var mostraIndietro: Bool = false
    var onIndietro: (() -> Void)? = nil
    var onModificaSveglia: (ConfigurazioneGiorno) -> Void
    var onImpostazioni: (() -> Void)? = nil

    private var isLandscape: Bool {
        verticalSizeClass == .compact
    }

    var body: some View {
        Group {
            if isLandscape {
                layoutOrizzontale
            } else {
                layoutVerticale
            }
        }
        .background(Color(uiColor: .systemGroupedBackground).ignoresSafeArea())
        .safeAreaInset(edge: .top) {
            if mostraIndietro || onImpostazioni != nil {
                HStack {
                    if mostraIndietro {
                        Button {
                            onIndietro?()
                        } label: {
                            Label("Indietro", systemImage: "chevron.left")
                                .font(.system(.body, design: .rounded).weight(.semibold))
                        }
                    }
                    Spacer()
                    Text("Settimana")
                        .font(.system(.headline, design: .rounded))
                    Spacer()
                    if let onImpostazioni {
                        Button(action: onImpostazioni) {
                            Image(systemName: "gearshape.fill")
                        }
                        .accessibilityLabel("Impostazioni")
                    } else if mostraIndietro {
                        Color.clear.frame(width: 44, height: 1)
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
                .background(.bar)
            }
        }
    }

    // MARK: - Portrait: fasce orizzontali sovrapposte

    private var layoutVerticale: some View {
        GeometryReader { geo in
            let altezzaFascia = max(88, geo.size.height / 7)
            ScrollView(.vertical, showsIndicators: false) {
                VStack(spacing: 0) {
                    ForEach(GiornoSettimana.ordineSettimana) { giorno in
                        fasciaOrizzontale(
                            giorno: giorno,
                            altezza: altezzaFascia
                        )
                    }
                }
                .frame(minHeight: geo.size.height)
            }
        }
    }

    private func fasciaOrizzontale(giorno: GiornoSettimana, altezza: CGFloat) -> some View {
        let config = store.impostazioni.configurazione(per: giorno)
        let data = store.dataPerFascia(giorno)

        return HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(giorno.nome)
                    .font(.system(.headline, design: .rounded).weight(.bold))
                Text(dataBreve(data))
                    .font(.system(.caption, design: .rounded))
                    .foregroundStyle(.secondary)
                Text(config.haRaccolta ? config.nomiMateriali : "Nessuna raccolta")
                    .font(.system(.subheadline, design: .rounded))
                    .foregroundStyle(config.haRaccolta ? .primary : .secondary)
                    .lineLimit(2)
                    .minimumScaleFactor(0.85)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            if config.haRaccolta {
                HStack(spacing: 6) {
                    ForEach(config.materiali.prefix(3)) { mat in
                        PattumieraView(materiale: mat, dimensione: 36)
                            .frame(width: 44)
                    }
                }
            }

            Button {
                onModificaSveglia(config)
            } label: {
                Text(config.sveglia.attiva ? config.sveglia.orarioFormattato : "Sveglia disattivata")
                    .font(.system(.subheadline, design: .rounded).weight(.semibold))
                    .foregroundStyle(config.sveglia.attiva ? .primary : .secondary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 8)
                    .background(.ultraThinMaterial, in: Capsule())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(
                config.sveglia.attiva
                    ? "Sveglia alle \(config.sveglia.orarioFormattato), tocca per modificare"
                    : "Sveglia disattivata, tocca per modificare"
            )
        }
        .padding(.horizontal, 14)
        .frame(maxWidth: .infinity)
        .frame(height: altezza)
        .background(config.coloreSfondo)
    }

    // MARK: - Landscape: fasce verticali affiancate

    private var layoutOrizzontale: some View {
        GeometryReader { geo in
            let larghezzaFascia = max(120, geo.size.width / 7)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 0) {
                    ForEach(GiornoSettimana.ordineSettimana) { giorno in
                        fasciaVerticale(
                            giorno: giorno,
                            larghezza: larghezzaFascia,
                            altezza: geo.size.height
                        )
                    }
                }
                .frame(minWidth: geo.size.width, minHeight: geo.size.height)
            }
        }
    }

    private func fasciaVerticale(giorno: GiornoSettimana, larghezza: CGFloat, altezza: CGFloat) -> some View {
        let config = store.impostazioni.configurazione(per: giorno)
        let data = store.dataPerFascia(giorno)

        return VStack(spacing: 10) {
            Text(giorno.nomeBreve)
                .font(.system(.headline, design: .rounded).weight(.bold))
            Text(dataBreve(data))
                .font(.system(.caption2, design: .rounded))
                .foregroundStyle(.secondary)

            if config.haRaccolta {
                ForEach(config.materiali) { mat in
                    PattumieraView(materiale: mat, dimensione: min(52, larghezza * 0.45))
                }
                Text(config.nomiMateriali)
                    .font(.system(.caption2, design: .rounded))
                    .multilineTextAlignment(.center)
                    .lineLimit(3)
                    .minimumScaleFactor(0.8)
            } else {
                Text("Nessuna raccolta")
                    .font(.system(.caption, design: .rounded))
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            Spacer(minLength: 4)

            Button {
                onModificaSveglia(config)
            } label: {
                Text(config.sveglia.attiva ? config.sveglia.orarioFormattato : "Sveglia disattivata")
                    .font(.system(.caption, design: .rounded).weight(.semibold))
                    .multilineTextAlignment(.center)
                    .padding(8)
                    .frame(maxWidth: .infinity)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
            .buttonStyle(.plain)
        }
        .padding(8)
        .frame(width: larghezza, height: altezza)
        .background(config.coloreSfondo)
    }

    private func dataBreve(_ date: Date) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "it_IT")
        f.dateFormat = "d MMM"
        return f.string(from: date)
    }
}
