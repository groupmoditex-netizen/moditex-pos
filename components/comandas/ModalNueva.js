'use client';
import React, { useState, useMemo, useEffect } from 'react';
import BarcodeScanner from '@/components/BarcodeScanner';
import CatalogoExplorer from '@/components/CatalogoExplorer';
import ModalPromo from '@/components/ModalPromo';
import { calcularPreciosCarrito } from '@/lib/precioMayorista';

const METODOS = [
  {id:'pago_movil',  label:'Pago Móvil',   icon:'📱', divisa:'BS'},
  {id:'transferencia',label:'Transf. BS',   icon:'🏦', divisa:'BS'},
  {id:'efectivo_bs', label:'Efectivo BS',   icon:'💵', divisa:'BS'},
  {id:'punto_venta', label:'Punto Venta',   icon:'💳', divisa:'BS'},
  {id:'zelle',       label:'Zelle',         icon:'💸', divisa:'USD'},
  {id:'efectivo_usd',label:'Efectivo USD',  icon:'🇺🇸', divisa:'USD'},
  {id:'binance',     label:'Binance/USDT',  icon:'🔶', divisa:'USDT'},
  {id:'efectivo_eur',label:'Efectivo €',    icon:'💶', divisa:'EUR'},
  {id:'transferencia_eur',label:'Transf. €',icon:'🇪🇺', divisa:'EUR'},
];

const inp = {width:'100%',padding:'9px 11px',background:'var(--bg2)',border:'1px solid var(--border)',fontFamily:'Poppins,sans-serif',fontSize:'13px',outline:'none',boxSizing:'border-box'};
const lbl = {fontFamily:'DM Mono,monospace',fontSize:'8px',letterSpacing:'.16em',textTransform:'uppercase',color:'#555',display:'block',marginBottom:'5px'};

function fmtNum(n){return Number(n||0).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2});}
// Eliminamos precioItem ya que usaremos el motor de precios enricher
function colorHex(n){
  const CM={BLANCO:'#d0d0d0',NEGRO:'#1a1a1a',AZUL:'#3b6fd4',ROJO:'#d63b3b',VERDE:'#2d9e4a',ROSA:'#f07aa0',GRIS:'#6b7280',AMARILLO:'#f5c842',NARANJA:'#f5c842',MORADO:'#7c4fd4',VINOTINTO:'#8b2035',BEIGE:'#d4b896',CORAL:'#f26e5b',CELESTE:'#7ec8e3'};
  const k=(n||'').toUpperCase().trim();return CM[k]||CM[k.split(' ')[0]]||'#9ca3af';
}

export default function ModalNueva({ onClose, onSave, clientes=[], productos=[], initialDraft=null, isAdmin, usuariosDB=[] }) {
  const [fase, setFase] = useState(1);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  
  const [showAuth, setShowAuth] = useState(false);
  const [authPendingIdx, setAuthPendingIdx] = useState(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPin, setAuthPin] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authErr, setAuthErr] = useState('');
  const [cliente_tipo, setCliente_tipo] = useState('nuevo');
  const [cliente_id, setCliente_id] = useState('');
  const [cliente_nombre, setCliente_nombre] = useState('');
  const [cliente_cedula, setCliente_cedula] = useState('');
  const [cliente_telefono, setCliente_telefono] = useState('');
  const [cliente_email, setCliente_email] = useState('');
  const [cliente_ciudad, setCliente_ciudad] = useState('');
  const [items, setItems] = useState([]);
  const [notas, setNotas] = useState('');
  const [agencia_envio, setAgencia_envio] = useState('');
  const [pago_directo, setPago_directo] = useState(false);
  const [pago_metodo, setPago_metodo] = useState('');
  const [pago_referencia, setPago_referencia] = useState('');
  const [pago_monto, setPago_monto] = useState('');
  const [pago_divisa, setPago_divisa] = useState('EUR');
  const [pago_tasa, setPago_tasa] = useState('');
  const [vincular_pago, setVincular_pago] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [pagosLista, setPagosLista] = useState([]);
  const [globalTasa, setGlobalTasa] = useState(1);

  // Draft loading
  useEffect(() => {
    if (initialDraft) {
      if (initialDraft.cliente) {
        setCliente_tipo('existente');
        setCliente_id(initialDraft.cliente.id || '');
        setCliente_nombre(initialDraft.cliente.nombre || '');
      }
      if (initialDraft.items) setItems(initialDraft.items);
      if (initialDraft.notas) setNotas(initialDraft.notas);
      setFase(initialDraft.items?.length ? 2 : 1);
    }
  }, [initialDraft]);

  // Fetch Tasa actual
  useEffect(() => {
    fetch('/api/tasa')
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.tasa_bs_eur) {
          setGlobalTasa(d.tasa_bs_eur);
          setPago_tasa(d.tasa_bs_eur);
        }
      })
      .catch(() => {});
  }, []);

  const clientesFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return [];
    return clientes.filter(c => 
      c.nombre?.toLowerCase().includes(q) || 
      (c.telefono && c.telefono.includes(q)) ||
      (c.cedula && c.cedula.toLowerCase().includes(q))
    ).slice(0, 5); // Mostrar top 5
  }, [clientes, busqueda]);

  const seleccionarCliente = (c) => {
    setCliente_tipo('existente');
    setCliente_id(c.id);
    setCliente_nombre(c.nombre);
    setCliente_cedula(c.cedula || '');
    setCliente_telefono(c.telefono || '');
    setCliente_email(c.email || '');
    setCliente_ciudad(c.ciudad || '');
    setBusqueda(c.nombre);
    setMostrarResultados(false);
  };

  // Motor de precios enriquecido
  const itemsEnriquecidos = useMemo(() => {
    return calcularPreciosCarrito(items.map(it => ({
      ...it,
      qty: it.cant || 1,
      precio_detal: it.precioDetal || it.precio_detal || 0,
      precio_mayor: it.precioMayor || it.precio_mayor || 0,
      min_mayorista: it.minMayorista || it.min_mayorista || 6,
      modelos_min_mayorista: it.modelosMinMayorista || it.modelos_min_mayorista || 3,
      tipo_precio: it.tipoVenta || 'AUTO'
    })));
  }, [items]);

  const totalComanda = itemsEnriquecidos.reduce((a, b) => a + (b.subtotal || 0), 0);
  const totalPagado = pagosLista.reduce((a, b) => a + (b.divisa === 'BS' ? b.monto / (b.tasa || globalTasa || 1) : b.monto), 0);
  const resta = totalComanda - totalPagado;

  const agregarItem = (it, delta = 1) => {
    const idx = items.findIndex(x => x.sku === it.sku);
    if (idx >= 0) {
      const next = [...items];
      next[idx].cant = (next[idx].cant || 1) + delta;
      setItems(next);
    } else {
      setItems([...items, { ...it, cant: delta, tipoVenta: 'AUTO' }]);
    }
  };

  const setCantItem = (sku, val) => {
    const v = Math.max(1, parseInt(val) || 1);
    setItems(prev => prev.map(x => x.sku === sku ? { ...x, cant: v } : x));
  };

  const quitarItem = (idx) => {
    const next = [...items];
    if (next[idx].cant > 1) next[idx].cant -= 1;
    else next.splice(idx, 1);
    setItems(next);
  };

  const quitarTodosPorSku = (sku) => {
    setItems(prev => prev.filter(x => x.sku !== sku));
  };

  const guardarBorrador = () => {
    const list = JSON.parse(localStorage.getItem('moditex_comandas_espera') || '[]');
    const clientName = cliente_tipo === 'existente' ? clientes.find(c => c.id === parseInt(cliente_id))?.nombre : cliente_nombre;
    const nuevo = { id: Date.now(), cliente: { id: cliente_id, nombre: clientName || 'Sin Nombre' }, items, notas, fecha: new Date().toISOString() };
    localStorage.setItem('moditex_comandas_espera', JSON.stringify([nuevo, ...list]));
    onClose();
  };

  const toggleTipoVenta = (idx) => {
    const next = [...items];
    const current = next[idx].tipoVenta || 'AUTO';
    const ciclo = { 'AUTO': 'MAYOR_FORZADO', 'MAYOR_FORZADO': 'DETAL_FORZADO', 'DETAL_FORZADO': 'AUTO' };
    const nuevoModo = ciclo[current] || 'AUTO';

    // Si intenta forzar (no es AUTO) y no es admin, pedir PIN
    if (nuevoModo !== 'AUTO' && !isAdmin) {
      setAuthPendingIdx(idx);
      setShowAuth(true);
      return;
    }

    next[idx].tipoVenta = nuevoModo;
    setItems(next);
  };

  const handleAutorizar = async () => {
    if (!authEmail || !authPin) return setAuthErr('Email y PIN requeridos');
    setAuthLoading(true);
    setAuthErr('');
    try {
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authEmail, pin: authPin })
      }).then(r => r.json());

      if (res.ok) {
        // Autorizado! Aplicar el cambio que estaba pendiente
        const next = [...items];
        const current = next[authPendingIdx].tipoVenta || 'AUTO';
        const ciclo = { 'AUTO': 'MAYOR_FORZADO', 'MAYOR_FORZADO': 'DETAL_FORZADO', 'DETAL_FORZADO': 'AUTO' };
        next[authPendingIdx].tipoVenta = ciclo[current];
        setItems(next);
        
        setShowAuth(false);
        setAuthEmail('');
        setAuthPin('');
        setAuthPendingIdx(null);
      } else {
        setAuthErr(res.error || 'Error de autorización');
      }
    } catch (e) {
      setAuthErr('Error de conexión');
    }
    setAuthLoading(false);
  };

  const avanzarFase = () => {
    if (fase === 1) {
      if (cliente_tipo === 'nuevo' && !cliente_nombre.trim()) return setErr('Falta nombre del cliente');
      if (cliente_tipo === 'nuevo' && !cliente_cedula.trim()) return setErr('Falta cédula/RIF del cliente');
      if (cliente_tipo === 'existente' && !cliente_id) return setErr('Selecciona un cliente');
    }
    if (fase === 2) {
      if (!items.length) return setErr('No hay productos en la comanda');
    }
    setErr('');
    setFase(fase + 1);
  };

  const crearComanda = async (forzarEmpaque = false) => {
    if (cliente_tipo === 'nuevo' && !cliente_nombre.trim()) return setErr('Falta nombre del cliente');
    if (cliente_tipo === 'nuevo' && !cliente_cedula.trim()) return setErr('Falta cédula/RIF del cliente');
    if (cliente_tipo === 'existente' && !cliente_id) return setErr('Selecciona un cliente');
    if (!items.length) return setErr('No hay productos en la comanda');

    setSaving(true);
    setErr('');
    const payload = {
      cliente_nombre: cliente_tipo === 'nuevo' ? cliente_nombre : clientes.find(c => c.id === parseInt(cliente_id))?.nombre,
      cliente_cedula: cliente_tipo === 'nuevo' ? cliente_cedula : clientes.find(c => c.id === parseInt(cliente_id))?.cedula,
      cliente_email: cliente_tipo === 'nuevo' ? cliente_email : clientes.find(c => c.id === parseInt(cliente_id))?.email,
      cliente_ciudad: cliente_tipo === 'nuevo' ? cliente_ciudad : clientes.find(c => c.id === parseInt(cliente_id))?.ciudad,
      cliente_id: cliente_tipo === 'existente' ? parseInt(cliente_id) : null,
      telefono: cliente_telefono,
      items: itemsEnriquecidos.map(it => ({ 
        sku: it.sku, 
        cantidad: it.cant || 1, 
        precio: it.precio_aplicado, 
        modelo: it.modelo, 
        talla: it.talla, 
        color: it.color,
        tipoVenta: it.tipo_precio_resultado
      })),
      notas,
      agencia_envio,
      status: forzarEmpaque ? 'EMPACADO' : 'PENDIENTE',
      precio: totalComanda,
      pagos: pagosLista.map(p => ({ 
        metodo: p.metodo, 
        referencia: p.referencia, 
        monto_divisa: parseFloat(p.monto) || 0, 
        divisa: p.divisa, 
        tasa_bs: parseFloat(p.tasa) || 0 
      }))
    };

    const res = await fetch('/api/comandas', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(payload) 
    }).then(r => r.json());

    if (res.ok) { onSave(); onClose(); } else { setErr(res.error); setSaving(false); }
  };

  const agregarPagoALista = () => {
    if (!pago_metodo || !pago_monto) return;
    const nuevo = {
      id: Date.now(),
      metodo: pago_metodo,
      divisa: pago_divisa,
      monto: parseFloat(pago_monto),
      tasa: parseFloat(pago_tasa) || globalTasa,
      referencia: pago_referencia
    };
    setPagosLista([...pagosLista, nuevo]);
    // Reset form
    setPago_metodo('');
    setPago_monto('');
    setPago_referencia('');
    setPago_tasa(globalTasa);
  };

  const eliminarPagoDeLista = (id) => {
    setPagosLista(pagosLista.filter(p => p.id !== id));
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(5px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}}>
      <div className="modal-content" onClick={e=>e.stopPropagation()} style={{background:'var(--bg)',width:'100%',maxWidth:'900px',height:'90vh',borderRadius:'20px',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 40px rgba(0,0,0,0.3)'}}>
        
        {/* HEADER */}
        <div style={{padding:'20px 30px',background:'var(--surface)',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <h3 style={{margin:0,fontFamily:'Playfair Display,serif',fontSize:'22px'}}>Nueva Comanda</h3>
            <div style={{display:'flex',gap:'15px',marginTop:'8px'}}>
               {[1,2,3].map(n => (
                 <div key={n} style={{display:'flex',alignItems:'center',gap:'6px',opacity:fase===n?1:0.4}}>
                   <span style={{width:'20px',height:'20px',borderRadius:'50%',background:fase>=n?'var(--ink)':'#ccc',color:'#fff',fontSize:'10px',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>{n}</span>
                   <span style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em'}}>{n===1?'Cliente':n===2?'Productos':'Pago/Notas'}</span>
                 </div>
               ))}
            </div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:'20px',cursor:'pointer',opacity:0.5}}>✕</button>
        </div>

        {/* BODY */}
        <div style={{flex:1,overflowY:'auto',padding:'20px 25px',display:'flex',flexDirection:'column',gap:'15px'}}>
          {err && <div style={{padding:'12px',background:'var(--red-soft)',color:'var(--red)',borderRadius:'8px',fontSize:'13px',border:'1px solid var(--red)'}}>⚠️ {err}</div>}

          {fase === 1 && (
            <div style={{maxWidth:'600px',margin:'0 auto',width:'100%',display:'flex',flexDirection:'column',gap:'20px',animation:'fadeIn 0.3s ease-out'}}>
              <div>
                <label style={lbl}>Tipo de Cliente</label>
                <div style={{display:'flex',gap:'10px'}}>
                  <button onClick={()=>setCliente_tipo('nuevo')} style={{flex:1,padding:'12px',borderRadius:'10px',border:`1.5px solid ${cliente_tipo==='nuevo'?'var(--ink)':'var(--border)'}`,background:cliente_tipo==='nuevo'?'var(--ink)':'#fff',color:cliente_tipo==='nuevo'?'#fff':'#333',transition:'all 0.2s',cursor:'pointer',fontWeight:700,fontSize:'12px'}}>👤 Cliente Nuevo</button>
                  <button onClick={()=>setCliente_tipo('existente')} style={{flex:1,padding:'12px',borderRadius:'10px',border:`1.5px solid ${cliente_tipo==='existente'?'var(--ink)':'var(--border)'}`,background:cliente_tipo==='existente'?'var(--ink)':'#fff',color:cliente_tipo==='existente'?'#fff':'#333',transition:'all 0.2s',cursor:'pointer',fontWeight:700,fontSize:'12px'}}>📂 Lista de Clientes</button>
                </div>
              </div>

              <div style={{background:'var(--surface)',padding:'24px',borderRadius:'16px',border:'1px solid var(--border)',boxShadow:'0 4px 15px rgba(0,0,0,0.03)'}}>
              {cliente_tipo === 'nuevo' ? (
                <div style={{display:'flex',flexDirection:'column',gap:'18px'}}>
                  <div>
                    <label style={lbl}>Nombre Completo / Razón Social</label>
                    <div style={{position:'relative'}}>
                      <input 
                        autoFocus 
                        value={cliente_nombre} 
                        onChange={e => {
                          setCliente_nombre(e.target.value);
                          setBusqueda(e.target.value);
                          setMostrarResultados(true);
                        }} 
                        onFocus={() => setMostrarResultados(true)}
                        style={{...inp,fontSize:'16px',height:'48px',borderRadius:'8px'}} 
                        placeholder="Ej: Maria Perez"
                      />
                      {/* Atajo rápido — Si el nombre coincide con uno existente. Se oculta si ya empezó a llenar otros datos para no estorbar */}
                      {mostrarResultados && clientesFiltrados.length > 0 && !cliente_cedula && !cliente_telefono && (
                        <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#fff',border:'1px solid var(--border)',borderRadius:'12px',boxShadow:'0 10px 30px rgba(0,0,0,0.15)',zIndex:100,marginTop:'8px',overflow:'hidden',animation:'fadeInSlide 0.2s ease-out'}}>
                          <div style={{padding:'8px 12px',background:'var(--bg2)',fontSize:'9px',fontFamily:'DM Mono,monospace',color:'#888',fontWeight:700,borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <span>🔍 CLIENTES REGISTRADOS (ATAJO)</span>
                            <button onClick={(e)=>{e.stopPropagation(); setMostrarResultados(false);}} style={{background:'none', border:'none', cursor:'pointer', color:'var(--red)', fontWeight:900, fontSize:'10px'}}>✕ CERRAR</button>
                          </div>
                          {clientesFiltrados.map(c => (
                            <div key={c.id} onClick={() => seleccionarCliente(c)} style={{padding:'12px 15px',cursor:'pointer',borderBottom:'1px solid var(--border-soft)',transition:'background .1s'}} className="search-result-item">
                              <div style={{fontSize:'13px',fontWeight:700}}>{c.nombre}</div>
                              <div style={{display:'flex',gap:'10px',fontSize:'10px',color:'#888',fontFamily:'DM Mono,monospace'}}>
                                 <span>🪪 {c.cedula || 'S/C'}</span>
                                 <span>📱 {c.telefono || 'S/T'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                    <div>
                      <label style={lbl}>Cédula / RIF</label>
                      <input value={cliente_cedula} onChange={e=>setCliente_cedula(e.target.value)} style={{...inp,borderRadius:'8px'}} placeholder="V-123..."/>
                    </div>
                    <div>
                      <label style={lbl}>WhatsApp / Teléfono</label>
                      <input value={cliente_telefono} onChange={e=>setCliente_telefono(e.target.value)} style={{...inp,borderRadius:'8px'}} placeholder="+58 412..."/>
                    </div>
                  </div>

                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                    <div>
                      <label style={lbl}>Email (Opcional)</label>
                      <input value={cliente_email} onChange={e=>setCliente_email(e.target.value)} style={{...inp,borderRadius:'8px'}} placeholder="cliente@correo.com"/>
                    </div>
                    <div>
                      <label style={lbl}>Ciudad</label>
                      <input value={cliente_ciudad} onChange={e=>setCliente_ciudad(e.target.value)} style={{...inp,borderRadius:'8px'}} placeholder="Ej: Caracas"/>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                   <label style={lbl}>Buscar Cliente</label>
                    <div style={{display:'flex',gap:'5px',marginBottom:'15px'}}>
                      <input 
                        autoFocus
                        value={busqueda} 
                        onChange={e => {
                          setBusqueda(e.target.value);
                          setMostrarResultados(true);
                          if(!e.target.value) setCliente_id('');
                        }}
                        onFocus={() => setMostrarResultados(true)}
                        style={{...inp,fontSize:'16px',height:'48px',borderRadius:'8px'}} 
                        placeholder="Escribe para filtrar clientes..."
                      />
                    </div>

                    <div style={{
                      maxHeight:'280px', 
                      overflowY:'auto', 
                      border:'1px solid var(--border)', 
                      borderRadius:'10px',
                      background:'#fff'
                    }}>
                      {(busqueda.length > 0 ? clientesFiltrados : clientes.slice(0, 50)).map(c => (
                        <div 
                          key={c.id} 
                          onClick={() => seleccionarCliente(c)}
                          style={{
                            padding:'12px 15px',
                            cursor:'pointer', 
                            borderBottom:'1px solid var(--border-soft)',
                            background: cliente_id === c.id ? 'rgba(59,111,212,0.08)' : 'transparent',
                            display:'flex',
                            justifyContent:'space-between',
                            alignItems:'center'
                          }}
                          className="search-result-item"
                        >
                          <div>
                            <div style={{fontSize:'13px', fontWeight:700}}>{c.nombre}</div>
                            <div style={{fontSize:'10px', color:'#888', fontFamily:'DM Mono,monospace', marginTop:'2px'}}>
                              {c.cedula || '---'} · {c.telefono || '---'}
                            </div>
                          </div>
                          {cliente_id === c.id && <span style={{color:'var(--blue)',fontWeight:700,fontSize:'14px'}}>✓</span>}
                        </div>
                      ))}
                    </div>

                    {cliente_id && (
                      <div style={{marginTop:'15px',padding:'15px',background:'var(--blue-soft)',borderRadius:'10px',border:'1px dashed var(--blue)',display:'flex',alignItems:'center',gap:'12px',animation:'fadeIn .2s'}}>
                         <div style={{width:'36px',height:'36px',borderRadius:'50%',background:'var(--blue)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px'}}>👤</div>
                         <div style={{flex:1}}>
                           <div style={{fontSize:'14px',fontWeight:700,color:'var(--blue)'}}>{clientes.find(c=>c.id===parseInt(cliente_id))?.nombre}</div>
                           <div style={{fontSize:'10px',color:'#666',fontFamily:'DM Mono,monospace'}}>Seleccionado para esta comanda</div>
                         </div>
                         <button onClick={()=>{setCliente_id(''); setBusqueda('');}} style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:'12px',fontWeight:700}}>Cambiar</button>
                      </div>
                    )}
                </div>
              )}
              </div>
            </div>
          )}

          {fase === 2 && (
            <div style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:'20px',height:'100%',animation:'fadeIn 0.4s ease-out'}}>
               <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>
                  {/* SCANNER POS (USB + CAMARA + MULTIPLICADOR) */}
                  <div style={{background:'var(--surface)', padding:'15px', borderRadius:'16px', border:'1px solid var(--border)', boxShadow:'0 10px 25px rgba(0,0,0,0.05)'}}>
                    <BarcodeScanner 
                      productos={productos} 
                      onAdd={(p, qty) => agregarItem({ ...p, cant: qty })} 
                    />
                  </div>

                  <div style={{flex:1, minHeight:0, display:'flex', flexDirection:'column'}}>
                    <CatalogoExplorer 
                      onAdd={(p, qty, tv) => agregarItem({ ...p, cant: qty, tipoVenta: tv })} 
                      onRemove={quitarTodosPorSku}
                      itemsEnCesta={items}
                      onClose={() => {}} 
                      productos={productos} 
                      modo="salida" 
                      compact 
                    />
                  </div>
                  
                  <div style={{borderTop:'1px solid var(--border)',paddingTop:'15px',opacity:0.6}}>
                    <div style={{...lbl,fontSize:'9px',textAlign:'center'}}>El escáner arriba gestiona tanto entradas por cámara como por lector USB/Bluetooth.</div>
                  </div>
               </div>
               
               <div style={{background:'var(--surface)',borderRadius:'24px',border:'1px solid var(--border)',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 50px rgba(0,0,0,0.12)'}}>
                  <div style={{padding:'20px 25px',background:'var(--ink)',color:'#fff',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:'11px',fontWeight:800,letterSpacing:'.15em',textTransform:'uppercase'}}>Resumen de Venta</span>
                    <span style={{background:'rgba(255,255,255,0.15)',padding:'4px 10px',borderRadius:'6px',fontSize:'10px',fontWeight:800,fontFamily:'DM Mono,monospace'}}>{items.length} SKU{items.length!==1?'S':''}</span>
                  </div>

                  {/* TOTALES POS PREMIUM */}
                  <div style={{padding:'15px 20px', background:'var(--bg2)', borderBottom:'1px solid var(--border)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                    <div style={{textAlign:'center', padding:'10px', background:'#fff', borderRadius:'12px', border:'1.5px solid var(--border)', boxShadow:'0 2px 4px rgba(0,0,0,0.02)'}}>
                      <div style={{...lbl,marginBottom:'0px'}}>Prendas</div>
                      <div style={{fontSize:'22px', fontWeight:900, color:'var(--ink)', fontFamily:'Inter,sans-serif'}}>{items.reduce((a,b)=>a+(b.cant||1),0)}</div>
                    </div>
                    <div style={{textAlign:'center', padding:'10px', background:'#fff', borderRadius:'12px', border:'1.5px solid var(--border)', boxShadow:'0 2px 4px rgba(0,0,0,0.02)'}}>
                      <div style={{...lbl,marginBottom:'0px'}}>Total Venta</div>
                      <div style={{fontSize:'22px', fontWeight:900, color:'var(--green)', fontFamily:'Inter,sans-serif'}}>€{fmtNum(totalComanda)}</div>
                    </div>
                  </div>

                  <div style={{flex:1,overflowY:'auto',padding:'20px',display:'flex',flexDirection:'column',gap:'10px'}}>
                    {items.length === 0 ? (
                      <div style={{textAlign:'center',padding:'80px 20px',opacity:0.6}}>
                        <div style={{fontSize:'48px', marginBottom:'15px'}}>🛍️</div>
                        <div style={{fontSize:'14px', fontWeight:600, color:'#888'}}>La cesta está vacía</div>
                        <div style={{fontSize:'10px', color:'#aaa', marginTop:'5px', textTransform:'uppercase', letterSpacing:'.05em'}}>Escanea o utiliza el catálogo</div>
                      </div>
                    ) : (
                      itemsEnriquecidos.map((it,idx)=>(
                        <div key={idx} style={{display:'flex',flexDirection:'column',gap:'4px',padding:'10px 12px',background:'#fff',borderRadius:'12px',border:'1px solid var(--border-soft)',boxShadow:'0 2px 5px rgba(0,0,0,0.02)',transition:'all 0.2s',animation:'fadeInSlide 0.3s ease-out'}}>
                           <div style={{display:'flex',alignItems:'flex-start',gap:'10px'}}>
                              <div style={{width:'32px',height:'32px',borderRadius:'8px',background:'var(--bg2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'15px',position:'relative',marginTop:'2px'}}>
                                 {it.modelo?.slice(0,1)}
                                 <span style={{position:'absolute',top:'-3px',left:'-3px',width:'11px',height:'11px',borderRadius:'50%',background:colorHex(it.color),border:'1.5px solid #fff',boxShadow:'0 2px 4px rgba(0,0,0,0.1)'}}/>
                              </div>
                              <div style={{flex:1, minWidth:0}}>
                                <div style={{fontSize:'13px',fontWeight:800,color:'var(--ink)',lineHeight:'1.2',marginBottom:'2px'}}>{it.modelo}</div>
                                <div style={{fontSize:'10px',color:'#888',fontWeight:500}}>{it.talla} · {it.color} · €{fmtNum(it.precio_aplicado)}</div>
                              </div>
                               <div style={{display:'flex',alignItems:'center',gap:'6px',background:'var(--bg2)',padding:'4px',borderRadius:'10px'}}>
                                <button onClick={()=>quitarItem(idx)} style={{width:'26px',height:'26px',borderRadius:'8px',border:'none',background:'#fff',cursor:'pointer',fontSize:'16px',fontWeight:900,boxShadow:'0 2px 4px rgba(0,0,0,0.05)'}}>–</button>
                                <input 
                                  type="number" 
                                  value={it.cant} 
                                  onChange={e => setCantItem(it.sku, e.target.value)}
                                  style={{width:'40px', textAlign:'center', border:'none', background:'none', fontFamily:'Inter,sans-serif', fontWeight:900, fontSize:'14px', outline:'none'}}
                                />
                                <button onClick={()=>agregarItem(it, 1)} style={{width:'26px',height:'26px',borderRadius:'8px',border:'none',background:'#fff',cursor:'pointer',fontSize:'16px',fontWeight:900,boxShadow:'0 2px 4px rgba(0,0,0,0.05)'}}>+</button>
                              </div>
                           </div>
                           <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'5px',paddingTop:'10px',borderTop:'1px dashed var(--border-soft)'}}>
                              <div style={{display:'flex',gap:'5px',alignItems:'center'}}>
                                 <button 
                                  onClick={()=>toggleTipoVenta(idx)} 
                                  title="Haz clic para forzar precio Mayor o Detal"
                                  style={{
                                    padding:'4px 10px',
                                    borderRadius:'6px',
                                    border:'none',
                                    background: it.tipo_precio_resultado.includes('MAYOR') ? 'var(--blue-soft)' : 'var(--bg2)',
                                    color: it.tipo_precio_resultado.includes('MAYOR') ? 'var(--blue)' : '#666',
                                    fontSize:'9px',
                                    fontWeight:800,
                                    cursor:'pointer',
                                    textTransform:'uppercase',
                                    letterSpacing:'.05em'
                                  }}>
                                  {it.tipo_precio_resultado === 'MAYOR' && '🏢 Mayor (Regla)'}
                                  {it.tipo_precio_resultado === 'DETAL' && '👤 Detal (Regla)'}
                                  {it.tipo_precio_resultado === 'MAYOR_FORZADO' && '🏢 Mayor (Forzado)'}
                                  {it.tipo_precio_resultado === 'DETAL_FORZADO' && '👤 Detal (Forzado)'}
                                 </button>
                                 {it.tipoVenta === 'AUTO' && (
                                   <div style={{fontSize:'8px', color:'#aaa', fontWeight:500}}>
                                     Regla: {it._debug.minMay} tot. / {it._debug.minMod} mod.
                                   </div>
                                 )}
                                 {it.ahorro_unitario > 0 && (
                                   <span style={{fontSize:'9px', color:'var(--green)', fontWeight:700}}>Ahorras: €{fmtNum(it.ahorro_unitario)}/ud</span>
                                 )}
                              </div>
                              <div style={{fontSize:'12px',fontWeight:900,color:'var(--ink)'}}>€{fmtNum(it.subtotal)}</div>
                           </div>
                        </div>
                      ))
                    )}
                  </div>
               </div>
            </div>
          )}

          {fase === 3 && (
            <div style={{maxWidth:'700px',margin:'0 auto',width:'100%',display:'flex',flexDirection:'column',gap:'15px',animation:'fadeIn 0.4s'}}>
               <div style={{background:'var(--surface)',padding:'18px',borderRadius:'16px',border:'1px solid var(--border)',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'15px'}}>
                  <div>
                    <label style={{...lbl,marginBottom:'6px'}}>Agencia / Entrega</label>
                    <select value={agencia_envio} onChange={e=>setAgencia_envio(e.target.value)} style={{...inp,borderRadius:'10px',height:'38px'}}>
                      <option value="">(Retiro en Tienda)</option>
                      <option value="MRW">MRW</option>
                      <option value="ZOOM">Grupo ZOOM</option>
                      <option value="TEALCA">Tealca</option>
                      <option value="DOMESA">Domesa</option>
                      <option value="MOTORIZADO">Delivery</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label style={{...lbl,marginBottom:'6px'}}>Notas de Preparación</label>
                    <input value={notas} onChange={e=>setNotas(e.target.value)} style={{...inp,borderRadius:'10px',height:'38px'}} placeholder="Ej: Embalar con cuidado..."/>
                  </div>
               </div>

               <div style={{background:'var(--surface)',padding:'18px',borderRadius:'16px',border:'1px solid var(--border)',boxShadow:'0 4px 15px rgba(0,0,0,0.03)'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'15px'}}>
                    <div style={{width:'28px',height:'28px',borderRadius:'50%',background:'var(--blue-soft)',color:'var(--blue)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px'}}>💰</div>
                    <label style={{fontSize:'14px',fontWeight:800,color:'var(--ink)'}}>Pagos / Abonos</label>
                  </div>

                  {/* Lista de pagos ya agregados */}
                  {pagosLista.length > 0 && (
                    <div style={{display:'flex',flexDirection:'column',gap:'8px',marginBottom:'15px'}}>
                      {pagosLista.map(p => {
                        const mcfg = METODOS.find(m=>m.id===p.metodo);
                        return (
                          <div key={p.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',background:'var(--bg2)',borderRadius:'10px',border:'1px solid var(--border-soft)',animation:'fadeInSlide 0.3s'}}>
                             <div style={{fontSize:'16px'}}>{mcfg?.icon}</div>
                             <div style={{flex:1}}>
                               <div style={{fontSize:'12px',fontWeight:700}}>{mcfg?.label}</div>
                               <div style={{fontSize:'9px',color:'#888',fontFamily:'DM Mono,monospace'}}>{p.divisa} {fmtNum(p.monto)} {p.referencia && `· Ref: ${p.referencia}`}</div>
                             </div>
                             <div style={{textAlign:'right'}}>
                               <div style={{fontSize:'13px',fontWeight:800,color:'var(--green)'}}>€{p.divisa==='BS' ? fmtNum(p.monto/p.tasa) : fmtNum(p.monto)}</div>
                             </div>
                             <button onClick={()=>eliminarPagoDeLista(p.id)} style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:'14px'}}>✕</button>
                          </div>
                        );
                      })}
                      <div style={{padding:'8px 12px',background:'var(--blue-soft)',borderRadius:'8px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span style={{fontSize:'10px',fontWeight:700,color:'var(--blue)'}}>TOTAL PAGADO</span>
                        <span style={{fontSize:'14px',fontWeight:900,color:'var(--blue)'}}>€{fmtNum(pagosLista.reduce((a,b)=>a+(b.divisa==='BS'?b.monto/b.tasa:b.monto),0))}</span>
                      </div>
                    </div>
                  )}

                  {/* Formulario para agregar nuevo pago */}
                  <div style={{background:'var(--bg2)',padding:'12px',borderRadius:'12px',border:'1px dashed var(--border-strong)'}}>
                     <div style={{display:'grid',gridTemplateColumns:'1.5fr 1fr auto',gap:'10px',alignItems:'flex-end'}}>
                        <div>
                          <label style={lbl}>Método y Monto</label>
                          <div style={{display:'flex',gap:'4px'}}>
                            <select value={pago_metodo} onChange={e=>{
                              const val = e.target.value;
                              setPago_metodo(val);
                              const cfg = METODOS.find(m=>m.id===val);
                              if(cfg) setPago_divisa(cfg.divisa);
                            }} style={{...inp,borderRadius:'8px',height:'36px',flex:1, minWidth:'140px'}}>
                              <option value="">Método...</option>
                              {METODOS.map(m => <option key={m.id} value={m.id}>{m.icon} {m.label}</option>)}
                            </select>
                            <select value={pago_divisa} onChange={e=>setPago_divisa(e.target.value)} style={{...inp,width:'65px',borderRadius:'8px',height:'36px'}}><option>EUR</option><option>USD</option><option>BS</option></select>
                            <input type="number" value={pago_monto} onChange={e=>setPago_monto(e.target.value)} style={{...inp,width:'85px',borderRadius:'8px',height:'36px'}} placeholder="0.00"/>
                          </div>
                        </div>
                        <div>
                          <label style={lbl}>Ref / Tasa</label>
                          <div style={{display:'flex',gap:'4px'}}>
                            <input value={pago_referencia} onChange={e=>setPago_referencia(e.target.value)} style={{...inp,borderRadius:'8px',height:'36px',flex:1}} placeholder="Ref..."/>
                            <input type="number" value={pago_tasa} onChange={e=>setPago_tasa(e.target.value)} disabled={pago_divisa!=='BS'} style={{...inp,width:'85px',borderRadius:'8px',height:'36px',opacity:pago_divisa!=='BS'?.5:1}} placeholder="Tasa"/>
                          </div>
                        </div>
                        <button onClick={agregarPagoALista} disabled={!pago_metodo || !pago_monto} style={{height:'36px',background:'var(--blue)',color:'#fff',border:'none',padding:'0 15px',borderRadius:'8px',fontWeight:700,cursor:'pointer',opacity:(!pago_metodo||!pago_monto)?0.5:1,fontSize:'12px'}}>
                           + Añadir
                        </button>
                     </div>
                  </div>

                  {/* RESUMEN DE SALDOS POS PREMIUM */}
                  <div style={{marginTop:'15px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px'}}>
                     <div style={{background:'var(--surface)', padding:'10px', borderRadius:'12px', border:'1.5px solid var(--border)', textAlign:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.02)'}}>
                        <div style={lbl}>Total Orden</div>
                        <div style={{fontSize:'16px', fontWeight:900, color:'var(--ink)', fontFamily:'Inter,sans-serif'}}>€{fmtNum(totalComanda)}</div>
                     </div>
                     <div style={{background:'var(--surface)', padding:'10px', borderRadius:'12px', border:'1.5px solid var(--border)', textAlign:'center', boxShadow:'0 2px 4px rgba(0,0,0,0.02)'}}>
                        <div style={lbl}>Total Pagado</div>
                        <div style={{fontSize:'16px', fontWeight:900, color:'var(--green)', fontFamily:'Inter,sans-serif'}}>€{fmtNum(totalPagado)}</div>
                     </div>
                     <div style={{
                        background: resta > 0.01 ? 'rgba(245,158,11,0.05)' : (resta < -0.01 ? 'rgba(16,185,129,0.05)' : 'var(--bg2)'), 
                        padding:'10px', 
                        borderRadius:'12px', 
                        border:`1.5px solid ${resta > 0.01 ? '#f59e0b' : (resta < -0.01 ? '#10b981' : 'var(--border)')}`, 
                        textAlign:'center',
                        boxShadow:'0 2px 8px rgba(0,0,0,0.04)',
                        transition:'all 0.3s'
                     }}>
                        <div style={lbl}>{resta > 0.01 ? 'Falta por Pagar' : (resta < -0.01 ? 'Vuelto / Excedente' : 'Saldada')}</div>
                        <div style={{fontSize:'16px', fontWeight:900, color: resta > 0.01 ? '#f59e0b' : (resta < -0.01 ? '#10b981' : 'var(--ink)'), fontFamily:'Inter,sans-serif'}}>
                           {resta === 0 ? '✓' : `€${fmtNum(Math.abs(resta))}`}
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* MODAL DE AUTORIZACIÓN (PIN) */}
        {showAuth && (
          <div className="modal-overlay" style={{position:'fixed',inset:0,background:'rgba(15,23,42,0.8)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:2000,animation:'fadeIn .2s'}}>
            <div className="modal-content" style={{background:'#fff',padding:'30px',borderRadius:'24px',width:'100%',maxWidth:'360px',boxShadow:'0 25px 50px -12px rgba(0,0,0,0.5)',textAlign:'center'}}>
              <div style={{fontSize:'40px',marginBottom:'15px'}}>🔐</div>
              <h3 style={{margin:'0 0 10px',fontFamily:'Playfair Display,serif'}}>Autorización Requerida</h3>
              <p style={{fontSize:'12px',color:'#666',marginBottom:'20px'}}>Solo un administrador puede forzar precios manualmente. Por favor, ingrese sus credenciales.</p>
              
              {authErr && <div style={{padding:'10px',background:'var(--red-soft)',color:'var(--red)',fontSize:'11px',borderRadius:'8px',marginBottom:'15px',border:'1px solid rgba(217,30,30,0.1)'}}>{authErr}</div>}
              
              <div style={{display:'flex',flexDirection:'column',gap:'12px',textAlign:'left'}}>
                <div>
                  <label style={lbl}>Administrador</label>
                  <select value={authEmail} onChange={e=>setAuthEmail(e.target.value)} style={{...inp,height:'40px',borderRadius:'8px'}}>
                    <option value="">Seleccione Admin...</option>
                    {usuariosDB.filter(u=>u.rol==='admin'&&u.activo).map(u=>(
                      <option key={u.email} value={u.email}>{u.nombre || u.email}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={lbl}>PIN de Seguridad</label>
                  <input type="password" maxLength={6} value={authPin} onChange={e=>setAuthPin(e.target.value)} style={{...inp,height:'40px',borderRadius:'8px',textAlign:'center',fontSize:'20px',letterSpacing:'.5em'}} placeholder="****"/>
                </div>
              </div>

              <div style={{display:'flex',gap:'10px',marginTop:'25px'}}>
                <button onClick={()=>{setShowAuth(false);setAuthErr('');setAuthPin('');}} style={{flex:1,padding:'12px',background:'#eee',border:'none',borderRadius:'12px',fontSize:'13px',fontWeight:700,cursor:'pointer'}}>Cancelar</button>
                <button onClick={handleAutorizar} disabled={authLoading} style={{flex:1,padding:'12px',background:'var(--ink)',color:'#fff',border:'none',borderRadius:'12px',fontSize:'13px',fontWeight:700,cursor:'pointer',opacity:authLoading?0.6:1}}>
                  {authLoading ? 'Verificando...' : 'Autorizar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div style={{padding:'20px 30px',background:'var(--surface)',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'space-between'}}>
          <button onClick={guardarBorrador} style={{background:'none',border:'1px solid var(--border)',padding:'12px 20px',borderRadius:'10px',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>Guardar en Espera</button>
          
          <div style={{display:'flex',gap:'12px'}}>
            {fase > 1 && <button onClick={()=>setFase(fase-1)} style={{background:'none',border:'1px solid var(--border)',padding:'12px 25px',borderRadius:'10px',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>Anterior</button>}
            {fase < 3 ? (
              <button onClick={avanzarFase} style={{background:'var(--ink)',color:'#fff',border:'none',padding:'12px 30px',borderRadius:'10px',fontSize:'13px',fontWeight:700,cursor:'pointer'}}>Siguiente</button>
            ) : (
              <div style={{display:'flex',gap:'10px'}}>
                <button onClick={()=>crearComanda(true)} disabled={saving} style={{background:'var(--green-soft)',color:'var(--green)',border:'1px solid var(--green)',padding:'12px 25px',borderRadius:'10px',fontSize:'13px',fontWeight:800,cursor:'pointer',opacity:saving?0.5:1}}>
                  {saving?'⏳':'CREAR + EMPACAR'}
                </button>
                <button onClick={()=>crearComanda(false)} disabled={saving} style={{background:'var(--green)',color:'#fff',border:'none',padding:'12px 30px',borderRadius:'10px',fontSize:'13px',fontWeight:900,cursor:'pointer',opacity:saving?0.5:1}}>
                  {saving?'CREANDO...':'FINALIZAR COMANDA'}
                </button>
              </div>
            )}
          </div>
        </div>
        <style dangerouslySetInnerHTML={{__html:`
          .search-result-item:hover { background: var(--bg2) !important; }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes fadeInSlide { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        `}}/>
      </div>
    </div>
  );
}
