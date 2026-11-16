# 6. Postavljanje, instalacija i konfiguracija

**Cilj:** Detaljno dokumentirati topologiju izvođenja, postupak lokalne instalacije i konfiguracije iz izvornog koda te način javnog postavljanja i administracije programa. [README](../README.md) navodi javnu adresu i sažeti postupak lokalnog pokretanja; ova stranica donosi potpun inženjerski postupak koji osigurava točnu ponovljivost na drugom računalu.

Zamijenite oglednu topologiju, naredbe i postavke onima koje vaš tim stvarno koristi (u primjeru se koristi Render; dokumentirajte platformu odabranu za vaš projekt).

---

## 6.1 Prikaz razmještaja

**Cilj:** Prikazati okruženja izvođenja, raspodijeljene dijelove programa, spremište podataka i relevantne vanjske usluge. Njihovu komunikaciju i mrežne protokole prikažite jednim UML dijagramom razmještaja. Dok dijagram komponenata iz Poglavlja 4 prikazuje logičke odgovornosti, dijagram razmještaja pokazuje gdje se izvršni artefakti fizički ili virtualno izvode.

**Dijagram razmještaja:** [Ugradite čitljivu sliku UML dijagrama razmještaja.]  
**PlantUML izvor:** [Poveznica na odgovarajuću `.puml` datoteku.]  
**Javno dostupna aplikacija:** [Poveznica na javnu adresu navedenu u README-u ili na njegov odjeljak o postavljanju.]

*Pravila izrade prikaza:*
* Označite stvarne čvorove na kojima se program izvodi (korisnički uređaj, poslužitelj, baza podataka) i protokole među njima.
* Bazu podataka ili vanjskog pružatelja usluga uključite samo ako ih postavljeni program stvarno koristi.
* Razvojno računalo nije javni poslužitelj; prikažite isključivo produkcijsko okruženje.
* Ako se planirana arhitektura tijekom implementacije promijenila, ovdje prikažite stvarni razmještaj i odgovarajuće ažurirajte opis arhitekture.

<details>
<summary><strong>Primjer: Javno postavljanje programa za prijave i obavijesti </strong></summary>

**Primjer — CrisisMap:**
Predloženi klijentski dio gradi se kao statičko web-mjesto. Poslužiteljska web-usluga obrađuje prijave i asinkrono šalje obavijesti unutar **iste postavljene poslužiteljske aplikacije**. PostgreSQL sprema podatke prijava, pružatelj kartografskih usluga isporučuje kartografske pločice pregledniku, a Firebase Cloud Messaging prima zahtjeve za slanje upozorenja iz poslužiteljskog dijela. Primjer pretpostavlja da obavijesti pripadaju opsegu tog konkretnog projekta.

![UML dijagram razmještaja sustava CrisisMap](./assets/diagrams/6-1-crisismap-DD.svg)

**Slika 6.1. UML dijagram razmještaja sustava CrisisMap**

**PlantUML izvor:** [izvor](./puml/6-1-crisismap-DD.puml)
**Analiza razmještaja:**
* **Korisnički uređaj:** Web-preglednik izvršava klijentski kod nakon preuzimanja statičkih datoteka.
* **Poslužiteljski čvor:** Poslužiteljski API i pozadinski zadaci nalaze se unutar jedne usluge (jednog izvršnog procesa).
* **Baza podataka:** Veza s bazom uspostavlja se isključivo iz poslužiteljskog dijela putem interne mreže, a nikada izravno iz klijentskog preglednika.
* **Vanjske usluge:** Pružatelj kartografskih usluga i pružatelj obavijesti nalaze se izvan infrastrukture koju postavlja tim.
</details>

---

## 6.2 Lokalna instalacija i konfiguracija

**Cilj:** Omogućiti novom članu tima ili ocjenjivaču da iz čiste radne kopije repozitorija instalira i lokalno pokrene cijeli programski sustav, uključujući bazu podataka i početne podatke.

1. **Preduvjeti i preuzimanje izvornog koda:**
   * Navedite podržane verzije izvršnog okruženja, upravitelja paketa, baze podataka i CLI alata.
   * Navedite točne naredbe za kloniranje repozitorija i radni direktorij; naznačite koje se naredbe pokreću iz korijena repozitorija, a koje iz poddirektorija.
2. **Ovisnosti i konfiguracijske varijable:**
   * Navedite točne naredbe za instalaciju ovisnosti za klijentski i poslužiteljski dio.
   * Povežite predložak `.env.example`, opišite ulogu svake varijable, koje vrijednosti smiju biti javne i kako ovlašteni korisnik dobiva tajne vrijednosti.
   * *Upozorenje:* Nikada ne objavljujte stvarne pristupne podatke i tajne ključeve.
3. **Inicijalizacija baze podataka i migracije:**
   * Navedite redoslijed naredbi za stvaranje lokalne baze, dodjelu korisničkih prava i izvođenje migracija sheme; navedite izvode li se migracije ručno ili pri pokretanju te stvarne putanje verzioniranih skripti.
   * Objasnite kako se učitavaju nužni početni podaci (samo oni nužni) i kako spriječiti višestruko izvođenje početnih skripti.
4. **Pokretanje i verifikacija:**
   * Prikažite točan redoslijed pokretanja procesa i lokalne mrežne adrese na kojima su dostupni.
   * Navedite točan korak provjere (npr. slanje probnog zahtjeva ili pregled u pregledniku) koji dokazuje da klijentski dio uspješno komunicira s poslužiteljskim API-jem i bazom te da se važni podaci trajno pohranjuju.
   * Navedite gdje čitatelj može provjeriti pogreške ako neki korak ne uspije.

Uključite samo korake koje aplikacija stvarno zahtijeva. Ako README već sadrži potpun i ponovljiv postupak, povežite ga i ovdje dodajte samo ono što nedostaje umjesto održavanja dviju potpunih kopija istih uputa.

<details>
<summary><strong>Primjer: Instalacija programa s lokalnom PostgreSQL bazom (CrisisMap)</strong></summary>

Ovaj nastavni primjer koristi klijentski dio temeljen na radnom okviru React/Vite (`frontend/`), poslužiteljski dio temeljen na Node.js okruženju (`backend/`) i PostgreSQL bazu podataka.

#### 1. Inicijalizacija baze podataka

U terminalu stvorite razvojnu bazu podataka i pokrenite početnu SQL skriptu iz korijena repozitorija:

```bash
createdb crisismap_dev
psql -d crisismap_dev -f backend/db/001_create_schema.sql
psql -d crisismap_dev -c '\dt'
```

Verzionirana SQL datoteka u ovom primjeru stvara tablice u **novoj** bazi podataka; provjera `\dt` treba ih prikazati. Konfigurirajte lokalni PostgreSQL račun koji može koristiti tu shemu; ako je riječ o zasebnom računu, zabilježite naredbe za njegovo stvaranje i dodjelu prava. Node.js poslužiteljski dio čita `DATABASE_URL`: lokalno ga postavite tako da se putem PostgreSQL URL-a povezuje na `crisismap_dev`, a potrebne pristupne podatke čuvajte u lokalnoj postavci koja se ne uključuje u repozitorij. Nemojte objaviti puni URL veze ako sadrži lozinku. Ako druga aplikacija koristi automatske migracije, pokrenite je prema uputama i provjerite jesu li migracije provedene umjesto zasebnog izvršavanja skripte početne sheme. Ako ogledne prijave zahtijevaju početne podatke, navedite stvarnu naredbu tog projekta i objasnite kada se treba koristiti.

#### 2. Konfiguracija i pokretanje poslužiteljskog dijela (backend)

U prvom terminalu postavite ovisnosti, pripremite varijable okruženja i pokrenite poslužitelj:

```bash
cd backend
npm ci
cp .env.example .env
# Uredite .env datoteku: postavite DATABASE_URL=postgresql://localhost:5432/crisismap_dev
npm start
```

*Poslužiteljski API pokreće se i sluša na:* `http://localhost:8080`

#### 3. Pokretanje klijentskog dijela (frontend)

U drugom terminalu instalirajte ovisnosti klijenta i pokrenite razvojni poslužitelj:

```bash
cd frontend
npm ci
VITE_API_BASE_URL=http://localhost:8080 npm run dev
```

*Klijentska aplikacija dostupna je u pregledniku na:* `http://localhost:5173`

#### 4. Provjera rada sustava

Otvorite adresu klijenta koju ispiše Vite, podnesite probnu prijavu s odabranom lokacijom, provjerite prikazuje li se potvrda s novim identifikatorom prijave i ponovno je dohvatite. Samo učitavanje početne stranice klijenta bez slanja i dohvata podataka ne dokazuje ispravnost rada poslužiteljskog dijela i baze podataka.

Ako se adresa poslužiteljskog dijela razlikuje od `http://localhost:8080`, koristite adresu koju aplikacija stvarno ispiše. Ako podnošenje ne uspije, pregledajte API zahtjev u pregledniku i zapis poslužiteljskog dijela; ako pokretanje ne uspije, provjerite postavke veze s bazom podataka i je li shema stvorena. Nemojte kopirati putanje ili naredbe iz ovog primjera ako se vaš repozitorij razlikuje.

**Analiza primjera:** Postupak ima jasan redoslijed: stvoriti bazu podataka, uspostaviti shemu i pristup, konfigurirati veze, pokrenuti oba procesa i provjeriti spremljenu prijavu. Naredbe i očekivani rezultati dovoljno su konkretni da se može dijagnosticirati nepotpuno postavljanje. Oni nadopunjuju kratki put iz README-a do pokrenute aplikacije umjesto da tvrde kako samo učitana web-stranica dokazuje uspješnu instalaciju.
</details>

### Prijava Google računom

Prijava je moguća samo Google računom, pa lokalno pokretanje traži OAuth klijent u Google Cloud Consoleu.

**Google Cloud Console:** u *APIs & Services → Credentials* otvorite OAuth klijent tipa *Web application* i pod *Authorized redirect URIs* dodajte `http://localhost:5173/accounts/google/login/callback/`. Adresa je na portu frontenda jer Vite zahtjeve na `/accounts` prosljeđuje Djangu. Za javno postavljanje dodajte istu putanju na javnoj adresi.

**Varijable u `backend/.env`** (predložak je `backend/.env.example`):

| Varijabla | Tajna | Uloga |
| --- | --- | --- |
| `SECRET_KEY` | Da | Ključ za potpisivanje sesija i kolačića; mora biti postavljen i neprazan. Lokalno se generira naredbom `python -c "import secrets; print(secrets.token_urlsafe(50))"`. |
| `GOOGLE_CLIENT_ID` | Ne | ID OAuth klijenta iz Google Cloud Consolea |
| `GOOGLE_CLIENT_SECRET` | Da | Tajna OAuth klijenta; dobiva se od člana tima koji upravlja Google projektom i nikad se ne upisuje u `.env.example` |
| `FRONTEND_URL` | Ne | Adresa frontenda, lokalno `http://localhost:5173`; na nju se korisnik vraća nakon neuspjele prijave, a na nju preusmjerava i `/admin/login/` |
| `ADMIN_EMAILS` | Osobni podatak | Google adrese administratora odvojene zarezom; ne objavljuju se u repozitoriju |
| `ALLOWED_HOSTS` | Ne | Lokalno `localhost,127.0.0.1` |

**Klijentski dio:** razvojni poslužitelj mora Djangu prosljeđivati `/api/v1`, `/_allauth` i `/accounts` s opcijom `changeOrigin: false`, da kolačići i adresa povratka s Googlea ostanu na `localhost:5173`.

**Provjera:** otvorite `http://localhost:5173`, odaberite „Prijava” i prijavite se Google računom. Pri prvoj prijavi upišite korisničko ime i potvrdite obavijest o privatnosti. Korisnik čija je adresa u `ADMIN_EMAILS` nakon prijave može otvoriti `http://localhost:8000/admin/`. Administracija nema obrazac s lozinkom, pa `createsuperuser` nije potreban.

### Podaci DHMZ-a

Mjerenja DHMZ-a preuzimaju se sama pri prvom otvaranju karte. Za odmah popunjenu bazu, u mapi `backend`:

```bash
python manage.py fetch_dhmz
```

Naredba ispisuje broj postaja u bazi; on ovisi o terminu mjerenja jer DHMZ u XML-u navodi samo postaje koje su poslale podatke. Naredbu ne treba pokretati češće od jednom u 10 minuta.

| Varijabla | Zadano | Uloga |
| --- | --- | --- |
| `DHMZ_FETCH_INTERVAL_MIN` | 30 | Interval P-10 u minutama; vrijednost manja od 10 podiže se na 10 |
| `DHMZ_MEASUREMENTS_URL` | `https://vrijeme.hr/hrvatska_n.xml` | Adresa XML-a s mjerenjima |

Obje vrijednosti su javne i nisu tajne.

### Fotografije prijava

Fotografije prijava spremaju se u mapu `backend/media` (`MEDIA_ROOT`), a lokalno ih poslužuje Django na `http://localhost:8000/media/`. Mapa nije u repozitoriju.

Za fotografije u formatu HEIC potreban je paket `pillow_heif` iz `backend/requirements.txt`; za macOS, Windows i Linux postoje gotovi paketi pa `pip install -r requirements.txt` ne traži dodatne alate.

Nakon povlačenja promjena pokrenite migracije, jer prijava ima nova polja:

```bash
python manage.py migrate
```

**Provjera:** `GET http://localhost:8000/api/v1/reports` bez prijave vraća `200` i JSON s poljima `items`, `count`, `server_time` i `removed_ids`.

---

## 6.3 Javno postavljanje i administracija

**Cilj:** Dokumentirati točne korake za ponovljivo postavljanje cjelovitog programskog sustava na produkcijsku infrastrukturu u oblaku, uključujući smještenu bazu podataka i veze među postavljenim dijelovima. Kada je jasnije, povežite konfiguraciju koja već postoji u Gitu umjesto njezina prepisivanja.

| **Postavljeni podsustav** | **Infrastruktura i izvor koda** | **Naredbe izgradnje i pokretanja** | **Konfiguracija i varijable okruženja** |
| --- | --- | --- | --- |
| **Klijentski dio** | Ista Render web-usluga kao poslužiteljski dio; grana `main`; mapa `frontend/` | Gradi ga `backend/build.sh`: `npm ci --include=dev && npm run build` u mapi `frontend/`. Izlaz `frontend/dist/` Django poslužuje preko WhiteNoisea s korijena domene, a na `/` vraća `index.html`. | Nema zasebnih varijabli. API se zove relativnim putanjama, pa `VITE_API_BASE_URL` ostaje prazan. Varijable `VITE_*` čitaju se pri izgradnji i vidljive su u pregledniku, pa ne smiju sadržavati tajne. |
| **Poslužiteljski dio** | Render Web Service, Python okruženje; grana `main`; Root Directory `backend` | Izgradnja `./build.sh` (frontend, `pip install`, `collectstatic`, `migrate`); pokretanje `gunicorn config.wsgi:application`. Gunicorn sluša na `0.0.0.0` i portu iz varijable `PORT` koju postavlja Render. | Varijable u tablici ispod. Verziju Pythona određuje `backend/.python-version` (3.14), a verziju Node.js-a `NODE_VERSION`. |
| **Baza podataka** | Render PostgreSQL u istoj regiji kao web-usluga | Shemu stvara i ažurira `python manage.py migrate --noinput` iz `build.sh` pri svakom postavljanju, prije pokretanja nove inačice. Ručne SQL skripte nisu potrebne. | `DATABASE_URL` s **internim** URL-om baze, postavljen samo u web-usluzi |

**CI i CD:** Kontinuirana integracija (engl. *continuous integration*, CI) automatizira izgradnju i provjere pri integriranju promjena. Kratica CD može označavati dva različita postupka. **Kontinuirana isporuka** (engl. *continuous delivery*) održava provjerenu inačicu spremnom za postavljanje, ali postavljanje u produkciju može zahtijevati ručnu odluku. **Kontinuirano postavljanje** (engl. *continuous deployment*) automatski postavlja uspješno provjerenu promjenu u produkciju. Navedite postupak koji projekt stvarno koristi; nemojte koristiti oznaku CI/CD samo zato što alat podržava automatizaciju.
U tablici i opisu navedite **nazive i svrhu** varijabli, gdje ovlašteni održavatelj dobiva njihove vrijednosti i kojoj se usluzi svaka postavlja. Razlikujte konfiguraciju vidljivu pregledniku od tajnih podataka poslužiteljskog dijela.

### Postupak postavljanja

1. **Infrastruktura baze podataka:** u Renderu stvoriti PostgreSQL bazu u regiji u kojoj će raditi web-usluga i kopirati njezin *Internal Database URL*. Migracije se ne pokreću ručno; izvodi ih `build.sh` pri svakom postavljanju.
2. **Postavljanje poslužiteljskog dijela:** stvoriti *Web Service* iz repozitorija, grana `main`, Root Directory `backend`, Build Command `./build.sh`, Start Command `gunicorn config.wsgi:application`. *Auto-Deploy* isključiti, jer postavljanje pokreće CD nakon uspješnog CI-ja (vidi „Postupak ažuriranja”). Varijable okruženja:

   | Varijabla | Tajna | Vrijednost na Renderu |
   | --- | --- | --- |
   | `SECRET_KEY` | Da | Nova nasumična vrijednost, različita od lokalne |
   | `DATABASE_URL` | Da | Interni URL baze iz 1. koraka |
   | `ALLOWED_HOSTS` | Ne | Domena usluge, npr. `<usluga>.onrender.com` (bez `https://`) |
   | `CSRF_TRUSTED_ORIGINS` | Ne | `https://<usluga>.onrender.com` (sa shemom) |
   | `FRONTEND_URL` | Ne | Ista adresa kao `CSRF_TRUSTED_ORIGINS`, bez kose crte na kraju; frontend je na istoj domeni |
   | `GOOGLE_CLIENT_ID` | Ne | ID OAuth klijenta |
   | `GOOGLE_CLIENT_SECRET` | Da | Tajna OAuth klijenta; dobiva se od člana tima koji upravlja Google projektom |
   | `ADMIN_EMAILS` | Osobni podatak | Google adrese administratora. Stanje prijava mijenja se u Django Adminu, pa bez ove varijable nitko ne može potvrditi prijavu. |
   | `NODE_VERSION` | Ne | `24`, kao u CI-ju |
   | `DEBUG` | Ne | Ne postavlja se. Svaka vrijednost osim `1` isključuje način za razvoj i uključuje preusmjeravanje na HTTPS i sigurne kolačiće. |

3. **Izgradnja i objava klijentskog dijela:** nema zasebne usluge. `build.sh` gradi frontend prije Pythonovih koraka, a Django ga poslužuje s iste domene kao API. Ako od prije postoji zasebno statičko web-mjesto za frontend, treba ga obrisati, a iz GitHuba ukloniti tajnu `RENDER_DEPLOY_HOOK_URL`.
4. **Završno povezivanje:** u Google Cloud Consoleu pod *Authorized redirect URIs* dodati `https://<usluga>.onrender.com/accounts/google/login/callback/`, doslovno, s kosom crtom na kraju. Ako je OAuth consent screen u statusu *Testing*, prijaviti se mogu samo dodani testni korisnici. CORS nije potreban jer su frontend i API na istom podrijetlu. Rad provjeriti prema ST-DEPLOY-01 i javnu adresu upisati u `README.md`.

**Fotografije prijava:** uz isključen `DEBUG` Django ne poslužuje `/media/`, a disk web-usluge briše se pri svakom postavljanju, pa fotografije u javnoj inačici nisu dostupne (vidi 4.7).

### Pristup i administracija

- **Nadzor rada i zapisi pogrešaka:** u Renderu, na stranici web-usluge, *Events* prikazuje postavljanja s izlazom izgradnje (`npm`, `pip`, `migrate`), a *Logs* izlaz Gunicorna. Projekt nema postavku `LOGGING`, pa uz isključen `DEBUG` Django ne ispisuje iznimke koje završe odgovorom 500, i one se u *Logs* ne vide. Neuspjela preuzimanja DHMZ-a ipak se vide, jer ih `dhmz/services.py` bilježi na razini `WARNING`, koju Python bez postavke `LOGGING` ispisuje na standardni izlaz pogrešaka.
- **Upravljanje administratorskim ovlastima:** administracijsko sučelje je na `/admin/`. Ovlasti dobiva korisnik čija je Google adresa u `ADMIN_EMAILS`, pri sljedećoj prijavi Google računom; obrazac s lozinkom ne postoji, a `/admin/login/` preusmjerava na prijavu u frontendu. Uklanjanje adrese iz varijable ne oduzima već dodijeljene ovlasti; one se oduzimaju u administracijskom sučelju.
- **Postupak ažuriranja:** kontinuirano postavljanje. Nakon pusha ili spajanja u `main` izvodi se *CI Pipeline* (`.github/workflows/ci.yml`): za frontend `npm ci`, `npm run lint` i `npm run build`; za backend `manage.py check`, provjera nedostajućih migracija, migracije i ispitivanja nad PostgreSQL-om. Tek ako CI uspije, *CD Pipeline* (`.github/workflows/cd.yml`) poziva Render deploy hook iz tajne `RENDER_BACKEND_DEPLOY_HOOK_URL`. Render tada izvodi `build.sh`, uključujući migracije, i pokreće novu inačicu.
- **Sigurnosne kopije i oporavak:** [Dokumentirajte samo ako ga je tim stvarno konfigurirao i koristio.]

Opisujte samo okruženja i automatizirane postupke koji stvarno postoje. Okruženje za pripremu, kontinuirana integracija (CI), kontinuirana isporuka ili kontinuirano postavljanje (CD), krajnja točka za provjeru stanja, sigurnosne kopije i druge operativne mogućnosti navode se samo ako ih tim stvarno koristi.
<details>
<summary><strong>Primjer konfiguriranja statičkog web-mjesta, poslužiteljskog dijela i baze podataka na Renderu</strong></summary>

**Primjer — CrisisMap:**

Jedno izvedivo postavljanje prethodno opisanog Node.js nastavnog primjera koristi sljedeće usluge Rendera. Lokalna PostgreSQL baza iz odjeljka 6.2 odvojena je od upravljane baze koja poslužuje javnu aplikaciju.

| **Postavljeni podsustav** | **Izvor i konfiguracija izgradnje / pokretanja** | **Potrebne varijable i mrežne veze** |
| --- | --- | --- |
| **Statičko web-mjesto** (klijent) | Mapa `frontend/`; grana `main`; izgradnja `npm ci && npm run build`; direktorij objave `dist/`. | `VITE_API_BASE_URL` postavljen na javni URL poslužiteljskog dijela. To je konfiguracija vidljiva pregledniku, a ne tajna vrijednost. |
| **Web-usluga** (poslužitelj) | Mapa `backend/`; Node.js okruženje; izgradnja `npm ci`; pokretanje `npm start`. | `DATABASE_URL` (**interni** URL Render baze), `PORT` (dodjeljuje platforma). Poslužitelj mora slušati `PORT` na `0.0.0.0`. Po potrebi konfigurirajte dopušteno ishodište klijenta (CORS). |
| **Upravljani PostgreSQL** | Baza stvorena u istoj Render regiji kao i web-usluga; početnu shemu primijenite na **novu** bazu prije posluživanja zahtjeva za prijave. | Podatke veze dohvatite iz nadzorne ploče baze i čuvajte ih privatnima. Kasnije migracije primjenjujte zasebno umjesto ponovnog izvođenja početne skripte. |
| **Pružatelj obavijesti** | Integraciju konfigurirajte u poslužiteljskom dijelu samo ako pripada odobrenom projektu i implementirana je. | Poslužiteljski pristupni podatak unesite kroz tajne postavke platforme; dokumentirajte njegov **naziv**, nikada vrijednost. |

#### Koraci izvođenja na Renderu

1. **Stvaranje baze podataka:** U nadzornoj ploči Rendera stvorite PostgreSQL bazu u regiji u kojoj će se izvoditi poslužiteljski dio. Interni URL baze čuvajte za poslužiteljski dio; nemojte ga unositi u dokumentaciju ni u postavke klijenta.
2. **Inicijalizacija produkcijske sheme:** Ako baza dopušta vanjsku vezu, iz pouzdanog terminala u korijenu repozitorija povežite se uputom za PSQL iz nadzorne ploče. U otvorenoj `psql` sesiji pokrenite:

   ```sql
   \i backend/db/001_create_schema.sql
   \dt
   ```

   *Napomena:* Naredbu za povezivanje koja sadrži pristupne podatke nikada ne kopirajte u repozitorij ni dokumentaciju. Ako su vanjske veze onemogućene, opišite stvarni ovlašteni mehanizam migracije svog tima. Početnu skriptu ne pokrećite ponovno pri svakom postavljanju.
3. **Pokretanje poslužiteljske web-usluge:** Povežite repozitorij, odaberite Node.js okruženje i odgovarajuću granu, postavite korijenski direktorij na `backend/`, naredbu izgradnje na `npm ci` i naredbu pokretanja na `npm start`. U privatne postavke okruženja dodajte `DATABASE_URL` s **internim** URL-om baze. Poslužitelj konfigurirajte da sluša na `0.0.0.0` i portu iz varijable `PORT`. Nakon uspješnog postavljanja zabilježite javnu adresu usluge (npr. `https://crisismap-api.onrender.com`).
4. **Izgradnja klijentskog web-mjesta:** Povežite repozitorij, odaberite `frontend/`, naredbu izgradnje `npm ci && npm run build` i mapu objave `dist/`. Prije izgradnje postavite `VITE_API_BASE_URL` na **javnu adresu poslužitelja**; ovdje nikada ne koristite privatni URL baze. Zabilježite generiranu javnu adresu web-mjesta.
5. **Povezivanje i verifikacija produkcijskog rada:** Ako poslužitelj ograničava ishodišta preglednika, dopustite javnu adresu statičkog web-mjesta i ponovno postavite poslužiteljski dio. Otvorite javnu adresu klijenta, podnesite prijavu i ponovno je dohvatite kako biste potvrdili trajno spremanje. Zabilježite javni URL web-mjesta u `README.md`.
6. **Održavanje:** Ako postavljanje ne uspije, pregledajte izlaz i zapise postavljanja usluge u Renderu. Za novu reviziju koristite konfigurirano automatsko postavljanje iz repozitorija ili ručnu radnju postavljanja iz nadzorne ploče. Pristupni podatak za obavijesti konfigurirajte samo u poslužiteljskom dijelu i samo ako je ta funkcionalnost stvarno implementirana. Automatsko pokretanje postavljanja nakon promjene u repozitoriju samo po sebi nemojte nazivati kontinuiranim postavljanjem (CD) ako projekt nema definiran automatizirani tijek provjera koji promjena mora uspješno proći prije postavljanja.

Tim zamjenjuje ogledne nazive direktorija, naredbe, mehanizam sheme i postavke vrijednostima koje rade u vlastitom repozitoriju. Ako obavijesti nisu dostupne, integraciju dokumentirajte iskreno; uspješno podnošenje prijave ne dokazuje uspješnu dostavu obavijesti.

Ako aplikacija uključuje moderatorsko sučelje, navedite njegovu putanju i objasnite kako se moderatorski račun dodjeljuje kroz aplikaciju ili odobreni postupak tima. Nemojte objaviti zadanu lozinku. Oporavak baze podataka opisujte samo ako je tim uspostavio uporabljiv postupak sigurnosnog kopiranja; nemojte implicirati da upravljani smještaj automatski jamči oporavak.

**Analiza primjera:** API i obrada obavijesti ostaju u jednom postavljanju poslužiteljskog dijela, kao na dijagramu. Postupak razlikuje Renderovu internu vezu s bazom od javnog URL-a poslužitelja koji koristi klijent te uspostavlja shemu prije obrade prijava. Izgradnja klijenta dobiva samo konfiguraciju vidljivu pregledniku; tajni podaci baze i pružatelja ostaju u poslužiteljskom dijelu. Render je samo jedan nastavni primjer pa druga platforma zahtijeva opis vlastitog postupka.
</details>

---

>**Završna provjera:** Upute za lokalno pokretanje omogućuju podizanje cjelokupnog sustava iz čiste kopije repozitorija bez neprenosivih lokalnih staza. Dijagram razmještaja prikazuje samo stvarno produkcijsko okruženje, njegove čvorove i protokole. Poveznica na javnu aplikaciju provjerena je, vodi na postavljenu verziju programa i jednaka je onoj u `README.md`. Administracijske upute opisuju samo mogućnosti koje tim stvarno pruža. Nijedna datoteka dokumentacije, konfiguracijski primjer niti zapis promjene ne sadrži stvarne pristupne podatke, privatne tokene ili lozinke.
