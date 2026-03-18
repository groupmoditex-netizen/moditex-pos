# MODITEX POS — Instalación desde cero

## Paso 1 — Extraer el ZIP

Extrae la carpeta `moditex-fresh` donde quieras, por ejemplo:
  C:\Users\Usuairo\moditex-fresh

## Paso 2 — Crear el archivo .env.local

Dentro de la carpeta `moditex-fresh`, crea un archivo llamado exactamente `.env.local`
(sin ninguna extensión adicional) con este contenido:

  NEXT_PUBLIC_SUPABASE_URL=https://TU_PROJECT_ID.supabase.co
  NEXT_PUBLIC_SUPAB

## Estructura del proyecto

moditex-fresh/
├── app/
│   ├── layout.js          ← layout raíz con Providers
│   ├── page.js            ← redirige a /dashboard
│   ├── providers.js       ← React Query configurado
│   ├── globals.css        ← Tailwind
│   ├── dashboard/
│   │   └── page.js        ← página de inicio
│   └── inventario/
│       └── page.js        ← inventario con infinite scroll
│
├── hooks/
│   └── useProducts.js     ← todos los hooks de React Query
│ASE_ANON_KEY=TU_ANON_KEY

Los valores los encuentras en: Supabase → tu proyecto → Settings → API

## Paso 3 — Instalar dependencias

Abre la terminal en esa carpeta y corre:

  npm install

Espera a que termine (puede tardar 1-2 minutos).

## Paso 4 — Arrancar

  npm run dev

Abre el navegador en http://localhost:3000/inventario

Deberías ver los 5 productos del seed con sus variantes expandibles.

---
├── lib/
│   └── supabase.js        ← cliente Supabase
│
├── modules/
│   ├── products/
│   │   ├── product.repository.js
│   │   └── product.service.js
│   ├── inventory/
│   │   ├── inventory.repository.js
│   │   └── inventory.service.js
│   ├── clients/
│   │   └── client.service.js
│   └── sales/
│       └── sales.service.js
│
├── .env.example           ← copia esto como .env.local
├── jsconfig.json          ← alias @/ configurado
├── next.config.js
├── tailwind.config.js
└── package.json           ← todas las dependencias incluidas
