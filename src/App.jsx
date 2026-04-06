import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import emailjs from '@emailjs/browser'
import './App.css'

function App() {
  const [reminders, setReminders] = useState(() => {
    const saved = localStorage.getItem('recuerdame_data');
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('recuerdame_settings');
    return saved ? JSON.parse(saved) : { 
      email: '', 
      serviceId: '', 
      templateId: '', 
      publicKey: '',
      notificationsEnabled: false,
      alertSameDay: true,
      alertOneDayBefore: true,
      useBackend: false,
      backendUrl: '/api'
    };
  });

  const [text, setText] = useState('');
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // PWA Install Prompt
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => setDeferredPrompt(null));
    }
  };

  useEffect(() => {
    localStorage.setItem('recuerdame_data', JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    localStorage.setItem('recuerdame_settings', JSON.stringify(settings));
  }, [settings]);

  // Request notification permission
  useEffect(() => {
    if (settings.notificationsEnabled && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [settings.notificationsEnabled]);

  // Reminder checking logic
  useEffect(() => {
    const checkReminders = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const newReminders = reminders.map(reminder => {
        const reminderDate = new Date(reminder.date + 'T00:00:00');
        reminderDate.setHours(0, 0, 0, 0);

        const diffTime = reminderDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let updatedReminder = { ...reminder };
        let shouldNotify = false;
        let alertContext = '';

        // Check milestones
        if (diffDays === 0 && settings.alertSameDay && !reminder.notified_0d) {
          shouldNotify = true;
          alertContext = 'PARA HOY';
          updatedReminder.notified_0d = true;
        } else if (diffDays === 1 && settings.alertOneDayBefore && !reminder.notified_1d) {
          shouldNotify = true;
          alertContext = 'PARA MAÑANA';
          updatedReminder.notified_1d = true;
        }

        if (shouldNotify) {
          // Browser Notification
          if (settings.notificationsEnabled && Notification.permission === 'granted') {
            new Notification(`Recuerdame (${alertContext})`, {
              icon: '/pwa-192x192.png',
              body: `${reminder.text} ${reminder.amount ? '- $' + reminder.amount : ''}`,
            });
          }

          const emailSubject = `Recordatorio: ${reminder.text} (${alertContext})`;
          const emailMessage = `Hola, tienes un pago ${alertContext.toLowerCase()}: ${reminder.text}. Monto: ${reminder.amount || 'No especificado'}.`;

          // Notification method: Backend vs EmailJS
          if (settings.useBackend && settings.backendUrl) {
            // Using your OWN Node.js server
            fetch(`${settings.backendUrl}/api/send-reminder`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: settings.email,
                subject: emailSubject,
                message: emailMessage
              })
            }).catch(err => console.error('Error Backend:', err));
          } else if (settings.email && settings.serviceId && settings.templateId && settings.publicKey) {
            // Using EmailJS API
            emailjs.send(
              settings.serviceId,
              settings.templateId,
              {
                to_email: settings.email,
                subject: emailSubject,
                message: emailMessage,
              },
              settings.publicKey
            ).catch(err => console.error('Error EmailJS:', err));
          }
        }

        return updatedReminder;
      });

      const hasChanged = JSON.stringify(newReminders) !== JSON.stringify(reminders);
      if (hasChanged) {
        setReminders(newReminders);
      }
    };

    const interval = setInterval(checkReminders, 1000 * 60 * 60); 
    checkReminders();
    return () => clearInterval(interval);
  }, [reminders, settings]);

  const addReminder = (e) => {
    e.preventDefault();
    if (!text || !date) return;
    
    const newReminder = {
      id: Date.now(),
      text,
      date,
      amount,
      completed: false,
      notified_0d: false,
      notified_1d: false
    };
    
    setReminders([newReminder, ...reminders]);
    setText('');
    setDate('');
    setAmount('');
  };

  const deleteReminder = (id) => {
    setReminders(reminders.filter(r => r.id !== id));
  };

  const sortByDate = (a, b) => new Date(a.date) - new Date(b.date);

  return (
    <>
      <div className="blob blob-1"></div>
      <div className="blob blob-2"></div>

      <div className="app-container">
        <header className="header">
          <div className="header-top">
            <h1 className="title">Recuerdame</h1>
            <div className="header-actions">
              {deferredPrompt && (
                <motion.button 
                  className="install-btn"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleInstallClick}
                >
                  📲 Instalar App
                </motion.button>
              )}
              <motion.button 
                className="settings-toggle"
                whileTap={{ scale: 0.8, rotate: 90 }}
                onClick={() => setIsSettingsOpen(true)}
              >
                ⚙️
              </motion.button>
            </div>
          </div>
          <p className="subtitle">Gestión de Pagos y Recordatorios</p>
        </header>

        <form className="add-form glass" onSubmit={addReminder}>
          <div className="input-group">
            <input 
              type="text" 
              placeholder="¿Qué hay que pagar? (ej: Luz)" 
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
            />
          </div>
          <div className="input-row">
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <input 
              type="text" 
              placeholder="Monto (opcional)" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <motion.button 
            type="submit" 
            className="btn-add"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Agregar Recordatorio
          </motion.button>
        </form>

        <main className="reminder-list">
          <AnimatePresence mode='popLayout'>
            {reminders.sort(sortByDate).map(reminder => (
              <motion.div 
                key={reminder.id} 
                className="reminder-card glass"
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <div className="card-info">
                  <h3 className="reminder-text">{reminder.text}</h3>
                  <div className="card-meta">
                    <span className="reminder-date">📅 {new Date(reminder.date + 'T00:00:00').toLocaleDateString()}</span>
                    {reminder.amount && <span className="reminder-amount">💰 {reminder.amount}</span>}
                  </div>
                </div>
                <motion.button 
                  className="btn-delete" 
                  onClick={() => deleteReminder(reminder.id)}
                  whileHover={{ backgroundColor: 'rgba(239, 68, 68, 0.3)' }}
                  whileTap={{ scale: 0.9 }}
                >
                  Eliminar
                </motion.button>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {reminders.length === 0 && (
            <motion.div 
              className="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p>No tienes recordatorios pendientes.</p>
              <span>¡Empieza agregando uno arriba!</span>
            </motion.div>
          )}
        </main>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            className="settings-overlay blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSettingsOpen(false)}
          >
            <motion.div 
              className="settings-panel glass"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="settings-header">
                <h2>Configuración</h2>
                <button onClick={() => setIsSettingsOpen(false)}>✕</button>
              </div>

              <div className="settings-body">
                <section className="settings-section">
                  <h3>Recordatorios por Email</h3>
                  <div className="input-group">
                    <label>Tu Email</label>
                    <input 
                      type="email" 
                      placeholder="ejemplo@correo.com" 
                      value={settings.email}
                      onChange={(e) => setSettings({...settings, email: e.target.value})}
                    />
                  </div>
                  <div className="quota-warning glass">
                    <p>⚠️ <strong>Nota sobre la cuota:</strong> La cuenta gratuita de EmailJS permite 200 correos al mes. Si muchos usuarios usan la misma cuenta, este límite se agotará rápido.</p>
                  </div>
                  <p className="settings-hint">Configuración avanzada para desarrolladores:</p>
                  <div className="input-group">
                    <label>Public Key</label>
                    <input 
                      type="text" 
                      value={settings.publicKey}
                      onChange={(e) => setSettings({...settings, publicKey: e.target.value})}
                    />
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Service ID</label>
                      <input 
                        type="text" 
                        value={settings.serviceId}
                        onChange={(e) => setSettings({...settings, serviceId: e.target.value})}
                      />
                    </div>
                    <div className="input-group">
                      <label>Template ID</label>
                      <input 
                        type="text" 
                        value={settings.templateId}
                        onChange={(e) => setSettings({...settings, templateId: e.target.value})}
                      />
                    </div>
                  </div>
                </section>

                <section className="settings-section">
                  <h3>Servidor Propio (Aprendizaje)</h3>
                  <div className="toggle-group">
                    <span>Usar mi propio servidor Node.js</span>
                    <input 
                      type="checkbox" 
                      checked={settings.useBackend}
                      onChange={(e) => setSettings({...settings, useBackend: e.target.checked})}
                    />
                  </div>
                  {settings.useBackend && (
                    <div className="input-group" style={{ marginTop: '10px' }}>
                      <label>URL del Servidor</label>
                      <input 
                        type="text" 
                        value={settings.backendUrl}
                        onChange={(e) => setSettings({...settings, backendUrl: e.target.value})}
                      />
                    </div>
                  )}
                  <p className="settings-hint">Ideal para no depender de EmailJS y aprender backend.</p>
                </section>

                <section className="settings-section">
                  <h3>Frecuencia de Avisos</h3>
                  <div className="toggle-group">
                    <span>Avisar el mismo día</span>
                    <input 
                      type="checkbox" 
                      checked={settings.alertSameDay}
                      onChange={(e) => setSettings({...settings, alertSameDay: e.target.checked})}
                    />
                  </div>
                  <div className="toggle-group" style={{ marginTop: '10px' }}>
                    <span>Avisar 1 día antes</span>
                    <input 
                      type="checkbox" 
                      checked={settings.alertOneDayBefore}
                      onChange={(e) => setSettings({...settings, alertOneDayBefore: e.target.checked})}
                    />
                  </div>
                </section>

                <section className="settings-section">
                  <h3>Notificaciones Locales</h3>
                  <div className="toggle-group">
                    <span>Habilitar alertas de escritorio</span>
                    <input 
                      type="checkbox" 
                      checked={settings.notificationsEnabled}
                      onChange={(e) => setSettings({...settings, notificationsEnabled: e.target.checked})}
                    />
                  </div>
                </section>
              </div>
              
              <button className="btn-add" onClick={() => setIsSettingsOpen(false)}>Listo</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default App
