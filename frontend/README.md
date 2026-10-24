# StormWatch – Frontend

Početna konfiguracija frontenda projekta **StormWatch**.

**Tehnologije:** React · TypeScript · Vite · ESLint

## Pokretanje projekta

**Preduvjeti:** Node.js (20.19+ ili 22.12+) i npm.

Nakon preuzimanja repozitorija, iz glavne mape projekta pokrenuti:

```bash
cd frontend
npm ci
npm run dev
```

Razvojni server pokreće se na adresi koju ispiše Vite, najčešće **http://localhost:5173/**.

## Dostupne naredbe

| Naredba | Opis |
|---|---|
| `npm ci` | Instalacija ovisnosti |
| `npm run dev` | Pokretanje razvojnog servera |
| `npm run build` | TypeScript provjera i izgradnja aplikacije |
| `npm run lint` | Provjera koda pomoću ESLinta |
| `npm run preview` | Lokalni pregled izgrađene aplikacije |

## Napomene

- Mape `node_modules/` i `dist/` nisu uključene u Git.
- Konfiguracija ne definira konačnu arhitekturu ni funkcionalnosti frontenda.
- Na Windows PowerShellu, ako `npm` ne radi, koristiti `npm.cmd` (npr. `npm.cmd ci`).