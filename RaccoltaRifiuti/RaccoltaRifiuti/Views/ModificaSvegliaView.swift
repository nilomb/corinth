import SwiftUI

struct ModificaSvegliaView: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.dismiss) private var dismiss

    let giorno: GiornoSettimana
    /// Se true, le modifiche valgono solo per la prossima occorrenza.
    @State private var soloQuestaSettimana: Bool = false
    @State private var attiva: Bool
    @State private var oraDate: Date
    @State private var momento: MomentoAvviso
    @State private var saltata: Bool = false

    private let dataRaccolta: Date

    init(config: ConfigurazioneGiorno, dataRaccolta: Date? = nil) {
        self.giorno = config.giorno
        let data = dataRaccolta ?? Date()
        self.dataRaccolta = Calendar.current.startOfDay(for: data)
        _attiva = State(initialValue: config.sveglia.attiva)
        _momento = State(initialValue: config.sveglia.momento)
        var components = DateComponents()
        components.hour = config.sveglia.ora
        components.minute = config.sveglia.minuto
        _oraDate = State(initialValue: Calendar.current.date(from: components) ?? Date())
    }

    private var orarioAnteprima: SvegliaConfig {
        let comps = Calendar.current.dateComponents([.hour, .minute], from: oraDate)
        return SvegliaConfig(
            attiva: attiva,
            ora: comps.hour ?? 0,
            minuto: comps.minute ?? 0,
            momento: momento
        )
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Toggle("Sveglia attiva", isOn: $attiva)
                    if attiva {
                        DatePicker(
                            "Orario",
                            selection: $oraDate,
                            displayedComponents: .hourAndMinute
                        )
                        .environment(\.locale, Locale(identifier: "it_IT"))

                        Picker("Quando avvisare", selection: $momento) {
                            ForEach(MomentoAvviso.allCases) { m in
                                Text(m.titolo).tag(m)
                            }
                        }

                        Text(orarioAnteprima.testoQuandoSuona(giornoRaccolta: giorno))
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                } header: {
                    Text("Sveglia per \(giorno.nome)")
                } footer: {
                    Text("Raccolta di \(giorno.nome): \(store.impostazioni.configurazione(per: giorno).nomiMateriali)")
                }

                Section {
                    Toggle("Modifica solo questa settimana", isOn: $soloQuestaSettimana)
                    if soloQuestaSettimana {
                        Toggle("Salta questa occorrenza", isOn: $saltata)
                        Text("La programmazione abituale resta invariata. Vale solo per \(dataFormattata).")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                } header: {
                    Text("Eccezione")
                }

                if attiva {
                    Section("Anteprima") {
                        LabeledContent("Suona") {
                            Text(orarioAnteprima.giornoSuono(perRaccolta: giorno).nome)
                        }
                        LabeledContent("Orario") {
                            Text(orarioAnteprima.orarioFormattato)
                        }
                        LabeledContent("Riferimento raccolta") {
                            Text(giorno.nome)
                        }
                    }
                }
            }
            .navigationTitle("Modifica sveglia")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Annulla") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Salva") { salva() }
                        .fontWeight(.semibold)
                }
            }
            .onAppear {
                if let ecc = store.eccezione(per: giorno, dataRaccolta: dataRaccolta) {
                    soloQuestaSettimana = true
                    saltata = ecc.saltata
                    if let o = ecc.oraAlternativa, let m = ecc.minutoAlternativo {
                        var c = DateComponents()
                        c.hour = o
                        c.minute = m
                        oraDate = Calendar.current.date(from: c) ?? oraDate
                    }
                    if let mom = ecc.momentoAlternativo {
                        momento = mom
                    }
                }
            }
        }
    }

    private var dataFormattata: String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "it_IT")
        f.dateStyle = .full
        return f.string(from: dataRaccolta)
    }

    private func salva() {
        let comps = Calendar.current.dateComponents([.hour, .minute], from: oraDate)
        let ora = comps.hour ?? 0
        let minuto = comps.minute ?? 0

        if soloQuestaSettimana {
            let dataEffettiva: Date = {
                let start = Calendar.current.startOfDay(for: dataRaccolta)
                let oggi = Calendar.current.startOfDay(for: Date())
                if start >= oggi { return start }
                return store.prossimaData(di: giorno)
            }()
            let eccezione = EccezioneSveglia(
                giornoRaccolta: giorno,
                dataRaccolta: dataEffettiva,
                saltata: saltata || !attiva,
                oraAlternativa: saltata ? nil : ora,
                minutoAlternativo: saltata ? nil : minuto,
                momentoAlternativo: saltata ? nil : momento
            )
            store.salvaEccezione(eccezione)
        } else {
            var config = store.impostazioni.configurazione(per: giorno)
            config.sveglia.attiva = attiva
            config.sveglia.ora = ora
            config.sveglia.minuto = minuto
            config.sveglia.momento = momento
            store.aggiornaConfigurazione(config)
        }
        dismiss()
    }
}
