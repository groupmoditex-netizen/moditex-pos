/**
 * Sistema de Respaldos Automáticos - MODITEX-POS
 * Configuración y gestión de backups automáticos
 */

export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { getUsuarioCookie } from '@/utils/getUsuarioCookie';

function getSessionUser(request) {
  return getUsuarioCookie(request);
}

function unauthorized() {
  return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ ok: false, error: 'Permisos insuficientes' }, { status: 403 });
}

// Configuración de respaldos
const BACKUP_CONFIG = {
  enabled: process.env.AUTO_BACKUP_ENABLED === 'true',
  schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // 2 AM diario
  retention: {
    daily: parseInt(process.env.BACKUP_RETENTION_DAYS) || 7,
    weekly: parseInt(process.env.BACKUP_RETENTION_WEEKS) || 4,
    monthly: parseInt(process.env.BACKUP_RETENTION_MONTHS) || 3
  },
  storage: {
    type: process.env.BACKUP_STORAGE_TYPE || 'local', // 'local', 's3', 'gcs'
    path: process.env.BACKUP_STORAGE_PATH || './backups',
    compression: process.env.BACKUP_COMPRESSION === 'true'
  },
  notifications: {
    email: process.env.BACKUP_NOTIFICATION_EMAIL,
    slack: process.env.BACKUP_SLACK_WEBHOOK
  }
};

// Tablas críticas para respaldar
const CRITICAL_TABLES = [
  'comandas',
  'pagos',
  'movimientos',
  'productos',
  'clientes',
  'usuarios',
  'logs',
  'error_alerts'
];

export async function POST(request) {
  try {
    const usuario = getSessionUser(request);
    if (!usuario) return unauthorized();
    if (usuario.rol !== 'admin') return forbidden();

    const body = await request.json();
    const action = body?.action || 'create';
    const { type = 'manual', tables = CRITICAL_TABLES } = body || {};

    if (action === 'restore') {
      return await restoreBackup(body?.backupId);
    }
    
    if (!BACKUP_CONFIG.enabled) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Sistema de respaldos deshabilitado' 
      }, { status: 400 });
    }

    const backupId = await createBackup(type, tables);
    
    // Limpiar respaldos antiguos
    await cleanupOldBackups();
    
    // Enviar notificación
    await sendBackupNotification(backupId, type);
    
    return NextResponse.json({ 
      ok: true, 
      backupId,
      message: 'Respaldo creado exitosamente',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error en respaldo:', error);
    await sendErrorNotification(error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message 
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const usuario = getSessionUser(request);
    if (!usuario) return unauthorized();
    if (usuario.rol !== 'admin') return forbidden();

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    switch (action) {
      case 'status':
        return await getBackupStatus();
      case 'list':
        return await getBackupList();
      default:
        return await getBackupStatus();
    }
    
  } catch (error) {
    console.error('Error al obtener estado de respaldos:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message 
    }, { status: 500 });
  }
}

async function createBackup(type = 'manual', tables = CRITICAL_TABLES) {
  const backupId = `backup_${Date.now()}_${type}`;
  const timestamp = new Date().toISOString();
  
  console.log(`🔄 Iniciando respaldo ${backupId}...`);
  
  const backupData = {
    id: backupId,
    type,
    timestamp,
    tables: {},
    metadata: {
      version: '2.1',
      environment: process.env.NODE_ENV || 'development',
      tables_count: tables.length,
      config: BACKUP_CONFIG
    }
  };
  
  // Exportar datos de cada tabla
  for (const tableName of tables) {
    try {
      console.log(`📊 Exportando tabla: ${tableName}`);
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*');
      
      if (error) {
        console.error(`Error exportando ${tableName}:`, error);
        backupData.tables[tableName] = { error: error.message };
      } else {
        backupData.tables[tableName] = {
          count: data.length,
          data: data,
          exported_at: new Date().toISOString()
        };
      }
      
    } catch (error) {
      console.error(`Error crítico exportando ${tableName}:`, error);
      backupData.tables[tableName] = { error: error.message };
    }
  }
  
  // Guardar respaldo
  await saveBackup(backupId, backupData);
  
  // Registrar en logs
  await logBackup(backupId, type, tables, 'success');
  
  return backupId;
}

async function saveBackup(backupId, backupData) {
  const backupPath = `${BACKUP_CONFIG.storage.path}/${backupId}.json`;
  
  if (BACKUP_CONFIG.storage.type === 'local') {
    // Para desarrollo/local - guardar en sistema de archivos
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      await fs.mkdir(path.dirname(backupPath), { recursive: true });
      
      const dataToSave = BACKUP_CONFIG.storage.compression 
        ? JSON.stringify(backupData) 
        : JSON.stringify(backupData, null, 2);
      
      await fs.writeFile(backupPath, dataToSave, 'utf8');
      console.log(`✅ Respaldo guardado en: ${backupPath}`);
      
    } catch (error) {
      throw new Error(`Error guardando respaldo local: ${error.message}`);
    }
  } else if (BACKUP_CONFIG.storage.type === 'supabase') {
    // Guardar en tabla de backups
    const { error } = await supabase
      .from('backups')
      .insert({
        id: backupId,
        type: backupData.type,
        data: backupData,
        created_at: backupData.timestamp,
        size: JSON.stringify(backupData).length
      });
    
    if (error) {
      throw new Error(`Error guardando respaldo en Supabase: ${error.message}`);
    }
  }
}

async function cleanupOldBackups() {
  try {
    console.log('🧹 Limpiando respaldos antiguos...');
    
    const now = new Date();
    const cutoffs = {
      daily: new Date(now.getTime() - (BACKUP_CONFIG.retention.daily * 24 * 60 * 60 * 1000)),
      weekly: new Date(now.getTime() - (BACKUP_CONFIG.retention.weekly * 7 * 24 * 60 * 60 * 1000)),
      monthly: new Date(now.getTime() - (BACKUP_CONFIG.retention.monthly * 30 * 24 * 60 * 60 * 1000))
    };
    
    if (BACKUP_CONFIG.storage.type === 'supabase') {
      // Limpiar en Supabase
      const { data: oldBackups } = await supabase
        .from('backups')
        .select('id,type,created_at')
        .lt('created_at', cutoffs.daily.toISOString());
      
      if (oldBackups && oldBackups.length > 0) {
        await supabase
          .from('backups')
          .delete()
          .in('id', oldBackups.map(b => b.id));
        
        console.log(`🗑️ Eliminados ${oldBackups.length} respaldos antiguos`);
      }
    }
    
    console.log('✅ Limpieza de respaldos completada');
    
  } catch (error) {
    console.error('Error en limpieza de respaldos:', error);
  }
}

async function getBackupStatus() {
  try {
    const { data: backups, error } = await supabase
      .from('backups')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      throw error;
    }
    
    const status = {
      enabled: BACKUP_CONFIG.enabled,
      last_backup: backups?.[0]?.created_at || null,
      total_backups: backups?.length || 0,
      next_scheduled: getNextScheduledBackup(),
      retention: BACKUP_CONFIG.retention,
      recent_backups: backups || []
    };
    
    return NextResponse.json({ ok: true, status });
    
  } catch (error) {
    return NextResponse.json({ 
      ok: false, 
      error: error.message 
    }, { status: 500 });
  }
}

async function getBackupList() {
  try {
    const { data: backups, error } = await supabase
      .from('backups')
      .select('id,type,created_at,size')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({ 
      ok: true, 
      backups: backups || [] 
    });
    
  } catch (error) {
    return NextResponse.json({ 
      ok: false, 
      error: error.message 
    }, { status: 500 });
  }
}

async function restoreBackup(backupId) {
  try {
    if (!backupId) {
      return NextResponse.json({ 
        ok: false, 
        error: 'backupId requerido' 
      }, { status: 400 });
    }
    
    console.log(`🔄 Iniciando restauración del respaldo ${backupId}...`);
    
    // Obtener datos del respaldo
    const { data: backup, error } = await supabase
      .from('backups')
      .select('data')
      .eq('id', backupId)
      .single();
    
    if (error || !backup) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Respaldo no encontrado' 
      }, { status: 404 });
    }
    
    const backupData = backup.data;
    let restoredTables = 0;
    let errors = [];
    
    // Restaurar cada tabla
    for (const [tableName, tableData] of Object.entries(backupData.tables)) {
      try {
        if (tableData.error) {
          errors.push(`${tableName}: ${tableData.error}`);
          continue;
        }
        
        if (tableData.data && tableData.data.length > 0) {
          // Limpiar tabla actual
          await supabase.from(tableName).delete().neq('id', 'impossible-id');
          
          // Insertar datos del respaldo
          const { error: insertError } = await supabase
            .from(tableName)
            .insert(tableData.data);
          
          if (insertError) {
            errors.push(`${tableName}: ${insertError.message}`);
          } else {
            restoredTables++;
            console.log(`✅ Tabla ${tableName} restaurada (${tableData.count} registros)`);
          }
        }
        
      } catch (error) {
        errors.push(`${tableName}: ${error.message}`);
      }
    }
    
    // Registrar restauración
    await logBackup(backupId, 'restore', Object.keys(backupData.tables), 
      errors.length === 0 ? 'success' : 'partial');
    
    return NextResponse.json({ 
      ok: true, 
      message: 'Restauración completada',
      restored_tables: restoredTables,
      errors: errors
    });
    
  } catch (error) {
    console.error('Error en restauración:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message 
    }, { status: 500 });
  }
}

async function logBackup(backupId, type, tables, status) {
  try {
    await supabase.from('logs').insert({
      usuario: 'sistema',
      accion: `BACKUP_${type.toUpperCase()}`,
      detalle: `${backupId} | Tablas: ${tables.join(', ')} | Estado: ${status}`,
      resultado: status.toUpperCase()
    });
  } catch (error) {
    console.error('Error registrando log de backup:', error);
  }
}

async function sendBackupNotification(backupId, type) {
  try {
    const message = `✅ Respaldo ${type} completado: ${backupId}`;
    console.log(message);
    
    // Enviar notificación por Slack si está configurado
    if (BACKUP_CONFIG.notifications.slack) {
      await fetch(BACKUP_CONFIG.notifications.slack, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message,
          username: 'MODITEX-POS Backups'
        })
      });
    }
    
  } catch (error) {
    console.error('Error enviando notificación de backup:', error);
  }
}

async function sendErrorNotification(error) {
  try {
    const message = `❌ Error en respaldo: ${error.message}`;
    console.error(message);
    
    if (BACKUP_CONFIG.notifications.slack) {
      await fetch(BACKUP_CONFIG.notifications.slack, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message,
          username: 'MODITEX-POS Backups'
        })
      });
    }
    
  } catch (notificationError) {
    console.error('Error enviando notificación de error:', notificationError);
  }
}

function getNextScheduledBackup() {
  // Calcular próximo respaldo programado (simplificado)
  const now = new Date();
  const next = new Date(now);
  next.setDate(now.getDate() + 1);
  next.setHours(2, 0, 0, 0);
  
  return next.toISOString();
}
