/**
 * Sistema de Alertas de Errores en Tiempo Real
 * MODITEX-POS - Monitoreo y Notificaciones
 */

class ErrorAlertSystem {
  constructor() {
    this.alerts = [];
    this.maxAlerts = 100;
    this.alertThresholds = {
      critical: 1,      // Alertar inmediatamente
      high: 3,          // Alertar después de 3 ocurrencias
      medium: 5,        // Alertar después de 5 ocurrencias
      low: 10          // Alertar después de 10 ocurrencias
    };
    this.cooldownPeriod = 300000; // 5 minutos
    this.lastAlerts = new Map();
    
    this.initializeErrorTracking();
  }

  initializeErrorTracking() {
    // Capturar errores no manejados
    window.addEventListener('error', (event) => {
      this.handleError({
        type: 'javascript',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    // Capturar promesas rechazadas
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        type: 'promise',
        message: event.reason?.message || 'Promise rechazada',
        stack: event.reason?.stack
      });
    });

    // Capturar errores de fetch
    this.interceptFetch();
  }

  interceptFetch() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        // Capturar respuestas de error HTTP
        if (!response.ok) {
          this.handleError({
            type: 'http',
            message: `HTTP ${response.status}: ${response.statusText}`,
            url: args[0],
            status: response.status,
            statusText: response.statusText
          });
        }
        
        return response;
      } catch (error) {
        this.handleError({
          type: 'network',
          message: error.message,
          url: args[0],
          stack: error.stack
        });
        throw error;
      }
    };
  }

  handleError(errorInfo) {
    const errorKey = this.generateErrorKey(errorInfo);
    const now = Date.now();
    
    // Verificar cooldown
    if (this.isInCooldown(errorKey, now)) {
      return;
    }

    // Clasificar severidad
    const severity = this.classifySeverity(errorInfo);
    
    // Crear alerta
    const alert = {
      id: this.generateId(),
      timestamp: now,
      severity,
      ...errorInfo,
      count: 1,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getCurrentUserId()
    };

    // Verificar si ya existe un error similar
    const existingAlert = this.findSimilarAlert(errorKey);
    if (existingAlert) {
      existingAlert.count++;
      existingAlert.lastSeen = now;
      existingAlert.timestamp = now;
      
      // Verificar si debe alertar basado en el threshold
      if (existingAlert.count >= this.alertThresholds[severity]) {
        this.triggerAlert(existingAlert);
        this.setCooldown(errorKey, now);
      }
    } else {
      this.alerts.unshift(alert);
      this.trimAlerts();
      
      // Alertas críticas siempre se notifican
      if (severity === 'critical') {
        this.triggerAlert(alert);
        this.setCooldown(errorKey, now);
      }
    }

    // Log para debugging
    console.error('🚨 Error capturado:', alert);
  }

  generateErrorKey(errorInfo) {
    // Crear clave única para errores similares
    const base = `${errorInfo.type}-${errorInfo.message}`;
    return base.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50);
  }

  classifySeverity(errorInfo) {
    // Clasificación automática de severidad
    const message = errorInfo.message?.toLowerCase() || '';
    const status = errorInfo.status;
    
    // Errores críticos
    if (message.includes('network') || 
        message.includes('fetch') ||
        status >= 500 ||
        message.includes('database') ||
        message.includes('connection')) {
      return 'critical';
    }
    
    // Errores altos
    if (status >= 400 || 
        message.includes('unauthorized') ||
        message.includes('forbidden') ||
        message.includes('timeout')) {
      return 'high';
    }
    
    // Errores medios
    if (message.includes('not found') ||
        message.includes('validation') ||
        message.includes('invalid')) {
      return 'medium';
    }
    
    // Errores bajos
    return 'low';
  }

  findSimilarAlert(errorKey) {
    return this.alerts.find(alert => 
      this.generateErrorKey(alert) === errorKey
    );
  }

  isInCooldown(errorKey, now) {
    const lastAlert = this.lastAlerts.get(errorKey);
    return lastAlert && (now - lastAlert) < this.cooldownPeriod;
  }

  setCooldown(errorKey, now) {
    this.lastAlerts.set(errorKey, now);
  }

  triggerAlert(alert) {
    // Crear notificación visual
    this.showNotification(alert);
    
    // Enviar a servidor para monitoreo
    this.sendToServer(alert);
    
    // Actualizar UI si existe
    this.updateErrorUI(alert);
  }

  showNotification(alert) {
    // Crear notificación en la UI
    const notification = document.createElement('div');
    notification.className = `error-notification error-${alert.severity}`;
    notification.innerHTML = `
      <div class="error-icon">${this.getSeverityIcon(alert.severity)}</div>
      <div class="error-content">
        <div class="error-title">Error ${alert.severity.toUpperCase()}</div>
        <div class="error-message">${alert.message}</div>
        <div class="error-count">Ocurrencias: ${alert.count}</div>
      </div>
      <button class="error-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    // Estilos
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${this.getSeverityColor(alert.severity)};
      color: white;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      max-width: 400px;
      display: flex;
      align-items: center;
      gap: 12px;
      font-family: 'DM Mono', monospace;
      font-size: 12px;
      animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remover después de 10 segundos
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 10000);
  }

  getSeverityIcon(severity) {
    const icons = {
      critical: '🚨',
      high: '⚠️',
      medium: '⚡',
      low: 'ℹ️'
    };
    return icons[severity] || '❌';
  }

  getSeverityColor(severity) {
    const colors = {
      critical: '#dc2626',
      high: '#ea580c',
      medium: '#d97706',
      low: '#0891b2'
    };
    return colors[severity] || '#6b7280';
  }

  async sendToServer(alert) {
    try {
      await fetch('/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...alert,
          timestamp: new Date(alert.timestamp).toISOString()
        })
      });
    } catch (error) {
      console.error('Error al enviar alerta al servidor:', error);
    }
  }

  updateErrorUI(alert) {
    // Actualizar contador de errores en la UI si existe
    const errorCounter = document.querySelector('.error-counter');
    if (errorCounter) {
      errorCounter.textContent = this.alerts.length;
      errorCounter.style.display = this.alerts.length > 0 ? 'block' : 'none';
    }
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  getCurrentUserId() {
    // Obtener ID del usuario actual del contexto de autenticación
    return window.usuario?.email || 'anonymous';
  }

  trimAlerts() {
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(0, this.maxAlerts);
    }
  }

  // Métodos públicos para debugging
  getAlerts() {
    return this.alerts;
  }

  getAlertsBySeverity(severity) {
    return this.alerts.filter(alert => alert.severity === severity);
  }

  clearAlerts() {
    this.alerts = [];
    this.lastAlerts.clear();
  }

  generateReport() {
    const report = {
      total: this.alerts.length,
      bySeverity: {
        critical: this.getAlertsBySeverity('critical').length,
        high: this.getAlertsBySeverity('high').length,
        medium: this.getAlertsBySeverity('medium').length,
        low: this.getAlertsBySeverity('low').length
      },
      byType: this.groupByType(),
      recent: this.alerts.slice(0, 10),
      generated: new Date().toISOString()
    };
    
    console.log('📊 Reporte de Errores:', report);
    return report;
  }

  groupByType() {
    const grouped = {};
    this.alerts.forEach(alert => {
      grouped[alert.type] = (grouped[alert.type] || 0) + 1;
    });
    return grouped;
  }
}

// Inicializar sistema de alertas
let errorAlertSystem;
if (typeof window !== 'undefined') {
  errorAlertSystem = new ErrorAlertSystem();
  
  // Exponer para debugging
  window.errorAlertSystem = errorAlertSystem;
  window.generateErrorReport = () => errorAlertSystem.generateReport();
  
  console.log('🛡️ Sistema de alertas de errores activado');
}

export default ErrorAlertSystem;
