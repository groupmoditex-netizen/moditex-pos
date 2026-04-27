const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  'https://byoweugcuoeowkfwcnwo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5b3dldWdjdW9lb3drZndjbndvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzMyMTQ0OSwiZXhwIjoyMDg4ODk3NDQ5fQ.TKv39hLFJGbIrBbs5B-QG01SbdxQzDtI2OihQyAzq08'
);

async function crearUsuario() {
  const nuevoUsuario = {
    email:    'kike2',       // ← nombre de usuario para el login
    nombre:   'Enrique',     // ← nombre visible
    rol:      'admin',       // ← admin | vendedor | viewer
    pin:      '1234',        // ← PIN que quieras usar
    activo:   true,
  };

  const hash = await bcrypt.hash(nuevoUsuario.pin, 10);

  const { error } = await supabase.from('usuarios').insert({
    email:  nuevoUsuario.email,
    nombre: nuevoUsuario.nombre,
    rol:    nuevoUsuario.rol,
    pin:    hash,
    activo: nuevoUsuario.activo,
  });

  if (error) {
    console.error('✗ Error:', error.message);
  } else {
    console.log(`✅ Usuario '${nuevoUsuario.email}' creado con PIN '${nuevoUsuario.pin}'`);
  }
}

crearUsuario();
