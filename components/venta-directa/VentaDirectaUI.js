'use client';
import React, { useState, useMemo, useEffect } from 'react';
import BarcodeScanner from '@/components/BarcodeScanner';
import CatalogoExplorer from '@/components/CatalogoExplorer';
import ModalPromo from '@/components/ModalPromo';
import { calcularPreciosCarrito } from '@/lib/precioMayorista';
import { useAuth } from '@/lib/AuthContext';

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
function colorHex(n){
  const CM={'BLANCO':'#ffffff','NEGRO':'#1a1a1a','GRIS':'#9ca3af','AZUL':'#3b82f6','ROJO':'#ef4444','VERDE':'#22c55e','AMARILLO':'#eab308','NARANJA':'#f97316','MORADO':'#a855f7','BEIGE':'#f5f5dc','MARRON':'#78350f'};
  const k=(n||'').toUpperCase().trim();
  const found = Object.keys(CM).find(color => k.includes(color));
  return CM[found] || CM[k.split(' ')[0]] || '#9ca3af';
}

const VD_COLOR = '#7c3aed'; // Violeta Eléctrico para Venta Directa
const VD_COLOR_SOFT = 'rgba(124, 58, 237, 0.08)';

export default function VentaDirectaUI({ clientes=[], productos=[], onSave }) {
  const { usuario } = useAuth() || {};
  const isAdmin = usuario?.rol === 'admin';
  const [tasaDesbloqueada, setTasaDesbloqueada] = useState(false);

  const [fase, setFase] = useState(1);
  const RECOVERY_KEY = 'moditex_venta_directa_autosave';
  const DRAFTS_KEY = 'moditex_ventas_espera';
  
  const [activeDraftId, setActiveDraftId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  
  const [cliente_tipo, setCliente_tipo] = useState('nuevo');
  const [cliente_id, setCliente_id] = useState('');
  const [cliente_nombre, setCliente_nombre] = useState('CONSUMIDOR FINAL');
  const [cliente_cedula, setCliente_cedula] = useState('');
  const [cliente_telefono, setCliente_telefono] = useState('');
  const [cliente_email, setCliente_email] = useState('');
  const [cliente_ciudad, setCliente_ciudad] = useState('');
  const [items, setItems] = useState([]);
  const [notas, setNotas] = useState('');
  const [pagosLista, setPagosLista] = useState([]);
  const [globalTasa, setGlobalTasa] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarResultados, setMostrarResultados] = useState(false);

  const [pago_metodo, setPago_metodo] = useState('');
  const [pago_monto, setPago_monto] = useState('');
  const [pago_divisa, setPago_divisa] = useState('EUR');
  const [pago_tasa, setPago_tasa] = useState('');
  const [pago_referencia, setPago_referencia] = useState('');

  const [borradoresEnEspera, setBorradoresEnEspera] = useState([]);
  const timerRef = React.useRef(null);

  // Cargar borradores locales
  const cargarDrafts = () => {
    const list = JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]');
    setBorradoresEnEspera(list);
  };

  useEffect(() => {
    const initApp = async () => {
      let draftToLoad = null;
      
      // 1. Intentar cargar desde la nube
      if (usuario?.email) {
        try {
          const res = await fetch(`/api/borradores?email=${encodeURIComponent(usuario.email)}`).then(r=>r.json());
          if (res.ok && res.borradores?.length) {
             const listEspera = res.borradores.filter(b => b.id !== 'draft-autosave').map(b => b.payload);
             setBorradoresEnEspera(listEspera);
             
             const auto = res.borradores.find(b => b.id === 'draft-autosave');
             if (auto) draftToLoad = auto.payload;
          }
        } catch(e) { console.error('Error nube:', e); }
      }

      // 2. Si no hubo en la nube, recurrir a LocalStorage
      if (!draftToLoad) {
         cargarDrafts();
         const saved = localStorage.getItem(RECOVERY_KEY);
         if (saved) {
           try { draftToLoad = JSON.parse(saved); } catch (e) {}
         }
      }

      // 3. Aplicar al estado
      if (draftToLoad) {
        if (draftToLoad.id && draftToLoad.id !== 'draft-autosave') setActiveDraftId(draftToLoad.id);
        if (draftToLoad.items?.length) setItems(draftToLoad.items);
        if (draftToLoad.cliente_nombre) setCliente_nombre(draftToLoad.cliente_nombre);
        if (draftToLoad.cliente_id) setCliente_id(draftToLoad.cliente_id);
        if (draftToLoad.fase) setFase(draftToLoad.fase);
      }
    };
    if (usuario) initApp();
  }, [usuario]);

  // Auto-guardado con Debounce a la DB
  useEffect(() => {
    if (items.length > 0 || (cliente_nombre && cliente_nombre !== 'CONSUMIDOR FINAL')) {
      const draft = { id: activeDraftId || 'draft-autosave', items, cliente_id, cliente_nombre, cliente_cedula, cliente_telefono, notas, fase, timestamp: Date.now() };
      localStorage.setItem(RECOVERY_KEY, JSON.stringify(draft));
      
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        if (!usuario?.email) return;
        try {
          await fetch('/api/borradores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: 'draft-autosave', email: usuario.email, payload: draft })
          });
        } catch (e) { console.error('Error sync autosave:', e); }
      }, 3000);
    }
  }, [items, cliente_id, cliente_nombre, cliente_cedula, cliente_telefono, notas, fase, activeDraftId, usuario]);

  // Fetch Tasa
  useEffect(() => {
    fetch('/api/tasa').then(r => r.json()).then(d => {
      if (d.ok) {
        const t = d.tasa_bs_eur || d.tasa || 1;
        setGlobalTasa(t); 
        setPago_tasa(t); 
      }
    });
  }, []);

  const itemsEnriquecidos = useMemo(() => {
    // Mapear propiedades para que coincidan con lo que espera el motor precioMayorista.js
    // precioMayorista espera: qty, precio_detal, precio_mayor
    const itemsParaMotor = items.map(it => ({
      ...it,
      qty: it.cant || 1,
      precio_detal: it.precioDetal ?? it.precio_detal ?? 0,
      precio_mayor: it.precioMayor ?? it.precio_mayor ?? 0,
      min_mayorista: it.minMayorista ?? it.min_mayorista ?? 6,
      modelos_min_mayorista: it.modelosMinMayorista ?? it.modelos_min_mayorista ?? 3,
      tipo_precio: it.tipo_precio || 'AUTO'
    }));

    return calcularPreciosCarrito(itemsParaMotor, 0);
  }, [items]);

  const totalVenta = itemsEnriquecidos.reduce((acc, it) => acc + (it.precio_aplicado * (it.qty || 1)), 0);
  const totalPagado = pagosLista.reduce((acc, p) => acc + (p.divisa === 'BS' ? (p.tasa > 0 ? p.monto / p.tasa : 0) : p.monto), 0);
  const falta = Math.max(0, totalVenta - totalPagado);
  const vuelto = Math.max(0, totalPagado - totalVenta);

  const clientesFiltrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    if (!q) return [];
    return (clientes || []).filter(c => 
      (c.nombre || '').toLowerCase().includes(q) || 
      (c.cedula || '').toLowerCase().includes(q) || 
      (c.telefono || '').toLowerCase().includes(q)
    ).slice(0, 10);
  }, [clientes, busqueda]);

  const seleccionarCliente = (c) => {
    setCliente_id(c.id);
    setCliente_nombre(c.nombre);
    setCliente_cedula(c.cedula || '');
    setCliente_telefono(c.telefono || '');
    setCliente_email(c.email || '');
    setCliente_ciudad(c.ciudad || '');
    setBusqueda('');
    setMostrarResultados(false);
  };

  const agregarItem = (it, delta = 1, bypassStock = false) => {
    // Validar stock estricto - Usar 'disponible' que es la propiedad real
    const stockActual = it.disponible ?? it.stock ?? 0;
    const stockTotal = it.stockTotal ?? stockActual;
    const idx = items.findIndex(x => x.sku === it.sku);
    const qtyInCart = idx >= 0 ? (items[idx].cant || 1) : 0;
    const qtyRequested = qtyInCart + delta;
    
    if (!bypassStock && stockActual < qtyRequested) {
      if (stockTotal >= qtyRequested) {
        if (!window.confirm(`Estás vendiendo unidades reservadas para WhatsApp. ¿Deseas continuar?`)) {
          return;
        }
      } else {
        setErr(`⚠️ Sin stock suficiente para ${it.modelo} (${stockActual} disp.)`);
        setTimeout(() => setErr(''), 3000);
        return;
      }
    }

    if (idx >= 0) {
      const next = [...items];
      next[idx].cant = (next[idx].cant || 1) + delta;
      setItems(next);
    } else {
      setItems([...items, { ...it, cant: delta, tipo_precio: 'AUTO', isFactory: bypassStock }]);
    }
  };

  const quitarItem = (sku) => {
    const idx = items.findIndex(x => x.sku === sku);
    if (idx < 0) return;
    const next = [...items];
    if (next[idx].cant > 1) {
      next[idx].cant -= 1;
      setItems(next);
    } else {
      if (confirm('¿Eliminar producto de la cesta?')) {
        setItems(items.filter(x => x.sku !== sku));
      }
    }
  };

  const setCantItem = (sku, val) => {
    const n = parseInt(val) || 0;
    if (n < 1) {
       setItems(items.filter(x => x.sku !== sku));
    } else {
       setItems(items.map(x => x.sku === sku ? { ...x, cant: n } : x));
    }
  };

  const toggleTipoVenta = (sku) => {
    const modes = ['AUTO', 'MAYOR_FORZADO', 'DETAL_FORZADO'];
    setItems(items.map(x => {
      if (x.sku !== sku) return x;
      const curr = x.tipo_precio || 'AUTO';
      const nextIdx = (modes.indexOf(curr) + 1) % modes.length;
      return { ...x, tipo_precio: modes[nextIdx] };
    }));
  };

  const guardarBorrador = async () => {
    const nuevoId = activeDraftId || `draft-${Date.now()}`;
    const nuevo = { id: nuevoId, cliente: { id: cliente_id, nombre: cliente_nombre }, items, notas, fecha: new Date().toISOString() };
    
    // 1. LocalStorage
    const list = JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]');
    const filtered = list.filter(d => d.id !== nuevoId);
    localStorage.setItem(DRAFTS_KEY, JSON.stringify([nuevo, ...filtered]));
    localStorage.removeItem(RECOVERY_KEY);
    
    // 2. DB (Borrador en espera) y limpiar autosave
    if (usuario?.email) {
      await fetch('/api/borradores', { method: 'POST', body: JSON.stringify({ id: nuevoId, email: usuario.email, payload: nuevo }) });
      await fetch(`/api/borradores?id=draft-autosave`, { method: 'DELETE' });
    }
    
    window.location.reload();
  };

  const limpiarFormulario = async () => {
    if (items.length > 0 && !confirm('¿Limpiar venta actual?')) return;
    localStorage.removeItem(RECOVERY_KEY);
    if (usuario?.email) {
      await fetch(`/api/borradores?id=draft-autosave`, { method: 'DELETE' });
    }
    window.location.reload();
  };

  const realizarCobro = async () => {
    if (!items.length) return setErr('No hay productos');
    if (falta > 0.01) return setErr(`Faltan € ${fmtNum(falta)} por pagar`);
    
    setSaving(true);
    setErr('');
    try {
      // 1. Registro Único y Atómico (Movimientos, Comanda, Items y Pagos)
      const payloadComanda = {
        cliente_nombre, 
        cliente_id: cliente_id || null, 
        productos: itemsEnriquecidos.map(it => ({ 
          sku: it.sku, 
          cantidad: it.qty, 
          precio: it.precio_aplicado, 
          modelo: it.modelo, 
          tipoVenta: it.tipo_precio_resultado,
          desde_produccion: it.isFactory === true
        })),
        pagos: pagosLista,
        precio: totalVenta, 
        monto_pagado: totalPagado,
        status: 'entregado', 
        notas: `Venta Directa ${notas ? '| ' + notas : ''}`
      };

      const resCmd = await fetch('/api/comandas', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payloadComanda) 
      }).then(r => r.json());

      if (!resCmd.ok) throw new Error(resCmd.error || 'Error al procesar la venta');

      localStorage.removeItem(RECOVERY_KEY);
      if (usuario?.email) {
        await fetch(`/api/borradores?id=draft-autosave&email=${encodeURIComponent(usuario.email)}`, { method: 'DELETE' });
      }

      if (activeDraftId) {
        const list = JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]');
        localStorage.setItem(DRAFTS_KEY, JSON.stringify(list.filter(d => d.id !== activeDraftId)));
      }
      
      alert('✅ Venta procesada con éxito');
      
      // Limpiar estado local para nueva venta
      setItems([]);
      setPagosLista([]);
      setCliente_nombre('CONSUMIDOR FINAL');
      setCliente_id('');
      setCliente_cedula('');
      setCliente_telefono('');
      setNotas('');
      setActiveDraftId(null);
      setFase(1);
      
      onSave();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  };

  const itemsAgrupados = useMemo(() => {
    const res = [];
    itemsEnriquecidos.forEach(it => {
      const k = it.modelo;
      let g = res.find(x => x.modelo === k);
      if (!g) { g = { modelo: k, items: [], total: 0 }; res.push(g); }
      g.items.push(it);
      g.total += it.precio_aplicado * it.qty;
    });
    return res;
  }, [itemsEnriquecidos]);

  return (
    <div style={{display:'flex', flexDirection:'column', height:'calc(100vh - 120px)', background:'var(--bg)', borderRadius:'12px', overflow:'hidden', border:'1px solid var(--border)'}}>
      
      {/* HEADER */}
      <div style={{padding:'12px 20px', background:'var(--surface)', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div style={{display:'flex', alignItems:'center', gap:'20px'}}>
           <h3 style={{margin:0, fontFamily:'Playfair Display,serif', fontSize:'18px'}}>Venta Directa</h3>
           <div style={{display:'flex', gap:'10px'}}>
             {[1,2,3].map(n => (
               <div key={n} onClick={() => {
                  if (n < fase) {
                    setFase(n);
                    setTasaDesbloqueada(false);
                    setPago_tasa(globalTasa);
                  }
               }} style={{display:'flex', alignItems:'center', gap:'6px', opacity:fase===n?1:0.4, cursor: n < fase ? 'pointer' : 'default'}}>
                 <span style={{width:'18px', height:'18px', borderRadius:'50%', background:fase>=n?'var(--ink)':'#ccc', color:'#fff', fontSize:'9px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700}}>{n}</span>
                 <span style={{fontSize:'9px', fontWeight:700, textTransform:'uppercase'}}>{n===1?'Cliente':n===2?'Venta':'Cierre'}</span>
               </div>
             ))}
           </div>
        </div>
        <div style={{display:'flex', gap:'10px'}}>
           {borradoresEnEspera.length > 0 && <span style={{background:'var(--blue-soft)', color:'var(--blue)', padding:'4px 10px', borderRadius:'20px', fontSize:'10px', fontWeight:800}}>⏸ {borradoresEnEspera.length} en espera</span>}
           <button onClick={guardarBorrador} style={{padding:'6px 12px', background:'none', border:'1px solid var(--border)', cursor:'pointer', fontSize:'10px', fontWeight:700}}>En Espera</button>
           <button onClick={limpiarFormulario} style={{padding:'6px 12px', background:'var(--red-soft)', color:'var(--red)', border:'1px solid var(--red)', cursor:'pointer', fontSize:'10px', fontWeight:700}}>Limpiar</button>
        </div>
      </div>

      {/* BODY */}
      <div style={{flex:1, display:'flex', overflow:'hidden', position:'relative'}}>
        
        {/* LADO IZQUIERDO: CONTENIDO */}
        <div style={{flex:1, display:'flex', flexDirection:'column', overflow:'hidden'}}>
          {err && <div style={{padding:'12px', margin:'20px 20px 0 20px', background:'var(--red-soft)', color:'var(--red)', borderRadius:'8px', fontSize:'13px', border:'1px solid var(--red)', zIndex:1000}}>⚠️ {err}</div>}

          {fase === 1 && (
            <div style={{flex:1, overflowY:'auto', padding:'40px 20px'}}>
              <div style={{maxWidth:'600px', margin:'0 auto', display:'flex', flexDirection:'column', gap:'20px'}}>
              {borradoresEnEspera.length > 0 && (
                <div style={{background:'rgba(245,158,11,0.05)', border:'1.5px dashed #f59e0b', borderRadius:'16px', padding:'15px'}}>
                  <div style={lbl}>Recuperar Venta en Espera</div>
                  <div style={{display:'flex', gap:'10px', overflowX:'auto'}}>
                    {borradoresEnEspera.map(b => (
                      <div key={b.id} onClick={() => { setActiveDraftId(b.id); setItems(b.items); setCliente_nombre(b.cliente?.nombre); setFase(2); }} style={{minWidth:'150px', background:'#fff', border:'1px solid var(--border)', padding:'10px', borderRadius:'10px', cursor:'pointer'}}>
                        <div style={{fontSize:'11px', fontWeight:800}}>{b.cliente?.nombre}</div>
                        <div style={{fontSize:'9px', color:'#888'}}>{b.items?.length} ítems · {new Date(b.id).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end'}}>
                <div style={{flex:1}}>
                  <label style={lbl}>Tipo de Cliente</label>
                  <div style={{display:'flex',gap:'10px'}}>
                    <button onClick={()=>setCliente_tipo('nuevo')} style={{flex:1,padding:'12px',borderRadius:'10px',border:`1.5px solid ${cliente_tipo==='nuevo'?VD_COLOR:'var(--border)'}`,background:cliente_tipo==='nuevo'?VD_COLOR:'#fff',color:cliente_tipo==='nuevo'?'#fff':'#333',transition:'all 0.2s',cursor:'pointer',fontWeight:700,fontSize:'12px'}}>👤 Cliente Nuevo</button>
                    <button onClick={()=>setCliente_tipo('existente')} style={{flex:1,padding:'12px',borderRadius:'10px',border:`1.5px solid ${cliente_tipo==='existente'?VD_COLOR:'var(--border)'}`,background:cliente_tipo==='existente'?VD_COLOR:'#fff',color:cliente_tipo==='existente'?'#fff':'#333',transition:'all 0.2s',cursor:'pointer',fontWeight:700,fontSize:'12px'}}>📂 Lista de Clientes</button>
                  </div>
                </div>
              </div>

              <div style={{background:'var(--surface)', padding:'24px', borderRadius:'16px', border:'1px solid var(--border)', boxShadow:'0 4px 15px rgba(0,0,0,0.03)'}}>
                {cliente_tipo === 'nuevo' ? (
                  <div style={{display:'flex', flexDirection:'column', gap:'18px'}}>
                    <div>
                      <label style={lbl}>Nombre del Cliente</label>
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
                          style={{...inp, fontSize:'16px', height:'48px', borderRadius:'8px'}} 
                          placeholder="Consumidor Final" 
                        />
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
                        <input value={cliente_cedula} onChange={e=>setCliente_cedula(e.target.value)} style={{...inp, borderRadius:'8px'}} placeholder="V-123..." />
                      </div>
                      <div>
                        <label style={lbl}>WhatsApp / Teléfono</label>
                        <input value={cliente_telefono} onChange={e=>setCliente_telefono(e.target.value)} style={{...inp, borderRadius:'8px'}} placeholder="+58 412..." />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label style={lbl}>Buscar Cliente Existente</label>
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

                    <div style={{maxHeight:'280px', overflowY:'auto', border:'1px solid var(--border)', borderRadius:'10px', background:'#fff'}} className="custom-scrollbar">
                      {(busqueda.length > 0 ? clientesFiltrados : clientes.slice(0, 50)).map(c => (
                        <div key={c.id} onClick={() => seleccionarCliente(c)} style={{padding:'12px 15px',cursor:'pointer', borderBottom:'1px solid var(--border-soft)', background: cliente_id === c.id ? 'rgba(59,111,212,0.08)' : 'transparent', display:'flex', justifyContent:'space-between', alignItems:'center'}} className="search-result-item">
                          <div>
                            <div style={{fontSize:'13px', fontWeight:700}}>{c.nombre}</div>
                            <div style={{fontSize:'10px', color:'#888', fontFamily:'DM Mono,monospace', marginTop:'2px'}}>{c.cedula || '---'} · {c.telefono || '---'}</div>
                          </div>
                          {cliente_id === c.id && <span style={{color:VD_COLOR,fontWeight:700,fontSize:'14px'}}>✓</span>}
                        </div>
                      ))}
                    </div>

                    {cliente_id && (
                      <div style={{marginTop:'15px',padding:'15px',background:VD_COLOR_SOFT,borderRadius:'10px',border:`1px dashed ${VD_COLOR}`,display:'flex',alignItems:'center',gap:'12px',animation:'fadeIn .2s'}}>
                         <div style={{width:'36px',height:'36px',borderRadius:'50%',background:VD_COLOR,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px'}}>👤</div>
                         <div style={{flex:1}}>
                           <div style={{fontSize:'14px',fontWeight:700,color:VD_COLOR}}>{clientes.find(c=>c.id===parseInt(cliente_id))?.nombre}</div>
                           <div style={{fontSize:'10px',color:'#666',fontFamily:'DM Mono,monospace'}}>Seleccionado para esta venta</div>
                         </div>
                         <button onClick={()=>{setCliente_id(''); setBusqueda('');}} style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',fontSize:'12px',fontWeight:700}}>Cambiar</button>
                      </div>
                    )}
                  </div>
                )}
                <button onClick={() => setFase(2)} style={{width:'100%', marginTop:'24px', padding:'16px', background:VD_COLOR, color:'#fff', border:'none', borderRadius:'12px', fontWeight:800, cursor:'pointer', fontSize:'14px', transition:'all 0.2s', boxShadow:`0 8px 20px ${VD_COLOR}33`}} onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'} onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}>Continuar a Venta →</button>
              </div>
            </div>
          </div>
        )}

          {fase === 2 && (
            <div className="phase-2-grid-responsive" style={{display:'flex', gap:'20px', height:'100%', width:'100%', animation:'fadeIn 0.4s ease-out', overflow:'hidden', minHeight:0}}>
               {/* COLUMNA CATALOGO */}
               <div style={{flex:1, display:'flex', flexDirection:'column', gap:'20px', overflowY:'auto', padding:'20px', height:'100%', minHeight:0, minWidth:0}} className="custom-scrollbar">
                  <div style={{position:'sticky', top:0, zIndex:100, background:'var(--bg)', padding:'8px 12px', borderRadius:'12px', border:'1.5px solid var(--border)', boxShadow:'0 5px 15px rgba(0,0,0,0.05)', marginBottom:'10px', flexShrink:0}}>
                    <BarcodeScanner onScan={(sku) => {
                      const p = productos.find(x => x.sku === sku);
                      if (p) agregarItem(p, 1);
                      else setErr(`No se encontró el SKU ${sku}`);
                    }} />
                  </div>
                  
                  <div style={{display:'flex', flexDirection:'column', flex:1, minHeight:0}}>
                    <CatalogoExplorer 
                      productos={productos} 
                      compact
                      itemsEnCesta={items}
                      onAdd={(p, q, tv) => {
                        const stockActual = p.disponible ?? p.stock ?? 0;
                        if (stockActual < q) {
                           if (confirm(`Producto sin stock (${stockActual} disp). ¿Traer de fábrica?`)) {
                             agregarItem(p, q, true);
                           }
                        } else {
                          agregarItem(p, q);
                        }
                      }} 
                    />
                  </div>
               </div>

               {/* COLUMNA CESTA (SIDEBAR) */}
               <div style={{width:'320px', display:'flex', flexDirection:'column', background:'var(--surface)', borderLeft:'1px solid var(--border)', boxShadow:'-5px 0 20px rgba(0,0,0,0.02)', position:'relative', height:'100%'}}>
                  <div style={{padding:'15px 20px', borderBottom:'1.5px solid var(--border)', background:'var(--bg2)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <span style={{fontSize:'10px', fontWeight:900, textTransform:'uppercase', letterSpacing:'.1em', color:VD_COLOR}}>🛒 RESUMEN DE VENTA</span>
                    <span style={{fontSize:'10px', background:VD_COLOR, color:'#fff', padding:'2px 8px', borderRadius:'20px'}}>{items.length} SKUS</span>
                  </div>

                  <div style={{flex:1, overflowY:'auto', padding:'15px', display:'flex', flexDirection:'column', gap:'10px', background:'var(--bg2)', minHeight:0}}>
                      {items.length === 0 ? (
                        <div style={{textAlign:'center', padding:'40px 20px', opacity:0.6}}>
                          <div style={{fontSize:'48px', marginBottom:'15px'}}>🛒</div>
                          <div style={{fontSize:'14px', fontWeight:600, color:'#888'}}>CESTA VACÍA</div>
                        </div>
                      ) : (
                        itemsAgrupados.map((grupo, gIdx) => (
                          <div key={gIdx} style={{background:'#fff', borderRadius:'14px', border:'1px solid var(--border-soft)', overflow:'hidden', boxShadow:'0 4px 12px rgba(0,0,0,0.03)', flexShrink:0}}>
                             {/* HEADER MODELO */}
                             <div style={{padding:'8px 12px', background:'var(--surface)', borderBottom:'1px solid var(--border-soft)', display:'flex', alignItems:'center', gap:'8px'}}>
                                <div style={{width:'22px', height:'22px', borderRadius:'6px', background:'var(--ink)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:900}}>
                                   {grupo.modelo?.slice(0,1)}
                                </div>
                                <div style={{fontSize:'10px', fontWeight:800, color:'var(--ink)', textTransform:'uppercase'}}>{grupo.modelo}</div>
                             </div>

                             {/* VARIANTES */}
                             <div style={{display:'flex', flexDirection:'column'}}>
                                {grupo.items.map((it, iIdx) => (
                                  <div key={iIdx} style={{padding:'10px 12px', borderBottom:iIdx === grupo.items.length-1 ? 'none' : '1px solid var(--border-soft)', display:'flex', flexDirection:'column', gap:'6px'}}>
                                     <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                        <div style={{width:'10px', height:'10px', borderRadius:'50%', background:colorHex(it.color), border:'1px solid rgba(0,0,0,0.1)'}} />
                                        <div style={{flex:1, minWidth:0}}>
                                           <div style={{fontSize:'10px', fontWeight:800, color:'var(--ink)', textTransform:'uppercase', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>{it.color} {it.talla && `· T:${it.talla}`}</div>
                                           <div style={{fontSize:'9px', color:VD_COLOR, fontWeight:700}}>€{fmtNum(it.precio_aplicado)}/ud</div>
                                        </div>
                                        
                                        <div style={{display:'flex', alignItems:'center', gap:'2px', background:'var(--bg3)', padding:'2px', borderRadius:'6px', border:'1px solid var(--border)'}}>
                                           <button onClick={()=>quitarItem(it.sku)} style={{width:'22px', height:'22px', borderRadius:'5px', border:'none', background:'#fff', cursor:'pointer', fontSize:'11px', fontWeight:900, boxShadow:'0 2px 4px rgba(0,0,0,0.05)'}}>–</button>
                                           <input 
                                             type="number" 
                                             value={it.qty} 
                                             onChange={e => setCantItem(it.sku, e.target.value)}
                                             style={{width:'28px', textAlign:'center', border:'none', background:'none', fontFamily:'DM Mono,monospace', fontWeight:900, fontSize:'11px', outline:'none'}}
                                           />
                                           <button onClick={()=>agregarItem(it, 1)} style={{width:'22px', height:'22px', borderRadius:'5px', border:'none', background:'#fff', cursor:'pointer', fontSize:'11px', fontWeight:900, boxShadow:'0 2px 4px rgba(0,0,0,0.05)'}}>+</button>
                                        </div>
                                        
                                        <div style={{fontSize:'11px', fontWeight:900, color:'var(--ink)', minWidth:'50px', textAlign:'right', fontFamily:'DM Mono,monospace'}}>€{fmtNum(it.precio_aplicado * it.qty)}</div>
                                     </div>

                                     <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                        <button onClick={()=>toggleTipoVenta(it.sku)} style={{background:'var(--surface)', border:'1px solid var(--border-strong)', padding:'1px 5px', borderRadius:'4px', fontSize:'8px', fontWeight:800, cursor:'pointer', textTransform:'uppercase'}}>
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

                  <div style={{padding:'20px', borderTop:'1.5px solid var(--border)', background:'#fff', boxShadow:'0 -10px 25px rgba(0,0,0,0.03)'}}>
                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'12px'}}>
                      <span style={{fontSize:'10px', fontWeight:700, color:'#888'}}>TOTAL A COBRAR</span>
                      <span style={{fontSize:'20px', fontWeight:900, color:VD_COLOR}}>€ {fmtNum(totalVenta)}</span>
                    </div>
                    <button 
                      onClick={() => setFase(3)} 
                      disabled={items.length===0} 
                      style={{
                        width:'100%', 
                        padding:'15px', 
                        background:VD_COLOR, 
                        color:'#fff', 
                        border:'none', 
                        borderRadius:'12px', 
                        fontWeight:900, 
                        fontSize:'13px', 
                        cursor:'pointer', 
                        transition:'all 0.2s', 
                        boxShadow:`0 4px 15px ${VD_COLOR}33`
                      }} 
                      onMouseEnter={e => { e.currentTarget.style.background = '#5b21b6'; }} 
                      onMouseLeave={e => { e.currentTarget.style.background = VD_COLOR; }}
                    >
                      CONTINUAR AL COBRO →
                    </button>
                  </div>
               </div>
            </div>
          )}

          {fase === 3 && (
            <div style={{flex:1, overflowY:'auto', padding:'40px 20px'}}>
              <div style={{maxWidth:'800px', margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1.2fr', gap:'30px'}}>
               <div style={{background:'var(--surface)', padding:'20px', borderRadius:'16px', border:'1px solid var(--border)'}}>
                  <label style={lbl}>Registrar Pago</label>
                  <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px', marginBottom:'15px'}}>
                    {METODOS.map(m => (
                      <button key={m.id} onClick={() => { setPago_metodo(m.id); setPago_divisa(m.divisa); setPago_tasa(globalTasa); }} style={{padding:'10px 5px', border:`1.5px solid ${pago_metodo===m.id?VD_COLOR:'var(--border)'}`, background:pago_metodo===m.id?VD_COLOR:'#fff', color:pago_metodo===m.id?'#fff':'#333', borderRadius:'8px', cursor:'pointer', fontSize:'9px', textAlign:'center'}}>
                         <div style={{fontSize:'16px'}}>{m.icon}</div>
                         <div style={{fontWeight:700}}>{m.label}</div>
                      </button>
                    ))}
                  </div>
                  <div style={{display:'flex', gap:'10px', marginBottom:'15px'}}>
                     <div style={{flex:1}}>
                        <label style={lbl}>Monto ({pago_divisa})</label>
                        <input type="number" value={pago_monto} onChange={e=>setPago_monto(e.target.value)} style={inp} placeholder="0.00" />
                     </div>
                     {pago_divisa === 'BS' && (
                       <div style={{width:'100px'}}>
                          <label style={lbl}>Tasa</label>
                          <div style={{display:'flex', gap:'5px'}}>
                             <input type="number" disabled={!tasaDesbloqueada} value={pago_tasa} onChange={e=>setPago_tasa(e.target.value)} style={{...inp, background: !tasaDesbloqueada ? 'var(--bg2)' : '#fff', opacity: !tasaDesbloqueada ? 0.7 : 1}} />
                             {!tasaDesbloqueada && (
                               <button onClick={async () => {
                                  if (isAdmin) {
                                    const pin = window.prompt('Ingrese su PIN de Administrador:');
                                    if(!pin) return;
                                    try {
                                      const res = await fetch('/api/auth/verify-pin', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username: usuario?.email, pin})}).then(r=>r.json());
                                      if(res.ok) setTasaDesbloqueada(true); else alert(res.error || 'PIN incorrecto');
                                    } catch(e) { alert('Error de red'); }
                                  } else {
                                    const admin = window.prompt('Email del Administrador:');
                                    if(!admin) return;
                                    const pin = window.prompt('PIN del Administrador:');
                                    if(!pin) return;
                                    try {
                                      const res = await fetch('/api/auth/verify-pin', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username: admin, pin})}).then(r=>r.json());
                                      if(res.ok) setTasaDesbloqueada(true); else alert(res.error || 'Credenciales incorrectas');
                                    } catch(e) { alert('Error de red'); }
                                  }
                               }} style={{background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'4px', cursor:'pointer', padding:'0 8px'}} title="Desbloquear Tasa">🔒</button>
                             )}
                          </div>
                       </div>
                     )}
                  </div>
                  <input value={pago_referencia} onChange={e=>setPago_referencia(e.target.value)} style={{...inp, marginBottom:'15px'}} placeholder="Referencia (opcional)" />
                  <button onClick={() => {
                    if (!pago_metodo || !pago_monto) return;
                    setPagosLista([...pagosLista, { id:Date.now(), metodo:pago_metodo, divisa:pago_divisa, monto:parseFloat(pago_monto), tasa:parseFloat(pago_tasa)||globalTasa, referencia:pago_referencia }]);
                    setPago_monto(''); setPago_referencia('');
                  }} style={{width:'100%', padding:'12px', background:VD_COLOR, color:'#fff', border:'none', borderRadius:'8px', fontWeight:700}}>Añadir Pago</button>
               </div>

               <div>
                 <div style={{background:'var(--surface)', padding:'20px', borderRadius:'16px', border:'1px solid var(--border)', marginBottom:'15px'}}>
                    <div style={{...lbl, color:'#888'}}>Resumen de Cobro</div>
                    <div style={{display:'flex', justifyContent:'space-between', fontSize:'14px', marginBottom:'10px'}}><span>Venta Total:</span><span style={{fontWeight:700}}>€ {fmtNum(totalVenta)}</span></div>
                    {pagosLista.map(p => (
                      <div key={p.id} style={{display:'flex', justifyContent:'space-between', fontSize:'12px', color:'var(--green)', marginBottom:'5px'}}>
                        <span>
                          {METODOS.find(m=>m.id===p.metodo)?.label}: {p.divisa} {fmtNum(p.monto)}
                          {p.divisa === 'BS' && p.tasa > 0 && <span style={{color:'#888', fontSize:'10px', marginLeft:'5px'}}>(≈ € {fmtNum(p.monto / p.tasa)})</span>}
                        </span>
                        <button onClick={() => setPagosLista(pagosLista.filter(x=>x.id!==p.id))} style={{background:'none', border:'none', color:'red', cursor:'pointer'}}>✕</button>
                      </div>
                    ))}
                    <div style={{marginTop:'15px', paddingTop:'15px', borderTop:'1.5px dashed var(--border)', display:'flex', justifyContent:'space-between'}}>
                      <span style={{fontWeight:900}}>PAGADO:</span>
                      <span style={{fontWeight:900, color:'var(--green)'}}>€ {fmtNum(totalPagado)}</span>
                    </div>
                    {vuelto > 0.01 ? (
                      <div style={{marginTop:'10px', padding:'10px', background:'var(--green-soft)', borderRadius:'8px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <span style={{fontWeight:900, color:'var(--green)'}}>VUELTO:</span>
                        <span style={{fontWeight:900, color:'var(--green)'}}>
                          € {fmtNum(vuelto)} 
                          <span style={{fontSize:'11px', opacity:0.8, marginLeft:'6px'}}>(≈ BS {fmtNum(vuelto * globalTasa)})</span>
                        </span>
                      </div>
                    ) : falta > 0.01 && (
                      <div style={{marginTop:'10px', padding:'10px', background:'var(--red-soft)', borderRadius:'8px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <span style={{fontWeight:900, color:'var(--red)'}}>FALTA:</span>
                        <span style={{fontWeight:900, color:'var(--red)'}}>
                          € {fmtNum(falta)}
                          <span style={{fontSize:'11px', opacity:0.8, marginLeft:'6px'}}>(≈ BS {fmtNum(falta * globalTasa)})</span>
                        </span>
                      </div>
                    )}
                 </div>
                 <div style={{ display: 'flex', gap: '12px' }}>
                   <button onClick={() => {
                      setFase(2);
                      setTasaDesbloqueada(false);
                      setPago_tasa(globalTasa);
                   }} style={{ padding:'18px', minWidth:'100px', background:'var(--surface)', color:'var(--ink)', border:'1.5px solid var(--border-strong)', borderRadius:'12px', fontSize:'14px', fontWeight:900, cursor:'pointer', transition: 'all 0.2s' }}>
                     ← ATRÁS
                   </button>
                   <button onClick={realizarCobro} disabled={saving || falta > 0.01} style={{flex:1, padding:'18px', background:falta<=0.01?'var(--green)':'#ccc', color:'#fff', border:'none', borderRadius:'12px', fontSize:'16px', fontWeight:900, cursor:'pointer', boxShadow:'0 10px 20px rgba(0,0,0,0.1)'}}>
                      {saving ? '⏳ PROCESANDO...' : '⚡ FINALIZAR VENTA'}
                   </button>
                 </div>
               </div>
            </div>
          </div>
        )}

        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ccc; border-radius: 10px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      ` }} />
    </div>
  );
}
