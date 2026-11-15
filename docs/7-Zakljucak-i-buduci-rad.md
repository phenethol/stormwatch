# 7. Zaključak i budući rad

**Cilj:** Objektivno procijeniti i dokumentirati konačni opseg onoga što je tim isporučio, kritički se osvrnuti na najvažnije inženjerske spoznaje stečene tijekom razvoja programa te identificirati realne mogućnosti nadogradnje.

## 7.1 Rezultati projekta

[Sažmite što korisnici mogu raditi u dovršenoj aplikaciji. Jasno razlikujte dovršene, djelomično ostvarene i neostvarene funkcionalnosti te opišite njihov učinak na korisnike. Tvrdnje temeljite na pokrenutoj aplikaciji i zabilježenim rezultatima ispitivanja.]

## 7.2 Izazovi i naučene lekcije

[Opišite jedan ili dva značajna tehnička ili organizacijska izazova. Objasnite što se dogodilo, kako je tim reagirao i što je iz toga naučio. Navedite znanja ili vještine koje bi timu pomogle da problem ranije prepozna ili riješi. Navedite što biste u sličnom projektu sljedeći put napravili drugačije i zašto.]

<details>
<summary><strong>Primjer: obrada lokacije pri prijavi događaja</strong></summary>

**Primjer — CrisisMap:** Tim se pri podnošenju prijava kriznih događaja u početku oslanjao na pristup lokaciji preglednika. Kada su korisnici odbili dopuštenje, nisu mogli zadati lokaciju. Tim je dodao mogućnost ručnog odabira lokacije i ispitao oba puta. To je pokazalo zašto funkcionalnost koja ovisi o dopuštenju od početka treba imati alternativni korisnički tijek.

**Analiza primjera:** Opis navodi poteškoću, odgovor tima i konkretnu naučenu lekciju. Ne tvrdi da je cijela aplikacija ispitana samo zato što je provjeren jedan tijek.

</details>

## 7.3 Budući rad

[Navedite mali broj opravdanih poboljšanja i ograničite se na nekoliko prioriteta. Razlikujte nedovršene funkcionalnosti potrebne za ispunjenje izvornog opsega od neobaveznih proširenja. Za svako ukratko objasnite korist i što bi trebalo promijeniti.]

- **Upozorenja i regije DHMZ-a (F-005, F-007).** U prvoj inačici `/warnings` i `/regions` vraćaju 501, pa karta umjesto sloja upozorenja prikazuje poruku. Potrebno je raščlanjivanje upozorenja DHMZ-a i granica regija.
- **Povijest mjerenja postaje (F-026).** Mjerenja se već spremaju, ali `GET /stations/{id}/measurements` nije izložen.
- **Raspoređivač preuzimanja.** Zamijeniti lijeno preuzimanje periodičkim poslom, da se podaci osvježavaju i kad nitko ne otvara kartu.
- **Regije i moderatori (PR-06, PR-07).** Prijave zasad nemaju regiju, pa moderator vidi isto što i registrirani korisnik. Potrebno je uvesti regije, pridružiti im prijave i moderatoru prikazati prijave iz njegovih regija.
- **Glasanje, komentari i događaji (PR-02 do PR-04).** Polja za potvrde, osporavanja, vjerodostojnost, komentare i događaj već postoje u odgovorima API-ja, ali imaju početne vrijednosti.
- **Trajna pohrana fotografija i sličice.** Fotografije premjestiti s lokalnog diska u pohranu objekata i pri predaji generirati sličice za popise i kartu.

---

>**Završna provjera:** Tvrdnje o dovršenim funkcionalnostima podudaraju se s postavljenom aplikacijom i rezultatima ispitivanja. Nedovršen rad jasno je naveden; planovi za budući rad ne prikazuju se kao dovršene funkcionalnosti. Utrošeno vrijeme i pojedinačni doprinosi dokumentirani su u dokumentu [A. Pregled aktivnosti grupe](A-Pregled-aktivnosti-grupe.md).
