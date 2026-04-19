import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { AlertTriangle, Droplet, WifiOff, CheckCircle, Clock } from 'lucide-react';
import { api } from '../api';

export function AlertasScreen() {
  const [alertas, setAlertas] = useState<any[]>([]);
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [loading, setLoading] = useState(true);

  const cargarAlertas = () => {
    api.getAlertas().then(data => {
      setAlertas(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    cargarAlertas();
  }, []);

  const handleMarcarAtendida = async (alertaId: number) => {
  try {
    const res = await api.marcarAlertaLeida(alertaId);

    if (!res?.ok) {
      throw new Error(res?.error || 'No fue posible marcar la alerta como atendida');
    }
    
    setAlertas(prev => 
      prev.map(alerta => 
        alerta.id_alerta === alertaId 
          ? { ...alerta, leida: 1, fecha_lectura: new Date().toISOString() } 
          : alerta
      )
    );

  } catch (error) {
    console.error("Error al marcar como leída", error);
  }
};

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'Estrés Hídrico': return Droplet;
      case 'Saturación': return Droplet;
      case 'Falla de Calibración': return WifiOff;
      default: return AlertTriangle;
    }
  };

  const getSeveridadColor = (severidad: string) => {
    switch (severidad) {
      case 'Crítica': return 'bg-red-100 text-red-700';
      case 'Advertencia': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  const getBorderColor = (severidad: string) => {
    switch (severidad) {
      case 'Crítica': return 'border-l-red-500';
      case 'Advertencia': return 'border-l-yellow-500';
      default: return 'border-l-blue-500';
    }
  };

  const formatFecha = (fecha: string) => {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleString('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const filtradas = alertas.filter(a => {
    if (filtroEstado === 'pendientes') return !a.leida;
    if (filtroEstado === 'atendidas') return a.leida;
    return true;
  });

  const pendientes = alertas.filter(a => !a.leida).length;
  const atendidas = alertas.filter(a => a.leida).length;

  if (loading) {
    return (
        <div className="p-8 flex items-center justify-center min-h-screen">
          <div className="text-gray-500">Cargando alertas...</div>
        </div>
    );
  }

  return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl mb-2">Alertas del Sistema</h1>
            <p className="text-sm md:text-base text-gray-600">
              Monitorea las alertas de tus áreas de riego
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Alertas Pendientes</p>
                  <p className="text-3xl">{pendientes}</p>
                </div>
              </div>
            </Card>
            <Card className="p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Alertas Atendidas</p>
                  <p className="text-3xl">{atendidas}</p>
                </div>
              </div>
            </Card>
            <Card className="p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total de Alertas</p>
                  <p className="text-3xl">{alertas.length}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Filtro */}
          <Card className="p-6 rounded-2xl shadow-sm">
            <h2 className="text-lg mb-4">Filtros</h2>
            <div className="w-full md:w-64">
              <label className="text-sm text-gray-600 mb-2 block">Estado</label>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las Alertas</SelectItem>
                  <SelectItem value="pendientes">Pendientes</SelectItem>
                  <SelectItem value="atendidas">Atendidas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Lista */}
          <div className="space-y-4">
            {filtradas.length === 0 ? (
                <Card className="p-12 rounded-2xl shadow-sm text-center">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl mb-2">No hay alertas</h3>
                  <p className="text-gray-600">No se encontraron alertas en esta categoría</p>
                </Card>
            ) : (
                filtradas.map((alerta: any) => {
                  const Icon = getTipoIcon(alerta.tipo_alerta);
                  return (
                      <Card
                          key={alerta.id_alerta}
                          className={`p-4 md:p-6 rounded-2xl shadow-sm border-l-4 ${getBorderColor(alerta.severidad)}`}
                      >
                        <div className="flex flex-col gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                              <Icon className="w-6 h-6 text-gray-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 md:gap-3 mb-2 flex-wrap">
                                <h3 className="text-base md:text-lg">{alerta.tipo_alerta}</h3>
                                <Badge className={getSeveridadColor(alerta.severidad)}>
                                  {alerta.severidad}
                                </Badge>
                                {alerta.leida && (
                                    <Badge className="bg-green-100 text-green-700">Atendida</Badge>
                                )}
                              </div>
                              <div className="space-y-1 text-sm text-gray-600">
                                <p>{alerta.mensaje}</p>
                                <p>
                                  <span className="font-medium">Área:</span>{' '}
                                  {alerta.nombre_area || alerta.id_area}
                                </p>
                                <p>
                                  <span className="font-medium">Fecha:</span>{' '}
                                  {formatFecha(alerta.fecha_generacion)}
                                </p>
                                {alerta.leida && alerta.fecha_lectura && (
                                    <p>
                                      <span className="font-medium">Atendida:</span>{' '}
                                      {formatFecha(alerta.fecha_lectura)}
                                    </p>
                                )}
                              </div>
                            </div>
                          </div>
                          {!alerta.leida && (
                              <Button
                                  onClick={() => handleMarcarAtendida(alerta.id_alerta)}
                                  className="w-full sm:w-auto sm:self-end bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 rounded-xl"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Marcar como Atendida
                              </Button>
                          )}
                        </div>
                      </Card>
                  );
                })
            )}
          </div>
        </div>
      </div>
  );
}