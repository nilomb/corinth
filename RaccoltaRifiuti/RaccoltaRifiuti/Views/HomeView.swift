import SwiftUI

struct HomeView: View {
    @EnvironmentObject private var store: AppStore
    @Environment(\.scenePhase) private var scenePhase

    @State private var mostraSettimanaManuale = false
    @State private var mostraImpostazioni = false
    @State private var svegliaDaModificare: ConfigurazioneGiorno?
    @State private var dataSvegliaDaModificare: Date = Date()

    var body: some View {
        Group {
            if mostraSettimanaManuale {
                RiepilogoSettimanaleView(
                    mostraIndietro: true,
                    onIndietro: {
                        withAnimation { mostraSettimanaManuale = false }
                    },
                    onModificaSveglia: apriModificaSveglia
                )
            } else if store.deveMostrareRiepilogoAutomatico {
                RiepilogoSettimanaleView(
                    mostraIndietro: false,
                    onModificaSveglia: apriModificaSveglia,
                    onImpostazioni: { mostraImpostazioni = true }
                )
            } else {
                GiornoRaccoltaView(
                    config: store.configurazioneGiornoAttuale,
                    data: store.giornoDaMostrare,
                    etichetta: store.etichettaGiornoRiferimento,
                    onModificaSveglia: {
                        dataSvegliaDaModificare = store.giornoDaMostrare
                        svegliaDaModificare = store.configurazioneGiornoAttuale
                    },
                    onVediSettimana: {
                        withAnimation { mostraSettimanaManuale = true }
                    },
                    onImpostazioni: { mostraImpostazioni = true }
                )
            }
        }
        .animation(.easeInOut(duration: 0.25), value: store.deveMostrareRiepilogoAutomatico)
        .animation(.easeInOut(duration: 0.25), value: mostraSettimanaManuale)
        .sheet(item: $svegliaDaModificare) { config in
            ModificaSvegliaView(config: config, dataRaccolta: dataSvegliaDaModificare)
                .environmentObject(store)
        }
        .sheet(isPresented: $mostraImpostazioni) {
            ImpostazioniView()
                .environmentObject(store)
        }
        .onChange(of: scenePhase) { phase in
            if phase == .active {
                store.aggiornaDataRiferimento()
            }
        }
        .onAppear {
            store.aggiornaDataRiferimento()
        }
    }

    private func apriModificaSveglia(_ config: ConfigurazioneGiorno) {
        dataSvegliaDaModificare = store.dataPerFascia(config.giorno)
        svegliaDaModificare = config
    }
}
