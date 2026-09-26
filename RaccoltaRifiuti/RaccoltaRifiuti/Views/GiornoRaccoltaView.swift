import SwiftUI

/// Schermata verticale del giorno: mostra tutte le pattumiere senza ruotare.
struct GiornoRaccoltaView: View {
    let config: ConfigurazioneGiorno
    let data: Date
    let etichetta: String
    var onModificaSveglia: () -> Void
    var onVediSettimana: () -> Void
    var onImpostazioni: () -> Void

    private var formatterData: DateFormatter {
        let f = DateFormatter()
        f.locale = Locale(identifier: "it_IT")
        f.dateStyle = .full
        f.timeStyle = .none
        return f
    }

    var body: some View {
        ZStack {
            config.coloreSfondo.ignoresSafeArea()

            VStack(spacing: 0) {
                intestazione

                if config.haRaccolta {
                    ScrollView {
                        VStack(spacing: 20) {
                            Text("Cosa conferire")
                                .font(.system(.title2, design: .rounded).weight(.semibold))
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.horizontal)

                            ForEach(config.materiali) { materiale in
                                PattumieraView(
                                    materiale: materiale,
                                    dimensione: config.materiali.count == 1 ? 160 : 130
                                )
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 8)
                            }

                            rigaSveglia
                                .padding(.top, 8)
                        }
                        .padding(.vertical, 16)
                    }
                } else {
                    Spacer()
                    Text("Nessuna raccolta")
                        .font(.system(.title, design: .rounded).weight(.medium))
                        .foregroundStyle(.secondary)
                    Spacer()
                }

                pulsantiInferiori
            }
        }
    }

    private var intestazione: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 4) {
                Text(etichetta.uppercased())
                    .font(.system(.caption, design: .rounded).weight(.bold))
                    .foregroundStyle(.secondary)
                    .tracking(1.2)
                Text(config.giorno.nome)
                    .font(.system(.largeTitle, design: .rounded).weight(.bold))
                Text(formatterData.string(from: data).capitalized)
                    .font(.system(.subheadline, design: .rounded))
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Button(action: onImpostazioni) {
                Image(systemName: "gearshape.fill")
                    .font(.title2)
                    .foregroundStyle(.primary)
                    .padding(10)
                    .background(.ultraThinMaterial, in: Circle())
            }
            .accessibilityLabel("Impostazioni")
        }
        .padding()
    }

    private var rigaSveglia: some View {
        Button(action: onModificaSveglia) {
            HStack {
                Image(systemName: config.sveglia.attiva ? "alarm.fill" : "alarm")
                if config.sveglia.attiva {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Sveglia \(config.sveglia.orarioFormattato)")
                            .font(.system(.headline, design: .rounded))
                        Text(config.sveglia.testoQuandoSuona(giornoRaccolta: config.giorno))
                            .font(.system(.caption, design: .rounded))
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.leading)
                    }
                } else {
                    Text("Sveglia disattivata")
                        .font(.system(.headline, design: .rounded))
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .foregroundStyle(.secondary)
            }
            .padding()
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .padding(.horizontal)
        }
        .buttonStyle(.plain)
    }

    private var pulsantiInferiori: some View {
        Button(action: onVediSettimana) {
            Text("Vedi settimana")
                .font(.system(.headline, design: .rounded))
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.primary.opacity(0.9), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .foregroundStyle(Color(uiColor: .systemBackground))
        }
        .padding()
    }
}
