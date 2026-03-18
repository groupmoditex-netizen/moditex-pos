'use client';
import { useState, useMemo } from 'react';
import Shell from '@/components/Shell';
import { useAppData } from '@/lib/AppContext';

function fmtF(d){if(!d)return '—';const p=d.split('-');return(p[2]||'')+'/'+(p[1]||'')+'/'+(p[0]||'');}

// ── Modal Agregar/Editar cliente ───────────────────────────────────────────
function ModalCliente({ cli, onClose, onSave }) {
  const esNuevo = !cli;
  const [form, setForm] = useState(cli ? {
    nombre:cli.nombre||'', cedula:cli.cedula||'', telefono:cli.telefono||'',
    email:cli.email||'', ciudad:cli.ciudad||'',
  } : { nombre:'', cedula:'', telefono:'', email:'', ciudad:'' });
  const [guardando, setGuardando] = useState(false);
  const [err, setErr] = useState('');

  async function guardar() {
    if (!form.nombre.trim()) { setErr('El nombre es requerido'); return; }
    if (!form.cedula.trim()) { setErr('La cédula es requerida'); return; }
    setGuardando(true);
    try {
      const url    = esNuevo ? '/api/clientes' : `/api/clientes/${cli.id}`;
      const method = esNuevo ? 'POST' : 'PUT';
      const res    = await fetch(url, {
        method, headers:{'Content-Type':'application/json'},
        body: JSON.stringify(esNuevo ? form : { ...form, id: cli.id }),
      }).then(r=>r.json());
      if (res.ok) onSave();
      else setErr(res.error || 'Error al guardar');
    } catch(e) { setErr('Error de conexión'); }
    setGuardando(false);
  }

  const inp = { width:'100%',padding:'9px 11px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'12px',outline:'none' };
  const lbl = { fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.16em',textTransform:'uppercase',color:'#555',display:'block',marginBottom:'4px' };

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{background:'var(--bg)',border:'1px solid var(--border-strong)',width:'100%',maxWidth:'480px',borderTop:'2px solid var(--red)'}}>
        <div style={{padding:'18px 22px 14px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontFamily:'Playfair Display,serif',fontSize:'16px',fontWeight:700}}>{esNuevo?'Nuevo Cliente':'Editar Cliente'}</div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#555',marginTop:'2px'}}>{esNuevo?'Registro para seguimiento de pedidos':'Modifica los datos del cliente'}</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'1px solid var(--border)',width:'26px',height:'26px',cursor:'pointer',fontSize:'12px',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>
        <div style={{padding:'20px 22px',display:'flex',flexDirection:'column',gap:'13px'}}>
          {err && <div style={{padding:'9px 12px',background:'var(--red-soft)',color:'var(--red)',fontFamily:'DM Mono,monospace',fontSize:'10px',border:'1px solid rgba(217,30,30,.2)'}}>{err}</div>}
          <div style={{display:'grid',gridTemplateColumns:'1fr',gap:'12px'}}>
            <div><label style={lbl}>Nombre completo *</label><input style={inp} value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} placeholder="Nombre del cliente" /></div>
            <div><label style={lbl}>Cédula *</label><input style={inp} value={form.cedula} onChange={e=>setForm(f=>({...f,cedula:e.target.value}))} placeholder="V-12345678" /></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
              <div><label style={lbl}>Teléfono</label><input style={inp} value={form.telefono} onChange={e=>setForm(f=>({...f,telefono:e.target.value}))} placeholder="+58 412..." /></div>
              <div><label style={lbl}>Ciudad</label><input style={inp} value={form.ciudad} onChange={e=>setForm(f=>({...f,ciudad:e.target.value}))} placeholder="Caracas..." /></div>
            </div>
            <div><label style={lbl}>Email</label><input style={inp} type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="correo@ejemplo.com" /></div>
          </div>
        </div>
        <div style={{padding:'13px 22px',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'flex-end',gap:'9px',background:'var(--bg2)'}}>
          <button onClick={onClose} style={{padding:'8px 16px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase'}}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} style={{padding:'8px 18px',background:'var(--red)',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase',opacity:guardando?.6:1}}>
            {guardando?'⏳ Guardando...':'✓ '+(esNuevo?'Registrar':'Guardar Cambios')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Detalle del cliente ────────────────────────────────────────────────────
function DetalleCliente({ cli, movimientos, productos, onVolver, onEditar }) {
  const pedidos = movimientos.filter(m=>m.tipo==='SALIDA'&&(m.clienteId===cli.id||m.contacto===cli.nombre));
  const ini = cli.nombre.split(' ').map(w=>w[0]||'').join('').toUpperCase().slice(0,2);

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'18px'}}>
        <button onClick={onVolver} style={{padding:'6px 13px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600,letterSpacing:'.05em',textTransform:'uppercase'}}>← Volver</button>
        <span style={{fontFamily:'Playfair Display,serif',fontSize:'17px',fontWeight:700}}>{cli.nombre}</span>
        <button onClick={onEditar} style={{marginLeft:'auto',padding:'6px 13px',background:'none',border:'1px solid var(--blue)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600,letterSpacing:'.05em',textTransform:'uppercase',color:'var(--blue)'}}>✏️ Editar</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'280px 1fr',gap:'16px'}}>
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',padding:'18px'}}>
          <div style={{width:'50px',height:'50px',borderRadius:'50%',background:'var(--bg3)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700,marginBottom:'12px'}}>{ini}</div>
          <div style={{fontFamily:'Playfair Display,serif',fontSize:'16px',fontWeight:700,marginBottom:'3px'}}>{cli.nombre}</div>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'var(--blue)',marginBottom:'14px'}}>{cli.id}</div>
          {[['Cédula',cli.cedula],['Teléfono',cli.telefono],['Email',cli.email],['Ciudad',cli.ciudad],['Registrado',fmtF(cli.fecha_registro)]].map(([l,v])=>(
            <div key={l} style={{marginBottom:'10px'}}>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#555',letterSpacing:'.14em',textTransform:'uppercase',marginBottom:'2px'}}>{l}</div>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'12px',color:'#333'}}>{v||'—'}</div>
            </div>
          ))}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginTop:'14px',paddingTop:'14px',borderTop:'1px solid var(--border)',textAlign:'center'}}>
            <div>
              <div style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700,color:'var(--green)'}}>€ {(cli.totalGastado||0).toFixed(2)}</div>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#555',textTransform:'uppercase',letterSpacing:'.12em'}}>Total gastado</div>
            </div>
            <div>
              <div style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700,color:'var(--red)'}}>{pedidos.length}</div>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'8px',color:'#555',textTransform:'uppercase',letterSpacing:'.12em'}}>Pedidos</div>
            </div>
          </div>
        </div>
        <div style={{background:'var(--surface)',border:'1px solid var(--border)'}}>
          <div style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#666',letterSpacing:'.14em',textTransform:'uppercase'}}>Historial de Pedidos</div>
          {pedidos.length === 0
            ? <div style={{padding:'40px',textAlign:'center',color:'#666',fontFamily:'DM Mono,monospace',fontSize:'11px'}}>Sin pedidos registrados aún</div>
            : pedidos.map((m,i)=>{
              const p = productos.find(x=>x.sku===m.sku);
              return (
                <div key={i} style={{display:'flex',alignItems:'center',gap:'14px',padding:'12px 14px',borderBottom:'1px solid var(--border)'}}>
                  <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#666',width:'80px'}}>{m.id}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'12px',fontWeight:600}}>{p?`${p.modelo} — ${p.color}`:m.sku}</div>
                    <div style={{fontSize:'10px',color:'#666',fontFamily:'DM Mono,monospace',marginTop:'1px'}}>{fmtF(m.fecha)} {m.concepto&&`· ${m.concepto}`} {m.tipoVenta&&<span style={{background:m.tipoVenta==='MAYOR'?'var(--warn-soft)':'var(--blue-soft)',color:m.tipoVenta==='MAYOR'?'var(--warn)':'var(--blue)',padding:'1px 5px'}}>{m.tipoVenta}</span>}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontFamily:'DM Mono,monospace',fontSize:'12px',fontWeight:700,color:'var(--red)'}}>-{m.cantidad} uds</div>
                    {m.precioVenta>0&&<div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'var(--green)'}}>€ {(m.precioVenta*m.cantidad).toFixed(2)}</div>}
                  </div>
                </div>
              );
            })
          }
        </div>
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────
export default function ClientesPage() {
  const { data, cargando, recargar } = useAppData() || {};
  const [buscar, setBuscar] = useState('');
  const [detalle, setDetalle] = useState(null);
  const [modal, setModal]     = useState(null); // null | 'nuevo' | clienteObj

  const { clientes=[], movimientos=[], productos=[] } = data || {};

  const filtrados = useMemo(() =>
    clientes.filter(c => {
      const q = buscar.toLowerCase();
      return !q || `${c.nombre} ${c.cedula||''} ${c.telefono||''} ${c.id}`.toLowerCase().includes(q);
    }), [clientes, buscar]
  );

  function onSave() {
    setModal(null);
    setDetalle(null);
    recargar();
  }

  if (detalle) {
    const cli = clientes.find(c=>c.id===detalle);
    if (!cli) { setDetalle(null); return null; }
    return (
      <Shell title="Clientes">
        {modal && <ModalCliente cli={typeof modal==='object'?modal:null} onClose={()=>setModal(null)} onSave={onSave}/>}
        <DetalleCliente cli={cli} movimientos={movimientos} productos={productos} onVolver={()=>setDetalle(null)} onEditar={()=>setModal(cli)}/>
      </Shell>
    );
  }

  return (
    <Shell title="Clientes">
      {modal && <ModalCliente cli={typeof modal==='object'?modal:null} onClose={()=>setModal(null)} onSave={onSave}/>}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
        <div>
          <div style={{fontFamily:'Playfair Display,serif',fontSize:'16px',fontWeight:700}}>Clientes</div>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#555',marginTop:'2px'}}>Gestión de compradores mayoristas</div>
        </div>
        <button onClick={()=>setModal('nuevo')} style={{padding:'8px 16px',background:'var(--red)',color:'#fff',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase'}}>
          + Nuevo Cliente
        </button>
      </div>

      <div style={{display:'flex',alignItems:'center',gap:'8px',background:'var(--bg2)',border:'1px solid var(--border)',padding:'8px 12px',marginBottom:'16px'}}>
        <span style={{color:'#555'}}>🔍</span>
        <input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="Buscar por nombre, teléfono o ID..." style={{background:'none',border:'none',outline:'none',fontFamily:'Poppins,sans-serif',fontSize:'12px',color:'#111',width:'100%'}} />
      </div>

      {cargando && <div style={{textAlign:'center',padding:'40px',fontFamily:'DM Mono,monospace',fontSize:'12px',color:'#666'}}>⏳ Cargando...</div>}

      {!cargando && filtrados.length === 0 && (
        <div style={{textAlign:'center',padding:'60px',background:'var(--surface)',border:'1px solid var(--border)'}}>
          <div style={{fontSize:'32px',marginBottom:'10px'}}>👤</div>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#666'}}>{clientes.length===0?'Sin clientes registrados aún':'Sin resultados'}</div>
        </div>
      )}

      {!cargando && filtrados.map(c => {
        const ini = c.nombre.split(' ').map(w=>w[0]||'').join('').toUpperCase().slice(0,2);
        return (
          <div key={c.id} onClick={()=>setDetalle(c.id)}
            style={{display:'flex',alignItems:'center',gap:'16px',padding:'14px 16px',background:'var(--surface)',border:'1px solid var(--border)',cursor:'pointer',marginBottom:'8px',transition:'border-color .13s'}}
            onMouseEnter={e=>e.currentTarget.style.borderColor='var(--border-strong)'}
            onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
            <div style={{width:'42px',height:'42px',borderRadius:'50%',background:'var(--bg3)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Playfair Display,serif',fontSize:'15px',fontWeight:700,flexShrink:0}}>{ini}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:'13px',fontWeight:600,marginBottom:'2px'}}>{c.nombre}</div>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#666'}}>
                {c.cedula||'Sin cédula'} · {c.telefono||'Sin tel.'} · {c.ciudad||'Sin ciudad'}
              </div>
            </div>
            <div style={{textAlign:'right',flexShrink:0}}>
              <div style={{fontFamily:'Playfair Display,serif',fontSize:'18px',fontWeight:700,color:'var(--green)'}}>€ {(c.totalGastado||0).toFixed(2)}</div>
              <div style={{fontFamily:'DM Mono,monospace',fontSize:'9px',color:'#666'}}>{c.totalPedidos||0} pedido{c.totalPedidos!==1?'s':''}</div>
            </div>
          </div>
        );
      })}
    </Shell>
  );
}
