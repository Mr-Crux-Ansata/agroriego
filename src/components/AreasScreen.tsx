import { useState, useEffect, Fragment } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Droplet, Calendar, Sprout, Settings, ArrowLeft } from 'lucide-react';
import { api } from '../api';

interface AreasScreenProps {
  userRole: 'admin' | 'user';
  onNavigate: (view: string, data?: any) => void;
  selectedPredioId?: number | null;
}

export function AreasScreen({ userRole, onNavigate, selectedPredioId }: AreasScreenProps) {
  const [areas, setAreas] = useState<any[]>([]);
  const [predios, setPredios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        const [areasData, prediosData] = await Promise.all([api.getAreas(), api.getPredios()]);
        const safeAreas = Array.isArray(areasData) ? areasData : [];
        const safePredios = Array.isArray(prediosData) ? prediosData : [];
        setPredios(safePredios);

        // Para cada área, obtener la última lectura de telemetría
        const areasConTelemetria = await Promise.all(
          safeAreas.map(async (area: any) => {
            try {
              const telemetria = await api.getTelemetria(area.id_area);
              const ultimaLectura = telemetria && telemetria.length > 0 ? telemetria[0] : null;
              return {
                ...area,
                humedad_suelo: ultimaLectura ? ultimaLectura.humedad_suelo : null,
              };
            } catch (error) {
              console.error(`Error obteniendo telemetría para área ${area.id_area}:`, error);
              return { ...area, humedad_suelo: null };
            }
          })
        );

        setAreas(areasConTelemetria);
      } catch (error) {
        console.error('Error cargando áreas:', error);
        setAreas([]);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  const sameId = (a: any, b: any) => Number(a) === Number(b);

  const areasFiltradas = selectedPredioId
    ? areas.filter((area: any) => sameId(area.id_predio, selectedPredioId))
    : areas;

  const predioSeleccionado = selectedPredioId
    ? predios.find((predio: any) => sameId(predio.id_predio, selectedPredioId))
    : null;


  const getStatusColor = (humedad: number, capacidad: number, marchitez: number) => {
    if (humedad < marchitez) return 'bg-red-500';
    if (humedad > capacidad) return 'bg-blue-500';
    if (humedad < marchitez * 1.3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusBadge = (humedad: number, capacidad: number, marchitez: number) => {
    if (humedad < marchitez) return { text: 'Falta de Agua', class: 'bg-red-100 text-red-700' };
    if (humedad > capacidad) return { text: 'Exceso de Agua', class: 'bg-blue-100 text-blue-700' };
    if (humedad < marchitez * 1.3) return { text: 'Nivel Crítico', class: 'bg-yellow-100 text-yellow-700' };
    return { text: 'Adecuado', class: 'bg-green-100 text-green-700' };
  };

  const getHumidityColor = (humedad: number, capacidad: number, marchitez: number) => {
    if (humedad < marchitez) return 'text-red-600';
    if (humedad > capacidad) return 'text-blue-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
        <div className="p-8 flex items-center justify-center min-h-screen">
          <div className="text-gray-500">Cargando áreas...</div>
        </div>
    );
  }

  return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          {selectedPredioId && (
            <Button
              onClick={() => onNavigate('predios')}
              variant="ghost"
              className="rounded-xl w-fit"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Volver a Predios
            </Button>
          )}

          <div>
            <h1 className="text-2xl md:text-3xl mb-2">Áreas de Riego</h1>
            <p className="text-sm md:text-base text-gray-600">
              {selectedPredioId
                ? `Monitoreo de áreas dentro de ${predioSeleccionado?.nombre || 'el predio seleccionado'}`
                : 'Monitoreo de todas las áreas de cultivo'}
            </p>
          </div>

          {/* Legend */}
          <Card className="p-3 md:p-4 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3 md:gap-6 flex-wrap">
              <p className="text-xs md:text-sm font-medium text-gray-700">Estados:</p>
              {[
                { color: 'bg-green-500', label: 'Adecuado (dentro del rango)' },
                { color: 'bg-yellow-500', label: 'Nivel Crítico' },
                { color: 'bg-red-500', label: 'Falta de Agua' },
                { color: 'bg-blue-500', label: 'Exceso de Agua' },
              ].map(item => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="text-xs md:text-sm">{item.label}</span>
                  </div>
              ))}
            </div>
          </Card>

          {areasFiltradas.length === 0 ? (
              <Card className="p-12 rounded-2xl shadow-sm text-center">
                <p className="text-gray-500">No hay áreas de riego registradas para este predio</p>
              </Card>
          ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {areasFiltradas.map((area: any) => {
                  const humedad = area.humedad_suelo || 0;
                  const badge = getStatusBadge(humedad, area.capacidad_campo, area.punto_marchitez);

                  return (
                      <Card key={area.id_area} className="p-4 md:p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start gap-3">
                            <div className={`w-3 h-3 rounded-full mt-2 ${getStatusColor(humedad, area.capacidad_campo, area.punto_marchitez)}`} />
                            <div>
                              <h3 className="text-sm md:text-base font-medium mb-1">{area.nombre}</h3>
                              <p className="text-xs md:text-sm text-gray-600">{area.nombre_predio}</p>
                            </div>
                          </div>
                          {!area.estatus_activo && (
                              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-lg">
                        Inactiva
                      </span>
                          )}
                        </div>

                        <div className="mb-4">
                    <span className={`text-xs px-3 py-1 rounded-lg ${badge.class}`}>
                      {badge.text}
                    </span>
                        </div>

                        <div className="space-y-3 mb-4">
                          <div className="flex items-center gap-2">
                            <Sprout className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-gray-600">Cultivo:</span>
                            <span className="text-sm font-medium">{area.tipo_cultivo}</span>
                          </div>

                          <div className="p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-600">Humedad del Suelo</span>
                              <Droplet className={`w-4 h-4 ${getHumidityColor(humedad, area.capacidad_campo, area.punto_marchitez)}`} />
                            </div>
                            <p className={`text-2xl ${getHumidityColor(humedad, area.capacidad_campo, area.punto_marchitez)}`}>
                              {humedad > 0 ? `${humedad}%` : 'Sin lectura'}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 text-xs md:text-sm">
                            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-600">
                        Marchitez: {area.punto_marchitez}% · Cap. campo: {area.capacidad_campo}%
                      </span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                              onClick={() => onNavigate('area-detail', area)}
                              className="flex-1 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 rounded-xl"
                          >
                            Ver Detalles
                          </Button>
                          {userRole === 'admin' && (
                              <Button
                                  onClick={() => onNavigate('area-config', area)}
                                  variant="outline"
                                  size="sm"
                                  className="rounded-xl"
                              >
                                <Settings className="w-4 h-4" />
                              </Button>
                          )}
                        </div>
                      </Card>
                  );
                })}
              </div>
          )}
        </div>
      </div>
  );
}