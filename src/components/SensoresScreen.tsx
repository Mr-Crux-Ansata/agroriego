import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useState, useEffect } from 'react';
import { api } from '../api'; // Asegúrate de que la ruta coincida con la ubicación de tu api.js
import {
  Gauge,
  Droplet,
  Thermometer,
  Wind,
  Sun,
  TrendingDown,
  Waves,
  HelpCircle,
  CheckCircle,
  AlertTriangle,
  WifiOff,
  Loader2
} from 'lucide-react';

interface SensorMapeado {
  id: string;
  tipo: string;
  area: string;
  areaId: string;
  predio: string;
  predioId: string;
  valor: number | null;
  unidad: string;
  estado: string;
  ultimaLectura: string;
  icon: any;
  color: string;
  bgColor: string;
}

export function SensoresScreen() {
  const [filtroPredio, setFiltroPredio] = useState('todos');
  const [filtroArea, setFiltroArea] = useState('todas');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  const [sensores, setSensores] = useState<SensorMapeado[]>([]);
  const [prediosDisponibles, setPrediosDisponibles] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setCargando(true);

        const prediosData = await api.getPredios();
        setPrediosDisponibles(prediosData);

        const areasData = await api.getAreas();
        const sensoresGenerados: SensorMapeado[] = [];

        for (const area of areasData) {
          const predio = prediosData.find((p: any) => p.id_predio === area.id_predio);
          const nombrePredio = predio ? predio.nombre : 'Desconocido';
          const predioIdStr = area.id_predio.toString();

          try {
            const telemetriaData = await api.getTelemetria(area.id_area);
            const ultimaLectura = telemetriaData && telemetriaData.length > 0
                ? telemetriaData[0]
                : null;

            if (ultimaLectura) {
              const fechaFormateada = new Date(ultimaLectura.fecha_hora).toLocaleString([], {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'
              });

              const humedadAlerta = ultimaLectura.humedad_suelo <= area.punto_marchitez
                  || ultimaLectura.humedad_suelo >= area.capacidad_campo;
              const estadoHumedad = humedadAlerta ? 'alerta' : 'normal';

              sensoresGenerados.push({
                id: `${area.id_area}-H`,
                tipo: 'Humedad del Suelo',
                area: area.nombre,
                areaId: area.id_area.toString(),
                predio: nombrePredio,
                predioId: predioIdStr,
                valor: ultimaLectura.humedad_suelo,
                unidad: '%',
                estado: estadoHumedad,
                ultimaLectura: fechaFormateada,
                icon: Droplet,
                color: estadoHumedad === 'alerta' ? 'text-red-600' : 'text-green-600',
                bgColor: estadoHumedad === 'alerta' ? 'bg-red-50' : 'bg-green-50',
              });

              sensoresGenerados.push({
                id: `${area.id_area}-T`,
                tipo: 'Temperatura Ambiental',
                area: area.nombre,
                areaId: area.id_area.toString(),
                predio: nombrePredio,
                predioId: predioIdStr,
                valor: ultimaLectura.temperatura_ambiental,
                unidad: '°C',
                estado: 'normal',
                ultimaLectura: fechaFormateada,
                icon: Thermometer,
                color: 'text-orange-600',
                bgColor: 'bg-orange-50',
              });

              sensoresGenerados.push({
                id: `${area.id_area}-HR`,
                tipo: 'Humedad Relativa',
                area: area.nombre,
                areaId: area.id_area.toString(),
                predio: nombrePredio,
                predioId: predioIdStr,
                valor: ultimaLectura.humedad_relativa,
                unidad: '%',
                estado: 'normal',
                ultimaLectura: fechaFormateada,
                icon: Wind,
                color: 'text-blue-600',
                bgColor: 'bg-blue-50',
              });

              sensoresGenerados.push({
                id: `${area.id_area}-ET`,
                tipo: 'Evapotranspiración',
                area: area.nombre,
                areaId: area.id_area.toString(),
                predio: nombrePredio,
                predioId: predioIdStr,
                valor: ultimaLectura.evapotranspiracion,
                unidad: 'mm/día',
                estado: 'normal',
                ultimaLectura: fechaFormateada,
                icon: TrendingDown,
                color: 'text-purple-600',
                bgColor: 'bg-purple-50',
              });

            } else {
              sensoresGenerados.push({
                id: `${area.id_area}-F`,
                tipo: 'Telemetría',
                area: area.nombre,
                areaId: area.id_area.toString(),
                predio: nombrePredio,
                predioId: predioIdStr,
                valor: null,
                unidad: '',
                estado: 'falla',
                ultimaLectura: 'Sin conexión',
                icon: WifiOff,
                color: 'text-gray-600',
                bgColor: 'bg-gray-50',
              });
            }
          } catch (error) {
            console.error(`Fallo al leer telemetría del área ${area.id_area}`, error);
          }
        }

        setSensores(sensoresGenerados);
      } catch (error) {
        console.error("Error general obteniendo datos de Agroriego:", error);
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, []);

  const filteredSensores = sensores.filter(sensor => {
    if (filtroPredio !== 'todos' && sensor.predioId !== filtroPredio) return false;
    if (filtroArea !== 'todas' && sensor.areaId !== filtroArea) return false;
    if (filtroEstado !== 'todos' && sensor.estado !== filtroEstado) return false;
    return true;
  });

  const areasDisponibles = Object.values(
    sensores.reduce((acc, sensor) => {
      if (!acc[sensor.areaId]) {
        acc[sensor.areaId] = {
          areaId: sensor.areaId,
          area: sensor.area,
          predioId: sensor.predioId,
          predio: sensor.predio,
        };
      }
      return acc;
    }, {} as Record<string, { areaId: string; area: string; predioId: string; predio: string }>),
  )
    .filter((a) => filtroPredio === 'todos' || a.predioId === filtroPredio)
    .sort((a, b) => {
      const byPredio = a.predio.localeCompare(b.predio);
      if (byPredio !== 0) return byPredio;
      return a.area.localeCompare(b.area);
    });

  const sensoresPorPredioYArea = Object.values(
    filteredSensores.reduce((acc, sensor) => {
      if (!acc[sensor.predioId]) {
        acc[sensor.predioId] = {
          predioId: sensor.predioId,
          predio: sensor.predio,
          areas: {} as Record<string, { areaId: string; area: string; sensores: SensorMapeado[] }>,
        };
      }

      if (!acc[sensor.predioId].areas[sensor.areaId]) {
        acc[sensor.predioId].areas[sensor.areaId] = {
          areaId: sensor.areaId,
          area: sensor.area,
          sensores: [],
        };
      }

      acc[sensor.predioId].areas[sensor.areaId].sensores.push(sensor);
      return acc;
    }, {} as Record<string, { predioId: string; predio: string; areas: Record<string, { areaId: string; area: string; sensores: SensorMapeado[] }> }>),
  ).sort((a, b) => {
    return a.predio.localeCompare(b.predio);
  });

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'normal':
        return { icon: CheckCircle, text: 'Normal', class: 'bg-green-100 text-green-700' };
      case 'alerta':
        return { icon: AlertTriangle, text: 'Alerta', class: 'bg-yellow-100 text-yellow-700' };
      case 'falla':
        return { icon: WifiOff, text: 'Falla', class: 'bg-red-100 text-red-700' };
      default:
        return { icon: CheckCircle, text: 'Normal', class: 'bg-gray-100 text-gray-700' };
    }
  };

  const sensoresNormales = sensores.filter(s => s.estado === 'normal').length;
  const sensoresAlerta = sensores.filter(s => s.estado === 'alerta').length;
  const sensoresFalla = sensores.filter(s => s.estado === 'falla').length;

  if (cargando) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <p className="text-gray-600">Sincronizando sensores del sistema...</p>
        </div>
    );
  }

  return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl mb-2">Sensores IoT</h1>
            <p className="text-sm md:text-base text-gray-600">Monitoreo en tiempo real de todos los sensores</p>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Gauge className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Sensores</p>
                  <p className="text-3xl">{sensores.length}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Normales</p>
                  <p className="text-3xl">{sensoresNormales}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">En Alerta</p>
                  <p className="text-3xl">{sensoresAlerta}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 rounded-2xl shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <WifiOff className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Con Fallas</p>
                  <p className="text-3xl">{sensoresFalla}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Filtros */}
          <Card className="p-6 rounded-2xl shadow-sm">
            <h2 className="text-lg mb-4">Filtros</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-600">Predio</label>
                <Select
                  value={filtroPredio}
                  onValueChange={(valor) => {
                    setFiltroPredio(valor);
                    setFiltroArea('todas');
                  }}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los Predios</SelectItem>
                    {/* Poblamos el select dinámicamente con los predios de la DB */}
                    {prediosDisponibles.map(p => (
                        <SelectItem key={p.id_predio} value={p.id_predio.toString()}>
                          {p.nombre}
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-600">Área de Riego</label>
                <Select value={filtroArea} onValueChange={setFiltroArea}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las Áreas</SelectItem>
                    {areasDisponibles.map((a) => (
                      <SelectItem key={a.areaId} value={a.areaId}>
                        {a.predio} - {a.area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-600">Estado</label>
                <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los Estados</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="alerta">En Alerta</SelectItem>
                    <SelectItem value="falla">Con Falla</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Lista de Sensores por Predio y Área */}
          <div className="space-y-6">
            {sensoresPorPredioYArea.map((grupoPredio) => (
              <Card key={grupoPredio.predioId} className="p-6 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-4 border-b pb-4">
                  <h3 className="text-lg font-medium">Predio: {grupoPredio.predio}</h3>
                  <Badge className="bg-slate-100 text-slate-700 w-fit">
                    {Object.values(grupoPredio.areas).reduce((acc, area) => acc + area.sensores.length, 0)} sensores
                  </Badge>
                </div>

                <div className="space-y-6">
                  {Object.values(grupoPredio.areas)
                    .sort((a, b) => a.area.localeCompare(b.area))
                    .map((grupoArea) => (
                      <div key={grupoArea.areaId}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                          <h4 className="text-base font-medium text-gray-800">Área: {grupoArea.area}</h4>
                          <Badge className="bg-blue-100 text-blue-700 w-fit">{grupoArea.sensores.length} sensores</Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {grupoArea.sensores.map((sensor) => {
                            const Icon = sensor.icon;
                            const badge = getEstadoBadge(sensor.estado);
                            const BadgeIcon = badge.icon;

                            return (
                              <Card key={sensor.id} className="p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-4">
                                  <div className={`w-12 h-12 ${sensor.bgColor} rounded-xl flex items-center justify-center`}>
                                    <Icon className={`w-6 h-6 ${sensor.color}`} />
                                  </div>
                                  <Badge className={badge.class}>
                                    <BadgeIcon className="w-3 h-3 mr-1" />
                                    {badge.text}
                                  </Badge>
                                </div>

                                <h5 className="font-medium mb-1">{sensor.tipo}</h5>

                                <div className="mb-4">
                                  {sensor.valor !== null ? (
                                    <div className="flex items-baseline gap-2">
                                      <span className={`text-3xl ${sensor.color}`}>
                                        {sensor.valor}
                                      </span>
                                      <span className="text-lg text-gray-600">
                                        {sensor.unidad}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="text-2xl text-gray-400">
                                      Sin lectura
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-1 text-xs text-gray-500 border-t pt-3">
                                  <p><span className="font-medium">ID:</span> {sensor.id}</p>
                                  <p><span className="font-medium">Última lectura:</span> {sensor.ultimaLectura}</p>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            ))}
          </div>

          {filteredSensores.length === 0 && (
              <Card className="p-12 rounded-2xl shadow-sm text-center">
                <Gauge className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl mb-2">No se encontraron sensores</h3>
                <p className="text-gray-600">
                  No hay sensores que coincidan con los filtros seleccionados
                </p>
              </Card>
          )}
        </div>
      </div>
  );
}