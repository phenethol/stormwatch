# StormWatch — Projektna dokumentacija

**Kolegij:** [Programsko inženjerstvo](https://www.fer.unizg.hr/predmet/proinz), Fakultet elektrotehnike i računarstva Sveučilišta u Zagrebu  
**Akademska godina:** 2026./2027.  
**Tim:** G08.3 StormBusters  
**Nastavnik:** Vlado Sruk  
**Asistent:** Marin Matjanec

## Pregled projekta

StormWatch je web aplikacija prilagođena mobitelima koja na jednoj karti prikazuje službena mjerenja DHMZ-a i prijave nevremena koje šalju građani. Namijenjena je građanima koji žele provjeriti stanje u svojem području i prijaviti nepogodu koju su upravo doživjeli. Uz svaku prijavu sprema se mjerenje najbliže postaje, pa se opažanje s terena može usporediti sa službenim podatkom.

**Aplikacija i osnovno postavljanje:** [README repozitorija](../README.md#quick-start)  
**Javno dostupna aplikacija:** pogledajte [README – Postavljanje](../README.md#deployment)

## Članovi tima i uloge

Ažurirani popis članova, njihovih GitHub profila i glavnih uloga ili doprinosa nalazi se u [README-u repozitorija](../README.md#team-members).

## Kazalo dokumentacije

| Stranica | Svrha |
| --- | --- |
| [1. Opseg projekta](1-Projekt.md) | Problem, cilj i granice projekta |
| [2. Analiza zahtjeva](2-Analiza-zahtjeva.md) | Zahtjevi, ograničenja, promjene i sljedivost zahtjeva |
| [3. Obrasci uporabe](3-Obrasci-uporabe.md) | Akteri i reprezentativne interakcije korisnika |
| [4. Arhitektura i oblikovanje](4-Arhitektura-i-oblikovanje.md) | Glavne odluke oblikovanja, struktura, podaci i ponašanje |
| [5. Ispitivanje](5-Ispitivanje.md) | Pristup ispitivanju, stvarni rezultati i poznati nedostaci |
| [6. Postavljanje, instalacija i konfiguracija](6-Postavljanje-instalacija-i-konfiguracija.md) | Lokalna instalacija, konfiguracija, javno postavljanje i administracija |
| [7. Zaključak i budući rad](7-Zakljucak-i-buduci-rad.md) | Zaključak i moguća daljnja poboljšanja |
| [A. Pregled aktivnosti grupe](A-Pregled-aktivnosti-grupe.md) | Aktivnosti tima, doprinosi i izazovi |

## Ključne točke projekta

**Javno dostupna aplikacija:** <https://stormwatch-4013.onrender.com/>

| Kontrolna točka | Demonstracija | Video |
| --- | --- | --- |
| Iteracija 1 | [Javno dostupna aplikacija](https://stormwatch-4013.onrender.com/) | [Demo video](assets/video/stormwatch-demo-iteracija-1.mp4) |
| Završni pregled | Dodaje se nakon završnog pregleda | Dodaje se nakon završnog pregleda |

Dokumentacija se kontinuirano ažurira kako se aplikacija razvija.

## Organizacija projekta i razvojni proces

**Način rada:** Posao je podijeljen u zadatke I-01 do I-08 unutar prekretnice „Prva inačica (MVP)”. Oznake zadataka navode vrstu, prioritet, područje (backend ili frontend) i stanje, a zadaci koji ostvaruju arhitekturno značajne zahtjeve imaju oznaku ASR. Svaka promjena razvija se na zasebnoj grani i u `main` ulazi pull requestom nakon uspješnog CI-ja.  
**Praćenje trenutačnih zadataka i nedostataka:** [GitHub Issues](https://github.com/phenethol/stormwatch/issues)

## Pravila dokumentacije

Dokumentacija se sastoji od međusobno povezanih Markdown stranica. Obavezni UML dijagrami izrađuju se u PlantUML-u, uz PlantUML izvor u dokumentaciji sačuvajte i čitljivu sliku.

PlantUML izvori nalaze se u `docs/puml/`. Nakon spajanja u `main` GitHub Action [`generate-puml-diagrams.yaml`](../.github/workflows/generate-puml-diagrams.yaml) iz njih generira SVG slike u `docs/assets/diagrams/`, koje prikazuju stranice dokumentacije. Ugovor API-ja između frontenda i backenda vodi se u [`docs/api/openapi.yaml`](api/openapi.yaml). Blokovi „Primjer — CrisisMap” u poglavljima koja još nisu popunjena dio su predloška kolegija, a ne rezultat ovog projekta.

## Akademski integritet, ponašanje i licenciranje

README repozitorija sadrži projektnu [izjavu o uporabi umjetne inteligencije](../README.md#ai-usage), [informacije o kodeksu ponašanja i podršci](../README.md#code-of-conduct-and-support) te [status licence ili ponovne uporabe](../README.md#license). Pristupni podaci i druge tajne nikada se ne objavljuju u dokumentaciji niti dijele u običnim porukama.

## Izjava o uporabi umjetne inteligencije

Kratak sažetak: [README – Uporaba umjetne inteligencije](../README.md#ai-usage). Ovaj odjeljak bilježi koji su alati korišteni i za što. Alati su korišteni u skladu s Kodeksom ponašanja studenata FER-a i FER-ovim [pravilima o primjerenoj uporabi umjetne inteligencije](https://www.fer.unizg.hr/_download/repository/Policy%20on%20the%20appropriate%20use%20of%20artificial%20intelligence%20at%20the%20faculty%20of%20electrical%20engineering%20and%20computing%5B1%5D.pdf).

### Korišteni alati

| Alat | Inačica ili model | Koristio/la | Glavna svrha |
| --- | --- | --- | --- |
| Claude | Opus 5.5 | Članovi tima | Pomoć u pisanju koda; formatiranje teksta i dotjerivanje rečenica u dokumentaciji |
| GPT | Astra | Članovi tima | Pomoć u pisanju koda |

### Provjera generiranog sadržaja

| Provjera | Kako je provedena | Dokaz |
| --- | --- | --- |
| Kod | Kod nastao uz pomoć alata u `main` ulazi istim putem kao i ostali kod: pull requestom i nakon uspješnog CI-ja (lint i build frontenda, testovi backenda nad PostgreSQL-om). | [Pull requestovi](https://github.com/phenethol/stormwatch/pulls?q=is%3Apr), [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) |
| Povjerljivi sadržaj | Tajne vrijednosti (`backend/.env`) ne nalaze se u repozitoriju ni u dokumentaciji; u repozitoriju su samo predlošci `.env.example` bez tajni. | `backend/.env.example`, `frontend/.env.example` |
