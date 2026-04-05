export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const alert = await request.json();
    
    // Validar datos de la alerta
    if (!alert.message || !alert.type) {
      return NextResponse.json({ ok: false, error: 'Datos incompletos' }, { status: 400 });
    }

    // Guardar alerta en la base de datos
    const { data, error } = await supabase
      .from('error_alerts')
      .insert({
        id: alert.id,
        type: alert.type,
        message: alert.message,
        severity: alert.severity,
        count: alert.count || 1,
        user_id: alert.userId,
        url: alert.url,
        user_agent: alert.userAgent,
        filename: alert.filename,
        lineno: alert.lineno,
        stack: alert.stack,
        status: alert.status,
        created_at: new Date(alert.timestamp).toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error al guardar alerta:', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Si es un error crítico, enviar notificación inmediata
    if (alert.severity === 'critical') {
      await sendCriticalNotification(alert);
    }

    return NextResponse.json({ ok: true, alert: data });
    
  } catch (error) {
    console.error('Error en API de alertas:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity');
    const limit = parseInt(searchParams.get('limit')) || 50;
    
    let query = supabase
      .from('error_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (severity) {
      query = query.eq('severity', severity);
    }

    const { data, error } = await query;
    
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, alerts: data || [] });
    
  } catch (error) {
    console.error('Error al obtener alertas:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

async function sendCriticalNotification(alert) {
  try {
    // Aquí puedes integrar con servicios de notificación
    // Ejemplo: Slack, Discord, Email, SMS, etc.
    
    console.log('🚨 ALERTA CRÍTICA DETECTADA:', {
      message: alert.message,
      type: alert.type,
      user: alert.userId,
      url: alert.url,
      timestamp: new Date(alert.timestamp).toISOString()
    });

    // Ejemplo de integración con Slack (descomentar y configurar)
    /*
    const slackWebhook = process.env.SLACK_WEBHOOK_URL;
    if (slackWebhook) {
      await fetch(slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 ERROR CRÍTICO EN MODITEX-POS`,
          attachments: [{
            color: 'danger',
            fields: [
              { title: 'Mensaje', value: alert.message, short: false },
              { title: 'Tipo', value: alert.type, short: true },
              { title: 'Usuario', value: alert.userId, short: true },
              { title: 'URL', value: alert.url, short: false }
            ]
          }]
        })
      });
    }
    */

    // Ejemplo de integración con Email (descomentar y configurar)
    /*
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: '🚨 Error Crítico - MODITEX-POS',
      html: `
        <h2>Error Crítico Detectado</h2>
        <p><strong>Mensaje:</strong> ${alert.message}</p>
        <p><strong>Tipo:</strong> ${alert.type}</p>
        <p><strong>Usuario:</strong> ${alert.userId}</p>
        <p><strong>URL:</strong> ${alert.url}</p>
        <p><strong>Timestamp:</strong> ${new Date(alert.timestamp).toISOString()}</p>
        ${alert.stack ? `<pre>${alert.stack}</pre>` : ''}
      `
    });
    */

  } catch (error) {
    console.error('Error al enviar notificación crítica:', error);
  }
}
