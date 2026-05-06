'use client';
import { useState, useMemo, useEffect } from 'react';
import Shell from '@/components/Shell';
import { useAppData } from '@/lib/AppContext';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
  const pedidos = movimientos.filter(m=>m.tipo==='SALIDA'&&(m.clienteId===cli.id||m.contacto===cli.nombre));
  const ini = cli.nombre.split(' ').map(w=>w[0]||'').join('').toUpperCase().slice(0,2);
  const [expandido, setExpandido] = useState(null);

  // Agrupar movimientos por Comanda
  const agrupados = useMemo(() => {
    const groups = {};
    pedidos.forEach(m => {
      const comandaId = m.comandaId || (m.concepto?.match(/CMD-[A-Z0-9-]+/i)?.[0]);
      const key = comandaId || `MOV-${m.fecha}-${m.id}`;
      if (!groups[key]) {
        groups[key] = {
          id: key,
          comandaId: comandaId,
          fecha: m.fecha,
          items: [],
          total: 0,
          cantidadTotal: 0,
          tipoVenta: m.tipoVenta
        };
      }
      groups[key].items.push(m);
      groups[key].total += (m.precioVenta || 0) * (m.cantidad || 0);
      groups[key].cantidadTotal += (m.cantidad || 0);
    });
    return Object.values(groups).sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
  }, [pedidos]);

  return (
    <div style={{animation:'fadeIn 0.3s ease-out'}}>
      <div style={{display:'flex',alignItems:'center',gap:'15px',marginBottom:'24px', flexWrap:'wrap'}}>
        <button onClick={onVolver} style={{padding:'10px 18px',background:'#fff',border:'1px solid var(--border)',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'12px',fontWeight:700, borderRadius:'16px', display:'flex', alignItems:'center', gap:'8px', boxShadow:'0 2px 8px rgba(0,0,0,0.03)'}}>
           <span style={{fontSize:'16px'}}>←</span> Volver al Directorio
        </button>
        <div style={{fontFamily:'Poppins,sans-serif',fontSize:'18px',fontWeight:900, color:'var(--ink)'}}>{cli.nombre}</div>
        <button onClick={onEditar} style={{marginLeft:'auto',padding:'10px 20px',background:'var(--blue)',border:'none',cursor:'pointer',fontFamily:'Poppins,sans-serif',fontSize:'11px',fontWeight:800,textTransform:'uppercase',color:'#fff', borderRadius:'16px', boxShadow:'0 4px 12px rgba(59,130,246,0.2)'}}>
           ✏️ EDITAR PERFIL
        </button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))',gap:'24px', alignItems:'start'}}>
        
        {/* Perfil del Cliente */}
        <div style={{background:'#fff', border:'1px solid var(--border)', borderRadius:'28px', padding:'30px', boxShadow:'0 8px 30px rgba(0,0,0,0.04)', textAlign:'center'}}>
          <div style={{width:'80px',height:'80px',borderRadius:'24px',background:'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Poppins,sans-serif',fontSize:'24px',fontWeight:900,color:'var(--ink)', margin:'0 auto 20px'}}>{ini}</div>
          
          <div style={{marginBottom:'24px'}}>
            <div style={{fontFamily:'Poppins,sans-serif',fontSize:'20px',fontWeight:900,color:'var(--ink)', marginBottom:'4px'}}>{cli.nombre}</div>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'var(--blue)', fontWeight:700, background:'rgba(59,130,246,0.08)', padding:'4px 12px', borderRadius:'10px', display:'inline-block'}}>ID: {cli.id.slice(0,12)}</div>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'30px'}}>
             <div style={{padding:'15px', background:'#f9fafb', borderRadius:'20px'}}>
                <div style={{fontFamily:'Poppins,sans-serif', fontSize:'22px', fontWeight:900, color:'var(--green)'}}>€ {(cli.totalGastado||0).toFixed(2)}</div>
                <div style={{fontFamily:'Poppins,sans-serif', fontSize:'8px', color:'#aaa', fontWeight:800, textTransform:'uppercase'}}>Total Gastado</div>
             </div>
             <div style={{padding:'15px', background:'#f9fafb', borderRadius:'20px'}}>
                <div style={{fontFamily:'Poppins,sans-serif', fontSize:'22px', fontWeight:900, color:'var(--red)'}}>{agrupados.length}</div>
                <div style={{fontFamily:'Poppins,sans-serif', fontSize:'8px', color:'#aaa', fontWeight:800, textTransform:'uppercase'}}>Ordenes</div>
             </div>
          </div>

          <div style={{textAlign:'left', display:'flex', flexDirection:'column', gap:'16px'}}>
            {[
              ['Cédula', cli.cedula || '—', '🆔'],
              ['Teléfono', cli.telefono || '—', '📞'],
              ['Email', cli.email || '—', '📧'],
              ['Ciudad', cli.ciudad || '—', '📍'],
              ['Registrado', fmtF(cli.fecha_registro) || '—', '📅']
            ].map(([l, v, ico]) => (
              <div key={l} style={{display:'flex', gap:'12px', alignItems:'center'}}>
                <span style={{fontSize:'16px', background:'#f3f4f6', width:'32px', height:'32px', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center'}}>{ico}</span>
                <div>
                  <div style={{fontFamily:'Poppins,sans-serif', fontSize:'8px', color:'#aaa', fontWeight:800, textTransform:'uppercase'}}>{l}</div>
                  <div style={{fontFamily:'Poppins,sans-serif', fontSize:'13px', color:'#333', fontWeight:600}}>{v}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Historial de Pedidos Agrupado */}
        <div style={{background:'#fff', border:'1px solid var(--border)', borderRadius:'28px', overflow:'hidden', boxShadow:'0 8px 30px rgba(0,0,0,0.04)'}}>
          <div style={{padding:'20px 24px', borderBottom:'1px solid var(--border)', background:'#fcfcfc', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div style={{fontFamily:'Poppins,sans-serif', fontSize:'12px', color:'var(--ink)', fontWeight:800, textTransform:'uppercase', letterSpacing:'.05em'}}>Historial de Compras</div>
            <span style={{fontSize:'10px', background:'var(--ink)', color:'#fff', padding:'2px 8px', borderRadius:'8px', fontWeight:800}}>{agrupados.length} PEDIDOS</span>
          </div>
          
          <div style={{maxHeight:'600px', overflowY:'auto'}}>
            {agrupados.length === 0
              ? <div style={{padding:'60px 40px',textAlign:'center'}}>
                  <div style={{fontSize:'40px', marginBottom:'15px'}}>🛒</div>
                  <div style={{fontFamily:'Poppins,sans-serif', fontSize:'14px', color:'#bbb', fontWeight:600}}>Este cliente aún no tiene pedidos registrados</div>
                </div>
              : agrupados.map((g,i)=>{
                const isExp = expandido === g.id;
                return (
                  <div key={g.id} style={{borderBottom:'1px solid var(--border-soft)', transition:'background 0.2s'}}>
                    <div 
                      onClick={() => setExpandido(isExp ? null : g.id)}
                      style={{display:'flex',alignItems:'center',gap:'16px',padding:'20px 24px', cursor: 'pointer', background: isExp ? '#f8fafc' : 'transparent'}} 
                      className="order-row-premium">
                      <div style={{width:'40px', height:'40px', borderRadius:'12px', background: g.comandaId ? 'rgba(59,130,246,0.1)' : '#f3f4f6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', flexShrink:0}}>
                        {g.comandaId ? '📋' : '📦'}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontFamily:'Poppins,sans-serif', fontSize:'14px', fontWeight:800, color:'var(--ink)'}}>
                          {g.comandaId || 'Venta Directa'}
                        </div>
                        <div style={{fontFamily:'DM Mono,monospace', fontSize:'11px', color:'#888', marginTop:'2px'}}>
                          {fmtF(g.fecha)} · {g.items.length} productos {g.tipoVenta && <span style={{background:g.tipoVenta==='MAYOR'?'#fef3c7':'#dbeafe', color:g.tipoVenta==='MAYOR'?'#92400e':'#1e40af', padding:'1px 6px', borderRadius:'4px', fontSize:'9px', fontWeight:900, marginLeft:'6px'}}>{g.tipoVenta}</span>}
                        </div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontFamily:'Poppins,sans-serif', fontSize:'16px', fontWeight:900, color:'var(--green)'}}>€ {g.total.toFixed(2)}</div>
                        <div style={{fontFamily:'Poppins,sans-serif', fontSize:'9px', fontWeight:800, color: isExp ? 'var(--blue)' : '#aaa', marginTop:'2px'}}>{isExp ? 'OCULTAR' : 'VER DETALLE'} {isExp ? '↑' : '↓'}</div>
                      </div>
                    </div>

                    {isExp && (
                      <div style={{background:'#fcfcfc', padding:'10px 24px 20px', borderTop:'1px dashed var(--border-soft)', animation:'fadeIn 0.2s'}}>
                         <div style={{display:'flex', flexDirection:'column', gap:'8px', marginBottom:'15px'}}>
                           {g.items.map((it, idx) => {
                             const p = productos.find(x=>x.sku===it.sku);
                             return (
                               <div key={idx} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f1f1f1'}}>
                                 <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                                   <div style={{width:'4px', height:'4px', borderRadius:'50%', background:'#ccc'}}/>
                                   <span style={{fontSize:'12px', fontWeight:600, color:'#444'}}>{p ? `${p.modelo} — ${p.color}` : it.sku}</span>
                                 </div>
                                 <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
                                   <span style={{fontSize:'11px', color:'#777', fontWeight:700}}>{it.cantidad} uds</span>
                                   <span style={{fontSize:'11px', color:'var(--green)', fontWeight:800}}>€ {((it.precioVenta||0)*(it.cantidad||0)).toFixed(2)}</span>
                                 </div>
                               </div>
                             );
                           })}
                         </div>
                         {g.comandaId && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); router.push(`/comandas?ver=${g.comandaId}`); }}
                              style={{width:'100%', padding:'10px', background:'var(--ink)', color:'#fff', border:'none', borderRadius:'12px', fontFamily:'Poppins,sans-serif', fontSize:'10px', fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'}}>
                              GESTIONAR COMANDA ORIGINAL 📋
                            </button>
                         )}
                      </div>
                    )}
                  </div>
                );
              })
            }
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .order-row-premium:hover { background: #f9fafb; }
      ` }} />
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
      
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px',flexWrap:'wrap',gap:'15px'}}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
            <div style={{fontFamily:'Poppins,sans-serif',fontSize:'16px',fontWeight:800, textTransform: 'uppercase', letterSpacing: '.05em'}}>Directorio de Clientes</div>
            <span style={{fontSize:'10px', color:'var(--red)', background: 'rgba(239,68,68,0.1)', padding: '2px 10px', borderRadius: '12px', fontWeight: 800}}>● {clientes.length} REGISTRADOS</span>
          </div>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'11px',color:'#888'}}>Gestión de compradores mayoristas y fidelización</div>
        </div>
        <button onClick={()=>setModal('nuevo')} style={{padding:'12px 24px',background:'var(--red)',color:'#fff',border:'none',cursor:'pointer',fontSize:'12px',fontWeight:800,textTransform:'uppercase', borderRadius: '16px', fontFamily: 'Poppins, sans-serif', boxShadow: '0 4px 15px rgba(239,68,68,0.2)'}}>
          + NUEVO CLIENTE
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))',gap:'16px',marginBottom:'30px'}}>
         <div style={{padding:'20px', background:'#fff', borderRadius:'24px', border:'1px solid var(--border)', boxShadow:'0 4px 12px rgba(0,0,0,0.02)'}}>
            <div style={{fontFamily:'Poppins,sans-serif', fontSize:'11px', fontWeight:800, color:'#888', textTransform:'uppercase', marginBottom:'10px'}}>Facturación Total (CRM)</div>
            <div style={{fontFamily:'Poppins,sans-serif', fontSize:'24px', fontWeight:900, color:'var(--green)'}}>
              € {clientes.reduce((a,b)=>a+(b.totalGastado||0),0).toLocaleString('es-ES',{minimumFractionDigits:2})}
            </div>
         </div>
         <div style={{padding:'20px', background:'#fff', borderRadius:'24px', border:'1px solid var(--border)', boxShadow:'0 4px 12px rgba(0,0,0,0.02)'}}>
            <div style={{fontFamily:'Poppins,sans-serif', fontSize:'11px', fontWeight:800, color:'#888', textTransform:'uppercase', marginBottom:'10px'}}>Clientes Frecuentes</div>
            <div style={{fontFamily:'Poppins,sans-serif', fontSize:'24px', fontWeight:900, color:'var(--blue)'}}>
              {clientes.filter(c=>(c.totalPedidos||0)>=5).length}
            </div>
         </div>
         <div style={{padding:'20px', background:'#fff', borderRadius:'24px', border:'1px solid var(--border)', boxShadow:'0 4px 12px rgba(0,0,0,0.02)'}}>
            <div style={{fontFamily:'Poppins,sans-serif', fontSize:'11px', fontWeight:800, color:'#888', textTransform:'uppercase', marginBottom:'10px'}}>Nuevos este mes</div>
            <div style={{fontFamily:'Poppins,sans-serif', fontSize:'24px', fontWeight:900, color:'var(--red)'}}>
              {clientes.filter(c => {
                const reg = new Date(c.fecha_registro);
                const now = new Date();
                return reg.getMonth() === now.getMonth() && reg.getFullYear() === now.getFullYear();
              }).length}
            </div>
         </div>
      </div>

      <div style={{display:'flex',alignItems:'center',gap:'12px',background:'#fff',padding:'12px 20px',borderRadius:'24px',border:'1px solid var(--border)',marginBottom:'24px', boxShadow:'0 4px 15px rgba(0,0,0,0.02)'}}>
        <span style={{fontSize:'16px', opacity:0.5}}>🔍</span>
        <input value={buscar} onChange={e=>setBuscar(e.target.value)} placeholder="Buscar por nombre, teléfono o ID..." style={{background:'none',border:'none',outline:'none',fontFamily:'Poppins,sans-serif',fontSize:'14px',color:'#111',width:'100%'}} />
      </div>

      {cargando && <div style={{textAlign:'center',padding:'80px',fontFamily:'Poppins,sans-serif',fontSize:'14px',color:'#aaa', fontWeight:600}}>
          <div style={{fontSize:'24px', marginBottom:'10px'}}>⏳</div>
          Buscando clientes...
      </div>}

      {!cargando && filtrados.length === 0 && (
        <div style={{textAlign:'center',padding:'80px',background:'#fff',borderRadius:'24px',border:'1px dashed var(--border)'}}>
          <div style={{fontSize:'48px',marginBottom:'15px'}}>👤</div>
          <div style={{fontFamily:'Poppins,sans-serif',fontSize:'14px',color:'#999', fontWeight:700}}>{clientes.length===0?'No hay clientes registrados':'No encontramos resultados'}</div>
        </div>
      )}

      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'20px', marginBottom:'40px'}}>
        {!cargando && filtrados.map(c => {
          const ini = c.nombre.split(' ').map(w=>w[0]||'').join('').toUpperCase().slice(0,2);
          const esVIP = (c.totalGastado||0) > 500;
          const esFrecuente = (c.totalPedidos||0) >= 5;

          return (
            <div key={c.id} onClick={()=>setDetalle(c.id)}
              style={{
                background:'#fff', 
                borderRadius:'24px', 
                border:'1px solid var(--border)', 
                padding:'24px',
                display:'flex',
                flexDirection:'column',
                position:'relative',
                boxShadow:'0 8px 24px rgba(0,0,0,0.04)',
                transition:'all 0.2s',
                cursor:'pointer'
              }} className="client-card-premium">
              
              <div style={{position:'absolute', top:'15px', right:'15px', display:'flex', gap:'5px'}}>
                {esVIP && <span style={{background:'#fef3c7', color:'#92400e', fontSize:'8px', fontWeight:900, padding:'3px 8px', borderRadius:'10px', textTransform:'uppercase'}}>💎 VIP</span>}
                {esFrecuente && <span style={{background:'#dbeafe', color:'#1e40af', fontSize:'8px', fontWeight:900, padding:'3px 8px', borderRadius:'10px', textTransform:'uppercase'}}>⭐ Frecuente</span>}
              </div>

              <div style={{display:'flex', alignItems:'center', gap:'16px', marginBottom:'20px'}}>
                <div style={{width:'54px',height:'54px',borderRadius:'16px',background:'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Poppins,sans-serif',fontSize:'18px',fontWeight:900,color:'var(--ink)', flexShrink:0}}>{ini}</div>
                <div style={{overflow:'hidden'}}>
                  <div style={{fontFamily:'Poppins,sans-serif', fontSize:'16px', fontWeight:900, color:'var(--ink)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{c.nombre}</div>
                  <div style={{fontFamily:'DM Mono,monospace', fontSize:'11px', color:'#888'}}>{c.ciudad || 'Sin ciudad'}</div>
                </div>
              </div>

              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'20px', padding:'12px', background:'#f9fafb', borderRadius:'16px'}}>
                <div>
                  <div style={{fontFamily:'Poppins,sans-serif', fontSize:'8px', color:'#aaa', fontWeight:800, textTransform:'uppercase', marginBottom:'4px'}}>Compras</div>
                  <div style={{fontFamily:'Poppins,sans-serif', fontSize:'16px', fontWeight:900, color:'var(--ink)'}}>{c.totalPedidos||0} <span style={{fontSize:'10px', fontWeight:600}}>PEDIDOS</span></div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontFamily:'Poppins,sans-serif', fontSize:'8px', color:'#aaa', fontWeight:800, textTransform:'uppercase', marginBottom:'4px'}}>Total Gastado</div>
                  <div style={{fontFamily:'Poppins,sans-serif', fontSize:'16px', fontWeight:900, color:'var(--green)'}}>€ {(c.totalGastado||0).toFixed(2)}</div>
                </div>
              </div>

              <div style={{marginTop:'auto', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                 <div style={{display:'flex', flexDirection:'column'}}>
                   <span style={{fontFamily:'DM Mono,monospace', fontSize:'8px', color:'#aaa', textTransform:'uppercase'}}>ID: {c.id.slice(0,8)}</span>
                   <span style={{fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#666', fontWeight:700}}>{c.telefono || 'Sin teléfono'}</span>
                 </div>
                 <div style={{width:'32px', height:'32px', borderRadius:'50%', background:'var(--bg3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', color:'#888', transition:'all 0.2s'}} className="arrow-btn">→</div>
              </div>
            </div>
          );
        })}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .client-card-premium:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 30px rgba(0,0,0,0.08);
          border-color: var(--red-soft);
        }
        .client-card-premium:hover .arrow-btn {
          background: var(--red);
          color: #fff;
          transform: translateX(3px);
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      ` }} />
    </Shell>
  );
}
