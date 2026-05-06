'use client';
import { useState, useEffect } from 'react';
import Shell from '@/components/Shell';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';

const ROLES = [
  {id:'admin',    label:'Administrador', desc:'Acceso total al sistema',           color:'var(--red)'},
  {id:'vendedor', label:'Vendedor',      desc:'Ventas, comandas, historial',        color:'var(--blue)'},
  {id:'viewer',   label:'Solo Vista',    desc:'Ver dashboard e inventario',         color:'var(--green)'},
];

const inp={width:'100%',padding:'9px 11px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'12px',outline:'none',boxSizing:'border-box'};
const lbl={fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.16em',textTransform:'uppercase',color:'#555',display:'block',marginBottom:'4px'};

function generarUsername(nombre) {
  return nombre.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,'_');
}

function ModalUsuario({ modo, usuario_edit, onClose, onSave, usuarioActual }) {
  const esEditar = modo === 'editar';
  const [nombre,   setNombre]  = useState(esEditar ? (usuario_edit.nombre||'') : '');
  const [username, setUsername]= useState(esEditar ? usuario_edit.email : '');
  const [pin,      setPin]     = useState('');
  const [rol,      setRol]     = useState(esEditar ? usuario_edit.rol : 'vendedor');
  const [activo,   setActivo]  = useState(esEditar ? usuario_edit.activo : true);
  const [avatar,   setAvatar]  = useState(esEditar ? (usuario_edit.avatar || '1') : '1');
  const [autoUser, setAutoUser]= useState(!esEditar);
  const [saving,   setSaving]  = useState(false);
  const [err,      setErr]     = useState('');

  function handleNombre(v) {
    setNombre(v);
    if (autoUser && !esEditar) setUsername(generarUsername(v));
  }

  async function guardar() {
    if (!username.trim()) { setErr('Usuario requerido'); return; }
    if (!esEditar && !pin)  { setErr('PIN requerido'); return; }
    if (pin && pin.length < 4) { setErr('El PIN debe tener al menos 4 dígitos'); return; }
    setSaving(true); setErr('');
    try {
      let res;
      if (esEditar) {
        res = await fetch('/api/usuarios', {
          method:'PUT', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            email: usuario_edit.email,
            nombre, nuevo_username: username !== usuario_edit.email ? username : undefined,
            rol, pin: pin||undefined, activo, avatar,
          }),
        }).then(r=>r.json());
      } else {
        res = await fetch('/api/usuarios', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ nombre, username, rol, pin, activo, avatar }),
        }).then(r=>r.json());
      }
      if (res.ok) onSave(esEditar ? '✓ Usuario actualizado' : '✓ Usuario creado');
      else setErr(res.error||'Error');
    } catch(e){ setErr('Error de conexión'); }
    setSaving(false);
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:'var(--bg)',border:'1px solid var(--border-strong)',width:'100%',maxWidth:'500px',borderTop:`2px solid ${esEditar?'var(--blue)':'var(--ink)'}`}}>
        <div style={{padding:'15px 20px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontFamily:'Playfair Display,serif',fontSize:'16px',fontWeight:700}}>
            {esEditar ? `✏️ Editar: ${usuario_edit.nombre||usuario_edit.email}` : '+ Nuevo Usuario'}
          </div>
          <button onClick={onClose} style={{background:'none',border:'1px solid var(--border)',width:'26px',height:'26px',cursor:'pointer',fontSize:'12px',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>
        <div style={{padding:'18px 20px',display:'flex',flexDirection:'column',gap:'12px'}}>
          {err&&<div style={{padding:'8px 12px',background:'var(--red-soft)',color:'var(--red)',fontFamily:'DM Mono,monospace',fontSize:'10px'}}>{err}</div>}

          {/* Nombre */}
          <div>
            <label style={lbl}>Nombre del operador *</label>
            <input value={nombre} onChange={e=>handleNombre(e.target.value)} placeholder="Ej: María García" style={inp}/>
          </div>

          {/* Username */}
          <div>
            <label style={lbl}>Usuario de acceso * {!esEditar&&<span style={{color:'var(--blue)'}}>(auto-generado)</span>}</label>
            <div style={{display:'flex',gap:'6px'}}>
              <input value={username} onChange={e=>{setUsername(e.target.value.toLowerCase().replace(/\s/g,'_'));setAutoUser(false);}}
                placeholder="ej: maria_garcia" style={{...inp,flex:1,fontFamily:'DM Mono,monospace',fontSize:'12px',letterSpacing:'.05em'}}/>
              {!esEditar&&<button onClick={()=>{setAutoUser(true);setUsername(generarUsername(nombre));}}
                style={{padding:'0 10px',background:'var(--bg3)',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#555',flexShrink:0,whiteSpace:'nowrap'}}>↺ Auto</button>}
            </div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#888',marginTop:'4px'}}>
              Este es el nombre con el que el operador inicia sesión
            </div>
          </div>

          {/* PIN */}
          <div>
            <label style={lbl}>PIN de acceso {esEditar?'(dejar vacío para no cambiar)':'*'} (4–6 dígitos)</label>
            <input type="password" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,''))}
              placeholder={esEditar?'Nueva contraseña (opcional)':'••••••'} maxLength={6}
              style={{...inp,letterSpacing:'.2em',textAlign:'center',fontSize:'20px'}}/>
          </div>

          {/* Activo toggle */}
          <div onClick={()=>setActivo(a=>!a)}
            style={{display:'flex',alignItems:'center',gap:'10px',padding:'9px 11px',background:'var(--bg2)',border:'1px solid var(--border)',cursor:'pointer'}}>
            <div style={{width:'34px',height:'20px',background:activo?'var(--green)':'#ccc',borderRadius:'10px',position:'relative',transition:'background .2s',flexShrink:0}}>
              <div style={{width:'14px',height:'14px',background:'#fff',borderRadius:'50%',position:'absolute',top:'3px',left:activo?'17px':'3px',transition:'left .2s'}}/>
            </div>
            <span style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:activo?'var(--green)':'#888'}}>{activo?'✓ Activo':'✗ Inactivo'}</span>
          </div>

          {/* Avatar Selector */}
          <div>
            <label style={lbl}>Avatar del Operador</label>
            <div style={{display:'flex',gap:'8px',overflowX:'auto',paddingBottom:'8px'}}>
              {Array.from({length:18}).map((_,i)=>{
                const num = (i+1).toString();
                const sel = avatar === num;
                return (
                  <img key={num} src={`https://byoweugcuoeowkfwcnwo.supabase.co/storage/v1/object/public/avatars/${num}.png`}
                    onClick={()=>setAvatar(num)} alt={`Avatar ${num}`}
                    style={{width:'40px',height:'40px',borderRadius:'50%',objectFit:'cover',cursor:'pointer',border:`2px solid ${sel?'var(--ink)':'transparent'}`,opacity:sel?1:0.5,transition:'all .2s',flexShrink:0}}/>
                );
              })}
            </div>
          </div>

          {/* Rol */}
          <div>
            <label style={lbl}>Rol / Permisos *</label>
            <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
              {ROLES.map(r=>(
                <div key={r.id} onClick={()=>setRol(r.id)}
                  style={{padding:'9px 13px',background:rol===r.id?'var(--bg3)':'var(--bg2)',border:`1px solid ${rol===r.id?r.color:'var(--border)'}`,cursor:'pointer',display:'flex',alignItems:'center',gap:'10px',transition:'all .13s'}}>
                  <div style={{width:'9px',height:'9px',borderRadius:'50%',background:rol===r.id?r.color:'var(--border)',flexShrink:0}}/>
                  <div>
                    <div style={{fontSize:'12px',fontWeight:600,color:rol===r.id?r.color:'#333'}}>{r.label}</div>
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#666'}}>{r.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{padding:'12px 20px',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'flex-end',gap:'8px',background:'var(--bg2)'}}>
          <button onClick={onClose} style={{padding:'8px 15px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600,textTransform:'uppercase'}}>Cancelar</button>
          <button onClick={guardar} disabled={saving} style={{padding:'8px 18px',background:esEditar?'var(--blue)':'var(--ink)',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:700,textTransform:'uppercase',opacity:saving?.6:1}}>
            {saving?'⏳ Guardando...':(esEditar?'✓ Guardar Cambios':'✓ Crear Usuario')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsuariosPage() {
  const { usuario } = useAuth()||{};
  const router = useRouter();
  const [usuarios,  setUsuarios]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null); // null | 'nuevo' | {modo:'editar', user}
  const [ok,        setOk]        = useState('');

  useEffect(()=>{
    if(usuario?.rol !== 'admin') { router.replace('/dashboard'); return; }
    cargar();
  },[usuario]);

  async function cargar(){
    setLoading(true);
    const res=await fetch('/api/usuarios').then(r=>r.json()).catch(()=>({ok:false}));
    if(res.ok) setUsuarios(res.usuarios||[]);
    setLoading(false);
  }

  function onSave(msg){ setOk(msg); setModal(null); cargar(); setTimeout(()=>setOk(''),3000); }

  async function toggleActivo(email, activo){
    await fetch('/api/usuarios',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,activo:!activo})});
    cargar();
  }

  const rolColor = {admin:'var(--red)',vendedor:'var(--blue)',viewer:'var(--green)'};
  const rolLabel = {admin:'Admin',vendedor:'Vendedor',viewer:'Solo Vista'};

  return (
    <Shell title="Gestión de Usuarios">
      {modal==='nuevo' && <ModalUsuario modo="crear" onClose={()=>setModal(null)} onSave={onSave} usuarioActual={usuario}/>}
      {modal?.modo==='editar' && <ModalUsuario modo="editar" usuario_edit={modal.user} onClose={()=>setModal(null)} onSave={onSave} usuarioActual={usuario}/>}

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px',flexWrap:'wrap',gap:'15px'}}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
            <div style={{fontFamily:'Poppins,sans-serif',fontSize:'16px',fontWeight:800, textTransform: 'uppercase', letterSpacing: '.05em'}}>Equipo de Trabajo</div>
            <span style={{fontSize:'10px', color:'var(--blue)', background: 'rgba(59,130,246,0.1)', padding: '2px 10px', borderRadius: '12px', fontWeight: 800}}>● {usuarios.length} OPERADORES</span>
          </div>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#888'}}>Control de accesos y permisos por rol · Moditex Security</div>
        </div>
        <button onClick={()=>setModal('nuevo')} style={{padding:'12px 24px',background:'var(--ink)',color:'#fff',border:'none',cursor:'pointer',fontSize:'12px',fontWeight:800,textTransform:'uppercase', borderRadius: '16px', fontFamily: 'Poppins, sans-serif', boxShadow: '0 4px 15px rgba(0,0,0,0.1)'}}>
          + NUEVO USUARIO
        </button>
      </div>

      {ok&&<div style={{padding:'12px 18px',marginBottom:'20px',background:'var(--green-soft)',color:'var(--green)',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:700, borderRadius:'16px', border:'1px solid rgba(26,122,60,.2)', animation:'fadeIn 0.3s ease-out'}}>{ok}</div>}

      {/* Roles info */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:'16px',marginBottom:'30px'}}>
        {ROLES.map(r=>(
          <div key={r.id} style={{padding:'16px 20px',background:'#fff',border:`1px solid var(--border)`, borderTop:`4px solid ${r.color}`, borderRadius:'20px', boxShadow:'0 4px 12px rgba(0,0,0,0.03)'}}>
            <div style={{fontFamily:'Poppins,sans-serif',fontSize:'11px',color:r.color,fontWeight:900,letterSpacing:'.1em',textTransform:'uppercase',marginBottom:'6px'}}>{r.label}</div>
            <div style={{fontSize:'12px',color:'#666', lineHeight:1.4}}>{r.desc}</div>
          </div>
        ))}
      </div>

      {loading?(
        <div style={{textAlign:'center',padding:'80px',fontFamily:'Poppins,sans-serif',fontSize:'14px',color:'#aaa', fontWeight:600}}>
          <div style={{fontSize:'24px', marginBottom:'10px'}}>⏳</div>
          Preparando entorno...
        </div>
      ):(
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:'20px', marginBottom:'40px'}}>
          {usuarios.map(u=>(
            <div key={u.email} style={{
              background:'#fff', 
              borderRadius:'24px', 
              border:'1px solid var(--border)', 
              padding:'24px',
              display:'flex',
              flexDirection:'column',
              alignItems:'center',
              textAlign:'center',
              position:'relative',
              boxShadow:'0 8px 24px rgba(0,0,0,0.04)',
              transition:'transform 0.2s, box-shadow 0.2s',
              cursor:'default'
            }} className="user-card-premium">
              
              <div style={{position:'absolute', top:'15px', right:'15px'}}>
                <span style={{
                  background: u.activo ? (
                    (u.ultimo_acceso && (Date.now() - new Date(u.ultimo_acceso).getTime() < 15 * 60 * 1000)) 
                    ? 'rgba(34,197,94,0.2)' 
                    : 'rgba(59,130,246,0.1)'
                  ) : 'rgba(239,68,68,0.1)',
                  color: u.activo ? (
                    (u.ultimo_acceso && (Date.now() - new Date(u.ultimo_acceso).getTime() < 15 * 60 * 1000)) 
                    ? '#16a34a' 
                    : 'var(--blue)'
                  ) : 'var(--red)',
                  fontSize: '8px',
                  fontWeight: 900,
                  padding: '3px 10px',
                  borderRadius: '10px',
                  textTransform: 'uppercase',
                  letterSpacing: '.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {u.activo ? (
                    (u.ultimo_acceso && (Date.now() - new Date(u.ultimo_acceso).getTime() < 15 * 60 * 1000)) 
                    ? <><span style={{width:'4px', height:'4px', borderRadius:'50%', background:'#16a34a'}}/> EN LÍNEA</> 
                    : 'ACTIVO'
                  ) : 'DESACTIVADO'}
                </span>
              </div>

              <div style={{width:'84px', height:'84px', borderRadius:'50%', border:`4px solid ${rolColor[u.rol] || '#eee'}`, padding:'3px', marginBottom:'16px', background: '#fff'}}>
                <img 
                  src={`https://byoweugcuoeowkfwcnwo.supabase.co/storage/v1/object/public/avatars/${u.avatar||'1'}.png`} 
                  alt="avatar" 
                  style={{width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover'}}
                />
              </div>

              <div style={{marginBottom:'16px'}}>
                <div style={{fontFamily:'Poppins,sans-serif', fontSize:'18px', fontWeight:900, color:'var(--ink)', lineHeight:1.2}}>{u.nombre||u.email}</div>
                <div style={{fontFamily:'DM Mono,monospace', fontSize:'11px', color:'var(--blue)', fontWeight:700, marginTop:'4px'}}>@{u.email}</div>
              </div>

              <div style={{display:'flex', justifyContent:'center', gap:'8px', marginBottom:'20px'}}>
                <span style={{
                  background: 'var(--bg3)', 
                  color: rolColor[u.rol]||'#333', 
                  fontFamily: 'Poppins,sans-serif', 
                  fontSize: '10px', 
                  padding: '4px 12px', 
                  fontWeight: 800, 
                  borderRadius: '12px',
                  textTransform: 'uppercase'
                }}>
                  {rolLabel[u.rol]||u.rol}
                </span>
              </div>

              <div style={{width:'100%', borderTop:'1px solid var(--border-soft)', paddingTop:'16px', marginBottom:'20px'}}>
                <div style={{fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#aaa', textTransform:'uppercase', letterSpacing:'.05em', marginBottom:'4px'}}>Último Acceso</div>
                <div style={{fontFamily:'DM Mono,monospace', fontSize:'11px', color:'#555', fontWeight:700}}>
                  {u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString('es-VE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit', hour12:true}) : 'Nunca'}
                </div>
              </div>

              <div style={{display:'flex', gap:'8px', width:'100%'}}>
                <button 
                  onClick={()=>setModal({modo:'editar',user:u})}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'var(--ink)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '14px',
                    fontFamily: 'Poppins,sans-serif',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}>
                  EDITAR
                </button>
                {u.email !== usuario?.email && (
                  <button 
                    onClick={()=>toggleActivo(u.email,u.activo)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: 'none',
                      border: `1px solid ${u.activo ? 'var(--red)' : 'var(--green)'}`,
                      color: u.activo ? 'var(--red)' : 'var(--green)',
                      borderRadius: '14px',
                      fontFamily: 'Poppins,sans-serif',
                      fontSize: '10px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}>
                    {u.activo ? 'DESACTIVAR' : 'ACTIVAR'}
                  </button>
                )}
              </div>
            </div>
          ))}
          {!usuarios.length && (
            <div style={{gridColumn:'1/-1', textAlign:'center', padding:'60px', background:'#fff', borderRadius:'24px', border:'1px dashed var(--border)'}}>
              <div style={{fontSize:'32px', marginBottom:'15px'}}>👥</div>
              <div style={{fontFamily:'Poppins,sans-serif', fontSize:'14px', color:'#999', fontWeight:600}}>Aún no hay operadores registrados en el sistema</div>
            </div>
          )}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .user-card-premium:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 30px rgba(0,0,0,0.08);
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      ` }} />
    </Shell>
  );
}