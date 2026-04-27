'use client';
import React, { useState, useMemo, useEffect, useCallback, useRef, Suspense, memo } from 'react';
import { useSearchParams } from 'next/navigation';
import Shell from '@/components/Shell';
import { useAppData } from '@/lib/AppContext';
import { useAuth } from '@/lib/AuthContext';
import { fetchApi } from '@/utils/fetchApi';
import ModalTicketEnvio from '@/components/ModalTicketEnvio';

// Importar nuevos componentes modulares
import ComandaCard from '@/components/comandas/ComandaCard';
import ModalNueva from '@/components/comandas/ModalNueva';
import ModalGestion from '@/components/comandas/ModalGestion';

/* ─── Constantes & Helpers (Shared) ────────────────────────────────── */
/* ─── Constantes & Helpers (Shared) ────────────────────────────────── */
const S = {
  pendiente: {bg:'#fff8e1',color:'#f59e0b',border:'#f59e0b',label:'Pendiente',  icon:'🕐'},
  empacado:  {bg:'#eff6ff',color:'#3b82f6',border:'#3b82f6',label:'Empacado',   icon:'📦'},
  enviado:   {bg:'#f0fdf4',color:'#22c55e',border:'#22c55e',label:'Enviado',    icon:'🚀'},
  cancelado: {bg:'#fff1f2',color:'#ef4444',border:'#ef4444',label:'Cancelado',  icon:'❌'},
};

function parseProd(cmd){ if(!cmd) return []; let p=cmd.productos; if(!p) return []; if(typeof p==='string') try{p=JSON.parse(p);}catch{p=[];} return Array.isArray(p)?p:[];}
const COALESCE = (...args) => args.find(a => a !== null && a !== undefined) ?? 0;

/* ═══════════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
═══════════════════════════════════════════════════════════════════ */
export default function ComandasPage() {
  return (
    <Suspense fallback={<div style={{textAlign:'center',padding:'60px',fontFamily:'DM Mono,monospace',fontSize:'12px',color:'#666'}}>⏳ Cargando...</div>}>
      <ComandasInner />
    </Suspense>
  );
}

function ComandasInner() {
  const { data, cargando, recargar, syncStatus, actualizarComandaLocal, mutationApi } = useAppData()||{};
  const { clientes=[], productos=[], comandas=[] } = data||{};
  const { usuario } = useAuth()||{};
  const isAdmin = usuario?.rol === 'admin';

  const [filtro,      setFiltro]      = useState('todos');
  const [buscar,      setBuscar]      = useState('');
  const [desde,       setDesde]       = useState('');
  const [hasta,       setHasta]       = useState('');
  const [modal,       setModal]       = useState(null); 
  const [expandedList, setExpandedList] = useState([]);
  const expandedItems = useMemo(() => 
    Object.fromEntries(expandedList.map(id => [id, true])), 
  [expandedList]);

  // --- SELECCIÓN MÚLTIPLE ---
  const [selectedIds, setSelectedIds] = useState([]);
  const toggleSelection = useCallback((id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);
  const selectAll = () => {
    if (selectedIds.length === filtradas.length) setSelectedIds([]);
    else setSelectedIds(filtradas.map(c => c.id));
  };

  const toggleItems = useCallback((id) => {
    setExpandedList(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id); // Cerrar si ya está abierta
      }
      // Abrir nueva: Máximo 10 abiertas simultáneamente (FIFO)
      const next = [...prev, id];
      if (next.length > 10) {
        return next.slice(next.length - 10); // Mantener solo las últimas 10
      }
      return next;
    });
  }, []);
  const [ticketModal, setTicketModal] = useState(null);
  const [filtroTela,  setFiltroTela]  = useState('');
  const [drafts,      setDrafts]      = useState([]);
  const [showDrafts,  setShowDrafts]  = useState(false);
  const [draftToLoad, setDraftToLoad] = useState(null);
  const [usuariosDB,    setUsuariosDB]    = useState([]); 
  
  const [partialMode,   setPartialMode]   = useState(null); 
  const [partialItems,  setPartialItems]  = useState({});  

  // --- Infinite Scroll / Incremental Rendering ---
  const [limit, setLimit] = useState(20);
  const [savingGlobal, setSavingGlobal] = useState(null); 
  const [pendingCount, setPendingCount] = useState(0);

  // --- Refs ---
  const scrollRef = useRef(null);
  const searchRef = useRef(null); // Ref para enfocar el buscador
  const observerTarget = useRef(null);



  const DRAFTS_KEY = 'moditex_comandas_espera';
  function loadDrafts() { try { return JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]'); } catch { return []; } }
  function saveDrafts(list) { try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(list)); } catch {} }

  useEffect(() => {
    setDrafts(loadDrafts());
    function onStorage(e) { if (e.key === DRAFTS_KEY) setDrafts(loadDrafts()); }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const refreshDrafts = () => setDrafts(loadDrafts());
  function abrirDraft(draft) { setDraftToLoad(draft); setModal('nueva'); setShowDrafts(false); }
  function descartarDraft(id) { const updated = loadDrafts().filter(d => d.id !== id); saveDrafts(updated); setDrafts(updated); }
  function descartarTodosDrafts() { if (!window.confirm('¿Descartar todas las comandas en espera?')) return; saveDrafts([]); setDrafts([]); }

  const searchParams = useSearchParams();
  const verRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('moditex_nueva_comanda_autosave');
    if (saved && !modal) {
      try {
        const draft = JSON.parse(saved);
        if ((Date.now() - (draft.timestamp || 0)) < 1000 * 60 * 60 * 2) {
          setDraftToLoad(draft);
          setModal('nueva');
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    const ver = searchParams?.get('ver');
    if (ver) verRef.current = ver;
  }, [searchParams]);

  useEffect(()=>{
    const ver = verRef.current || searchParams?.get('ver');
    if (ver && comandas.length > 0) {
      const cmd = comandas.find(c => c.id === ver);
      if (cmd) { setModal(cmd); verRef.current = null; }
    }
  },[searchParams, comandas]);

  useEffect(() => {
    if (searchParams?.get('nueva')) {
      setModal('nueva');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams]);

  async function cargarUsuarios() {
    try {
      const res = await fetchApi('/api/usuarios').then(r=>r.json());
      if (res.ok) setUsuariosDB(res.usuarios || []);
    } catch {}
  }

  useEffect(()=>{
    cargarUsuarios();
  },[]);

  const telasDisponibles = useMemo(() => {
    const set = new Set();
    comandas.forEach(cmd => {
      if (cmd.telas_idx) {
        cmd.telas_idx.split(' ').forEach(t => { if (t) set.add(t); });
      }
    });
    return [...set].sort();
  }, [comandas]);

  const filtradas = useMemo(()=>{
    // BÚSQUEDA GLOBAL: Si hay texto en buscar, ignorar el filtro de pestaña
    let r = (filtro==='todos' || buscar) ? comandas : comandas.filter(c=>c.status===filtro);
    if(buscar){
      const q=buscar.toLowerCase();
      r=r.filter(c=> `${c.cliente} ${c.id} ${c.notas||''} ${c.items_resumen||''}`.toLowerCase().includes(q) );
    }
    if(desde) r=r.filter(c=>(c.created_at||'')>=desde);
    if(hasta) r=r.filter(c=>(c.created_at||'')<=hasta+'T99');
    if(filtroTela) r=r.filter(cmd=> (cmd.telas_idx||'').includes(filtroTela) );
    return r;
  },[comandas,filtro,buscar,desde,hasta,filtroTela]);

  const conteos = useMemo(()=>Object.fromEntries(Object.keys(S).map(s=>[s,(comandas||[]).filter(c=>c.status===s).length])),[comandas]);

  // Advertir antes de cerrar si hay cambios pendientes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (pendingCount > 0) {
        e.preventDefault();
        e.returnValue = 'Tienes cambios pendientes por guardar. ¿Seguro que quieres salir?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [pendingCount]);

  async function cambiarStatusRapido(id, s) {
    setSavingGlobal(id);
    setPendingCount(prev => prev + 1);
    // Actualización optimista
    actualizarComandaLocal(id, { status: s });
    try {
      const res = await mutationApi('/api/comandas', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: s }) });
      if (!res.ok) {
        alert('Error: ' + res.error);
        recargar();
      }
    } catch (e) { recargar(); }
    setSavingGlobal(null);
    setPendingCount(prev => Math.max(0, prev - 1));
  }

  async function marcarEmpacadoRapido(cmdId, sku, delta, modelo = '', color = '') {
    const uNombre = usuario?.nombre || usuario?.email || 'Alguien';
    setPendingCount(prev => prev + 1);

    // --- Lógica Optimista ---
    const cmd = comandas.find(c => c.id === cmdId);
    if (cmd) {
      const prods = parseProd(cmd);
      const nextProds = prods.map(p => {
        if ((p.sku || '').toUpperCase() === (sku || '').toUpperCase()) {
          const actual = COALESCE(p.cant_empacada, p.despachado, 0);
          return { ...p, cant_empacada: Math.min(p.cantidad || p.cant || 0, actual + delta) };
        }
        return p;
      });
      actualizarComandaLocal(cmdId, { productos: nextProds });
    }

    try {
      const res = await mutationApi('/api/comandas/empacar', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ comanda_id: cmdId, sku, cantidad: delta, modelo, color })
      });

      if (!res.ok) {
        alert('Error: ' + res.error);
        recargar();
      }
    } catch (e) {
      recargar();
    }
    setPendingCount(prev => Math.max(0, prev - 1));
  }

  async function marcarTodoEmpacado(cmdId) {
    if (!confirm('¿Empacar todos los artículos de esta orden?')) return;
    setSavingGlobal(cmdId);
    setPendingCount(prev => prev + 1);
    
    // --- Lógica Optimista ---
    const cmd = comandas.find(c => c.id === cmdId);
    if (cmd) {
      const prods = parseProd(cmd);
      const nextProds = prods.map(p => ({ ...p, cant_empacada: p.cantidad || p.cant || 0 }));
      actualizarComandaLocal(cmdId, { productos: nextProds, status: 'empacado' });
    }

    try {
      const res = await mutationApi('/api/comandas/empacar-batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comanda_id: cmdId }) });
      if (!res.ok) {
        alert('Error: ' + res.error);
        recargar();
      }
    } catch (e) { recargar(); }
    setSavingGlobal(null);
    setPendingCount(prev => Math.max(0, prev - 1));
  }

  async function eliminarComanda(id) {
    if (!confirm(`¿Estás SEGURO de eliminar la comanda #${id}? Esta acción no se puede deshacer.`)) return;
    setSavingGlobal(id);
    setPendingCount(prev => prev + 1);
    try {
      const res = await mutationApi('/api/comandas', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      if (!res.ok) {
        alert('Error: ' + res.error);
        recargar();
      }
    } catch (e) { recargar(); }
    setSavingGlobal(null);
    setPendingCount(prev => Math.max(0, prev - 1));
  }

  async function confirmarEntregaParcial() {
    if (!partialMode) return;
    const itemsParaRetirar = Object.entries(partialItems).filter(([_, qty]) => qty > 0);
    if (itemsParaRetirar.length === 0) return setPartialMode(null);
    setSavingGlobal(partialMode);
    setPendingCount(prev => prev + 1);
    try {
      const res = await mutationApi('/api/comandas/entrega-parcial', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comanda_id: partialMode, items: partialItems, usuario: usuario?.nombre || usuario?.email || 'sistema' }) });
      if (res.ok) {
        setPartialMode(null); setPartialItems({}); recargar();
      } else alert('Error: ' + res.error);
    } catch (e) {}
    setSavingGlobal(null);
    setPendingCount(prev => Math.max(0, prev - 1));
  }

  // --- Infinite Scroll / Incremental Rendering (IntersectionObserver) ---
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && limit < filtradas.length) {
          setLimit(prev => prev + 20);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [limit, filtradas.length]);

  // Deseleccionar al cambiar filtro o buscar
  useEffect(() => {
    setSelectedIds([]);
  }, [filtro, buscar]);

  // --- ATAJOS DE TECLADO ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'n') { e.preventDefault(); setModal('nueva'); }
        if (key === 's') { e.preventDefault(); searchRef.current?.focus(); }
        if (key === 'r') { e.preventDefault(); recargar && recargar(); }
        if (key === 'g') { e.preventDefault(); if (filtradas.length > 0) setTicketModal({ cmds: filtradas }); }
      }
      if (e.key === 'Escape') {
        setModal(null);
        setTicketModal(null);
        setShowDrafts(false);
        setPartialMode(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filtradas, recargar]);


  function onSave(){ setModal(null); setDraftToLoad(null); if(typeof recargar === 'function') recargar(); }

  return (
    <Shell title="Comandas">
      {modal==='nueva'&&<ModalNueva
        clientes={clientes} productos={productos}
        isAdmin={isAdmin}
        usuariosDB={usuariosDB}
        onClose={()=>{ setModal(null); setDraftToLoad(null); }}
        onSave={()=>{ onSave(); setDraftToLoad(null); }}
        initialDraft={draftToLoad}
        onDraftSaved={refreshDrafts}
      />}
      {modal&&typeof modal==='object'&&<ModalGestion cmd={modal} productos={productos} isAdmin={isAdmin} usuariosDB={usuariosDB} usuario={usuario} onClose={()=>setModal(null)} onSave={onSave} />}
      {ticketModal&&<ModalTicketEnvio comandas={ticketModal.cmd||ticketModal.cmds} clientes={clientes} onClose={()=>setTicketModal(null)} />}

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px',flexWrap:'wrap',gap:'10px'}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
            <div style={{fontFamily:'Playfair Display,serif',fontSize:'16px',fontWeight:700}}>Comandas</div>
            {syncStatus === 'syncing' && <span style={{fontSize:'10px', color:'#f59e0b', animation:'pulse 1.5s infinite'}}>● Sincronizando...</span>}
            {syncStatus === 'synced' && <span style={{fontSize:'10px', color:'#22c55e', opacity:0.7}}>● Al día</span>}
          </div>
          <div style={{fontFamily:'DM Mono,monospace',fontSize:'10px',color:'#555',marginTop:'2px'}}>Stock se descuenta al despachar · Moditex POS Pro</div>
        </div>
        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          {filtradas.length>0&&<button onClick={()=>setTicketModal({cmds:filtradas})} style={{padding:'9px 14px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontSize:'11px',fontWeight:600}}>🖨️ Guías ({filtradas.length})</button>}
          <button onClick={()=>setModal('nueva')} style={{padding:'9px 18px',background:'#f59e0b',color:'#000',border:'none',cursor:'pointer',fontSize:'12px',fontWeight:700,textTransform:'uppercase'}}>📋 Nueva Comanda</button>
          {drafts.length > 0 && (
            <button onClick={()=>setShowDrafts(v=>!v)} style={{padding:'9px 14px',background:showDrafts?'rgba(245,158,11,.12)':'none',border:'1px solid rgba(245,158,11,.5)',cursor:'pointer',fontSize:'11px',fontWeight:700,color:'#f59e0b',display:'flex',alignItems:'center',gap:'7px'}}>
              ⏸ En Espera <span style={{background:'#f59e0b',color:'#000',borderRadius:'10px',padding:'1px 7px',fontSize:'10px',fontWeight:800}}>{drafts.length}</span>
            </button>
          )}
        </div>
      </div>

      {showDrafts && drafts.length > 0 && (
        <div style={{marginBottom:'14px',background:'var(--surface)',border:'1px solid rgba(245,158,11,.3)',borderLeft:'3px solid #f59e0b',overflow:'hidden'}}>
           <div style={{padding:'10px 14px',background:'rgba(245,158,11,.06)',borderBottom:'1px solid rgba(245,158,11,.15)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
             <span style={{fontFamily:'DM Mono,monospace',fontSize:'9px',fontWeight:700,color:'#f59e0b',textTransform:'uppercase'}}>Comandas en espera ({drafts.length})</span>
             <button onClick={descartarTodosDrafts} style={{background:'none',border:'none',cursor:'pointer',color:'var(--red)',fontSize:'9px'}}>Descartar todo</button>
           </div>
           {drafts.map(d=>(
             <div key={d.id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'11px 14px',borderBottom:'1px solid var(--border)'}}>
                <div style={{flex:1}}><div style={{fontSize:'13px',fontWeight:700}}>{d.cliQuery||'Sin cliente'}</div><div style={{fontSize:'9px',color:'#888'}}>Items: {d.items?.length||0}</div></div>
                <button onClick={()=>abrirDraft(d)} style={{padding:'7px 16px',background:'#f59e0b',border:'none',cursor:'pointer',fontWeight:700,fontSize:'11px'}}>Continuar →</button>
             </div>
           ))}
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'8px',marginBottom:'14px'}}>
        {Object.entries(S).map(([s,cfg])=>(
          <div key={s} onClick={()=>setFiltro(filtro===s?'todos':s)} style={{background:filtro===s?cfg.bg:'var(--surface)',border:`1px solid ${filtro===s?cfg.border:'var(--border)'}`,borderTop:`3px solid ${cfg.border}`,padding:'10px 12px',cursor:'pointer'}}>
            <div style={{fontFamily:'DM Mono,monospace',fontSize:'7px',color:cfg.color,textTransform:'uppercase'}}>{cfg.icon} {cfg.label}</div>
            <div style={{fontFamily:'Playfair Display,serif',fontSize:'26px',fontWeight:700,color:cfg.color}}>{conteos[s]||0}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',gap:'8px',marginBottom:'12px',flexWrap:'wrap',alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px',background:'var(--bg2)',border:'1px solid var(--border)',padding:'7px 12px',flex:1,minWidth:'180px'}}>
          <span>🔍</span>
          <input 
            ref={searchRef}
            value={buscar} 
            onChange={e=>{setBuscar(e.target.value); setLimit(20);}} 
            placeholder="Buscar (Alt+S)..." 
            style={{background:'none',border:'none',outline:'none',fontSize:'12px',width:'100%'}}
          />
        </div>
        <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
          {[['todos','Todas'],['pendiente','Pendiente'],['empacado','Empacado'],['enviado','Enviado']].map(([s,l])=>(
            <button key={s} onClick={()=>setFiltro(s)} style={{padding:'5px 12px',borderRadius:'20px',border:'none',cursor:'pointer',fontSize:'11px',background:filtro===s?'var(--ink)':'#eee',color:filtro===s?'#fff':'#333'}}>{l}</button>
          ))}
        </div>
        <input type="date" value={desde} onChange={e=>setDesde(e.target.value)} style={{padding:'6px 9px',background:'var(--bg2)',border:'1px solid var(--border)',fontSize:'12px'}}/>
        <button onClick={recargar} style={{padding:'6px 10px',background:'none',border:'1px solid var(--border)',cursor:'pointer',fontSize:'10px'}}>↺</button>
      </div>

      {!cargando && filtradas.length > 0 && (
        <div style={{display:'flex', flexDirection:'column', marginBottom:'20px', minHeight:'500px'}}>
          <div style={{display:'flex', padding:'0 18px 8px', fontFamily:'DM Mono,monospace', fontSize:'9px', color:'#888', textTransform:'uppercase'}} className="premium-header-row">
            <div style={{flex:'0 0 40px', textAlign:'center'}}>
               <input type="checkbox" checked={filtradas.length > 0 && selectedIds.length === filtradas.length} onChange={selectAll} style={{cursor:'pointer'}} />
            </div>
            <div style={{flex:'0 0 100px'}}>Order ID</div>
            <div style={{flex:'1 1 200px'}}>Client</div>
            <div style={{flex:'0 0 120px'}}>Status</div>
            <div style={{flex:'0 0 80px', textAlign:'center'}}>Items</div>
            <div style={{flex:'0 0 110px'}}>Total Value</div>
            <div style={{flex:'0 0 60px', textAlign:'right'}}>Sync</div>
          </div>

          {(filtradas||[]).slice(0, limit).map(cmd => (
            <div key={cmd.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ flex: '0 0 30px', display: 'flex', justifyContent: 'center' }}>
                 <input type="checkbox" checked={selectedIds.includes(cmd.id)} onChange={() => toggleSelection(cmd.id)} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--ink)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <ComandaCard 
                  cmd={cmd} status={cmd.status} usuario={usuario} usuariosDB={usuariosDB||[]} savingGlobal={savingGlobal} buscar={buscar}
                  expandedItems={expandedItems||{}} partialMode={partialMode} partialItems={partialItems||{}} toggleItems={toggleItems}
                  setPartialMode={setPartialMode} setPartialItems={setPartialItems} confirmarEntregaParcial={confirmarEntregaParcial}
                  marcarEmpacadoRapido={marcarEmpacadoRapido} cambiarStatusRapido={cambiarStatusRapido}
                  setModal={setModal} setTicketModal={setTicketModal} 
                  marcarTodoEmpacado={marcarTodoEmpacado}
                  eliminarComanda={eliminarComanda}
                  onCommentChange={recargar}
                />
              </div>
            </div>
          ))}
          
          {limit < filtradas.length && (
            <div ref={observerTarget} style={{textAlign:'center', padding:'20px', color:'#aaa', fontSize:'11px', fontFamily:'DM Mono,monospace'}}>
               Cargando más resultados...
            </div>
          )}
        </div>
      )}

      {/* BARRA FLOTANTE ACCIONES EN LOTE */}
      {selectedIds.length > 0 && (() => {
        const selCmds = comandas.filter(c => selectedIds.includes(c.id));
        const canEmpacar = selCmds.some(c => c.status === 'pendiente');
        const canDespachar = selCmds.some(c => c.status === 'empacado');

        return (
          <div style={{position:'fixed', bottom:'20px', left:'50%', transform:'translateX(-50%)', background:'var(--ink)', color:'#fff', padding:'15px 25px', borderRadius:'30px', boxShadow:'0 20px 40px rgba(0,0,0,0.3)', display:'flex', alignItems:'center', gap:'20px', zIndex:1000, animation:'fadeInSlide 0.3s ease-out'}}>
             <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
               <span style={{background:'#fff', color:'var(--ink)', width:'28px', height:'28px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:800}}>{selectedIds.length}</span>
               <span style={{fontSize:'13px', fontWeight:600, letterSpacing:'.05em'}}>SELECCIONADAS</span>
             </div>
             <div style={{width:'1px', height:'20px', background:'rgba(255,255,255,0.2)'}}/>
             <div style={{display:'flex', gap:'10px'}}>
               <button onClick={() => setTicketModal({ cmds: selCmds })} style={{background:'rgba(255,255,255,0.1)', color:'#fff', border:'none', padding:'8px 16px', borderRadius:'20px', fontSize:'12px', fontWeight:700, cursor:'pointer', transition:'all 0.2s'}}>🖨️ Guías de Envío</button>
               
               {canEmpacar && (
                 <button onClick={async () => {
                    if(!confirm(`¿Marcar ${selCmds.filter(c=>c.status==='pendiente').length} órdenes como EMPACADAS y descontar stock?`)) return;
                    setSavingGlobal('batch');
                    try {
                      await Promise.all(selCmds.filter(c=>c.status==='pendiente').map(c => mutationApi('/api/comandas/empacar-batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comanda_id: c.id }) })));
                      setSelectedIds([]);
                      recargar();
                    } catch(e) { alert('Error en proceso masivo'); }
                    setSavingGlobal(null);
                 }} style={{background:'var(--blue)', color:'#fff', border:'none', padding:'8px 16px', borderRadius:'20px', fontSize:'12px', fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', gap:'6px'}}>📦 Empacar Lote</button>
               )}

               {canDespachar && (
                 <button onClick={async () => {
                    if(!confirm(`¿Marcar ${selCmds.filter(c=>c.status==='empacado').length} órdenes como ENVIADAS?`)) return;
                    setSavingGlobal('batch');
                    try {
                      await Promise.all(selCmds.filter(c=>c.status==='empacado').map(c => mutationApi('/api/comandas', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id, status: 'enviado' }) })));
                      setSelectedIds([]);
                      recargar();
                    } catch(e) { alert('Error en despacho masivo'); }
                    setSavingGlobal(null);
                 }} style={{background:'var(--green)', color:'#fff', border:'none', padding:'8px 16px', borderRadius:'20px', fontSize:'12px', fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', gap:'6px'}}>🚀 Despachar Lote</button>
               )}
             </div>
             <button onClick={()=>setSelectedIds([])} style={{background:'none', border:'none', color:'#aaa', cursor:'pointer', fontSize:'16px', padding:'0 5px'}}>✕</button>
          </div>
        );
      })()}

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 767px) {
          .premium-header-row { display: none !important; }
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
      ` }} />
    </Shell>
  );
}