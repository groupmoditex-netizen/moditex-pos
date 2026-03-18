# 🚀 MODITEX POS — Deploy con CMD (sin GitHub)
# Solo necesitas Node.js instalado (ya lo tienes si corre npm run dev)

## ══════════════════════════════════════════
## PASO 1 — Instalar Vercel CLI
## ══════════════════════════════════════════

npm install -g vercel


## ══════════════════════════════════════════
## PASO 2 — Ir a la carpeta del proyecto
## ══════════════════════════════════════════

cd C:\ruta\a\tu\proyecto\moditex-pos
# Ejemplo: cd C:\Users\TuNombre\Desktop\moditex-pos


## ══════════════════════════════════════════
## PASO 3 — Login en Vercel (solo la primera vez)
## ══════════════════════════════════════════

vercel login
# Te pregunta el email → escríbelo
# Te manda un link al correo → haz clic → listo


## ══════════════════════════════════════════
## PASO 4 — Crear archivo de variables de entorno
## ══════════════════════════════════════════
# Crea el archivo .env.local en la carpeta del proyecto con este contenido:
# (cámbialo con tus keys reales de Supabase → Settings → API)

NEXT_PUBLIC_SUPABASE_URL=https://byoweugcuoeowkfwcnwo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_KEY_AQUI
SUPABASE_SERVICE_KEY=TU_SERVICE_ROLE_KEY_AQUI


## ══════════════════════════════════════════
## PASO 5 — Subir a Vercel (primer deploy)
## ══════════════════════════════════════════

vercel --prod

# Te hace estas preguntas — responde así:
# Set up and deploy? → Y (Enter)
# Which scope? → tu cuenta (Enter)
# Link to existing project? → N (Enter)
# Project name? → moditex-pos (Enter)
# In which directory? → ./ (Enter, dejar en blanco)
# Want to override settings? → N (Enter)

# ✅ En ~2 minutos te da la URL:
# https://moditex-pos.vercel.app  (o similar)


## ══════════════════════════════════════════
## PASO 6 — Agregar variables de entorno en Vercel
## ══════════════════════════════════════════
# Ejecutar estos 3 comandos UNA SOLA VEZ:

vercel env add NEXT_PUBLIC_SUPABASE_URL
# Pega el valor: https://byoweugcuoeowkfwcnwo.supabase.co
# Environment: Production (Enter)

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# Pega tu anon key
# Environment: Production (Enter)

vercel env add SUPABASE_SERVICE_KEY
# Pega tu service_role key
# Environment: Production (Enter)


## ══════════════════════════════════════════
## PASO 7 — Re-deploy con las variables activas
## ══════════════════════════════════════════

vercel --prod

# ✅ Listo. Ya puedes abrir desde el teléfono o cualquier PC.


## ══════════════════════════════════════════
## ACTUALIZACIONES FUTURAS (cuando hagas cambios)
## Solo 1 comando:
## ══════════════════════════════════════════

vercel --prod
