# Raccolta Rifiuti

App nativa iPhone (Swift + SwiftUI) per ricordare cosa conferire e a che ora preparare i rifiuti. Interfaccia in italiano. Calendario, impostazioni e sveglie sono salvati sul dispositivo e funzionano anche a app chiusa.

## Requisiti

| Voce | Valore |
|------|--------|
| Xcode | 15 o superiore |
| iOS minimo | **16.0** |
| Dispositivo | iPhone (simulatore o fisico) |
| Permessi | Notifiche locali (`UNUserNotificationCenter`) |

**Perché iOS 16:** notifiche calendarizzate, azioni «Posticipa» / «Interrompi», `interruptionLevel` time-sensitive e API SwiftUI moderne. Non usiamo AlarmKit (richiede iOS 26+): le sveglie sono notifiche locali programmate, affidabili a app chiusa.

## Aprire ed eseguire

1. Su Mac, clona il repository e apri:
   ```text
   RaccoltaRifiuti/RaccoltaRifiuti.xcodeproj
   ```
2. In Xcode seleziona il target **RaccoltaRifiuti** e un simulatore iPhone (o il tuo iPhone).
3. Se usi un iPhone fisico: imposta il tuo **Team** in *Signing & Capabilities* (Development Team).
4. Premi **Run** (⌘R).
5. Al primo avvio concedi le **notifiche** quando richiesto (o da Impostazioni nell’app → «Richiedi permesso notifiche»).

### Note sul simulatore

- Le notifiche locali funzionano anche nel simulatore.
- Per testare orari notturni (es. 03:05) puoi anticipare l’orario del Mac/simulatore, oppure impostare una sveglia tra 1–2 minuti.

## Funzionalità

- **Home:** di default mostra cosa conferire **domani**; se non c’è raccolta, mostra il riepilogo settimanale. Opzione *Mostra oggi per oggi* nelle impostazioni.
- **Giorno:** una o più pattumiere in verticale (niente rotazione obbligatoria).
- **Settimana:** 7 fasce da domenica a sabato; in landscape diventano fasce verticali affiancate.
- **Configurazione:** materiali per giorno (carta, plastica, vetro, organico, indifferenziato, personalizzati), stili pattumiera, colore di sfondo.
- **Sveglie:** orario indipendente per giorno; mattina del conferimento o sera precedente; eccezione per una sola settimana; Posticipa / Interrompi sulla notifica.
- **Persistenza:** JSON in Documents via `FileManager` (Codable).

## Come funzionano le sveglie a app chiusa

1. All’avvio e a ogni modifica, l’app riprogramma le notifiche locali per le **prossime 8 settimane** (`UNCalendarNotificationTrigger`, non ripetute).
2. Il sistema iOS consegna la notifica all’orario previsto anche se l’app è chiusa o in background.
3. Il testo indica i materiali da conferire.
4. Azioni sulla notifica:
   - **Posticipa** → nuova notifica dopo N minuti (impostabile).
   - **Interrompi** → chiude senza riprogrammare quel posticipo.
5. Eccezioni «solo questa settimana» (orario diverso o salta) aggiornano solo l’occorrenza corrispondente nella finestra.

## Checklist di verifica

1. **Uno e due materiali nello stesso giorno** — es. martedì (plastica + vetro) nella config di esempio: entrambe le pattumiere in verticale.
2. **Giorno senza raccolta** — domenica/giovedì: «Nessuna raccolta»; se è il giorno di riferimento home, compare il riepilogo settimanale.
3. **Riepilogo verticale a fasce orizzontali** — «Vedi settimana» o automatico: 7 fasce domenica→sabato.
4. **Passaggio landscape a fasce verticali** — ruota l’iPhone sul riepilogo: colonne affiancate; i dati restano.
5. **Modifica sveglia toccando l’orario** — tap sull’orario nella fascia → sheet di modifica.
6. **Sveglia alle 03:05** — martedì in esempio: mattina del conferimento alle 03:05.
7. **Sveglia la sera precedente** — lunedì/mercoledì in esempio: suona la sera prima.
8. **Modifica valida per una sola settimana** — in Modifica sveglia attiva «Modifica solo questa settimana» (o «Salta questa occorrenza»).
9. **Posticipo e interruzione** — quando arriva la notifica, usa Posticipa / Interrompi dalla schermata di blocco o dal banner.

## Struttura progetto

```text
RaccoltaRifiuti/
├── README.md
├── RaccoltaRifiuti.xcodeproj/
└── RaccoltaRifiuti/
    ├── RaccoltaRifiutiApp.swift
    ├── Info.plist
    ├── Assets.xcassets/
    ├── Models/
    ├── Persistence/
    ├── Notifications/
    └── Views/
```

## Configurazione di esempio (primo avvio)

| Giorno | Materiali | Sveglia |
|--------|-----------|---------|
| Lun | Organico | 20:30 sera precedente |
| Mar | Plastica + Vetro | 03:05 mattina conferimento |
| Mer | Carta | 20:00 sera precedente |
| Ven | Indifferenziato | 07:00 mattina conferimento |
| Sab | Organico | disattivata |
| Dom / Gio | — | — |

Tutto è modificabile da Impostazioni → Calendario raccolta.
