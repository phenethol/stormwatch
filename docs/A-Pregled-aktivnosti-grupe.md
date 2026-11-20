# A. Pregled aktivnosti grupe

## A.1 Evidencija sastanaka

**Kratice članova tima:** MV = Mario Vrdoljak; SK = Stipe Kujundžić; SL = Stipe Ledić; IR = Ivan Rajilić; TJ = Tin Jović; PRo = Petar Rogić; DR = David Režić.

| Datum i sudionici | Glavna tema | Donesena odluka ili zadatak | Poveznica na zadatak ili rezultat, ako postoji |
| --- | --- | --- | --- |
| 30. 10. 2026.; svi članovi (MV, SK, SL, IR, TJ, PRo, DR), FER | Funkcijski i nefunkcijski zahtjevi | Dogovoreno je koje funkcijske i nefunkcijske zahtjeve tim razrađuje i koji imaju visok prioritet za prvu inačicu: prijava Google računom i javni pregledi, predaja prijave s mjerenjem najbliže postaje, potvrde i osporavanja, moderacija te karta sa slojevima postaja i prijava. Zahtjevi su predstavljeni u prezentaciji „StormWatch: zahtjevi i obrasci uporabe”. | [2. Analiza zahtjeva](2-Analiza-zahtjeva.md) |
| 4. 11. 2026.; svi članovi, knjižnica FER-a | Odabir tehnologija | Backend: Django s Django Ninjom, django-allauth za prijavu Google računom i Django sesija; baza PostgreSQL, lokalno u Dockeru; frontend: React s TypeScriptom, Vite, Tailwind CSS i Leaflet; smještaj na Renderu; GitHub Actions za CI i PlantUML za dijagrame. Odluke su predstavljene u prezentaciji „StormWatch: odabrane tehnologije”, a kasnije promjene opisane su u odjeljku 4.1. | [README – Tehnologije](../README.md#tehnologije), [4.1](4-Arhitektura-i-oblikovanje.md#41-ključne-arhitekturne-odluke) |
| 5. 11. 2026.; svi članovi | Podjela rada i početak implementacije | Backend preuzimaju MV, SK i SL, a frontend PRo, TJ, IR i DR. Zadaci prve inačice raspoređeni su prema I-02 – I-06 i počela je intenzivna implementacija. | [Prekretnica „Prva inačica (MVP)”](https://github.com/phenethol/stormwatch/milestone/1), [PR #15 – #21](https://github.com/phenethol/stormwatch/pulls?q=is%3Apr+is%3Amerged) |

## A.2 Plan rada

**Trenutačni plan:** [prekretnica „Prva inačica (MVP)”](https://github.com/phenethol/stormwatch/milestone/1) sa zadacima I-01 – I-08. Zadatke je otvorio i plan vodi MV.

| Razdoblje | Glavni planirani rad | Odgovorni članovi | Poveznica na zadatke |
| --- | --- | --- | --- |
| 12. – 18. 10. 2026. | Postavljanje repozitorija iz predloška kolegija | MV | Početni zapis promjena |
| 19. – 25. 10. 2026. | Opseg projekta, zahtjevi i obrasci uporabe; podjela posla u zadatke I-01 – I-08; početna konfiguracija frontenda | MV, PRo | [I-01 – I-08](https://github.com/phenethol/stormwatch/milestone/1), [PR #10](https://github.com/phenethol/stormwatch/pull/10) |
| 26. 10. – 1. 11. 2026. | Pojednostavljenje zahtjeva i obrazaca uporabe nakon povratne informacije asistenta; prijava isključivo Google računom | SL | [PR #11](https://github.com/phenethol/stormwatch/pull/11) |
| 2. – 8. 11. 2026. | OpenAPI ugovor između frontenda i backenda; karta s mjernim postajama na lažnim podacima | MV, TJ | [PR #12](https://github.com/phenethol/stormwatch/pull/12), [PR #14](https://github.com/phenethol/stormwatch/pull/14) (I-04a) |
| 9. – 15. 11. 2026. | Temelj backenda; PostgreSQL u Dockeru, prijava Google računom i predaja prijave; CI i CD; podaci DHMZ-a; API prijava; početni pregled „Moje prijave” | SK, MV, SL, PRo | [PR #15 – #21](https://github.com/phenethol/stormwatch/pulls?q=is%3Apr+is%3Amerged) (I-02, I-03, I-05, I-06) |
| 16. – 20. 11. 2026. | Frontend prve inačice povezan sa stvarnim backendom; postavljanje kao jedna usluga na Renderu; dokumentacija i demo video za predaju | Svi članovi | [PR #24 – #53](https://github.com/phenethol/stormwatch/pulls?q=is%3Apr+is%3Amerged) |

Tablica prikazuje glavni rad po tjednima prve inačice. Plan druge inačice (I-07 potvrda i osporavanje, I-08 moderacija, upozorenja DHMZ-a i obavijesti) dodaje se nakon pregleda Iteracije 1.

## A.3 Aktivnosti i doprinosi članova

| Aktivnost ili rezultat | Član | Procijenjeni sati | Reprezentativni rezultat ili poveznica |
| --- | --- | --- | --- |
| Postavljanje repozitorija, zadaci I-01 – I-08 i OpenAPI ugovor | MV | 12 | Zadaci I-01 – I-08; [PR #12](https://github.com/phenethol/stormwatch/pull/12) |
| Backend: PostgreSQL u Dockeru, predaja prijave, API prijava, obrada fotografija i pravila vidljivosti | MV | 11 | [PR #17](https://github.com/phenethol/stormwatch/pull/17), [PR #21](https://github.com/phenethol/stormwatch/pull/21) |
| CI i CD, postavljanje na Render, produkcijska adresa i karta u produkciji; generiranje dijagrama na grani pull requesta; demo video prve inačice | MV | 7 | [PR #18](https://github.com/phenethol/stormwatch/pull/18), [#19](https://github.com/phenethol/stormwatch/pull/19), [#30](https://github.com/phenethol/stormwatch/pull/30), [#32](https://github.com/phenethol/stormwatch/pull/32), [#50](https://github.com/phenethol/stormwatch/pull/50); [demo video](assets/video/stormwatch-demo-iteracija-1.mp4) ([PR #49](https://github.com/phenethol/stormwatch/pull/49)) |
| Temelj backenda: Django, django-allauth, Django Ninja i model korisnika | SK | 15 | [PR #16](https://github.com/phenethol/stormwatch/pull/16) |
| Pojednostavljenje zahtjeva i obrazaca uporabe | SL | 5 | [PR #11](https://github.com/phenethol/stormwatch/pull/11) |
| Prijava Google računom: CSRF i dovršetak registracije | SL | 2 | Zapis promjena 338d77b u [PR #17](https://github.com/phenethol/stormwatch/pull/17) |
| Podaci DHMZ-a i API postaja; posluživanje frontenda na Renderu | SL | 6 | [PR #20](https://github.com/phenethol/stormwatch/pull/20), [PR #24](https://github.com/phenethol/stormwatch/pull/24) |
| Dokumentacija i PDF za prvu predaju | SL | 13 | [PR #42 – #46](https://github.com/phenethol/stormwatch/pulls?q=is%3Apr+is%3Amerged), [#49](https://github.com/phenethol/stormwatch/pull/49), [#51](https://github.com/phenethol/stormwatch/pull/51) |
| Frontend: početna konfiguracija, „Moje prijave”, Vite proxy, obrazac prijave i povezivanje stranica | PRo | 19 | [PR #10](https://github.com/phenethol/stormwatch/pull/10), [#15](https://github.com/phenethol/stormwatch/pull/15), [#25](https://github.com/phenethol/stormwatch/pull/25), [#35](https://github.com/phenethol/stormwatch/pull/35), [#39](https://github.com/phenethol/stormwatch/pull/39) |
| Frontend: karta mjernih postaja, prijava Google računom i dijalog računa, „Moje prijave” sa stanjima; uklanjanje nekorištenog prototipa | TJ | 20 | [PR #14](https://github.com/phenethol/stormwatch/pull/14), [#33](https://github.com/phenethol/stormwatch/pull/33), [#34](https://github.com/phenethol/stormwatch/pull/34), [#41](https://github.com/phenethol/stormwatch/pull/41) |
| Frontend: ikona i metapodaci, Vitest, karta prijava, stranica karte s popisom, filtrima i detaljima | IR | 20 | [PR #28](https://github.com/phenethol/stormwatch/pull/28), [#29](https://github.com/phenethol/stormwatch/pull/29), [#37](https://github.com/phenethol/stormwatch/pull/37), [#38](https://github.com/phenethol/stormwatch/pull/38) |
| Frontend: stilovi i zajedničke komponente, pretraga mjesta, integracijski testovi; dorada zahtjeva za registraciju i prijavu | DR | 18 | [PR #26](https://github.com/phenethol/stormwatch/pull/26), [#27](https://github.com/phenethol/stormwatch/pull/27), [#31](https://github.com/phenethol/stormwatch/pull/31), [#36](https://github.com/phenethol/stormwatch/pull/36), [#40](https://github.com/phenethol/stormwatch/pull/40), [#53](https://github.com/phenethol/stormwatch/pull/53) |

Tim nije vodio evidenciju sati tijekom rada, pa su sati procjena. Raspon od 15 do 30 sati po članu procijenio je tim, a unutar njega sati su raspoređeni razmjerno opsegu promjena u repozitoriju: izmijenjenim retcima (bez generiranih datoteka) i spojenim pull requestovima. Ukupno po članu: MV 30, SL 26, IR 20, TJ 20, PRo 19, DR 18 i SK 15 sati.

## A.4 Pregled promjena u repozitoriju

**Prikaz aktivnosti repozitorija:** [GitHub Contributors](https://github.com/phenethol/stormwatch/graphs/contributors) za razdoblje od 13. 10. do 20. 11. 2026. Tablica prikazuje stanje grane `main` nakon spajanja PR-a #53.

| Član | GitHub račun | Zapisi promjena (bez spajanja) | Spojeni pull requestovi |
| --- | --- | --- | --- |
| Mario Vrdoljak | [phenethol](https://github.com/phenethol) (u gitu i `ethylphenol`) | 29 | 10 |
| Stipe Ledić | [iStels](https://github.com/iStels) | 14 | 10 |
| Petar Rogić | [petarrogic](https://github.com/petarrogic) | 7 | 5 |
| David Režić | [davidrezic](https://github.com/davidrezic) | 6 | 6 |
| Tin Jović | [tjovic5](https://github.com/tjovic5) | 5 | 4 |
| Ivan Rajilić | [irajilic](https://github.com/irajilic) | 4 | 4 |
| Stipe Kujundžić | [stipeKujundzic](https://github.com/stipeKujundzic) | 1 | 1 |

Broj zapisa promjena ne mjeri veličinu doprinosa. SK je cijeli temelj backenda predao jednim zapisom (PR #16), a zapis 338d77b (SL) ušao je u `main` kroz PR #17 koji je otvorio MV. Preostala dva zapisa napravio je `github-actions[bot]`, koji iz PlantUML izvora generira SVG dijagrame. Otvoren je još PR [#52](https://github.com/phenethol/stormwatch/pull/52) (DR, cilj projekta i korisničke uloge u dokumentaciji).

## A.5 Ključni inženjerski izazovi i rješenja

| Izazov | Poduzeta radnja | Ishod ili preostalo ograničenje |
| --- | --- | --- |
| Pri lokalnom razvoju Django je Googleu slao povratnu adresu na `127.0.0.1:8000`, pa je Google javljao `redirect_uri_mismatch`, a kolačići sesije ne prelaze između različitih podrijetla frontenda i backenda. | PRo je u Vite proxyju za `/api/v1`, `/_allauth` i `/accounts` postavio `changeOrigin: false` (PR #25), SL je popravio CSRF i dovršetak registracije, a na Renderu Django poslužuje izgrađeni frontend s iste domene (SL, PR #24). | Prijava Google računom radi lokalno i na javnoj adresi. Ovisnost o istom podrijetlu zabilježena je u [4.7](4-Arhitektura-i-oblikovanje.md#47-arhitekturni-rizici-i-tehnički-dug). |
| XML DHMZ-a nema šifru postaje, broj postaja mijenja se po terminu mjerenja (otprilike 60 – 70), a besplatni Render nema raspoređivač poslova. | SL je postaju vezao uz naziv, par (postaja, termin) učinio jedinstvenim i uveo lijeno preuzimanje uz uvjetni UPDATE nad `FetchStatus` i interval P-10 (PR #20). | Postaje rade bez raspoređivača. Ograničenja: preimenovana postaja postaje nova postaja, a podaci se osvježavaju samo dok netko otvara kartu. |
| Prvi popis zahtjeva bio je preopsežan: 60 funkcijskih i 23 nefunkcijska zahtjeva te 29 obrazaca uporabe na jednom velikom dijagramu. | Na prijedlog asistenta SL je srodne zahtjeve i obrasce uporabe spojio u pet područja (PR #11). | 30 funkcijskih i 12 nefunkcijskih zahtjeva te 23 obrasca uporabe, svaki s prioritetom i kriterijem prihvaćanja; opseg prve inačice jasno je odvojen ([2.5](2-Analiza-zahtjeva.md#25-značajne-promjene-zahtjeva)). |
| Frontend i backend razvijali su se usporedno, prije nego što je API postojao. | MV je zapisao OpenAPI ugovor (PR #12); frontend je radio nad lažnim poslužiteljem Prism, a zatim prešao na stvarni backend (PR #25, #39). | Razlike u ugovoru, npr. podjela kategorije kiše na `heavy_rain` i `flood`, ispravljene su u ugovoru, migraciji i frontendu (MV, PR #23). |
