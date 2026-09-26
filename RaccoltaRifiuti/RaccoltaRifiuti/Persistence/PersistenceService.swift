import Foundation

enum PersistenceService {
    private static let fileName = "impostazioni-raccolta.json"

    private static var fileURL: URL {
        let dir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        return dir.appendingPathComponent(fileName)
    }

    static func carica() -> ImpostazioniApp {
        let url = fileURL
        guard FileManager.default.fileExists(atPath: url.path) else {
            let iniziale = ImpostazioniApp()
            salva(iniziale)
            return iniziale
        }
        do {
            let data = try Data(contentsOf: url)
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            return try decoder.decode(ImpostazioniApp.self, from: data)
        } catch {
            print("Errore caricamento impostazioni: \(error)")
            return ImpostazioniApp()
        }
    }

    static func salva(_ impostazioni: ImpostazioniApp) {
        do {
            let encoder = JSONEncoder()
            encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
            encoder.dateEncodingStrategy = .iso8601
            let data = try encoder.encode(impostazioni)
            try data.write(to: fileURL, options: [.atomic])
        } catch {
            print("Errore salvataggio impostazioni: \(error)")
        }
    }
}
