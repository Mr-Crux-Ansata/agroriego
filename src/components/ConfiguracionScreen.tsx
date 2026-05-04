import { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Save, Bell, Clock, Building } from 'lucide-react';
import { api } from '../api';

interface ConfiguracionScreenProps {
  userRole: 'system-admin' | 'admin' | 'user';
}

export function ConfiguracionScreen({ userRole }: ConfiguracionScreenProps) {
  const RFC_REGEX = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
  const normalizarRFC = (value: string) =>
    value.toUpperCase().replace(/[^A-Z0-9Ñ&]/g, '');

  const [config, setConfig] = useState({
    frecuenciaActualizacion: '10',
    notificacionesEmail: true,
    emailNotificaciones: 'admin@agroriego.com',
    nombreCliente: 'AgroRiego México S.A. de C.V.',
    rfc: 'ARM123456ABC',
    emailContacto: 'contacto@agroriego.com',
  });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const cargarConfiguracion = async () => {
      try {
        const res = await api.getConfiguracionGeneral();
        const cfg = res.data?.configuracion;
        if (!res.ok || !cfg) return;

        setConfig({
          frecuenciaActualizacion: String(cfg.frecuencia_actualizacion_min ?? 10),
          notificacionesEmail: Boolean(cfg.notificaciones_email),
          emailNotificaciones: cfg.email_notificaciones || 'admin@agroriego.com',
          nombreCliente: cfg.nombre_cliente || '',
          rfc: cfg.rfc || '',
          emailContacto: cfg.email_contacto || '',
        });
      } finally {
        setCargando(false);
      }
    };

    cargarConfiguracion();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const rfcNormalizado = normalizarRFC(config.rfc);

    if (!config.nombreCliente || !config.emailContacto || !rfcNormalizado) {
      setError('Todos los campos son obligatorios');
      return;
    }

    if (!RFC_REGEX.test(rfcNormalizado)) {
      setError('RFC inválido. Usa formato de 12 o 13 caracteres (ej: XAXX010101000).');
      return;
    }

    setGuardando(true);
    const res = await api.actualizarConfiguracionGeneral({
      frecuencia_actualizacion_min: Number(config.frecuenciaActualizacion),
      notificaciones_email: config.notificacionesEmail,
      email_notificaciones: config.emailNotificaciones,
      nombre_cliente: config.nombreCliente,
      rfc: rfcNormalizado,
      email_contacto: config.emailContacto,
    });
    setGuardando(false);

    if (!res.ok) {
      alert(res.error || 'No se pudo guardar la configuración');
      return;
    }

    setSuccess('Configuración guardada exitosamente.');
  };

  if (userRole !== 'admin' && userRole !== 'system-admin') {
    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <Card className="p-6 md:p-8 rounded-2xl shadow-sm text-center">
            <h2 className="text-2xl mb-2">Acceso Restringido</h2>
            <p className="text-gray-600">
              Solo los administradores pueden modificar la configuración del sistema
            </p>
          </Card>
        </div>
      </div>
    );
  }

  if (cargando) {
    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <Card className="p-6 md:p-8 rounded-2xl shadow-sm text-center">
            <p className="text-gray-600">Cargando configuración...</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl mb-2">Configuración General</h1>
          <p className="text-sm md:text-base text-gray-600">Ajustes del sistema y datos del cliente</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Configuración del Sistema */}
          <Card className="p-4 md:p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg md:text-xl">Configuración del Sistema</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="frecuencia">Frecuencia de Actualización</Label>
                <Select 
                  value={config.frecuenciaActualizacion} 
                  onValueChange={(value) => setConfig({ ...config, frecuenciaActualizacion: value })}
                >
                  <SelectTrigger className="rounded-xl" disabled>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">Cada 10 minutos (Fijo)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  La frecuencia de actualización está configurada en 10 minutos para todos los sensores
                </p>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl">
                <h3 className="text-sm font-medium mb-2">Tolerancia a Fallos</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Pérdida aceptable: hasta 1 hora</li>
                  <li>• Pérdida crítica: más de 1 día</li>
                  <li>• Alertas automáticas activadas para ambos casos</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Notificaciones */}
          <Card className="p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Bell className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-xl">Configuración de Notificaciones</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium">Notificaciones por Email</p>
                  <p className="text-sm text-gray-600">
                    Recibir alertas por correo electrónico
                  </p>
                </div>
                <Switch
                  checked={config.notificacionesEmail}
                  onCheckedChange={(checked) => setConfig({ ...config, notificacionesEmail: checked })}
                />
              </div>

              {config.notificacionesEmail && (
                <div className="space-y-2 ml-4">
                  <Label htmlFor="emailNotificaciones">Email para Notificaciones</Label>
                  <Input
                    id="emailNotificaciones"
                    type="email"
                    value={config.emailNotificaciones}
                    onChange={(e) => setConfig({ ...config, emailNotificaciones: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              )}

              <div className="p-4 bg-yellow-50 rounded-xl">
                <p className="text-sm text-yellow-900">
                  <span className="font-medium">Tipos de Alertas:</span> Falta de agua, exceso de agua, 
                  fallas de sensores, pérdida de comunicación con nodos
                </p>
              </div>
            </div>
          </Card>

          {/* Datos del Cliente */}
          <Card className="p-6 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Building className="w-5 h-5 text-purple-600" />
              </div>
              <h2 className="text-xl">Datos del Cliente</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 col-span-1 md:col-span-2">
                <Label htmlFor="nombreCliente">Nombre del Cliente / Empresa</Label>
                <Input
                  id="nombreCliente"
                  value={config.nombreCliente}
                  onChange={(e) => {
                    setError('');
                    setSuccess('');
                    setConfig({ ...config, nombreCliente: e.target.value });
                  }}
                  className="rounded-xl"
                  required
                />
              </div>

              <div className="space-y-2 col-span-1">
                <Label htmlFor="rfc">RFC</Label>
                <Input
                  id="rfc"
                  value={config.rfc}
                  onChange={(e) => {
                    setError('');
                    setSuccess('');
                    setConfig({ ...config, rfc: normalizarRFC(e.target.value) });
                  }}
                  className="rounded-xl"
                  required
                />
                {error && (
                  <p className="text-sm text-red-700">{error}</p>
                )}
              </div>

              <div className="space-y-2 col-span-1">
                <Label htmlFor="emailContacto">Email de Contacto</Label>
                <Input
                  id="emailContacto"
                  type="email"
                  value={config.emailContacto}
                  onChange={(e) => {
                    setError('');
                    setSuccess('');
                    setConfig({ ...config, emailContacto: e.target.value });
                  }}
                  className="rounded-xl"
                  required
                />
              </div>

            </div>
          </Card>

          {/* Información del Sistema */}
          <Card className="p-6 rounded-2xl shadow-sm bg-gradient-to-br from-blue-50 to-green-50">
            <h3 className="text-lg mb-4">Información del Sistema</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Versión del Sistema</p>
                <p className="font-medium">AgroRiego IoT v2.0.1</p>
              </div>
              <div>
                <p className="text-gray-600">Última Actualización</p>
                <p className="font-medium">04 Diciembre 2024</p>
              </div>
              <div>
                <p className="text-gray-600">Lecturas Totales (Hoy)</p>
                <p className="font-medium">2,432 lecturas</p>
              </div>
              <div>
                <p className="text-gray-600">Uptime del Sistema</p>
                <p className="font-medium">99.8%</p>
              </div>
            </div>
          </Card>

          {/* Botón de Guardar */}
          <Button
            type="submit"
            disabled={guardando}
            className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 rounded-xl"
          >
            <Save className="w-5 h-5 mr-2" />
            {guardando ? 'Guardando...' : 'Guardar Configuración'}
          </Button>

          {success && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              {success}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}