# Benodigdheden & Setup voor React Native Bluetooth Indoor Navigatie

Dit document geeft een compleet overzicht van wat je nodig hebt om een indoor tour app (met blue dot map en hotspots) te bouwen voor zowel **iOS** als **Android**.

---

## 1. Hardware (Voor de school om te bestellen)

Je gebruikt standaard **Bluetooth Low Energy (BLE)** beacons. Zoals besproken functioneren beacons voor 'navigatie' en 'hotspots' exact hetzelfde; je configureert ze alleen anders (hoge vs. lage zendsterkte).

### Wat heb je nodig?
*   **13x BLE 5.0 of BLE 5.2 Beacons (iBeacon protocol support)**
    *   *3 stuks als Anchors (voor trilateratie/positiebepaling)*
    *   *10 stuks als Hotspots (verspreid door de tour)*
*   **Aanbevolen goedkope & betrouwbare merken:**
    *   **Feasycom** (bijv. FSC-BP103B of FSC-BP104D) - Zeer goed voor developers.
    *   **Minew** (bijv. MiniBeacon E2 of i3) - Veel gebruikt en betrouwbaar.
    *   *Beide merken hebben een gratis app (iOS/Android) waarmee je de zendsterkte (Tx Power) en interval kunt instellen per beacon.*
*   **Geschatte Investering School:** € 150,- tot € 220,- in totaal.

---

## 2. Software / Framework

Je gaat bouwen met **React Native CLI** (Niet Expo Go!).
Omdat *Expo Go* (de makkelijke variant van React Native) standaard geen native permissies heeft ingebouwd voor agressief bluetooth scannen op de achtergrond, moet je een 'normaal' React Native project starten, of Expo gebruiken met "Development Builds" (EAS). Voor de minste hoofdpijn qua permissies en bluetooth is React Native CLI vaak de puurste route.

---

## 3. Essentiële npm Packages

In je React Native project zul je de volgende libraries moeten installeren en koppelen:

### A. Voor het Scannen van de Beacons (De Kern)
Je hebt er maar één nodig. Het is aan te raden beide te bekijken en te kiezen welke het beste werkt met je React Native versie.
*   `react-native-beacons-manager` (Aanrader voor pure *iBeacon* support)
    *   *Doel:* Scant continu naar Beacons en geeft heel overzichtelijk terug in een array: UUID, Major nr, Minor nr, en geschatte afstand in meters. Werkt geniaal voor iOS (iBeacon API) en emuleert dit op Android.
*   *(Alternatief)* `react-native-ble-plx`
    *   *Doel:* Een zwaardere, professionele library voor als Beacon Manager conflicten geeft. Scant brute (raw) bluetooth signalen die je zelf moet ontcijferen.

### B. Voor Permissies (Cruciaal voor Android & iOS)
Je app mag geen bluetooth gebruiken zonder de consument toestemming te vragen (Location & Bluetooth permissies).
*   `react-native-permissions`
    *   *Doel:* Zorgt dat je netjes popups toont aan de gebruiker: *"Mag deze app Bluetooth en je Locatie gebruiken?"*. Dit voorkomt dat je app crasht omdat het besturingssysteem het blokkeert.

### C. Voor Algoritmiek & Wiskunde (Trilateratie)
Dit hoef je niet per se als package te doen, je kunt dit algoritme ook zelf schrijven (of door AI laten schrijven), maar het scheelt werk.
*   `trilateration` (of een vergelijkbare JS math package)
    *   *Doel:* Je stuurt de afstand (in meters) van Anchor 1, 2 en 3 in de functie, en hij spuugt uit: X = 203, Y = 104. Dat zijn de coördinaten van je blauwe stip.

---

## 4. Wat moet er specifiek in de App Gereed gemaakt worden? (Configuraties)

Omdat je een Native App bouwt, bevat je React Native project twee speciale mappen: `android` en `ios`. Hierin zitten de daadwerkelijke bronbestanden voor de respectievelijke besturingssystemen. Omdat Bluetooth zwaar beveiligd is in verband met privacy, moet je de configuratiebestanden van deze systemen aanpassen om permissies aan te vragen. Zonder deze regels wijst de App Store of Google Play je app af, of crasht de app zodra je Bluetooth probeert aan te zetten.

Je kunt deze bestanden gewoon openen en bewerken in Visual Studio Code (het zijn XML-gebaseerde bestanden).

### 🍎 Voor iOS: Het `Info.plist` bestand

**Waar vind je dit bestand?**
Ga in VS Code naar: `ios/jouwProjectNaam/Info.plist`

**Hoe pas je het aan?**
Een `.plist` bestand is opgebouwd uit `<key>` en `<string>` combinaties. Apple eist dat je een duidelijke, leesbare reden opgeeft *waarom* je hardware gebruikt. Deze regel tekst wordt letterlijk getoond in de automatische pop-up op de iPhone van de gebruiker.

Voeg binnen in de `<dict>` tag (vaak ergens in het midden of onderaan) het volgende toe:

```xml
<!-- Voor het scannen naar Beacons (Bluetooth) -->
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Deze app gebruikt Bluetooth om te detecteren wanneer je in de buurt bent van een tour-hotspot.</string>
<key>NSBluetoothPeripheralUsageDescription</key>
<string>Bluetooth is noodzakelijk om verbinding te maken met de indoor beacons.</string>

<!-- Omdat iBeacons onder locatiebepaling vallen bij Apple -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>We gebruiken je locatie en beacons om je te navigeren op de plattegrond.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>We sturen notificaties als je langs een hotspot loopt, zelfs op de achtergrond.</string>
```

### 🤖 Voor Android: Het `AndroidManifest.xml` bestand

**Waar vind je dit bestand?**
Ga in VS Code naar: `android/app/src/main/AndroidManifest.xml`

**Hoe pas je het aan?**
In dit XML-bestand geef je het Android-systeem de rechten ('uses-permission') om hardware-onderdelen aan te roepen. Zonder deze tags zal een `react-native-permissions` prompt niet eens verschijnen.

Plaats deze regels direct onder de bestaande `<uses-permission ... />` regels (vlak boven de `<application>` tag):

```xml
<!-- Standaard permissies voor locatie (Noodzakelijk voor Bluetooth scans in Android) -->
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />

<!-- Specifieke Bluetooth permissies (Cruciaal voor Android 12 en nieuwer) -->
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />

<!-- Zorgt ervoor dat de app te downloaden blijft voor telefoons zónder Bluetooth (optioneel, maar netjes) -->
<uses-feature android:name="android.hardware.bluetooth_le" android:required="false" />
```

**Belangrijk na het aanpassen:**
Als je in normale React-bestanden werkt (`App.tsx`), wordt je app meteen geüpdatet als je opslaat (Fast Refresh). Maar zodra je native bestanden zoals `Info.plist` of `AndroidManifest.xml` wijzigt, moet je de app helemaal opnieuw 'builden' (opnieuw runnen via de terminal/Xcode) zodat jouw permissie-regels in de kern van de app gecompileerd kunnen worden.

---

## 5. De Workflow in 4 stappen (Samenvatting)

1. **Hardware instellen:** Stel de 3 Anchors in op heel hard zenden (Tx Power hoog). Stel de 10 Hotspots in op zacht zenden (Tx Power laag). Registreer alle ID's in een JSON bestand of database.
2. **App instellen:** Vraag toestemming aan de gebruiker (Locatie & Bluetooth) via `react-native-permissions`.
3. **Luisteren:** Start `react-native-beacons-manager` en luister (range/scan) naar alle beacons in de buurt, 1x per seconde.
4. **Logica draaien:**
   * Is de beacon een Hotspot (ID zit in hotspot lijst) en is afstand < 1 meter? -> *Toon de popup.*
   * Zijn de beacons Anchors (ID zit in anchor lijst)? -> *Gooi de 3 afstanden in de trilateratie-wiskunde en verplaats de blauwe dot op de kaart.*

---

## 6. Hoe krijg je de App GRATIS op een iPhone? (Zonder €99 licentie)

Als je de app wilt demonstreren of uittesten op je iPhone, hoef je **niet** te betalen voor de $99/jaar Apple Developer licentie. Apple biedt een gratis 'Personal Team' optie aan.

Dit is hoe je de app gratis op je iOS toestel krijgt:

### Wat je nodig hebt (De fysieke check)
1. Een **Mac computer** (MacBook, iMac, of Mac Mini). Misschien kan je er een lenen van school of een klasgenoot als je die zelf niet hebt. Zonder macOS kun je helaas geen iOS apps compileren.
2. **Xcode** (Het gratis ontwikkelprogramma van Apple, te downloaden via de Mac App Store).
3. Een **standaard Apple ID** (het account dat je ook voor iCloud of de App Store gebruikt, volledig gratis).
4. Een **kabeltje** (USB naar Lightning/USB-C) om de iPhone aan de Mac te leggen.

### De Stappen
1. Open de `ios` map in je React Native project via Xcode op de Mac.
2. Ga naar de projectinstellingen (Signing & Capabilities).
3. Log in met jouw gratis Apple ID.
4. Xcode maakt automatisch een 'Personal Team' certificaat voor je aan.
5. Selecteer bovenaan je aangesloten iPhone en druk op de grote **'Play' (Run) knop**.
6. De app wordt nu gebouwd en verschijnt op je home-screen! Je moet dan op je iPhone nog één keer naar *Instellingen -> Algemeen -> VPN en Apparaatbeheer -> Vertrouw deze ontwikkelaar* klikken.

### Let op de "7-Dagen Regel" (De enige "catch")
Apples regel voor de gratis methode is dat de app na **7 dagen verloopt**. Na een week crasht de app zodra je hem opent.
**De oplossing:** Je sluit de iPhone gewoon weer even met het kabeltje aan de Mac, drukt weer op *Play* in Xcode, en je kunt hem weer 7 dagen gebruiken. Voor ontwikkelen, nakijken en schoolpresentaties is dit dus ruim voldoende en **100% gratis**.
