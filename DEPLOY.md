# 🚀 MODITEX POS — Guía de Deploy en Vercel (GRATIS)

## Resultado final
Tu app estará disponible en:
  https://moditex-pos.vercel.app  (o el nombre que elijas)

Accesible desde cualquier dispositivo: celular, tablet, otra PC.

---

## PASO 1 — Subir el código a GitHub

### 1a. Crear cuenta en GitHub (si no tienes)
→ https://github.com/signup

### 1b. Crear repositorio nuevo
→ https://github.com/new
- Nombre: `moditex-pos`
- Privado ✓ (recomendado, para que nadie vea tu código)
- NO inicialices con README

### 1c. Subir tu proyecto desde la carpeta `moditex/`

Abre la terminal (cmd o PowerShell) en la carpeta del proyecto:

```bash
cd ruta/a/tu/carpeta/moditex

git init
git add .
git commit -m "MODITEX POS inicial"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/moditex-pos.git
git push -u origin main
```

---

## PASO 2 — Crear cuenta en Vercel

→ https://vercel.com/signup
- Regístrate con tu cuenta de GitHub (es lo más fácil)
- Plan gratuito (Hobby) es suficiente

---

## PASO 3 — Importar el proyecto en Vercel

1. Ve a https://vercel.com/new
2. Haz clic en **"Import Git Repository"**
3. Selecciona `moditex-pos`
4. Vercel detectará automáticamente que es Next.js ✓

---

## PASO 4 — Agregar variables de entorno (CRÍTICO)

Antes de hacer Deploy, expande **"Environment Variables"** y agrega:

| Nombre                          | Valor                                              |
|---------------------------------|----------------------------------------------------|
| NEXT_PUBLIC_SUPABASE_URL        | https://byoweugcuoeowkfwcnwo.supabase.co           |
| NEXT_PUBLIC_SUPABASE_ANON_KEY   | (tu anon key de Supabase → Settings → API)         |
| SUPABASE_SERVICE_KEY            | (tu service role key de Supabase → Settings → API) |

Para obtener las keys:
→ Supabase → Tu proyecto → Settings → API → "Project API keys"

---

## PASO 5 — Deploy

Haz clic en **"Deploy"**

Vercel tardará ~2 minutos en construir. Cuando termine verás:
✅ "Congratulations! Your project is now live."

Tu URL será algo como: `https://moditex-pos-usuario.vercel.app`

---

## PASO 6 — Actualizar en el futuro

Cada vez que hagas cambios en tu código:

```bash
git add .
git commit -m "descripción del cambio"
git push
```

Vercel detecta el push y hace re-deploy automáticamente en ~1 min.

---

## Dominio personalizado (opcional, gratis con Freenom)

Si quieres `moditex.tudominio.com`:
1. Vercel → Tu proyecto → Settings → Domains
2. Agrega tu dominio
3. Sigue las instrucciones para apuntar el DNS

---

## Solución a problemas comunes

**Error: "Module not found"**
→ Asegúrate de haber subido todos los archivos (`git add .`)

**Error: "Environment variable not found"**
→ Verifica que las 3 variables estén en Vercel → Settings → Environment Variables

**La app carga pero no trae datos**
→ Ve a Vercel → Tu proyecto → Functions → Ver logs del error
→ Probablemente falta la ANON_KEY o está mal copiada

---

## Acceso desde el celular

Una vez desplegado:
1. Abre Chrome/Safari en tu celular
2. Ve a `https://tu-proyecto.vercel.app`
3. Toca el menú ⋮ → "Agregar a pantalla de inicio"
4. Se instalará como app nativa 📱
