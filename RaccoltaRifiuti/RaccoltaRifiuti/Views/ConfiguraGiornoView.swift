import SwiftUI

struct ConfiguraGiornoView: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.dismiss) private var dismiss

    let giorno: GiornoSettimana

    @State private var materialiSelezionati: [Materiale]
    @State private var coloreHex: String
    @State private var stileSelezionato: StilePattumiera = .standard

    init(giorno: GiornoSettimana) {
        self.giorno = giorno
        // Valori temporanei; aggiornati in onAppear da store
        _materialiSelezionati = State(initialValue: [])
        _coloreHex = State(initialValue: "#E0EDFA")
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Materiali per \(giorno.nome)") {
                    ForEach(store.materialiDisponibili()) { mat in
                        let selezionato = materialiSelezionati.contains(where: { $0.id == mat.id || stessoTipo(mat) })
                        Button {
                            toggle(mat)
                        } label: {
                            HStack {
                                PattumieraView(materiale: matConStile(mat), dimensione: 40)
                                    .frame(width: 56)
                                Text(mat.nome)
                                    .foregroundStyle(.primary)
                                Spacer()
                                Image(systemName: selezionato ? "checkmark.circle.fill" : "circle")
                                    .foregroundStyle(selezionato ? Color.accentColor : .secondary)
                            }
                        }
                    }
                }

                Section("Stile pattumiere") {
                    Picker("Stile", selection: $stileSelezionato) {
                        ForEach(StilePattumiera.allCases) { stile in
                            Text(stile.nome).tag(stile)
                        }
                    }
                    .onChange(of: stileSelezionato) { nuovo in
                        materialiSelezionati = materialiSelezionati.map { mat in
                            var m = mat
                            m.stile = nuovo
                            return m
                        }
                    }
                }

                Section("Colore di sfondo del giorno") {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 6), spacing: 10) {
                        ForEach(palette, id: \.self) { hex in
                            Circle()
                                .fill(Color(hex: hex) ?? .gray)
                                .frame(width: 36, height: 36)
                                .overlay {
                                    if hex == coloreHex {
                                        Image(systemName: "checkmark")
                                            .font(.caption.bold())
                                            .foregroundStyle(.white)
                                    }
                                }
                                .onTapGesture { coloreHex = hex }
                        }
                    }
                    .padding(.vertical, 4)
                }

                if !materialiSelezionati.isEmpty {
                    Section("Anteprima") {
                        HStack {
                            ForEach(materialiSelezionati) { mat in
                                PattumieraView(materiale: mat, dimensione: 56)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color(hex: coloreHex) ?? .gray.opacity(0.2))
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                }
            }
            .navigationTitle(giorno.nome)
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
                let config = store.impostazioni.configurazione(per: giorno)
                materialiSelezionati = config.materiali
                coloreHex = config.coloreSfondoHex
                if let primo = config.materiali.first {
                    stileSelezionato = primo.stile
                }
            }
        }
    }

    private var palette: [String] {
        ["#EDE6F5", "#E0EDFA", "#E0F2E6", "#FAF2E0", "#F2E6E0", "#E6F0F2",
         "#F5EBE0", "#FDE8E8", "#E8F5E9", "#E3F2FD", "#FFF3E0", "#F3E5F5"]
    }

    private func stessoTipo(_ mat: Materiale) -> Bool {
        materialiSelezionati.contains { esistente in
            if let t1 = esistente.tipoPredefinito, let t2 = mat.tipoPredefinito {
                return t1 == t2
            }
            return esistente.nome == mat.nome
        }
    }

    private func matConStile(_ mat: Materiale) -> Materiale {
        var m = mat
        m.stile = stileSelezionato
        return m
    }

    private func toggle(_ mat: Materiale) {
        if let idx = materialiSelezionati.firstIndex(where: {
            if let t1 = $0.tipoPredefinito, let t2 = mat.tipoPredefinito { return t1 == t2 }
            return $0.id == mat.id || $0.nome == mat.nome
        }) {
            materialiSelezionati.remove(at: idx)
        } else {
            var nuovo = mat
            nuovo.id = UUID()
            nuovo.stile = stileSelezionato
            materialiSelezionati.append(nuovo)
        }
    }

    private func salva() {
        var config = store.impostazioni.configurazione(per: giorno)
        config.materiali = materialiSelezionati.map { mat in
            var m = mat
            m.stile = stileSelezionato
            return m
        }
        config.coloreSfondoHex = coloreHex
        store.aggiornaConfigurazione(config)
        dismiss()
    }
}
