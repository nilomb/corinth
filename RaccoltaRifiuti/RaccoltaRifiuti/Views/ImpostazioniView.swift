import SwiftUI

struct ImpostazioniView: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var notifications = NotificationManager.shared

    @State private var giornoInModifica: GiornoSettimana?
    @State private var nuovoMaterialeNome = ""
    @State private var mostraNuovoMateriale = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Toggle(
                        "Mostra oggi per oggi",
                        isOn: Binding(
                            get: { store.impostazioni.mostraOggiPerOggi },
                            set: { store.impostaMostraOggiPerOggi($0) }
                        )
                    )
                    Text(
                        store.impostazioni.mostraOggiPerOggi
                            ? "La schermata principale mostra cosa conferire oggi."
                            : "La schermata principale mostra cosa conferire domani."
                    )
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                } header: {
                    Text("Schermata principale")
                }

                Section {
                    statoNotifiche
                    Button("Richiedi permesso notifiche") {
                        Task {
                            _ = await notifications.richiediAutorizzazione()
                            await NotificationManager.shared.sincronizzaSveglieConFinestra(
                                impostazioni: store.impostazioni
                            )
                        }
                    }
                    Stepper(
                        "Posticipo: \(store.impostazioni.minutiPosticipo) min",
                        value: Binding(
                            get: { store.impostazioni.minutiPosticipo },
                            set: { nuovo in
                                var copy = store.impostazioni
                                copy.minutiPosticipo = nuovo
                                store.aggiornaImpostazioni(copy)
                            }
                        ),
                        in: 5...60,
                        step: 5
                    )
                } header: {
                    Text("Notifiche e sveglie")
                } footer: {
                    Text("Le sveglie usano UNUserNotificationCenter e funzionano anche a app chiusa. Minimo iOS 16.")
                }

                Section("Calendario raccolta") {
                    ForEach(GiornoSettimana.ordineSettimana) { giorno in
                        let config = store.impostazioni.configurazione(per: giorno)
                        Button {
                            giornoInModifica = giorno
                        } label: {
                            HStack {
                                Circle()
                                    .fill(config.coloreSfondo)
                                    .frame(width: 16, height: 16)
                                    .overlay(Circle().strokeBorder(.secondary.opacity(0.3), lineWidth: 0.5))
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(giorno.nome)
                                        .foregroundStyle(.primary)
                                    Text(config.haRaccolta ? config.nomiMateriali : "Nessuna raccolta")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                if config.sveglia.attiva {
                                    Text(config.sveglia.orarioFormattato)
                                        .font(.caption.monospacedDigit())
                                        .foregroundStyle(.secondary)
                                }
                                Image(systemName: "chevron.right")
                                    .font(.caption)
                                    .foregroundStyle(.tertiary)
                            }
                        }
                    }
                }

                Section("Materiali personalizzati") {
                    ForEach(store.impostazioni.materialiPersonalizzati) { mat in
                        HStack {
                            Circle().fill(mat.colore).frame(width: 14, height: 14)
                            Text(mat.nome)
                        }
                    }
                    Button("Aggiungi materiale…") {
                        nuovoMaterialeNome = ""
                        mostraNuovoMateriale = true
                    }
                }

                Section("Informazioni") {
                    LabeledContent("App", value: "Raccolta Rifiuti")
                    LabeledContent("iOS minimo", value: "16.0")
                    Text("Sveglie programmate sul dispositivo per le prossime 8 settimane; si aggiornano a ogni modifica.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Impostazioni")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Chiudi") { dismiss() }
                }
            }
            .sheet(item: $giornoInModifica) { giorno in
                ConfiguraGiornoView(giorno: giorno)
                    .environmentObject(store)
            }
            .alert("Nuovo materiale", isPresented: $mostraNuovoMateriale) {
                TextField("Nome", text: $nuovoMaterialeNome)
                Button("Annulla", role: .cancel) {}
                Button("Aggiungi") {
                    let nome = nuovoMaterialeNome.trimmingCharacters(in: .whitespacesAndNewlines)
                    guard !nome.isEmpty else { return }
                    store.aggiungiMaterialePersonalizzato(
                        Materiale(nome: nome, coloreHex: "#7C3AED", stile: .moderna)
                    )
                }
            } message: {
                Text("Il materiale comparirà tra le opzioni di ogni giorno.")
            }
            .task {
                await notifications.aggiornaStatoAutorizzazione()
            }
        }
    }

    @ViewBuilder
    private var statoNotifiche: some View {
        let testo: String = {
            switch notifications.autorizzazione {
            case .authorized, .provisional, .ephemeral: return "Consentite"
            case .denied: return "Negate — abilita in Impostazioni iOS"
            case .notDetermined: return "Non richieste"
            @unknown default: return "Sconosciuto"
            }
        }()
        LabeledContent("Permesso notifiche", value: testo)
    }
}
