# 🚀 MODITEX POS — Deploy Gratuito en Vercel
# Funciona desde cualquier dispositivo, celular, otra PC

## ═══════════════════════════════════════════════
## PASO 1 — Instalar Git (si no lo tienes)
## ═══════════════════════════════════════════════
# Descargar desde: https://git-scm.com/download/win
# Instalar con opciones por defecto


## ═══════════════════════════════════════════════
## PASO 2 — Subir el proyecto a GitHub (GRATIS)
## ═══════════════════════════════════════════════

# 1. Crear cuenta en https://github.com (si no tienes)

# 2. Crear repositorio nuevo en GitHub:
#    - Ve a github.com → botón verde "New"
#    - Nombre: moditex-pos
#    - Privado (recomendado)
#    - NO inicializar con README
#    - Clic en "Create repository"

# 3. En la carpeta de tu proyecto (donde está package.json), 
#    abre una terminal (click derecho → "Git Bash Here" o "Terminal") y ejecuta:

git init
git add .
git commit -m "MODITEX POS v9"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/moditex-pos.git
git push -u origin main

# ⚠️ IMPORTANTE: Reemplaza TU_USUARIO con tu usuario de GitHub


## ═══════════════════════════════════════════════
## PASO 3 — Deploy en Vercel (GRATIS, sin tarjeta)
## ═══════════════════════════════════════════════

# 1. Ir a https://vercel.com
# 2. Clic en "Start Deploying" → "Continue with GitHub"
# 3. Autorizar Vercel a acceder a GitHub
# 4. Clic en "Add New Project"
# 5. Buscar "moditex-pos" → clic en "Import"
# 6. Framework: Next.js (se detecta automático)
# 7. ❌ NO hacer deploy aún — primero agregar variables de entorno


## ═══════════════════════════════════════════════
## PASO 4 — Variables de Entorno en Vercel
## ═══════════════════════════════════════════════

# En la pantalla de configuración, sección "Environment Variables":
# Agregar EXACTAMENTE estas 3 variables:

# Variable 1:
Name:  NEXT_PUBLIC_SUPABASE_URL
Value: https://byoweugcuoeowkfwcnwo.supabase.co

# Variable 2:
Name:  NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: (tu anon key de Supabase → Settings → API → anon public)

# Variable 3:
Name:  SUPABASE_SERVICE_KEY
Value: (tu service_role key → Settings → API → service_role secret)

# ⚠️ Para obtener las keys:
# Supabase → tu proyecto → Settings (engranaje) → API
# Copiar "anon public" y "service_role"


## ═══════════════════════════════════════════════
## PASO 5 — Deploy
## ═══════════════════════════════════════════════

# Clic en "Deploy"
# Esperar ~2 minutos
# Vercel te da una URL como: https://moditex-pos.vercel.app

# ✅ Ya puedes abrir desde el teléfono, otra PC, donde sea


## ═══════════════════════════════════════════════
## PASO 6 — Dominio personalizado (opcional, gratis)
## ═══════════════════════════════════════════════

# En Vercel → tu proyecto → Settings → Domains
# Puedes agregar un dominio propio si tienes uno
# O usar la URL de Vercel directamente (gratis para siempre)


## ═══════════════════════════════════════════════
## ACTUALIZACIONES FUTURAS
## ═══════════════════════════════════════════════

# Cada vez que hagas cambios, solo ejecutar:
git add .
git commit -m "descripción del cambio"
git push

# Vercel re-despliega automáticamente en ~1 minuto ✅


## ═══════════════════════════════════════════════
## ARCHIVO .env.local PARA DESARROLLO LOCAL
## ═══════════════════════════════════════════════

# Crea un archivo llamado ".env.local" en la raíz del proyecto:
# (ya está incluido como ejemplo en .env.example)

NEXT_PUBLIC_SUPABASE_URL=https://byoweugcuoeowkfwcnwo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_KEY_AQUI
SUPABASE_SERVICE_KEY=TU_SERVICE_ROLE_KEY_AQUI
