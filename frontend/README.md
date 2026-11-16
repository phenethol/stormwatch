# StormWatch – Frontend

Početna konfiguracija frontenda projekta **StormWatch**.

**Tehnologije:** React · TypeScript · Vite · ESLint · Tailwind CSS

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

## Stilovi i zajedničke komponente

- **Tailwind CSS 4** uključen je preko dodatka `@tailwindcss/vite` u `vite.config.ts`, a `src/styles.css` ga uvozi s `@import "tailwindcss"`.
- **`src/styles.css`** sadrži samo zajedničke stilove: boje kao CSS varijable (npr. `--ink`, `--blue`, `--line`) za svijetlu temu i za tamnu temu (`[data-theme="dark"]`), tipografiju, gumbe (`.primary`, `.secondary`, `.text-button`), obavijesti (`.inline-note`), zaglavlje stranice i paginaciju. Stilovi karte, prijava i autentikacije idu u zasebne CSS datoteke.
- **Fontovi** se uvoze u `src/main.tsx` preko Fontsourcea, pa se isporučuju s aplikacijom: Instrument Sans za tekst i IBM Plex Mono za brojeve i oznake (varijabla `--mono`).
- **Ikone** dolaze iz biblioteke `lucide-react`, npr. `import { MapPin } from 'lucide-react'`.

Zajedničke komponente nalaze se u `src/components/ui.tsx`:

| Komponenta | Namjena |
|---|---|
| `Page` | Okvir zasebne stranice: naslov (`title`), neobavezni podnaslov (`subtitle`) i sadržaj |
| `Pager` | Gumbi „Prethodne” i „Sljedeće” s rasponom prikazanih zapisa. `page` počinje od 0, zadana veličina stranice je 20, a komponenta se ne prikazuje ako svi zapisi stanu na jednu stranicu. |
| `Status` | Poruke učitavanja, greške (s gumbom „Pokušaj ponovno”) i praznog popisa za resurs oblika `{ updated?, error?, refresh }`. Kod greške prethodno učitani podaci ostaju vidljivi. |

```tsx
import { Page, Pager, Status } from '../components/ui'
```

## Napomene

- Mape `node_modules/` i `dist/` nisu uključene u Git.
- Konfiguracija ne definira konačnu arhitekturu ni funkcionalnosti frontenda.
- Na Windows PowerShellu, ako `npm` ne radi, koristiti `npm.cmd` (npr. `npm.cmd ci`).