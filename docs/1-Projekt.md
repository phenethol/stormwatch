# 1. Opseg projekta

## 1.1 Problem i cilj projekta

Svake godine ljeti nad Hrvatskom iznenada nastaju jake nepogode. Grad u nekoliko minuta uništi urod, oluja otkrije krovove, a nabujala voda blokira gradske ulice. DHMZ raspolaže gustom mrežom mjerenja, prognoza i upozorenja, no između postaja postoje praznine: jedno mjesto može biti zahvaćeno olujom, dok najbliža stanica bilježi tek kišu.
Opažanja građana često obuhvaćaju ono što instrumenti previde, no ona su raspršena i nepotvrđena. Tek kada se više prijava s istog područja poveže, provjeri i usporedi sa službenim podacima, ona postaje pouzdan dio slike stvarnog stanja.
StormWatch objedinjuje službene podatke DHMZ-a i zapažanja korisnika na jednom mjestu. Korisnik ovdje provjerava stanje, prognozu i upozorenja za svoje područje, prijavljuje nepogodu koju je upravo doživio te je s drugima potvrđuje, osporava ili raspravlja o njoj.

**Cilj projekta** je web aplikacija StormWatch, prilagođena mobilnim uređajima, koja na jednom mjestu prikazuje službene podatke DHMZ-a (mjerenja, prognoze i upozorenja) i prijave nevremena koje predaju korisnici. Drugi korisnici prijave potvrđuju, osporavaju i komentiraju, regionalni moderatori ih pregledavaju, a meteorolozi ih stručno komentiraju.

**Očekivana korist:** korisnik na jednom mjestu provjerava uvjete, prognozu i upozorenja za svoje područje te vidi provjerena opažanja s terena koja službena mjerenja možda nisu zabilježila. Tim ne tvrdi da aplikacija mjerljivo smanjuje štetu ni da zamjenjuje službena upozorenja.

<details>
<summary><strong>Očekivane koristi i potkrepljujući dokazi</strong></summary>

| Korist                                                | Kako će se pokazati (bez brojčanih tvrdnji)                                                            |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Službeni podaci i opažanja korisnika na jednom mjestu | Mjerenja postaja, upozorenja i prijave vidljivi su kao slojevi iste karte (F-005).                     |
| Usporedba opažanja sa službenim mjerenjem             | Uz svaku prijavu prikazuje se mjerenje najbliže postaje u trenutku opažanja (F-010).                   |
| Pouzdanija opažanja                                   | Svaka prijava ima stanje i ocjenu vjerodostojnosti izračunatu iz potvrda i osporavanja (F-011, F-013). |
| Pravovremena obavijest                                | Korisnik postavlja pravila obavijesti za omiljene lokacije (F-018).                                    |
| Arhiva za analizu                                     | Prošli događaji dostupni su u statistici i izvozu CSV (F-017).                                         |

Korist se dokazuje demonstracijom funkcionalnosti, a ne mjerenjima na stvarnim korisnicima jer takvih podataka nemamo.

</details>

## 1.2 Ciljani korisnici i dionici

| Skupina korisnika ili dionika                 | Potreba ili interes relevantan za ovaj projekt                                                                                               |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Posjetitelj (neregistrirani korisnik)         | Bez registracije vidjeti trenutačne uvjete, prognozu, aktivna upozorenja i kartu potvrđenih prijava.                                         |
| Registrirani korisnik                         | Prijaviti nevrijeme koje opaža, potvrditi ili osporiti tuđe prijave, pratiti omiljene lokacije i primati obavijesti.                         |
| Pouzdani motritelj                            | Objavljivati prijave bez moderacije, s posebnom oznakom; njegova potvrda tuđe prijave ima veću težinu.                                       |
| Moderator (regionalni)                        | Pregledan red prijava na čekanju i prijavljenog sadržaja u svojoj regiji te alati za potvrdu, odbijanje, brisanje i sankcije.                |
| Meteorolog                                    | Objaviti stručni komentar uz događaj i označiti prijave vrijedne za stručnu analizu.                                                         |
| Sistemski administrator                       | Upravljati korisnicima i ulogama, podešavati preuzimanje podataka DHMZ-a i pratiti statistiku korištenja.                                    |
| DHMZ (dionik, vanjski izvor podataka)         | Poštivanje uvjeta korištenja i navođenje izvora; razumno opterećenje njegovih poslužitelja. Ne koristi aplikaciju, ali određuje ograničenja. |
| Službenik za zaštitu podataka / GDPR (dionik) | Zakonita obrada osobnih podataka: adrese e-pošte, lokacije i fotografija s metapodacima. Ne koristi aplikaciju.                              |

## 1.3 Granice projekta

**Uključeno:** javni pregled karte sa slojevima mjernih postaja, upozorenja i potvrđenih prijava; registracija i prijava isključivo Google računom (OpenID Connect na OAuth 2.0); periodičko preuzimanje i pohrana podataka DHMZ-a; predaja prijave nevremena s mjerenjem najbliže postaje; potvrde, osporavanja, komentari, ocjena vjerodostojnosti i grupiranje prijava u događaje; reputacija i pouzdani motritelji; regionalna moderacija i sankcije; stručni komentari meteorologa; omiljene lokacije, praćenje i obavijesti u aplikaciji i e-poštom; statistika s izvozom CSV; administracija korisnika, uloga i preuzimanja; prikaz novih prijava, potvrda i komentara bez ručnog osvježavanja.

**Izvan opsega ili odgođeno:**

- Izdavanje službenih upozorenja i vlastitih prognoza: upozorenja izdaje isključivo DHMZ, StormWatch ih samo prenosi.
- Prijava hitnih slučajeva službama (112): aplikacija nije hitna služba i to jasno navodi (NF-09).
- Nativne mobilne i desktop aplikacije: zadatak traži responzivnu web aplikaciju.
- SMS i push obavijesti: zadatak traži obavijesti u aplikaciji i e-poštom.
- Registracija i prijava korisničkim imenom i lozinkom ili drugim pružateljima identiteta: prijava je isključivo Google računom (odluka tima, C-02).
- Automatsko prepoznavanje pojava na fotografijama, novčana procjena štete, privatne poruke i višejezično sučelje: izvan zadatka i nepotrebni za glavnu svrhu u jednom semestru.

**Vanjske ovisnosti:**

- **DHMZ**: javno dostupni XML podaci (mjerenja, prognoze, upozorenja); bez njih nema službenog dijela sadržaja. Aplikacija ih pohranjuje i radi s posljednjim podacima kad izvor nije dostupan.
- **Kartografska usluga** (npr. OpenStreetMap): prikaz karte u pregledniku.
- **Poslužitelj e-pošte**: slanje obavijesti.
- **Preglednik uređaja**: Geolocation API za GPS lokaciju i pristup kameri ili datotekama za fotografije.
- **Google račun (OpenID Connect na OAuth 2.0)**: jedini način registracije i prijave. Korisnik se prijavljuje na Googleovoj stranici, a aplikacija provjerava Googleov ID token i izdaje vlastiti pristupni token; bez Google računa dostupni su samo javni pregledi.

## 1.4 Postojeći pristupi i opravdanost projekta

DHMZ na svojim stranicama ([meteo.hr](https://meteo.hr)) objavljuje mjerenja s postaja, prognoze i službena upozorenja, ali ne prikuplja opažanja građana. Europska baza opasnih vremenskih pojava ESWD ([eswd.eu](https://eswd.eu)) prikuplja prijave pojava poput tuče i olujnog vjetra i provjerava ih po razinama kontrole kvalitete, ali je namijenjena prvenstveno stručnoj zajednici i ne povezuje prijave s lokalnim upozorenjima DHMZ-a i obavijestima za korisnikovu lokaciju. Opažanja građana u Hrvatskoj zato uglavnom završavaju na društvenim mrežama, gdje nisu provjerena ni povezana sa službenim podacima. StormWatch tu potrebu pokriva objedinjavanjem službenih podataka i lokalnih opažanja te zajedničkom provjerom prijava; ne zamjenjuje službena upozorenja.
