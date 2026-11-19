# StormWatch

StormWatch je web aplikacija prilagođena mobitelima koja na jednoj karti prikazuje službena mjerenja DHMZ-a i prijave nevremena koje šalju korisnici.

**Projekt na kolegiju:** Ovu je aplikaciju razvio studentski tim G08.3 StormBusters u sklopu kolegija [Programsko inženjerstvo](https://www.fer.unizg.hr/predmet/proinz) na Fakultetu elektrotehnike i računarstva Sveučilišta u Zagrebu (FER).

## Opis aplikacije

Mjerne postaje DHMZ-a ne bilježe svaku lokalnu nepogodu: tuča, olujni udar ili poplava mogu pogoditi mjesto između postaja. StormWatch prikuplja opažanja građana i prikazuje ih na karti uz službena mjerenja, a uz svaku prijavu sprema mjerenje najbliže postaje u trenutku opažanja. Prva inačica pokriva prijavu Google računom, kartu s postajama i prijavama te predaju i praćenje vlastitih prijava. Glasanje, moderacija u aplikaciji, upozorenja DHMZ-a i obavijesti planirani su za sljedeću inačicu.

**Ključne funkcionalnosti**

- Karta Hrvatske s potvrđenim prijavama nevremena i posljednjim mjerenjima s postaja DHMZ-a, uz pretragu mjesta.
- Prijava i registracija Google računom: pri prvoj prijavi korisnik bira korisničko ime i potvrđuje obavijest o privatnosti.
- Predaja prijave nevremena (pojava, intenzitet, šteta, lokacija iz GPS-a ili s karte, 1–5 fotografija) i pregled vlastitih prijava sa stanjem u „Moje prijave”.

Za potpuni opseg, zahtjeve, oblikovanje i dokaze ispitivanja pogledajte [docs](docs/Home.md).

<a id="deployment"></a>
## Postavljanje (engl. deployment)

**Javno dostupna aplikacija:** <https://stormwatch-4013.onrender.com/>

**Isprobajte:** Na karti otvorite „Pregled → Postaje” i pogledajte posljednja mjerenja DHMZ-a. Zatim se prijavite Google računom („Prijava”), predajte prijavu („Nova prijava”) i pronađite je u „Moje prijave” u stanju „Na čekanju”.

**Demonstracija:** [Demo video prve inačice](docs/assets/video/stormwatch-demo-iteracija-1.mp4). Za prijavu je potreban Google račun; aplikacija nema lozinke ni demonstracijske račune.

**Ograničenja:**

- Aplikacija je na besplatnom planu Rendera: nakon 15 minuta bez prometa usluga se uspava, pa prvo otvaranje traje do minute.
- Prijave na čekanju potvrđuje ili odbija administrator u Django Adminu (`/admin/`). Neprijavljeni posjetitelji vide samo potvrđene prijave.
- Fotografije prijava na javnoj inačici se ne prikazuju i ne čuvaju trajno ([4.7](docs/4-Arhitektura-i-oblikovanje.md#47-arhitekturni-rizici-i-tehnički-dug)).
- Upozorenja DHMZ-a, glasanje, komentari, moderatori po regijama i obavijesti nisu dio prve inačice.

[Vodič za postavljanje i pokretanje](docs/6-Postavljanje-instalacija-i-konfiguracija.md) opisuje postavljanje na Renderu kao jednu web-uslugu koja poslužuje API i frontend.

<a id="quick-start"></a>
## Brzi početak / instalacija

**Preduvjeti:** Python 3.14, Node.js 22 ili 24 (CI koristi 24) s npm-om, Docker za PostgreSQL 16 i OAuth klijent u Google Cloud Consoleu (tip *Web application*).

Backend, iz korijena repozitorija:

```bash
git clone https://github.com/phenethol/stormwatch.git
cd stormwatch/backend
cp .env.example .env              # upisati SECRET_KEY, GOOGLE_CLIENT_ID i GOOGLE_CLIENT_SECRET
docker compose up -d              # PostgreSQL 16
python -m venv .venv
source .venv/bin/activate         # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Frontend, u drugom terminalu:

```bash
cd stormwatch/frontend
cp .env.example .env.local
npm ci
npm run dev
```

**Adresa:** <http://localhost:5173>. Vite zahtjeve na `/api/v1`, `/_allauth` i `/accounts` prosljeđuje Djangu na <http://127.0.0.1:8000>.

**Konfiguracija:** Varijable su opisane u [`backend/.env.example`](backend/.env.example) i [`frontend/.env.example`](frontend/.env.example). `SECRET_KEY` se generira lokalno, `GOOGLE_CLIENT_ID` i `GOOGLE_CLIENT_SECRET` daje član tima koji upravlja Google projektom, a `ADMIN_EMAILS` su Google adrese koje pri prijavi dobivaju administratorska prava. U Google Cloud Consoleu pod *Authorized redirect URIs* mora biti `http://localhost:5173/accounts/google/login/callback/`. Stvarne vrijednosti nikad se ne upisuju u repozitorij.

**Provjera:** <http://localhost:5173> prikazuje kartu, a <http://127.0.0.1:8000/api/v1/reports> vraća JSON s poljima `items` i `count`. Za detaljno postavljanje pogledajte [6.2 Lokalna instalacija](docs/6-Postavljanje-instalacija-i-konfiguracija.md#62-lokalna-instalacija-i-konfiguracija).

## Tehnologije

| Tehnologija ili alat | Uloga u ovom projektu | Razlog uporabe ili važno ograničenje |
| --- | --- | --- |
| React i TypeScript (Vite) | Jednostranična aplikacija: karta, obrazac prijave i „Moje prijave”. | Karta i popisi osvježavaju se bez ponovnog učitavanja stranice; izgrađene datoteke poslužuje Django s iste domene. |
| Leaflet i MapLibre (OpenFreeMap) | Karta s prijavama i postajama na podlozi od vektorskih pločica. | Podloga dolazi od vanjske usluge; OpenFreeMap ne ograničava broj zahtjeva. |
| Django i Django Ninja | REST API `/api/v1` prema ugovoru [`docs/api/openapi.yaml`](docs/api/openapi.yaml) i Django Admin za upravljanje prijavama. | Ninja provjerava zahtjeve i odgovore prema shemama; Admin u prvoj inačici zamjenjuje moderatorsko sučelje. |
| django-allauth (headless) | Prijava i registracija Google računom (OpenID Connect). | Sustav ne pohranjuje lozinke; sesijski kolačić traži da frontend i API budu na istoj domeni. |
| PostgreSQL 16 | Korisnici, prijave, fotografije, postaje i mjerenja. | Lokalno u Dockeru, u produkciji Render PostgreSQL; shemu mijenjaju Django migracije. |
| Pillow i pillow-heif | Provjera i obrada fotografija prijava. | Uklanja EXIF metapodatke s GPS koordinatama i pretvara HEIC u JPEG. |
| Podaci DHMZ-a (XML s vrijeme.hr) | Mjerenja s postaja i mjerenje najbliže postaje uz prijavu. | Preuzimaju se najviše jednom u 30 minuta; kad DHMZ nije dostupan, prikazuju se posljednji spremljeni podaci. |
| Render (Gunicorn i WhiteNoise) | Javno postavljanje: jedna web-usluga poslužuje API i izgrađeni frontend. | Besplatni plan uspavljuje uslugu i nema trajnog diska. |
| GitHub Actions | CI provjerava frontend (lint, build) i backend (testovi nad PostgreSQL-om); CD nakon toga pokreće postavljanje na Render. | Promjena koja ne prođe CI ne dolazi do produkcije. |

<a id="team-members"></a>
## Članovi tima

| Član | Glavna uloga ili doprinos |
| --- | --- |
| Mario Vrdoljak | Postavljanje repozitorija i strukture dokumentacije; backend: API prijava, obrada fotografija i pravila vidljivosti; CI/CD i postavljanje na Render |
| Stipe Kujundžić | Temelj backenda: Django, django-allauth, Django Ninja i model korisnika |
| Stipe Ledić | Backend: podaci DHMZ-a i API postaja, posluživanje frontenda na Renderu; zahtjevi i obrasci uporabe |
| Ivan Rajilić | Frontend: karta prijava, popis, filtri i detalji |
| Tin Jović | Frontend: prijava Google računom, dijalog računa i „Moje prijave” |
| Petar Rogić | Frontend: obrazac prijave, povezivanje stranica, Vite proxy i CI frontenda |
| David Režić | Frontend: stilovi i zajedničke komponente, pretraga mjesta i integracijski testovi |

Uloge se tijekom projekta mogu mijenjati. Repozitorij i GitHub Issues služe kao dodatni dokazi timskog rada.

## Doprinos projektu

Zadaci se vode kao [GitHub Issues](https://github.com/phenethol/stormwatch/issues) (I-01 do I-08). Promjene se razvijaju na zasebnim granama i u `main` ulaze pull requestom nakon uspješnog CI-ja.

<a id="license"></a>

**Status licence:** Kod aplikacije StormWatch objavljen je pod [licencom MIT](LICENSE). Dokumentacija u direktoriju `docs/` prilagođena je predlošku kolegija i, kako to traži licenca predloška, dijeli se pod licencom CC BY-NC-SA 4.0 ([`docs/LICENSE`](docs/LICENSE)).

Dokumentacijski predložak kolegija sadrži otvorene obrazovne sadržaje (engl. Open Educational Resources, OER) i licenciran je licencom Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International. Ta licenca **ne određuje automatski licencu studentske aplikacije**.

Kod trećih strana, skupovi podataka, slike, ikone i drugi sadržaji zadržavaju vlastite licence i uvjete uporabe. Meteorološki podaci preuzimaju se s [DHMZ-a](https://meteo.hr) i prikazuju uz navod izvora. Kartografska podloga: © [OpenStreetMap](https://www.openstreetmap.org/copyright) suradnici, [OpenFreeMap](https://openfreemap.org) i [OpenMapTiles](https://openmaptiles.org).

<a id="ai-usage"></a>
## Uporaba umjetne inteligencije [![AI Usage: Disclosed](https://img.shields.io/badge/AI%20Usage-Disclosed-blue.svg)](https://www.fer.unizg.hr/_download/repository/Policy%20on%20the%20appropriate%20use%20of%20artificial%20intelligence%20at%20the%20faculty%20of%20electrical%20engineering%20and%20computing%5B1%5D.pdf)

Ovaj projekt slijedi FER-ova [pravila o primjerenoj uporabi umjetne inteligencije](https://www.fer.unizg.hr/_download/repository/Policy%20on%20the%20appropriate%20use%20of%20artificial%20intelligence%20at%20the%20faculty%20of%20electrical%20engineering%20and%20computing%5B1%5D.pdf).

**Izjava:** Alati umjetne inteligencije korišteni su u skladu s Kodeksom ponašanja studenata FER-a. Za pomoć u pisanju koda korišteni su modeli Claude Opus 5.5 i GPT Astra. Claude Opus 5.5 korišten je i kao pomoć pri formatiranju teksta i dotjerivanju rečenica u dokumentaciji. Kod nastao uz pomoć tih alata u granu `main` ulazi istim putem kao i ostali kod: pull requestom i nakon uspješnog CI-ja.

<a id="code-of-conduct-and-support"></a>
## Kodeks ponašanja i podrška [![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](CODE_OF_CONDUCT.md)

Od članova tima očekuje se pridržavanje **Kodeksa ponašanja studenata** Fakulteta elektrotehnike i računarstva Sveučilišta u Zagrebu, pravila timskog rada na kolegiju i [Etičkog kodeksa IEEE-a](https://www.ieee.org/about/corporate/governance/p7-8.html). Za ovaj repozitorij vrijedi i [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).

---

Struktura dokumentacije prilagođena je predlošku kolegija Programsko inženjerstvo FER-a autora [Vlade Sruka](https://www.fer.unizg.hr/vlado.sruk), licenciranom pod [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/). Aplikaciju i njezin sadržaj izradio je gore navedeni studentski tim.
