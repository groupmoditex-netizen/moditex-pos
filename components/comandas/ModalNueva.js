'use client';
import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
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
  const CM={
    'BLANCO':'#ffffff', 'NEGRO':'#1a1a1a', 'GRIS':'#9ca3af', 'GRIS OSCURO':'#4b5563', 'GRIS CLARO':'#e5e7eb',
    'AZUL':'#3b82f6', 'AZUL MARINO':'#1e1b4b', 'AZUL CLARO':'#93c5fd', 'AZUL REY':'#1d4ed8', 'AZUL TURQUESA':'#06b6d4', 'CELESTE':'#7dd3fc',
    'ROJO':'#ef4444', 'VINOTINTO':'#7f1d1d', 'BORGOÑA':'#4c0519', 'ROSA':'#f472b6', 'ROSA PALO':'#dbadad', 'FUCSIA':'#d946ef',
    'VERDE':'#22c55e', 'VERDE MILITAR':'#3f6212', 'VERDE MENTA':'#86efac', 'OLIVA':'#65a30d',
    'AMARILLO':'#eab308', 'NARANJA':'#f97316', 'MORADO':'#a855f7', 'LILA':'#d8b4fe',
    'BEIGE':'#f5f5dc', 'BEIGE OSCURO':'#d2b48c', 'MARRON':'#78350f', 'MARRON CLARO':'#a16207', 'CAFE':'#451a03',
    'CREMA':'#fffdd0', 'CORAL':'#fb7185', 'SALMON':'#fda4af', 'MOSTAZA':'#ca8a04', 'TURQUESA':'#2dd4bf'
  };
  const k=(n||'').toUpperCase().trim();
  if(CM[k]) return CM[k];
  // Probar con la última palabra (ej: "AZUL MARINO" -> "MARINO" si no hay match completo)
  // O simplemente match parcial
  const found = Object.keys(CM).find(color => k.includes(color));
  if(found) return CM[found];
  return CM[k.split(' ')[0]] || '#9ca3af';
}

export default function ModalNueva({ onClose, onSave, clientes=[], productos=[], initialDraft=null, isAdmin, usuariosDB=[] }) {
  const [fase, setFase] = useState(1);
  const RECOVERY_KEY = 'moditex_nueva_comanda_autosave';
  const DRAFTS_KEY = 'moditex_comandas_espera';
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

  const [activeDraftId, setActiveDraftId] = useState(null);
  const [borradoresEnEspera, setBorradoresEnEspera] = useState([]);

  // Cargar borradores en espera (los de la lista persistente)
  const cargarBorradoresPersistentes = () => {
    const list = JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]');
    setBorradoresEnEspera(list);
  };

  useEffect(() => {
    cargarBorradoresPersistentes();
  }, []);

  // Carga de borradores (Oficiales o de Emergencia)
  useEffect(() => {
    if (initialDraft) {
      if (initialDraft.id) setActiveDraftId(initialDraft.id); // Guardar el ID del borrador activo
      if (initialDraft.cliente) {
        setCliente_tipo('existente');
        setCliente_id(initialDraft.cliente.id || '');
        setCliente_nombre(initialDraft.cliente.nombre || '');
        setCliente_cedula(initialDraft.cliente.cedula || '');
        setCliente_telefono(initialDraft.cliente.telefono || '');
      } else {
        setCliente_nombre(initialDraft.cliente_nombre || initialDraft.cliQuery || '');
        setCliente_cedula(initialDraft.cliente_cedula || '');
      }
      if (initialDraft.items) setItems(initialDraft.items);
      if (initialDraft.notas) setNotas(initialDraft.notas);
      setFase(initialDraft.items?.length ? 2 : 1);
    } else {
      const saved = localStorage.getItem(RECOVERY_KEY);
      if (saved) {
        try {
          const d = JSON.parse(saved);
          if (d.id) setActiveDraftId(d.id);
          if (d.items?.length) setItems(d.items);
          if (d.cliente_id) setCliente_id(d.cliente_id);
          if (d.cliente_tipo) setCliente_tipo(d.cliente_tipo);
          if (d.cliente_nombre) setCliente_nombre(d.cliente_nombre);
          if (d.cliente_cedula) setCliente_cedula(d.cliente_cedula);
          if (d.cliente_telefono) setCliente_telefono(d.cliente_telefono);
          if (d.cliente_email) setCliente_email(d.cliente_email);
          if (d.cliente_ciudad) setCliente_ciudad(d.cliente_ciudad);
          if (d.notas) setNotas(d.notas);
          if (d.fase) setFase(d.fase);
        } catch (e) {}
      }
    }
  }, [initialDraft]);

  // Auto-guardado
  useEffect(() => {
    if (items.length > 0 || cliente_id || cliente_nombre) {
      const draft = { 
        id: activeDraftId,
        items, cliente_id, cliente_tipo, cliente_nombre, cliente_cedula, cliente_telefono, cliente_email, cliente_ciudad, notas, fase,
        timestamp: Date.now() 
      };
      localStorage.setItem(RECOVERY_KEY, JSON.stringify(draft));
    }
  }, [items, cliente_id, cliente_tipo, cliente_nombre, cliente_cedula, cliente_telefono, cliente_email, cliente_ciudad, notas, fase, activeDraftId]);

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

  const itemsAgrupados = useMemo(() => {
    const grupos = [];
    const map = {};
    itemsEnriquecidos.forEach((it, idx) => {
      const mod = it.modelo || 'Sin Modelo';
      if (!map[mod]) {
        map[mod] = { modelo: mod, items: [] };
        grupos.push(map[mod]);
      }
      map[mod].items.push({ ...it, originalIdx: idx });
    });
    return grupos;
  }, [itemsEnriquecidos]);

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
    const list = JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]');
    const clientName = cliente_nombre || (cliente_tipo === 'existente' ? clientes.find(c => c.id == cliente_id)?.nombre : '');
    const nuevo = { 
      id: activeDraftId || Date.now(), 
      cliente: { id: cliente_id, nombre: clientName || '', cedula: cliente_cedula, telefono: cliente_telefono }, 
      items, 
      notas, 
      fecha: new Date().toISOString() 
    };
    localStorage.setItem(DRAFTS_KEY, JSON.stringify([nuevo, ...list]));
    localStorage.removeItem(RECOVERY_KEY); // IMPORTANTE: Limpiar el autosave al poner en espera
    onClose();
  };

  const limpiarYNueva = () => {
    if (items.length > 0 && !window.confirm('¿Seguro que quieres descartar este borrador actual y empezar uno nuevo?')) return;
    localStorage.removeItem(RECOVERY_KEY);
    setItems([]);
    setCliente_id('');
    setCliente_nombre('');
    setCliente_cedula('');
    setCliente_telefono('');
    setNotas('');
    setFase(1);
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
    const finalName = cliente_nombre || (cliente_tipo === 'existente' ? clientes.find(c => c.id == cliente_id)?.nombre : '');
    const payload = {
      cliente_nombre: finalName || 'Sin Nombre',
      cliente_cedula: cliente_cedula || (cliente_tipo === 'existente' ? clientes.find(c => c.id == cliente_id)?.cedula : '') || 'S/C',
      cliente_email: cliente_email || (cliente_tipo === 'existente' ? clientes.find(c => c.id == cliente_id)?.email : ''),
      cliente_ciudad: cliente_ciudad || (cliente_tipo === 'existente' ? clientes.find(c => c.id == cliente_id)?.ciudad : ''),
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

    if (res.ok) { 
      // 1. Limpiar el auto-guardado
      localStorage.removeItem(RECOVERY_KEY);
      
      // 2. Si venía de la lista de espera, eliminarlo de allí también
      if (activeDraftId) {
        const list = JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]');
        const next = list.filter(d => d.id !== activeDraftId);
        localStorage.setItem(DRAFTS_KEY, JSON.stringify(next));
      }
      
      onSave(); 
      onClose(); 
    } else { setErr(res.error); setSaving(false); }
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
    <div className="modal-overlay" onClick={onClose} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',display:'flex',alignItems:'stretch',justifyContent:'stretch',zIndex:1000, overflow:'hidden', overscrollBehavior:'contain'}}>
      <div className="modal-content" onClick={e=>e.stopPropagation()} style={{background:'var(--bg)',width:'100%',height:'100%',borderRadius:'0',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'none'}}>
        
        {/* HEADER */}
        <div className="modal-header-responsive" style={{padding:'10px 20px',background:'var(--surface)',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div style={{display:'flex', alignItems:'center', gap:'20px'}}>
            <h3 className="modal-title-responsive" style={{margin:0,fontFamily:'Playfair Display,serif',fontSize:'18px'}}>Nueva Comanda</h3>
            <div className="phases-container-responsive" style={{display:'flex',gap:'12px',overflowX:'auto'}}>
               {[1,2,3].map(n => (
                 <div key={n} style={{display:'flex',alignItems:'center',gap:'6px',opacity:fase===n?1:0.4,flexShrink:0}}>
                   <span style={{width:'20px',height:'20px',borderRadius:'50%',background:fase>=n?'var(--ink)':'#ccc',color:'#fff',fontSize:'10px',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>{n}</span>
                   <span className="phase-text-responsive" style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'.1em'}}>{n===1?'Cliente':n===2?'Productos':'Pago/Notas'}</span>
                 </div>
               ))}
            </div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:'20px',cursor:'pointer',opacity:0.5,padding:'10px'}}>✕</button>
        </div>

        {/* BODY */}
        <div style={{flex:1,overflowY:fase===2?'hidden':'auto',padding:fase===2?'0':'20px 25px',display:'flex',flexDirection:'column',gap:fase===2?'0':'15px', minHeight:0}}>
          {err && <div style={{padding:'12px',background:'var(--red-soft)',color:'var(--red)',borderRadius:'8px',fontSize:'13px',border:'1px solid var(--red)'}}>⚠️ {err}</div>}

          {fase === 1 && (
            <div style={{maxWidth:'600px',margin:'0 auto',width:'100%',display:'flex',flexDirection:'column',gap:'20px',animation:'fadeIn 0.3s ease-out'}}>
              
              {/* LISTA DE BORRADORES EN ESPERA (SI HAY) */}
              {borradoresEnEspera.length > 0 && (
                <div style={{background:'rgba(245,158,11,0.05)', border:'1.5px dashed #f59e0b', borderRadius:'16px', padding:'15px', display:'flex', flexDirection:'column', gap:'10px'}}>
                   <div style={{...lbl, color:'#f59e0b', fontWeight:900, display:'flex', justifyContent:'space-between'}}>
                      <span>⏸ COMANDAS EN ESPERA ({borradoresEnEspera.length})</span>
                      <span style={{fontSize:'7px'}}>RECUÉRALAS PARA CONTINUAR</span>
                   </div>
                   <div style={{display:'flex', gap:'10px', overflowX:'auto', paddingBottom:'8px', paddingTop:'5px'}} className="custom-scrollbar">
                      {borradoresEnEspera.map(b => {
                        const date = new Date(b.id);
                        const isToday = date.toDateString() === new Date().toDateString();
                        const dateStr = isToday ? date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : date.toLocaleDateString([], {day:'2-digit', month:'2-digit'});
                        
                        return (
                          <div key={b.id} style={{position:'relative', minWidth:'180px', flexShrink:0}}>
                             <div onClick={() => {
                                setActiveDraftId(b.id);
                                setItems(b.items || []);
                                setCliente_id(b.cliente?.id || '');
                                setCliente_nombre(b.cliente?.nombre || '');
                                setCliente_cedula(b.cliente?.cedula || '');
                                setCliente_telefono(b.cliente?.telefono || '');
                                setNotas(b.notas || '');
                                setFase(b.items?.length ? 2 : 1);
                             }} style={{
                                background:'#fff', border:'1px solid var(--border)', borderRadius:'12px', padding:'12px', cursor:'pointer', boxShadow:'0 4px 12px rgba(0,0,0,0.06)', transition:'all 0.2s', borderLeft:'4px solid #f59e0b'
                             }} onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.borderColor='#f59e0b';}} onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.borderColor='var(--border)';}}>
                                <div style={{fontSize:'12px', fontWeight:900, color:b.cliente?.nombre ? 'var(--ink)' : '#aaa', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom:'4px'}}>{b.cliente?.nombre || 'Sin Nombre'}</div>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                   <div style={{fontSize:'10px', color:'var(--blue)', fontWeight:700, background:'var(--blue-soft)', padding:'1px 6px', borderRadius:'4px'}}>📦 {b.items?.length || 0} ítems</div>
                                   <div style={{fontSize:'9px', color:'#999', fontFamily:'DM Mono,monospace', fontWeight:600}}>🕒 {dateStr}</div>
                                </div>
                             </div>
                             <button 
                               onClick={(e) => {
                                  e.stopPropagation();
                                  if(confirm('¿Eliminar este borrador?')) {
                                     const next = borradoresEnEspera.filter(x => x.id !== b.id);
                                     localStorage.setItem(DRAFTS_KEY, JSON.stringify(next));
                                     setBorradoresEnEspera(next);
                                     if(activeDraftId === b.id) setActiveDraftId(null);
                                  }
                               }}
                               style={{position:'absolute', top:'-6px', right:'-6px', width:'22px', height:'22px', borderRadius:'50%', background:'#ef4444', color:'#fff', border:'2px solid #fff', fontSize:'10px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 6px rgba(239,68,68,0.4)', zIndex:10}}
                               title="Eliminar borrador"
                             >✕</button>
                          </div>
                        );
                      })}
                   </div>
                </div>
              )}

              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end'}}>
                <div style={{flex:1}}>
                  <label style={lbl}>Tipo de Cliente</label>
                  <div style={{display:'flex',gap:'10px'}}>
                    <button onClick={()=>setCliente_tipo('nuevo')} style={{flex:1,padding:'12px',borderRadius:'10px',border:`1.5px solid ${cliente_tipo==='nuevo'?'var(--ink)':'var(--border)'}`,background:cliente_tipo==='nuevo'?'var(--ink)':'#fff',color:cliente_tipo==='nuevo'?'#fff':'#333',transition:'all 0.2s',cursor:'pointer',fontWeight:700,fontSize:'12px'}}>👤 Cliente Nuevo</button>
                    <button onClick={()=>setCliente_tipo('existente')} style={{flex:1,padding:'12px',borderRadius:'10px',border:`1.5px solid ${cliente_tipo==='existente'?'var(--ink)':'var(--border)'}`,background:cliente_tipo==='existente'?'var(--ink)':'#fff',color:cliente_tipo==='existente'?'#fff':'#333',transition:'all 0.2s',cursor:'pointer',fontWeight:700,fontSize:'12px'}}>📂 Lista de Clientes</button>
                  </div>
                </div>
                {(items.length > 0 || cliente_nombre) && (
                  <button onClick={limpiarYNueva} style={{marginBottom:'2px', marginLeft:'15px', padding:'10px 15px', borderRadius:'10px', background:'var(--red-soft)', color:'var(--red)', border:'1px solid var(--red)', fontSize:'10px', fontWeight:800, cursor:'pointer'}}>
                    ✨ LIMPIAR FORMULARIO
                  </button>
                )}
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
             <div className="phase-2-grid-responsive" style={{display:'flex', gap:'20px', height:'100%', width:'100%', animation:'fadeIn 0.4s ease-out', overflow:'hidden', minHeight:0}}>
               {/* COLUMNA CATALOGO */}
               <div style={{flex:1, display:'flex', flexDirection:'column', gap:'20px', overflowY:'auto', padding:'20px', height:'100%', minHeight:0, minWidth:0}}>
                  {/* SCANNER POS (USB + CAMARA + MULTIPLICADOR) - STICKY */}
                  <div style={{position:'sticky', top:0, zIndex:100, background:'var(--bg)', padding:'8px 12px', borderRadius:'12px', border:'1.5px solid var(--border)', boxShadow:'0 5px 15px rgba(0,0,0,0.05)', marginBottom:'10px', flexShrink:0}}>
                    <BarcodeScanner 
                      productos={productos} 
                      onAdd={(p, qty) => agregarItem({ ...p, cant: qty })} 
                    />
                  </div>

                  <div style={{display:'flex', flexDirection:'column', flex:1, minHeight:0}}>
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
               </div>
               
               {/* COLUMNA CARRITO */}
               <div style={{width:'380px', height:'100%', padding:'20px', display:'flex', flexDirection:'column', background:'var(--bg2)', borderLeft:'1px solid var(--border)', minHeight:0, flexShrink:0}}>
                  <div style={{flex:1, background:'var(--surface)',borderRadius:'20px',border:'1px solid var(--border)',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 15px 35px rgba(0,0,0,0.1)', minHeight:0}}>
                    <div style={{padding:'12px 20px',background:'var(--ink)',color:'#fff',display:'flex',justifyContent:'space-between',alignItems:'center', flexShrink:0}}>
                      <div style={{display:'flex', flexDirection:'column'}}>
                        <span style={{fontSize:'10px',fontWeight:800,letterSpacing:'.12em',textTransform:'uppercase'}}>Resumen de Venta</span>
                        {globalTasa > 0 && (
                          <Link href="/tasa" style={{
                            fontSize:'11px', 
                            color:'#fbbf24', 
                            fontFamily:'DM Mono,monospace', 
                            marginTop:'2px', 
                            fontWeight:900, 
                            letterSpacing:'.02em',
                            textDecoration:'none',
                            cursor:'pointer'
                          }}>
                            TASA: {globalTasa.toFixed(2)} Bs/€
                          </Link>
                        )}
                      </div>
                      <span style={{background:'rgba(255,255,255,0.15)',padding:'3px 8px',borderRadius:'5px',fontSize:'9px',fontWeight:800,fontFamily:'DM Mono,monospace'}}>{items.length} SKUS</span>
                    </div>

                    {/* TOTALES POS PREMIUM */}
                    <div style={{padding:'10px 15px', background:'var(--bg2)', borderBottom:'1px solid var(--border)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', flexShrink:0}}>
                      <div style={{textAlign:'center', padding:'6px', background:'#fff', borderRadius:'10px', border:'1.5px solid var(--border)', boxShadow:'0 2px 4px rgba(0,0,0,0.02)'}}>
                        <div style={{...lbl,fontSize:'7px',marginBottom:'0px'}}>Prendas</div>
                        <div style={{fontSize:'18px', fontWeight:900, color:'var(--ink)', fontFamily:'Inter,sans-serif'}}>{items.reduce((a,b)=>a+(b.cant||1),0)}</div>
                      </div>
                      <div style={{textAlign:'center', padding:'6px', background:'#fff', borderRadius:'10px', border:'1.5px solid var(--border)', boxShadow:'0 2px 4px rgba(0,0,0,0.02)'}}>
                        <div style={{...lbl,fontSize:'7px',marginBottom:'0px'}}>Total Venta</div>
                        <div style={{fontSize:'18px', fontWeight:900, color:'var(--green)', fontFamily:'Inter,sans-serif'}}>€{fmtNum(totalComanda)}</div>
                        {globalTasa > 0 && <div style={{fontSize:'9px', fontWeight:700, color:'#888', fontFamily:'DM Mono,monospace', marginTop:'1px'}}>≈ Bs. {fmtNum(totalComanda * globalTasa)}</div>}
                      </div>
                    </div>

                    {/* LISTA DE ITEMS CON SCROLL INDEPENDIENTE */}
                    <div style={{flex:1, overflowY:'auto', padding:'15px', display:'flex', flexDirection:'column', gap:'10px', minHeight:0}}>
                      {items.length === 0 ? (
                        <div style={{textAlign:'center',padding:'80px 20px',opacity:0.6, flex:1, display:'flex', flexDirection:'column', justifyContent:'center'}}>
                          <div style={{fontSize:'48px', marginBottom:'15px'}}>🛍️</div>
                          <div style={{fontSize:'14px', fontWeight:600, color:'#888'}}>La cesta está vacía</div>
                        </div>
                      ) : (
                        itemsAgrupados.map((grupo, gIdx) => (
                          <div key={gIdx} style={{background:'#fff', borderRadius:'14px', border:'1px solid var(--border-soft)', overflow:'hidden', marginBottom:'4px', boxShadow:'0 4px 12px rgba(0,0,0,0.03)', flexShrink:0}}>
                             {/* HEADER DEL MODELO */}
                             <div style={{padding:'8px 12px', background:'var(--bg2)', borderBottom:'1px solid var(--border-soft)', display:'flex', alignItems:'center', gap:'8px'}}>
                                <div style={{width:'24px',height:'24px',borderRadius:'6px',background:'var(--ink)',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:900}}>
                                   {grupo.modelo?.slice(0,1)}
                                </div>
                                <div style={{fontSize:'11px', fontWeight:800, color:'var(--ink)', textTransform:'uppercase', letterSpacing:'.05em'}}>{grupo.modelo}</div>
                             </div>

                             {/* VARIANTES (HIJOS) */}
                             <div style={{display:'flex', flexDirection:'column'}}>
                                {grupo.items.map((it, iIdx) => (
                                  <div key={iIdx} style={{padding:'10px 12px', borderBottom:iIdx === grupo.items.length - 1 ? 'none' : '1px solid var(--border-soft)', display:'flex', flexDirection:'column', gap:'6px'}}>
                                     <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                                        <div style={{width:'12px', height:'12px', borderRadius:'50%', background:colorHex(it.color), border:'1px solid rgba(0,0,0,0.1)', flexShrink:0}} />
                                        <div style={{flex:1, minWidth:0}}>
                                           <div style={{fontSize:'11px', fontWeight:800, color:'var(--ink)', textTransform:'uppercase', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{it.color} {it.talla && `· T:${it.talla}`}</div>
                                           <div style={{fontSize:'10px', color:'var(--blue)', fontWeight:700, marginTop:'1px'}}>€{fmtNum(it.precio_aplicado)}/ud</div>
                                        </div>
                                        
                                        <div style={{display:'flex', alignItems:'center', gap:'2px', background:'var(--bg3)', padding:'3px', borderRadius:'8px', flexShrink:0, border:'1px solid var(--border)'}}>
                                           <button onClick={()=>quitarItem(it.originalIdx)} style={{width:'24px',height:'24px',borderRadius:'6px',border:'none',background:'#fff',cursor:'pointer',fontSize:'12px',fontWeight:900,boxShadow:'0 2px 4px rgba(0,0,0,0.05)'}}>–</button>
                                           <input 
                                             type="number" 
                                             value={it.cant} 
                                             onChange={e => setCantItem(it.sku, e.target.value)}
                                             style={{width:'32px', textAlign:'center', border:'none', background:'none', fontFamily:'DM Mono,monospace', fontWeight:900, fontSize:'12px', outline:'none'}}
                                           />
                                           <button onClick={()=>agregarItem(it, 1)} style={{width:'24px',height:'24px',borderRadius:'6px',border:'none',background:'#fff',cursor:'pointer',fontSize:'12px',fontWeight:900,boxShadow:'0 2px 4px rgba(0,0,0,0.05)'}}>+</button>
                                        </div>
                                        
                                        <div style={{fontSize:'12px', fontWeight:900, color:'var(--ink)', minWidth:'55px', textAlign:'right', fontFamily:'DM Mono,monospace'}}>€{fmtNum(it.subtotal)}</div>
                                     </div>
                                     
                                     {/* REGLA DE PRECIO POR VARIANTE */}
                                     <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                        <button onClick={()=>toggleTipoVenta(it.originalIdx)} style={{
                                           background:'var(--surface)',
                                           border:'1px solid var(--border-strong)',
                                           padding:'1px 5px',
                                           borderRadius:'4px',
                                           fontSize:'8px',
                                           fontWeight:800,
                                           cursor:'pointer',
                                           textTransform:'uppercase'
                                        }}>
                                           {it.tipo_precio_resultado === 'MAYOR' && '🏢 Mayor'}
                                           {it.tipo_precio_resultado === 'DETAL' && '👤 Detal'}
                                           {it.tipo_precio_resultado === 'MAYOR_FORZADO' && '🏢 Mayor (F)'}
                                           {it.tipo_precio_resultado === 'DETAL_FORZADO' && '👤 Detal (F)'}
                                        </button>
                                        {it.ahorro_unitario > 0 && (
                                           <span style={{fontSize:'8px', color:'var(--green)', fontWeight:800, background:'var(--green-soft)', padding:'1px 5px', borderRadius:'4px'}}>Ahorras: €{fmtNum(it.ahorro_unitario)}</span>
                                        )}
                                     </div>
                                  </div>
                                ))}
                             </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
               </div>
             </div>
          )}

          {fase === 3 && (
            <div style={{maxWidth:'700px',margin:'0 auto',width:'100%',display:'flex',flexDirection:'column',gap:'15px',animation:'fadeIn 0.4s'}}>
               <div className="phase-3-top-grid-responsive" style={{background:'var(--surface)',padding:'18px',borderRadius:'16px',border:'1px solid var(--border)',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'15px'}}>
                  <div>
                    <label style={{...lbl,marginBottom:'10px'}}>Agencia / Entrega</label>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px'}}>
                      {[
                        {val:'',      icon:'🏠', label:'Retiro'},
                        {val:'MRW',   icon:'📦', label:'MRW'},
                        {val:'ZOOM',  icon:'🚚', label:'Zoom'},
                        {val:'TEALCA',icon:'🚢', label:'Tealca'},
                        {val:'MOTORIZADO',icon:'🛵', label:'Delivery'},
                        {val:'OTRO',  icon:'📝', label:'Otro'},
                      ].map(op => (
                        <button
                          key={op.val}
                          onClick={() => setAgencia_envio(op.val)}
                          style={{
                            padding:'8px 4px',
                            borderRadius:'10px',
                            border:`1.5px solid ${agencia_envio===op.val?'var(--ink)':'var(--border)'}`,
                            background:agencia_envio===op.val?'var(--ink)':'#fff',
                            color:agencia_envio===op.val?'#fff':'#333',
                            cursor:'pointer',
                            fontSize:'9px',
                            fontWeight:700,
                            textAlign:'center',
                            transition:'all 0.15s',
                            display:'flex',
                            flexDirection:'column',
                            alignItems:'center',
                            gap:'3px',
                          }}
                        >
                          <span style={{fontSize:'18px'}}>{op.icon}</span>
                          <span>{op.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{...lbl,marginBottom:'6px'}}>Notas de Preparación</label>
                    <textarea value={notas} onChange={e=>setNotas(e.target.value)} style={{...inp,borderRadius:'10px',height:'108px',resize:'none',paddingTop:'10px'}} placeholder="Ej: Embalar con cuidado..."/>
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
                  <div style={{background:'var(--bg2)',padding:'15px',borderRadius:'12px',border:'1px dashed var(--border-strong)'}}>
                    {/* REJILLA DE METODOS - Estilo Venta Directa */}
                    <label style={{...lbl,marginBottom:'10px'}}>Método de Pago</label>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px',marginBottom:'15px'}}>
                      {METODOS.map(m => (
                        <button
                          key={m.id}
                          onClick={() => { setPago_metodo(m.id); setPago_divisa(m.divisa); setPago_tasa(globalTasa); }}
                          style={{
                            padding:'10px 4px',
                            border:`1.5px solid ${pago_metodo===m.id?'var(--ink)':'var(--border)'}`,
                            background:pago_metodo===m.id?'var(--ink)':'#fff',
                            color:pago_metodo===m.id?'#fff':'#333',
                            borderRadius:'10px',
                            cursor:'pointer',
                            fontSize:'9px',
                            fontWeight:700,
                            textAlign:'center',
                            transition:'all 0.15s',
                            display:'flex',
                            flexDirection:'column',
                            alignItems:'center',
                            gap:'3px',
                          }}
                        >
                          <span style={{fontSize:'20px'}}>{m.icon}</span>
                          <span>{m.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* CAMPOS MONTO / REF / TASA / BOTON - sin cambios logicos */}
                    <div className="pago-form-grid-responsive" style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:'10px',alignItems:'flex-end'}}>
                      <div>
                        <label style={lbl}>Monto ({pago_divisa})</label>
                        <div style={{display:'flex',gap:'4px'}}>
                          <select value={pago_divisa} onChange={e=>setPago_divisa(e.target.value)} style={{...inp,width:'65px',borderRadius:'8px',height:'36px'}}><option>EUR</option><option>USD</option><option>BS</option></select>
                          <input type="number" value={pago_monto} onChange={e=>setPago_monto(e.target.value)} style={{...inp,borderRadius:'8px',height:'36px'}} placeholder="0.00"/>
                        </div>
                      </div>
                      <div className="pago-form-second-row-responsive">
                        <label style={lbl}>Ref / Tasa</label>
                        <div style={{display:'flex',gap:'4px'}}>
                          <input value={pago_referencia} onChange={e=>setPago_referencia(e.target.value)} style={{...inp,borderRadius:'8px',height:'36px',flex:1}} placeholder="Ref..."/>
                          <input type="number" value={pago_tasa} onChange={e=>setPago_tasa(e.target.value)} disabled={pago_divisa!=='BS'} style={{...inp,width:'72px',borderRadius:'8px',height:'36px',opacity:pago_divisa!=='BS'?.4:1}} placeholder="Tasa"/>
                        </div>
                      </div>
                      <button className="pago-form-button-responsive" onClick={agregarPagoALista} disabled={!pago_metodo || !pago_monto} style={{height:'36px',background:'var(--ink)',color:'#fff',border:'none',padding:'0 18px',borderRadius:'8px',fontWeight:800,cursor:'pointer',opacity:(!pago_metodo||!pago_monto)?0.4:1,fontSize:'12px',transition:'opacity 0.2s'}}>
                        + Añadir
                      </button>
                    </div>
                  </div>

                  {/* RESUMEN DE SALDOS */}
                  <div className="saldos-grid-responsive" style={{marginTop:'15px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px'}}>
                     <div style={{background:'var(--surface)', padding:'12px 10px', borderRadius:'14px', border:'1.5px solid var(--border)', textAlign:'center', boxShadow:'0 4px 12px rgba(0,0,0,0.04)'}}>
                        <div style={lbl}>Total Orden</div>
                        <div style={{fontSize:'16px', fontWeight:900, color:'var(--ink)', fontFamily:'Inter,sans-serif'}}>€{fmtNum(totalComanda)}</div>
                        {globalTasa > 0 && <div style={{fontSize:'8px', color:'#888', fontWeight:700, marginTop:'2px'}}>Bs. {fmtNum(totalComanda * globalTasa)}</div>}
                     </div>
                     <div style={{background:'var(--green-soft)', padding:'12px 10px', borderRadius:'14px', border:'1.5px solid var(--green)', textAlign:'center', boxShadow:'0 4px 12px rgba(26,122,60,0.08)'}}>
                        <div style={lbl}>Total Pagado</div>
                        <div style={{fontSize:'16px', fontWeight:900, color:'var(--green)', fontFamily:'Inter,sans-serif'}}>€{fmtNum(totalPagado)}</div>
                     </div>
                     <div style={{
                        background: resta > 0.01 ? 'rgba(245,158,11,0.07)' : (resta < -0.01 ? 'rgba(16,185,129,0.07)' : 'var(--bg2)'), 
                        padding:'12px 10px', 
                        borderRadius:'14px', 
                        border:`1.5px solid ${resta > 0.01 ? '#f59e0b' : (resta < -0.01 ? '#10b981' : 'var(--border)')}`, 
                        textAlign:'center',
                        boxShadow: resta > 0.01 ? '0 4px 12px rgba(245,158,11,0.12)' : '0 4px 12px rgba(0,0,0,0.04)',
                        transition:'all 0.3s'
                     }}>
                        <div className="lbl-saldo-responsive" style={lbl}>{resta > 0.01 ? 'Falta por Pagar' : (resta < -0.01 ? 'Vuelto / Excedente' : 'Saldada ✓')}</div>
                        <div style={{fontSize:'16px', fontWeight:900, color: resta > 0.01 ? '#f59e0b' : (resta < -0.01 ? '#10b981' : 'var(--green)'), fontFamily:'Inter,sans-serif'}}>
                           {resta === 0 ? '✓' : `€${fmtNum(Math.abs(resta))}`}
                        </div>
                        {resta > 0.01 && globalTasa > 0 && <div style={{fontSize:'8px',color:'#a16207',fontWeight:700,marginTop:'2px'}}>Bs. {fmtNum(resta * globalTasa)}</div>}
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
                    { (Array.isArray(usuariosDB) ? usuariosDB : []).filter(u => u && u.rol === 'admin' && u.activo).map(u => (
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
        <div className="modal-footer-responsive" style={{padding:'10px 20px',background:'var(--surface)',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'space-between', flexShrink:0}}>
          <div style={{display:'flex', gap:'8px'}}>
            <button className="footer-btn-borrador-responsive" onClick={guardarBorrador} style={{background:'none',border:'1px solid var(--border)',padding:'8px 15px',borderRadius:'8px',fontSize:'12px',fontWeight:600,cursor:'pointer'}}>En Espera</button>
            <button onClick={()=>{ if(confirm('¿Descartar esta comanda?')){ localStorage.removeItem('moditex_comanda_recuperacion'); onClose(); } }} style={{background:'none',border:'1px solid var(--red)',color:'var(--red)',padding:'8px 15px',borderRadius:'8px',fontSize:'11px',fontWeight:700,cursor:'pointer'}}>Descartar</button>
          </div>
          
          <div className="footer-btns-right-responsive" style={{display:'flex',gap:'10px'}}>
            {fase > 1 && <button className="footer-btn-prev-responsive" onClick={()=>setFase(fase-1)} style={{background:'none',border:'1px solid var(--border)',padding:'8px 20px',borderRadius:'8px',fontSize:'12px',fontWeight:600,cursor:'pointer'}}>Anterior</button>}
            {fase < 3 ? (
              <button className="footer-btn-next-responsive" onClick={avanzarFase} style={{background:'var(--ink)',color:'#fff',border:'none',padding:'8px 25px',borderRadius:'8px',fontSize:'12px',fontWeight:700,cursor:'pointer'}}>Siguiente</button>
            ) : (
              <div className="footer-final-btns-responsive" style={{display:'flex',gap:'8px'}}>
                <button className="footer-btn-empacar-responsive" onClick={()=>crearComanda(true)} disabled={saving} style={{background:'var(--green-soft)',color:'var(--green)',border:'1px solid var(--green)',padding:'8px 20px',borderRadius:'8px',fontSize:'12px',fontWeight:800,cursor:'pointer',opacity:saving?0.5:1}}>
                   + EMPACAR
                </button>
                <button className="footer-btn-finalizar-responsive" onClick={()=>crearComanda(false)} disabled={saving} style={{background:'var(--green)',color:'#fff',border:'none',padding:'8px 25px',borderRadius:'8px',fontSize:'12px',fontWeight:900,cursor:'pointer',opacity:saving?0.5:1}}>
                   FINALIZAR
                </button>
              </div>
            )}
          </div>
        </div>
        <style dangerouslySetInnerHTML={{__html:`
          .search-result-item:hover { background: var(--bg2) !important; }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes fadeInSlide { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

          /* MEDIA QUERIES PARA MOBILE */
          @media (max-width: 600px) {
            .modal-content {
              height: 100vh !important;
              max-height: 100vh !important;
              border-radius: 0 !important;
            }
            .modal-header-responsive { padding: 15px !important; }
            .modal-title-responsive { font-size: 18px !important; }
            .phase-text-responsive { display: none !important; }
            
            .phase-2-grid-responsive {
              grid-template-columns: 1fr !important;
              display: flex !important;
              flex-direction: column !important;
            }
            
            .phase-3-top-grid-responsive {
              grid-template-columns: 1fr !important;
            }
            
            .pago-form-grid-responsive {
              display: flex !important;
              flex-direction: column !important;
              gap: 12px !important;
            }
            .pago-form-grid-responsive > div {
              width: 100% !important;
            }
            .pago-form-second-row-responsive { width: 100% !important; display: flex !important; flex-direction: column !important; gap: 10px !important; }
            .pago-form-button-responsive { width: 100% !important; height: 50px !important; margin-top: 5px; font-size: 14px !important; }
            
            .saldos-grid-responsive {
              grid-template-columns: 1fr 1fr !important;
            }
            .lbl-saldo-responsive { font-size: 7px !important; }

            .modal-footer-responsive {
              flex-direction: column !important;
              gap: 15px !important;
              padding: 15px !important;
            }
            .footer-btn-borrador-responsive { width: 100% !important; order: 2; }
            .footer-btns-right-responsive { width: 100% !important; order: 1; gap: 8px !important; }
            .footer-btn-prev-responsive { flex: 1 !important; padding: 12px 10px !important; }
            .footer-btn-next-responsive { flex: 2 !important; }
            .footer-final-btns-responsive { width: 100% !important; }
            .footer-btn-empacar-responsive { flex: 1 !important; padding: 12px 5px !important; font-size: 11px !important; }
            .footer-btn-finalizar-responsive { flex: 1.5 !important; padding: 12px 5px !important; font-size: 11px !important; }
          }
        `}}/>
        <style dangerouslySetInnerHTML={{__html:`
          @media (max-width: 800px) {
            .comanda-expanded-grid-responsive {
              grid-template-columns: 1fr !important;
              gap: 15px !important;
              padding: 10px !important;
            }
            .chat-container-responsive {
              height: 380px !important;
            }
          }
        `}}/>
      </div>
    </div>
  );
}
