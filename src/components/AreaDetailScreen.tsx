import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Droplet, Thermometer, Wind, Sun, TrendingDown, Waves, HelpCircle, ArrowLeft
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { api } from '../api';

interface AreaDetailScreenProps {
  area: any;
  onNavigate: (view: string, data?: any) => void;
}

export function AreaDetailScreen({ area, onNavigate }: AreaDetailScreenProps) {
  const [lecturas, setLecturas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('humedad_suelo');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const areaId = area?.id_area || area?.id;

  useEffect(() => {
    if (!areaId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api.getTelemetria(areaId, desde, hasta).then(data => {
      setLecturas(Array.isArray(data) ? data.reverse() : []);
      setLoading(false);
    }).catch(error => {
      console.error('Error cargando telemetria:', error);
      setLecturas([]);
      setLoading(false);
    });
  }, [areaId, desde, hasta]);

  const tabLabels: Record<string, string> = {
    humedad_suelo: 'Humedad Suelo %',
    temperatura_suelo: 'Temp. Suelo °C',
    temperatura_ambiental: 'Temp. Ambiental °C',
    humedad_relativa: 'H. Relativa %',
    radiacion_solar: 'Radiación W/m²',
    evapotranspiracion: 'ET mm/día',
    electroconductividad: 'E. Conductividad dS/m',
  };

  const tabs = Object.keys(tabLabels);

  const ultima = lecturas[lecturas.length - 1];

  const formatFecha = (str: string) => {
    if (!str) return '—';
    return new Date(str).toLocaleString('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getColor = (humedad: number) => {
    if (!area) return 'text-gray-600';
    if (humedad < area.punto_marchitez) return 'text-red-600';
    if (humedad > area.capacidad_campo) return 'text-blue-600';
    return 'text-green-600';
  };

  const getLabel = (humedad: number) => {
    if (!area) return '';
    if (humedad < area.punto_marchitez) return 'Estrés Hídrico';
    if (humedad > area.capacidad_campo) return 'Saturación';
    return 'Óptimo';
  };

  const sensors = [
    { id: 'humedad_suelo', nombre: 'Humedad Suelo', icon: Droplet, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'temperatura_suelo', nombre: 'Temp. Suelo', icon: Thermometer, color: 'text-orange-600', bg: 'bg-orange-50' },
    { id: 'humedad_relativa', nombre: 'H. Relativa', icon: Wind, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { id: 'radiacion_solar', nombre: 'Radiación Solar', icon: Sun, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { id: 'evapotranspiracion', nombre: 'ET', icon: TrendingDown, color: 'text-green-600', bg: 'bg-green-50' },
    { id: 'flujo_riego', nombre: 'Flujo Riego', icon: Waves, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'electroconductividad', nombre: 'E. Conductiv.', icon: HelpCircle, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Button onClick={() => onNavigate('areas')} variant="ghost" className="rounded-xl w-fit">
              <ArrowLeft className="w-4 h-4 mr-2" /> Volver a Áreas
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl">{area?.nombre || 'Detalle del Área'}</h1>
              <p className="text-sm text-gray-600">
                {area?.nombre_predio} · {area?.tipo_cultivo} · {area?.tamano_hectareas} ha · ID: {areaId}
              </p>
            </div>
          </div>

          {/* Filtro de fechas */}
          <Card className="p-4 rounded-2xl shadow-sm">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">Desde</label>
                <input
                    type="date"
                    value={desde}
                    onChange={e => setDesde(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">Hasta</label>
                <input
                    type="date"
                    value={hasta}
                    onChange={e => setHasta(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="text-sm text-gray-500">
                {loading ? 'Cargando...' : `${lecturas.length} lecturas encontradas`}
              </div>
            </div>
          </Card>

          {/* Estado actual */}
          {ultima && (
              <Card className="p-6 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Última Lectura</p>
                    <p className="text-xs text-gray-400">{formatFecha(ultima.fecha_hora)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-4xl font-bold ${getColor(ultima.humedad_suelo)}`}>
                      {ultima.humedad_suelo}%
                    </p>
                    <span className={`text-sm px-3 py-1 rounded-xl ${
                        ultima.humedad_suelo < (area?.punto_marchitez || 0)
                            ? 'bg-red-100 text-red-700'
                            : ultima.humedad_suelo > (area?.capacidad_campo || 100)
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-green-100 text-green-700'
                    }`}>
                  {getLabel(ultima.humedad_suelo)}
                </span>
                  </div>
                </div>
              </Card>
          )}

          {/* Indicadores */}
          {ultima && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {sensors.map(s => {
                  const Icon = s.icon;
                  return (
                      <Card key={s.id} className={`p-4 rounded-2xl shadow-sm ${s.bg}`}>
                        <div className="text-center">
                          <Icon className={`w-6 h-6 ${s.color} mx-auto mb-1`} />
                          <p className="text-xs text-gray-600 mb-1">{s.nombre}</p>
                          <p className={`text-lg font-bold ${s.color}`}>
                            {ultima[s.id] !== undefined && ultima[s.id] !== null
                                ? Number(ultima[s.id]).toFixed(1)
                                : '—'}
                          </p>
                        </div>
                      </Card>
                  );
                })}
              </div>
          )}

          {/* Gráfica */}
          <Card className="p-6 rounded-2xl shadow-sm">
            <Tabs value={tab} onValueChange={setTab}>
              <div className="mb-4">
                <p className="font-semibold text-gray-800 mb-3">Histórico de variables</p>
                <TabsList className="flex flex-wrap h-auto gap-1 bg-gray-100 p-1 rounded-xl">
                  {tabs.map(t => (
                      <TabsTrigger key={t} value={t} className="rounded-lg text-xs">
                        {tabLabels[t]}
                      </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {tabs.map(t => (
                  <TabsContent key={t} value={t}>
                    {lecturas.length === 0 ? (
                        <div className="h-64 flex items-center justify-center text-gray-400">
                          No hay lecturas en este rango de fechas
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={lecturas}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                                dataKey="fecha_hora"
                                stroke="#6b7280"
                                style={{ fontSize: '11px' }}
                                tickFormatter={v => new Date(v).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })}
                            />
                            <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                                labelFormatter={v => formatFecha(v)}
                                formatter={(value: any) => [Number(value).toFixed(2), tabLabels[t]]}
                            />
                            <Line
                                type="monotone"
                                dataKey={t}
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 5 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                    )}
                  </TabsContent>
              ))}
            </Tabs>
          </Card>

          {/* Tabla */}
          <Card className="p-6 rounded-2xl shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-4">
              Tabla de Lecturas ({lecturas.length} registros)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                <tr className="border-b">
                  {['Fecha/Hora', 'Humedad %', 'Temp. Suelo', 'H. Relativa', 'Radiación', 'ET', 'E. Cond.', 'Riego'].map(h => (
                      <th key={h} className="text-left p-3 text-gray-600 font-medium text-xs">{h}</th>
                  ))}
                </tr>
                </thead>
                <tbody>
                {lecturas.slice(0, 20).map((l, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-xs text-gray-600">{formatFecha(l.fecha_hora)}</td>
                      <td className={`p-3 font-bold ${getColor(l.humedad_suelo)}`}>{l.humedad_suelo}%</td>
                      <td className="p-3 text-gray-700">{l.temperatura_suelo}°C</td>
                      <td className="p-3 text-gray-700">{l.humedad_relativa}%</td>
                      <td className="p-3 text-gray-700">{l.radiacion_solar}</td>
                      <td className="p-3 text-gray-700">{l.evapotranspiracion}</td>
                      <td className="p-3 text-gray-700">{l.electroconductividad}</td>
                      <td className="p-3">
                        {l.estatus_riego
                            ? <span className="text-green-600 font-medium">🟢 {l.flujo_riego} m³/h</span>
                            : <span className="text-gray-400">⚪ Inactivo</span>}
                      </td>
                    </tr>
                ))}
                </tbody>
              </table>
              {lecturas.length > 20 && (
                  <p className="text-center text-xs text-gray-400 mt-3">
                    Mostrando 20 de {lecturas.length} registros. Exporta para ver todos.
                  </p>
              )}
            </div>
          </Card>
        </div>
      </div>
  );
}