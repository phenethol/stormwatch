# 5. Ispitivanje

**Cilj:** Prikazati kako tim provjerava važno ponašanje aplikacije, što je stvarno ispitano, što rezultati pokazuju i koji poznati nedostaci ostaju. Planirano ispitivanje nije dokaz uspješnog izvođenja.

Proširivi primjeri CrisisMapa prikazuju oblikovanje ispitivanja i izvještavanje o rezultatima. Povezivanje zahtjev → obrazac uporabe → ispitivanje održavajte u [tablici sljedivosti zahtjeva](2-Analiza-zahtjeva.md); specifikacije ispitivanja i dokaze izvođenja zabilježite ovdje ili povežite s ispitivanjima u repozitoriju.

## 5.1 Pristup ispitivanju

**Cilj:** Odabrati provjere koje obuhvaćaju glavne korisničke ciljeve, važne uvjete neuspjeha i projektno specifične nefunkcijske zahtjeve.

**Pristup ispitivanju:** [U nekoliko rečenica navedite komponente ili pravila koja se ispituju izdvojeno, glavne interakcije provjerene u pokrenutoj aplikaciji i relevantne nefunkcijske provjere. Navedite koje su provjere automatizirane, koje se izvode ručno i gdje tim čuva dokaze.]

Odaberite normalne slučajeve, granične vrijednosti i neuspjehe koji otkrivaju različita ponašanja. Selenium IDE može snimiti i ponovno izvesti osnovnu interakciju u pregledniku; Selenium WebDriver omogućuje zapis provjere preglednika u kodu. Selenium ili drugi prikladan alat koristite kada pomaže da sustavska provjera bude ponovljiva. Navedite alat koji tim stvarno koristi. Ispitivanje razreda ili pravila pripada razini komponente; otvaranje obrasca u pregledniku provjerava pokrenuti sustav. Tijek kontinuirane integracije (engl. *continuous integration*, CI) i njegova izvođenja navedite samo ako ga tim stvarno koristi. Kontinuirana integracija podrazumijeva da se promjene redovito integriraju u zajednički repozitorij te automatizirano izgrađuju i provjeravaju. Sama uporaba GitHub Actionsa ili drugog alata ne znači da projekt primjenjuje CI ako se takve provjere stvarno ne izvode nad promjenama.

<details>
<summary><strong>Primjer ispitivanja podnošenja prijave</strong></summary>

**Primjer — CrisisMap:** Tim izravno ispituje provjeru lokacije i promjene stanja prijave kontroliranim ulazima. Zatim u pokrenutom pregledniku uz Selenium WebDriver provjerava podnošenje prijave i pripadajuće poruke o pogreškama. Zasebna provjera pokušava odobriti prijavu bez moderatorskih ovlasti. Ako je dostava obavijesti dio odobrenog opsega, ispitivanje provjerava odabir primatelja; ispitivanje potpune dostave od početka do kraja zahtijeva i aktivnog pružatelja obavijesti. Odbijanje geolokacije preglednika provjerava se uz mogućnost ručnog odabira lokacije. Automatizirani kod ispitivanja čuva se u Gitu, a svaki izvršeni rezultat upućuje na određeno izvođenje.

**Analiza primjera:** Pravilo provjere valjanosti može proći iako potpuno podnošenje prijave ne uspije. Ispitivanja preglednika i komponente zato odgovaraju na različita pitanja. Primjer obavijesti odvaja logiku odabira primatelja od stvarne dostave. Ni naziv alata ni snimka zaslona sami po sebi ne dokazuju da je cijela interakcija uspješno prošla.

</details>

## 5.2 Ispitni slučajevi

**Cilj:** Važne provjere učiniti ponovljivima bilježenjem scenarija, ulaza, koraka, očekivanog rezultata i rezultata izvođenja. Svakoj provjeri dodijelite stabilan ID koji se može koristiti u tablici sljedivosti zahtjeva.

| ID ispitnog slučaja | Scenarij ispitivanja | Ulazni podaci | Očekivani rezultat | Stvarni rezultat | Ishod | Koraci ispitivanja |
| --- | --- | --- | --- | --- | --- | --- |
| CT-AUTH-01 | Komponenta: CSRF kolačić | GET `/api/v1/auth/csrf` bez prijave | 204 i postavljen kolačić `csrftoken` | Kao očekivano. | Prošlo | Automatski: `backend/core/tests.py`, `CsrfTests` |
| CT-AUTH-02 | Komponenta: registracija na čekanju | Stanje nakon povratka s Googlea za Google račun bez računa u sustavu; GET `/_allauth/browser/v1/auth/session` | 401 s tokom `provider_signup` označenim kao `is_pending`, pa frontend prikazuje obrazac za korisničko ime | Kao očekivano. | Prošlo | Automatski: `SignupTests.test_pending_signup_is_reported_to_frontend` |
| CT-AUTH-03 | Komponenta: registracija bez potvrde privatnosti | Korisničko ime `ana_k`, bez `privacy_notice_accepted` | 400; račun se ne stvara | Kao očekivano. | Prošlo | Automatski: `SignupTests.test_signup_requires_privacy_notice`, `PrivacyFormTests.test_form_without_privacy_is_invalid` |
| CT-AUTH-04 | Komponenta: pravilo korisničkog imena | Valjana: `ana`, `ana_k.2026`, `ana-k`; nevaljana: `ab`, `šime`, `ime s razmakom`, 31 znak | Valjana imena prihvaćena, nevaljana odbijena; registracija s imenom `šime` vraća 400 | Kao očekivano. | Prošlo | Automatski: `PrivacyFormTests.test_username_rule`, `SignupTests.test_signup_rejects_invalid_username` |
| CT-AUTH-05 | Komponenta: uspješna registracija | Korisničko ime `ana_k`, potvrda privatnosti, Google adresa `ana@gmail.com` | 200; račun s Google adresom, zabilježenim vremenom potvrde privatnosti i bez upotrebljive lozinke; korisnik je prijavljen | Kao očekivano. | Prošlo | Automatski: `SignupTests.test_signup_creates_user_with_google_email` |
| CT-AUTH-06 | Komponenta: administrator iz `ADMIN_EMAILS` | Prijava korisnika s adresom s popisa i korisnika s drugom adresom; GET `/admin/login/` | Prvi dobiva `is_staff` i `is_superuser` i otvara `/admin/`, drugi ne; `/admin/login/` preusmjerava na `?racun=prijava` u frontendu | Kao očekivano. | Prošlo | Automatski: `AdminTests` |
| ST-AUTH-01 | Sustav: prva prijava Google računom | Google račun koji još nema račun u StormWatchu | Nakon Googlea frontend traži korisničko ime i potvrdu privatnosti; nakon potvrde korisnik je prijavljen | Nije pokrenuto. | Nije pokrenuto | Pokrenuti Docker, Django i frontend s proxyjem (odjeljak 6.2); odabrati „Prijava”, prijaviti se na Googleu, upisati korisničko ime, potvrditi privatnost i provjeriti da je korisnik prijavljen |
| ST-AUTH-02 | Sustav: ponovna prijava i odjava | Isti Google račun nakon ST-AUTH-01 | Ponovna prijava ne traži korisničko ime; nakon odjave korisnik je neprijavljen, a Google račun ostaje prijavljen | Nije pokrenuto. | Nije pokrenuto | Odjaviti se, ponovno odabrati „Prijava”, zatim se odjaviti i osvježiti stranicu |
| CT-DHMZ-01 | Komponenta: raščlanjivanje XML-a DHMZ-a | Isječak XML-a za 14. 11. 2026., termin 18 h | Vrijeme mjerenja 18:00 po zagrebačkom vremenu (17:00 UTC); temperatura 4,6 °C; smjer vjetra NE pretvoren u SI | Kao očekivano. | Prošlo | Automatski: `backend/dhmz/tests.py`, `ParserTests.test_reads_time_and_values` |
| CT-DHMZ-02 | Komponenta: podaci koji nedostaju | Vrijednosti „-”, vlaga 0, tlak „837.0*” | „-” i vlaga 0 postaju null; tlak se čita kao 837,0 hPa | Kao očekivano. | Prošlo | Automatski: `ParserTests.test_missing_values_become_none`, `test_pressure_with_asterisk_is_read` |
| CT-DHMZ-03 | Komponenta: neispravan XML | Nepotpun XML; XML bez postaja | Raščlanjivanje se odbija; ništa se ne sprema | Kao očekivano. | Prošlo | Automatski: `ParserTests.test_broken_xml_is_rejected` |
| CT-DHMZ-04 | Komponenta: ponovljeno preuzimanje | Isti termin preuzet dvaput, zatim novi termin | Nema dvostrukih mjerenja; novi termin dodaje povijest i postaje posljednje mjerenje | Kao očekivano. | Prošlo | Automatski: `FetchTests` |
| CT-DHMZ-05 | Komponenta: DHMZ nedostupan (NF-03) | Uspješno preuzimanje, zatim pogreška veze | Ishod „failed” je zabilježen; postojeća mjerenja i vrijeme posljednjeg uspjeha ostaju | Kao očekivano. | Prošlo | Automatski: `FetchTests.test_failure_keeps_existing_data` |
| CT-DHMZ-06 | Komponenta: interval preuzimanja P-10 | Dva zahtjeva unutar intervala; zahtjev nakon 31 min | DHMZ se unutar intervala poziva jednom, a nakon isteka intervala ponovno | Kao očekivano. | Prošlo | Automatski: `StationApiTests.test_fetches_at_most_once_per_interval`, `test_fetches_again_after_interval` |
| CT-DHMZ-07 | Komponenta: API postaja | GET `/stations`, `/stations/{id}`, `/stations/999999`, `/data-status`, `/warnings` bez prijave | 200 s izvorom „DHMZ”; 404 za nepostojeću postaju; stanje preuzimanja „success”; 501 za upozorenja | Kao očekivano. | Prošlo | Automatski: `StationApiTests` |
| ST-DHMZ-01 | Sustav: postaje na karti | Lokalno pokrenuti Docker, Django i Vite (`VITE_LIVE=true`) | Kartica „Postaje” prikazuje broj postaja koji ispiše `fetch_dhmz`; temperature su na karti; na karti piše „DHMZ · dohvat u HH:MM” | Nije pokrenuto. | Nije pokrenuto | Pokrenuti `python manage.py fetch_dhmz`, otvoriti `http://localhost:5173`, otvoriti karticu „Postaje” i usporediti broj postaja s ispisom naredbe |
| CT-REP-01 | Komponenta: uspješna predaja prijave | Tuča, orah, manja šteta, opažena prije 10 min, jedna PNG fotografija; prijavljen korisnik | 201; zaglavlje `Location: /api/v1/reports/{id}`; tijelo sadrži sva obavezna polja `ReportDetail` iz `docs/api/openapi.yaml`; stanje `pending`; vjerodostojnost 50 | Kao očekivano. | Prošlo | Automatski: `backend/core/tests.py`, `CreateReportTests.test_valid_report_is_created`, `test_response_matches_openapi_report_detail`, `test_regular_report_is_pending` |
| CT-REP-02 | Komponenta: neispravni podaci prijave (PR-01) | Vrsta `tornado`; tuča s intenzitetom `strong`; snijeg s intenzitetom `walnut`; šteta `huge`; `lat` 91; opis od 2001 znaka | 422 po poljima; ni prijava ni fotografija nisu spremljene | Kao očekivano. | Prošlo | Automatski: `backend/core/tests.py`, `test_unknown_phenomenon`, `test_hail_needs_grain_size`, `test_other_phenomenon_rejects_grain_size`, `test_unknown_damage`, `test_latitude_out_of_range`, `test_description_too_long` |
| CT-REP-03 | Komponenta: granice vremena opažanja | Opažanje prije 25 h; za 10 min; vrijeme bez vremenske zone prije 10 min | 422, 422 i 201; vrijeme bez zone tumači se kao Europe/Zagreb | Kao očekivano. | Prošlo | Automatski: `backend/core/tests.py`, `test_observed_more_than_24h_ago`, `test_observed_more_than_5min_in_future`, `test_observed_at_without_timezone_is_accepted` |
| CT-REP-04 | Komponenta: broj i veličina fotografija (P-03) | 0, 5 i 6 fotografija; fotografija od 10 MB i 1 B | 0 i 6 vraćaju 422 s `loc` `["body", "photos"]`; 5 vraća 201; prevelika vraća 413 `{"detail": "Fotografija je veća od 10 MB.", "code": "photo_too_large"}` | Kao očekivano. | Prošlo | Automatski: `backend/core/tests.py`, `test_no_photos`, `test_five_photos_allowed`, `test_six_photos`, `test_photo_too_large` |
| CT-REP-05 | Komponenta: datoteka koja nije slika | PDF; tekst poslan sa zaglavljem `image/jpeg` | 422; zaglavlje `Content-Type` ne odlučuje | Kao očekivano. | Prošlo | Automatski: `backend/core/tests.py`, `test_wrong_file_type`, `test_fake_image_with_image_content_type` |
| CT-REP-06 | Komponenta: metapodaci i formati fotografija (NF-07) | JPEG s EXIF-om i GPS koordinatama; JPEG 40×30 s orijentacijom 6; HEIC; PNG | Spremljeni JPEG nema EXIF; okrenuta slika spremljena je kao 30×40; HEIC je spremljen kao JPEG s nastavkom `.jpg`; PNG ostaje PNG | Kao očekivano. | Prošlo | Automatski: `backend/core/tests.py`, `test_exif_is_removed`, `test_exif_orientation_is_applied`, `test_heic_is_converted_to_jpeg`, `test_png_stays_png` |
| CT-REP-07 | Komponenta: prijava u sustav i zabrana objavljivanja (PR-09) | Neprijavljen korisnik; zabrana do 2. 1. 2099. 08:30; zabrana istekla prije 1 min | 401 `{"detail": "Unauthorized"}`; 403 s `code` `posting_banned` i datumom isteka u poruci; 201 | Kao očekivano. | Prošlo | Automatski: `backend/core/tests.py`, `test_anonymous_user_gets_401`, `test_banned_user_gets_403_with_code`, `test_expired_ban_allows_posting` |
| CT-REP-08 | Komponenta: prijava pouzdanog motritelja (F-022) | Autor s ulogom pouzdanog motritelja | Prijava je odmah `confirmed` i označena kao prijava pouzdanog motritelja | Kao očekivano. | Prošlo | Automatski: `backend/core/tests.py`, `test_trusted_observer_report_is_confirmed` |
| CT-REP-09 | Komponenta: mjerenje najbliže postaje uz prijavu (PR-08) | Postaja Zagreb-Grič s mjerenjem prije 20 min; prijava na 45,81, 15,98; isto bez postaja | Prijava čuva mjerenje i udaljenost 0,75 km; odgovor sadrži naziv postaje, udaljenost i mjerenje s izvorom „DHMZ”; bez postaja `nearest_measurement` je null | Kao očekivano. | Prošlo | Automatski: `backend/core/tests.py`, `test_nearest_measurement_is_stored`, `test_no_measurement_nearby` |
| CT-REP-10 | Komponenta: pravila odabira postaje (P-04) | Grič i Maksimir u Zagrebu, Rijeka; mjerenja na −61, −50, 0, +10, +60 i +61 min | Bira se najbliža postaja, a za istu postaju mjerenje najbliže u vremenu; mjerenja izvan ±60 min i postaja dalja od 50 km se zanemaruju; udaljenost Zagreb–Rijeka je približno 130,6 km | Kao očekivano. | Prošlo | Automatski: `backend/core/tests.py`, `NearestMeasurementTests` |
| CT-REP-11 | Komponenta: vidljivost prijava u popisu (PR-07) | Po jedna prijava u svakom stanju; posjetitelj, drugi korisnik, autor i administrator | Posjetitelj vidi potvrđenu; korisnik na čekanju i potvrđenu; autor sve svoje; administrator sve | Kao očekivano. | Prošlo | Automatski: `backend/core/tests.py`, `ListReportsTests.test_visitor_sees_only_confirmed`, `test_user_sees_pending_and_confirmed`, `test_author_sees_all_own_reports`, `test_admin_sees_everything` |
| CT-REP-12 | Komponenta: filtri i paginacija popisa | `phenomenon=snow&phenomenon=storm_wind`, `observed_to`, `bbox`, `valuable_only`, `region_id`, `event_id`, `limit=2&offset=1`; nevaljani `phenomenon`, `bbox` i `limit=501`; `include_deleted` za običnog korisnika | Vraćaju se samo odgovarajuće prijave, najnovije opažanje prvo, s ukupnim `count`; nevaljani parametri vraćaju 422; `include_deleted` vraća 403 s `code` `admin_only` | Kao očekivano. | Prošlo | Automatski: `backend/core/tests.py`, `ListReportsTests` |
| CT-REP-13 | Komponenta: osvježavanje bez ponovnog učitavanja (NF-02) | `updated_since` iz prethodnog `server_time`; jedna prijava potvrđena, jedna odbijena nakon toga | `items` sadrži samo promijenjenu vidljivu prijavu, a `removed_ids` odbijenu | Kao očekivano. | Prošlo | Automatski: `backend/core/tests.py`, `test_updated_since_returns_changes_and_removed_ids` |
| CT-REP-14 | Komponenta: detalj prijave | Prijava na čekanju; tuđa odbijena; posjetitelj; ID 999999; autor odbijene; autor bez računa | 200 s poljima `ReportDetail`; nevidljiva i nepostojeća vraćaju 404 `{"detail": "Not Found"}`; autor vidi obrazloženje; `can_vote` je istinit samo za drugog korisnika; obrisani autor nema korisničko ime | Kao očekivano. | Prošlo | Automatski: `backend/core/tests.py`, `ReportDetailTests` |
| CT-REP-15 | Komponenta: pregled „Prijave” (F-011) | Dvije vlastite i jedna tuđa prijava; filtar `state=pending`; `limit=101`; neprijavljen korisnik | Samo vlastite prijave, najnovija prva, s obrazloženjem odbijanja; filtar radi; 422; 401 | Kao očekivano. | Prošlo | Automatski: `backend/core/tests.py`, `MyReportsTests` |
| CT-DEPLOY-01 | Komponenta: Django poslužuje izgrađeni frontend | Mapa s `index.html` i `assets/index-abc123.js` kao `WHITENOISE_ROOT`; GET `/`, `/?racun=povratak`, `/assets/index-abc123.js`, `/api/v1/auth/csrf`, `/_allauth/browser/v1/auth/session`, `/admin/` | `/` i `/?racun=povratak` vraćaju `index.html`; datoteka iz `assets/` vraća se kao JavaScript; CSRF 204, sesija bez prijave 401, `/admin/` preusmjerava na `/admin/login/` | Kao očekivano. | Prošlo | Automatski: `backend/core/tests.py`, `FrontendServingTests` |
| ST-DEPLOY-01 | Sustav: javno postavljanje na Renderu | Javna adresa usluge nakon postavljanja iz grane `main` | Početna stranica se otvara; osvježavanje stranice ne vraća 404; Google prijava vraća korisnika na istu domenu i korisnik ostaje prijavljen; administrator s adrese iz `ADMIN_EMAILS` otvara `/admin/` | Nije pokrenuto. | Nije pokrenuto | Otvoriti javnu adresu, osvježiti stranicu, prijaviti se Google računom, zatim otvoriti `/admin/` |

Scenarij određuje funkcionalnost koja se ispituje. Opaženi rezultat i **Prošlo**, **Nije prošlo** ili **Blokirano** unesite tek nakon izvođenja; do tada koristite **Nije pokrenuto**. Koraci ispitivanja moraju omogućiti drugom članu tima da ponovi provjeru. Izvorni kod automatiziranog ispitivanja čuvajte u Git repozitoriju projekta i iz relevantnog slučaja postavite poveznicu na njega; za ručnu provjeru ovdje dokumentirajte korake. Odaberite normalne slučajeve, smislene nevaljane ulaze ili granice, neuspjehe i relevantna svojstva kvalitete. Funkcionalnost koja nije implementirana predstavlja nedovršen opseg; provjera kako aplikacija obrađuje nevaljani ID valjano je negativno ispitivanje.

<details>
<summary><strong>Slučajevi podnošenja prijave na dvije razine ispitivanja</strong></summary>

**Primjer — ispitni slučajevi CrisisMapa:** Jedan neuspješan rezultat, ST-02, pokazuje razliku između provedenog slučaja i planiranih slučajeva označenih kao **Nije pokrenuto**. Datum, revizija, okruženje i dokazi oglednog izvođenja navedeni su u nastavku.

| ID ispitnog slučaja | Scenarij ispitivanja | Ulazni podaci | Očekivani rezultat | Stvarni rezultat | Ishod | Koraci ispitivanja |
| --- | --- | --- | --- | --- | --- | --- |
| CT-01 | Komponenta: valjana lokacija | Poplava; zemljopisna širina 45.82; zemljopisna dužina 16.00. | Koordinate prihvaćene. | Nije pokrenuto. | Nije pokrenuto | Pozvati validator lokacije s obje koordinate; provjeriti valjan rezultat. |
| CT-02 | Komponenta: nedostaje lokacija | Poplava; zemljopisna širina i dužina nisu zadane. | Provjera odbija podnošenje; ništa se ne sprema. | Nije pokrenuto. | Nije pokrenuto | Pozvati provjeru bez lokacije; provjeriti odbijanje i da nema spremanja. |
| CT-03 | Komponenta: granična vrijednost koordinata | Prvo (90, 180), zatim (90.01, 180). | Granica prihvaćena; vrijednost izvan granice odbijena. | Nije pokrenuto. | Nije pokrenuto | Izvesti provjeru s oba ulaza; usporediti ishode. |
| CT-04 | Komponenta: prijelaz prijave | Prijava u stanju SUBMITTED; odbijanje, zatim odobravanje. | Odobravanje odbijeno; status ostaje REJECTED. | Nije pokrenuto. | Nije pokrenuto | Odbiti prijavu; pozvati odobravanje; provjeriti konačni status. |
| CT-05 | Komponenta: prijava ne postoji | Repozitorij nema prijavu s ID-om 9999. | Definiran ishod „nije pronađeno”; ne stvara se izmišljena prijava. | Nije pokrenuto. | Nije pokrenuto | Zatražiti ID 9999 nad kontroliranim podacima repozitorija; provjeriti ishod „nije pronađeno”. |
| CT-06 | Komponenta: primatelji obavijesti | Potvrđena poplava blizu regije A; jedna pretplata na regiju A i jedna na regiju B. | Odabran je samo prihvatljiv primatelj u regiji A. | Nije pokrenuto. | Nije pokrenuto | Pozvati odabir primatelja s dvjema pretplatama; usporediti ID-ove. |
| CT-07 | Komponenta: nevaljana vrsta kriznog događaja | Prijava sadrži vrstu događaja izvan podržanog skupa. | Provjera odbija vrstu; prijava se ne sprema. | Nije pokrenuto. | Nije pokrenuto | Zadati nepodržanu vrijednost provjeri prijave; provjeriti odbijanje. |
| ST-01 | Sustav: valjano podnošenje prijave | Poplava; Visoka; odabrana lokacija na karti 45.82, 16.00. | Prikazuje se potvrda; prijava se može ponovno dohvatiti. | Nije pokrenuto. | Nije pokrenuto | Otvoriti obrazac; unijeti podatke; odabrati točku; poslati; otvoriti nastalu prijavu. |
| ST-02 | Sustav: nedostaje obavezna lokacija | Poplava; Visoka; opis „Water rising”; lokacija prazna. | Prikazuje se pogreška specifična za lokaciju; broj prijava se ne povećava. | Prikazana je općenita pogreška poslužitelja; broj prijava ostao je 24. | Nije prošlo | Otvoriti obrazac; unijeti podatke bez lokacije; poslati; usporediti broj prijava prije i poslije. |
| ST-03 | Sustav: dopuštenje geolokacije odbijeno | Dopuštenje preglednika odbijeno; Poplava; ručno odabrana točka na karti. | Korisnik može ručno odabrati lokaciju i podnijeti prijavu. | Nije pokrenuto. | Nije pokrenuto | Odbiti dopuštenje; odabrati točku na karti; poslati; provjeriti potvrdu. |
| ST-04 | Sustav: zaštićeni pregled prijave | Prijavljeni građanin bez moderatorske uloge; prijava ID 104. | Odobravanje odbijeno; prijava ostaje nepromijenjena. | Nije pokrenuto. | Nije pokrenuto | Pokušati odobravanje kroz aplikaciju/API; provjeriti odgovor i stanje prijave. |
| ST-05 | Sustav: pozadinski sustav nedostupan | Valjani podaci prijave poplave; pozadinski sustav namjerno nedostupan u ispitnom okruženju. | Aplikacija prijavljuje neuspjeh i ne prikazuje lažnu potvrdu podnošenja. | Nije pokrenuto. | Nije pokrenuto | Isključiti ispitni pozadinski sustav; poslati prijavu kroz preglednik; provjeriti poruku i ponašanje pri oporavku. |

**Analiza primjera:** Komponentni slučajevi izravno ispituju pravila; sustavski slučajevi ispituju vidljivo ponašanje u pokrenutoj aplikaciji. CT-03 pokazuje stvarnu graničnu vrijednost i vrijednost neposredno izvan nje; neodređena formulacija poput „vrlo dugačak ulaz” ne utvrđuje granicu. Ako tim usvoji zahtjev kvalitete NF-01 za ručni odabir lokacije, ST-03 ga također može provjeravati; nemojte stvarati drugi slučaj s istim koracima samo da biste dobili ID nefunkcijskog ispitivanja. CT-06 i ST-04 ovise o odobrenim funkcionalnostima. Redci prikazuju više tehnika i jedan ogledni neuspjeh; ne određuju obavezni broj slučajeva. Cilj performansi ili dostupnosti treba dogovoreni prag i izvediv postupak mjerenja prije nego što postane projektno ispitivanje.

**Detalji ponavljanja ST-02:** Prije radnje prebrojite pohranjene prijave u ispitnoj bazi podataka (24 u ovom oglednom izvođenju). Otvorite obrazac; odaberite Poplava i visoku razinu ozbiljnosti; unesite „Water rising”; ostavite lokaciju praznom; pošaljite; zabilježite poruku i ponovno provjerite broj prijava. Zabilježite reviziju aplikacije, prikazanu pogrešku i oba broja. Općenita pogreška ne zadovoljava očekivano objašnjenje specifično za lokaciju iako broj prijava ostaje 24.

</details>

<details>
<summary><strong>Automatizirano ispitivanje podnošenja prijave u Seleniumu</strong></summary>

**Primjer — CrisisMap:** Slučaj ST-01 u ovom nastavnom oblikovanju koristi polje za ručni unos koordinata. Nazivi selektora u nastavku predstavljaju elemente obrasca u ovom primjeru; tim mora pregledati vlastitu aplikaciju umjesto kopiranja tih identifikatora. Selenium IDE može snimiti interakciju, ali snimljeni slučaj i dalje treba provjeru očekivanog rezultata. Selenium WebDriver omogućuje timu da radnje i provjere napiše u verzioniranom ispitivanju.

| Korak | Postupak čitljiv čovjeku | Radnja Selenium WebDrivera u primjeru |
| --- | --- | --- |
| 1 | Otvoriti obrazac za prijavu. | Otvoriti URL obrasca za prijavu u ispitnoj aplikaciji. |
| 2 | Odabrati Poplava kao vrstu kriznog događaja. | Pronaći element `incidentType` i odabrati `Flood`. |
| 3 | Odabrati visoku razinu ozbiljnosti. | Pronaći element `severity` i odabrati `High`. |
| 4 | Unijeti lokaciju prijave. | Pronaći `locationInput` i unijeti `45.82, 16.00`. |
| 5 | Opisati krizni događaj. | Pronaći `description` i unijeti `Flooding in the city center`. |
| 6 | Poslati obrazac. | Pronaći i kliknuti `submitReport`. |
| 7 | Provjeriti rezultat. | Pričekati `reportConfirmation`; provjeriti da sadrži referencu na prijavu; otvoriti prijavu i provjeriti njezin opis. |

**WebDriver fragment (JavaScript):**

```js
const { Builder, By, until } = require('selenium-webdriver');
const assert = require('assert');

(async () => {
  const driver = await new Builder().forBrowser('chrome').build();

  try {
    await driver.get(baseUrl + '/reports/new');
    await driver.findElement(By.id('incidentType')).sendKeys('Flood');
    await driver.findElement(By.id('severity')).sendKeys('High');
    await driver.findElement(By.id('locationInput')).sendKeys('45.82, 16.00');
    await driver.findElement(By.id('description'))
      .sendKeys('Flooding in the city center');
    await driver.findElement(By.id('submitReport')).click();

    const confirmation = await driver.wait(
      until.elementLocated(By.id('reportConfirmation')),
      10000
    );

    assert((await confirmation.getText()).includes('Report'));

    const reportUrl = await driver
      .findElement(By.id('createdReportLink'))
      .getAttribute('href');

    await driver.get(reportUrl);

    assert(
      (await driver.findElement(By.id('reportDetails')).getText())
        .includes('Flooding in the city center')
    );
  } finally {
    await driver.quit();
  }
})();
```

**Analiza primjera:** Sedmi korak provjerava potvrdu i da se podnesena prijava može ponovno dohvatiti. Eksplicitno čekanje daje aplikaciji vrijeme za prikaz asinkrone potvrde. Selektori, ruta i tekst potvrde moraju odgovarati korisničkom sučelju tima; snimanje tijeka bez provjere očekivanog rezultata nije dokaz da je ispitivanje prošlo. Verzionirajte automatizirano ispitivanje i sačuvajte rezultat izvođenja.

</details>

<details>
<summary><strong>Ispitivanja performansi, uporabljivosti i sigurnosti</strong></summary>

**Primjer — CrisisMap:** Ovi dodatni slučajevi prikazuju vrste provjera zastupljene u ranijim materijalima kolegija. Ciljevi opterećenja ili vremena izvršavanja zadatka primjenjuju se samo kada tim ima dogovoreni zahtjev i izvediv način mjerenja. Svih šest slučajeva u nastavku označeno je kao **Nije pokrenuto**.

| ID ispitnog slučaja | Scenarij ispitivanja | Ulazni podaci | Očekivani rezultat | Stvarni rezultat | Ishod | Koraci ispitivanja |
| --- | --- | --- | --- | --- | --- | --- |
| NF-P-01 | Performanse: opterećenje popisa prijava | 20 istodobnih korisnika tijekom dvije minute; baza podataka sadrži 100 prijava. | Ako je odobreni cilj 95. percentil vremena odziva od 2 s i najviše 1 % neuspjelih zahtjeva, obje izmjerene vrijednosti zadovoljavaju cilj. | Nije pokrenuto. | Nije pokrenuto | Pripremiti prijave; pokrenuti JMeter ili prikladan alat za opterećenje; zabilježiti vremena odziva, stopu pogrešaka i konfiguraciju smještaja. |
| NF-P-02 | Performanse: veće opterećenje | Povećati broj korisnika s 20 na 40, zatim na 80 uz isti skup podataka. | Zabilježiti opterećenje pri kojem se prvi put prekorači dogovoreni cilj kašnjenja ili stope pogrešaka; bez cilja ne tvrditi da je ispitivanje prošlo. | Nije pokrenuto. | Nije pokrenuto | Povećavati opterećenje u koracima; sačuvati izvještaj alata i zabilježiti kada se pogreške prvi put pojavljuju. |
| NF-U-01 | Uporabljivost: podnošenje prijave poplave | Tri sudionika koji prvi put koriste sučelje; svi dobivaju isti zadatak prijave. | Svaki sudionik može pronaći obrazac, unijeti lokaciju i podnijeti prijavu bez pomoći; zabilježiti vrijeme i poteškoće. | Nije pokrenuto. | Nije pokrenuto | Zadati zadatak; promatrati pokušaje; zabilježiti dovršetak, vrijeme i točke nesnalaženja. |
| NF-U-02 | Pristupačnost: podnošenje samo tipkovnicom | Navigacija tipkovnicom; mogućnost ručnog unosa lokacije. | Korisnik može dosegnuti sva obavezna polja, odabrati lokaciju, poslati prijavu i pročitati potvrdu bez pokazivačkog uređaja. | Nije pokrenuto. | Nije pokrenuto | Navigirati samo tipkovnicom; zabilježiti redoslijed fokusa i rezultat. |
| NF-S-01 | Sigurnost: unos prijave obrađuje se kao podatak | Opis sadrži niz `' OR '1'='1` u kontroliranom ispitnom okruženju. | Nema neželjenog rezultata upita, neovlaštenog pristupa ni kvara poslužitelja; unos se obrađuje kao podatak. | Nije pokrenuto. | Nije pokrenuto | Poslati niz; provjeriti odgovor i pohranjeni rezultat; pregledati relevantne zapise ispitivanja. |
| NF-S-02 | Sigurnost: nevaljani identitet pri pregledu | Istekli ili nevaljani token prijave; pokušaj odobravanja prijave 104. | Zahtjev odbijen; prijava 104 ostaje nepromijenjena. | Nije pokrenuto. | Nije pokrenuto | Pozvati zaštićenu radnju s nevaljanim identitetom; provjeriti odgovor i stanje prijave. |

**Analiza primjera:** Primjer opterećenja zahtijeva zabilježene percentile i pogreške, a ne tvrdnju da je aplikacija „podržala 1.000 korisnika”. Opažanje triju sudionika dokaz je o tim pokušajima, a ne dokaz opće uporabljivosti. Sigurnosni retci ispituju definirano ponašanje; jedan ulazni niz ne dokazuje da je aplikacija sigurna. NF-S-02 relevantan je samo kada je zaštićeni pregled prijave dio odobrenog opsega. Sustavsko ispitivanje može istodobno pružiti dokaz za nefunkcijski zahtjev: ST-03 već provjerava ručni odabir lokacije pa ponavljanje istih koraka pod novim ID-om ne donosi vrijednost.

</details>

## 5.3 Provedena ispitivanja i rezultati

**Cilj:** Navesti reviziju aplikacije, okruženje i dokaze potrebne za tumačenje stvarnih rezultata u tablici ispitnih slučajeva. Dodajte kratak zapis izvođenja kada te podatke nije moguće jasno prenijeti poveznicom na kod ispitivanja ili CI izvođenje.

**Najnovije izvođenje ili dokaz:** 16. 11. 2026.; grana `ci/render-jedan-servis` na osnovi `d2c4d54`, promjene prije commita; Windows 11, Python 3.14.5, PostgreSQL 16 u Dockeru; `python manage.py test` u mapi `backend`: 91 ispitivanje cijelog poslužiteljskog dijela, OK. CT-DEPLOY-01 dio je tog izvođenja. Uz to je naredba za frontend iz `backend/build.sh` pokrenuta u kopiji repozitorija iz mape `backend`, a Django je s isključenim `DEBUG`-om i bez nadjačanih postavki poslužio dobiveni `frontend/dist`: `/` i `/?racun=povratak` vratili su `index.html`, `/assets/…` JavaScript, a `/api/v1/auth/csrf`, `/_allauth/…`, `/admin/` i `/static/admin/…` odgovorili su kao i prije.

**Prethodno izvođenje:** 15. 11. 2026.; grana `feature/reports`, revizija `d7dc950`; macOS, Python 3.14.9, PostgreSQL 16 u Dockeru; `python manage.py test` u mapi `backend`: 88 ispitivanja cijelog poslužiteljskog dijela, OK. Isti postupak ponovljen je u novom virtualnom okruženju, bez datoteke `.env` i nad praznom bazom, kao u CI-ju. Ispitni slučajevi CT-REP-01 do CT-REP-15 dio su tog izvođenja.

**Starije izvođenje:** 15. 11. 2026.; grana `backend/dhmz-postaje`, revizija `3a24a00` uz dodani `backend/dhmz/tests.py`; Windows 11, Python 3.14.5, PostgreSQL 16 u Dockeru; `python manage.py test` u mapi `backend`: 43 ispitivanja cijelog poslužiteljskog dijela, OK. Ispitni slučajevi CT-AUTH-01 do CT-AUTH-06 i CT-DHMZ-01 do CT-DHMZ-07 dio su tog izvođenja.

Stupci **Stvarni rezultat** i **Ishod** iznad mjerodavni su rezultati za pojedinačni slučaj. Nemojte kopirati sve rezultate u drugu obaveznu tablicu. Neuspješna i blokirana izvođenja zabilježite iskreno; pri ponovnom izvođenju zadržite relevantnu povijest umjesto prikazivanja starog uspješnog rezultata kao trenutačnog.

<details>
<summary><strong>Primjer neuspješnog izvođenja bez izmišljanja prolaza</strong></summary>

**Primjer — scenarij pregleda CrisisMapa:** Tijekom izvođenja ST-02 korisnik podnosi prijavu bez odabira lokacije. Aplikacija prikazuje općenitu pogrešku poslužitelja umjesto da navede da lokacija nedostaje.

| ID ispitivanja ili izvođenja | Datum i revizija aplikacije | Okruženje | Opaženi rezultat i ishod | Dokaz |
| --- | --- | --- | --- | --- |
| ST-02 | [Datum izvođenja]; revizija `[kratki hash commita]` | [Ispitno okruženje u kojem je ST-02 stvarno izveden] | Prikazana je općenita pogreška poslužitelja umjesto pogreške specifične za lokaciju; broj prijava ostao je 24. **Ishod: Nije prošlo.** | `tests/evidence/ST-02-error.png`; `tests/evidence/ST-02-db-check.txt`; zadatak #18 |

**Analiza primjera:** Revizija i okruženje čine izvođenje prepoznatljivim; snimka zaslona podupire opaženu poruku, dok zabilježeni broj prijava podupire zasebnu tvrdnju da ništa nije spremljeno. Zadatak prati nedostatak. Nakon ispravka ponovno izvedite ST-02 i ažurirajte njegov rezultat; prethodni neuspjeh zadržite u povijesti izvođenja ili zadatka.

</details>

## 5.4 Poznati nedostaci i ograničenja ispitivanja

**Cilj:** Omogućiti čitatelju da vidi nedostatke koji utječu na uporabu trenutačne aplikacije i važno ponašanje koje tim nije mogao provjeriti.

| Problem ili ograničenje | Korisniku vidljiv učinak ili neprovjereno ponašanje | Dokaz ili poveznica na zadatak |
| --- | --- | --- |
| Potpis Googleova ID tokena ne provjerava se | django-allauth ID token preuzima izravno od Googlea preko TLS-a i tada ne provjerava potpis, što OpenID Connect Core 1.0 (odjeljak 3.1.3.7) dopušta; izdavatelj, primatelj i rok valjanosti se provjeravaju. NF-04 traži i provjeru potpisa. | django-allauth 65.21.1, `socialaccount/providers/google/views.py` (`_decode_id_token`) |
| Automatska ispitivanja prijave ne kontaktiraju Google | Ispitivanja registracije počinju od stanja nakon povratka s Googlea; preusmjeravanje na Google i razmjena koda za token provjeravaju se samo ručno (ST-AUTH-01). | `backend/core/tests.py` (`start_google_signup`) |
| Klijentski dio u repozitoriju (`frontend/`) još nema prijavu Google računom | Prijava se lokalno može ispitati samo s klijentom koji Djangu prosljeđuje `/api/v1`, `/_allauth` i `/accounts`. | `frontend/vite.config.ts` |
| Parametar `bbox` se zanemaruje | `GET /api/v1/stations` uvijek vraća sve postaje (60–70, ovisno o terminu mjerenja). | `backend/dhmz/api.py` |
| Postaje nemaju regiju ni nadmorsku visinu | `region_id` i `altitude_m` su null; XML DHMZ-a ih ne sadrži, a regije još nisu uvedene. | Odstupanje od `docs/api/openapi.yaml` |
| Automatska ispitivanja postaja ne zovu stvarni DHMZ | Ispitivanja podmeću isječak XML-a; stvarni format provjerava se ručno naredbom `python manage.py fetch_dhmz`. | `backend/dhmz/tests.py` |
| HEIC je ispitan samo slikom koju generira pillow-heif | Pretvorba stvarnih fotografija s iPhonea u JPEG nije ručno provjerena. | `CreateReportTests.test_heic_is_converted_to_jpeg` |
| Vrijeme odziva predaje nije izmjereno | Zahtjev da potvrda stigne najviše 2 s nakon prijenosa fotografija (ispit s 50 predaja) nije provjeren. | Issue #6 |
| Postavljanje na Render kao jedna usluga nije izvedeno | `build.sh`, posluživanje frontenda i CD provjereni su samo lokalno. Izgradnja na Renderu (Node.js u Python okruženju), povratak s Googlea na javnu domenu i HTTPS nisu provjereni (ST-DEPLOY-01). | `backend/build.sh`, `.github/workflows/cd.yml` |
| Klijentski dio još nema obrazac za predaju prijave | Predaja se zasad provjerava samo automatskim ispitivanjima i izravnim zahtjevima na API. | `frontend/src` |

Detaljnu reprodukciju nedostatka i napredak čuvajte u alatu za praćenje zadataka, uz kratku poveznicu ovdje za nedostatke koji bitno utječu na aplikaciju ili demonstraciju. Ako je obavezna funkcionalnost nedovršena, jasno to navedite u završnim rezultatima; nemojte je nazivati poznatim nedostatkom niti uspješnim ispitivanjem. Iskreno zabilježite i nedostajuću mogućnost ispitivanja, primjerice vanjskog pružatelja koji tijekom izvođenja nije bio dostupan. Ovaj odjeljak ne zahtijeva drugi potpuni dnevnik problema.

<details>
<summary><strong>Neuspjela provjera i neprovjerena integracija</strong></summary>

**Primjer — CrisisMap:**

| Problem ili ograničenje | Korisniku vidljiv učinak ili neprovjereno ponašanje | Dokaz ili poveznica na zadatak |
| --- | --- | --- |
| Pogreška zbog nedostajuće lokacije previše je općenita | Građanin ne može prepoznati što mora ispraviti prije podnošenja prijave. | Zadatak #18; dokaz izvođenja ST-02. |
| Pružatelj obavijesti nije bio dostupan tijekom ispitivanja | Tim u tom izvođenju nije provjerio dostavu obavijesti. Podnošenje prijave i dalje može raditi. | Primjer zapisa blokiranog izvođenja `tests/evidence/notification-blocked.txt`. |

**Analiza primjera:** Prvi redak opisuje opaženi nedostatak; drugi ograničenje dostupnih dokaza. Nijedan se ne smije prikazati kao uspješno ispitivanje obavijesti. Redak uklonite ili ažurirajte kada se promijene zabilježeni dokazi tima.

</details>

**Završna provjera:** ID-ovi ispitivanja i očekivani ishodi odgovaraju primjenjivim zahtjevima i obrascima uporabe. Izvedeni rezultati upućuju na stvarnu reviziju aplikacije i pregledljivo izvođenje ili ponovljivo opažanje. Važni neuspjesi i otvoreni nedostaci ostaju vidljivi, dok završni opis isporučenih funkcionalnosti odražava ono što podržavaju ispitivanja i pokrenuta aplikacija.
