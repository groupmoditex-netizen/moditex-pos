// hashpins.js — ejecutar con: node hashpins.js
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  'https://byoweugcuoeowkfwcnwo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5b3dldWdjdW9lb3drZndjbndvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzMyMTQ0OSwiZXhwIjoyMDg4ODk3NDQ5fQ.TKv39hLFJGbIrBbs5B-QG01SbdxQzDtI2OihQyAzq08' // ← reemplaza con tu service_role key
);

async function hashearPins() {
  // 1. Obtener todos los usuarios con PIN en texto plano
  const { data: usuarios, error } = await supabase
    .from('usuarios')
    .select('email, pin')
    .not('pin', 'like', '$2%');

  if (error) { console.error('Error:', error); return; }
  console.log(`Encontrados ${usuarios.length} usuarios con PIN sin hashear`);

  // 2. Hashear y actualizar cada uno
  for (const u of usuarios) {
    if (!u.pin) { console.log(`⚠ ${u.email}: PIN vacío, saltando`); continue; }
    const hash = await bcrypt.hash(u.pin, 10);
    const { error: errUpdate } = await supabase
      .from('usuarios')
      .update({ pin: hash })
      .eq('email', u.email);
    if (errUpdate) {
      console.log(`✗ ${u.email}: ${errUpdate.message}`);
    } else {
      console.log(`✓ ${u.email}: hasheado correctamente`);
    }
  }
  console.log('\n✅ Listo. Prueba el login ahora.');
}

hashearPins();
