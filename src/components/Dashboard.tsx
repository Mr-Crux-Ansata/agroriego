import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Droplet, ThermometerSun, AlertTriangle, TrendingUp } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { api } from '../api';

interface DashboardProps {
  data: any;
  onNavigate: (view: string, data?: any) => void;
}

const consumptionData = [
  { time: '00:00', consumo: 0.8 },
  { time: '02:00', consumo: 0.6 },
  { time: '04:00', consumo: 0.5 },
  { time: '06:00', consumo: 1.2 },
  { time: '08:00', consumo: 1.8 },
  { time: '10:00', consumo: 2.1 },
  { time: '12:00', consumo: 2.4 },
  { time: '14:00', consumo: 2.2 },
  { time: '16:00', consumo: 1.9 },
  { time: '18:00', consumo: 1.5 },
  { time: '20:00', consumo: 1.1 },
  { time: '22:00', consumo: 0.9 },
];

function getStatusDot(humedad: number, cap: number, mar: number) {
  if (humedad < mar) return '#fb2c36';
  if (humedad > cap) return '#2b7fff';
  if (humedad < mar * 1.3) return '#f0b100';
  return '#00c950';
}

function getStatusBadge(humedad: number, cap: number, mar: number) {
  if (humedad < mar) return { text: 'Falta de Agua', bg: '#ffe2e2', color: '#c10007' };
  if (humedad > cap) return { text: 'Exceso de Agua', bg: '#dbeafe', color: '#1447e6' };
  if (humedad < mar * 1.3) return { text: 'Nivel Crítico', bg: '#fef9c2', color: '#a65f00' };
  return { text: 'Adecuado', bg: '#dcfce7', color: '#008236' };
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [predios, setPredios] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [alertas, setAlertas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        const [prediosData, areasData, alertasData] = await Promise.all([
          api.getPredios(),
          api.getAreas(),
          api.getAlertas()
        ]);

        // Para cada área, obtener la última lectura de telemetría
        const areasConTelemetria = await Promise.all(
          areasData.map(async (area: any) => {
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

        setPredios(Array.isArray(prediosData) ? prediosData : []);
        setAreas(areasConTelemetria);
        setAlertas(Array.isArray(alertasData) ? alertasData : []);
      } catch (error) {
        console.error('Error cargando datos del dashboard:', error);
        setPredios([]);
        setAreas([]);
        setAlertas([]);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  const alertasPendientes = alertas.filter(a => !a.leida).length;
  const humedadProm = areas.length
      ? (areas.reduce((s, a) => s + (Number(a.humedad_suelo) || 0), 0) / areas.length).toFixed(1)
      : '—';

  const stats = [
    {
      label: 'Humedad Promedio',
      value: areas.length ? `${humedadProm}%` : '—',
      icon: Droplet,
      bg: '#dcfce7',
      iconColor: '#00c950',
    },
    {
      label: 'Temperatura Actual',
      value: '27°C',
      icon: ThermometerSun,
      bg: '#ffedd4',
      iconColor: '#f97316',
    },
    {
      label: 'Consumo Total Hoy',
      value: '14.8 m³',
      icon: TrendingUp,
      bg: '#dbeafe',
      iconColor: '#2b7fff',
    },
    {
      label: 'Alertas Activas',
      value: String(alertasPendientes),
      icon: AlertTriangle,
      bg: '#ffe2e2',
      iconColor: '#fb2c36',
      extra: alertasPendientes > 0 ? 'Requiere atención' : undefined,
    },
  ];

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-gray-400">Cargando datos...</div>
        </div>
    );
  }

  return (
      <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Título */}
          <div>
            <h1 className="text-3xl text-gray-900">Dashboard General</h1>
            <p className="text-gray-500 mt-1">Resumen de todos los predios y áreas de riego</p>
          </div>

          {/* Stats Cards — igual al Figma: 4 columnas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((s, i) => {
              const Icon = s.icon;
              return (
                  <div
                      key={i}
                      className="bg-white rounded-2xl p-6 flex items-start justify-between"
                      style={{ border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)' }}
                  >
                    <div>
                      <p className="text-sm text-gray-500">{s.label}</p>
                      <p className="text-3xl text-gray-900 mt-1">{s.value}</p>
                      {s.extra && (
                          <p className="text-xs text-red-500 mt-1">{s.extra}</p>
                      )}
                    </div>
                    <div
                        className="w-12 h-12 rounded-[14px] flex items-center justify-center flex-shrink-0"
                        style={{ background: s.bg }}
                    >
                      <Icon className="w-6 h-6" style={{ color: s.iconColor }} />
                    </div>
                  </div>
              );
            })}
          </div>

          {/* Gráfica consumo de agua */}
          <div
              className="bg-white rounded-2xl p-6"
              style={{ border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
          >
            <h2 className="text-xl text-gray-900">Consumo de Agua</h2>
            <p className="text-sm text-gray-500 mt-0.5 mb-6">Actualización cada 10 minutos</p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={consumptionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="time" stroke="#6b7280" style={{ fontSize: 12 }} />
                <YAxis stroke="#6b7280" style={{ fontSize: 12 }} />
                <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                    formatter={(v: any) => [`${v} m³`, 'Consumo']}
                />
                <Line
                    type="monotone"
                    dataKey="consumo"
                    stroke="#2b7fff"
                    strokeWidth={2.5}
                    dot={{ fill: '#2b7fff', r: 4 }}
                    activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Estado Predios + Áreas Recientes — exactamente como en el Figma */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Estado de Predios */}
            <div
                className="bg-white rounded-2xl p-6"
                style={{ border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
            >
              <h2 className="text-xl text-gray-900 mb-6">Estado de Predios</h2>
              {predios.length === 0 ? (
                  <p className="text-sm text-gray-400">No hay predios registrados</p>
              ) : (
                  <div className="flex flex-col gap-3">
                    {predios.map(predio => {
                      const areasDePredio = areas.filter(a => a.id_predio === predio.id_predio);
                      const humProm = areasDePredio.length
                          ? (areasDePredio.reduce((s, a) => s + (Number(a.humedad_suelo) || 0), 0) / areasDePredio.length).toFixed(0)
                          : 0;
                      const dot = getStatusDot(Number(humProm), 35, 15);
                      return (
                          <button
                              key={predio.id_predio}
                              onClick={() => onNavigate('predios', predio)}
                              className="w-full flex items-center gap-3 p-4 rounded-[14px] text-left transition-colors"
                              style={{ background: '#f9fafb' }}
                              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#f3f4f6')}
                              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#f9fafb')}
                          >
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: dot }} />
                            <div>
                              <p className="text-base font-medium text-gray-900">{predio.nombre}</p>
                              <p className="text-sm text-gray-500">
                                {areasDePredio.length} área{areasDePredio.length !== 1 ? 's' : ''} • {humProm}% humedad
                              </p>
                            </div>
                          </button>
                      );
                    })}
                  </div>
              )}
            </div>

            {/* Áreas de Riego Recientes */}
            <div
                className="bg-white rounded-2xl p-6"
                style={{ border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
            >
              <h2 className="text-xl text-gray-900 mb-6">Áreas de Riego Recientes</h2>
              {areas.length === 0 ? (
                  <p className="text-sm text-gray-400">No hay áreas registradas</p>
              ) : (
                  <div className="flex flex-col gap-3">
                    {areas.slice(0, 5).map(area => {
                      const h = Number(area.humedad_suelo) || 0;
                      const badge = getStatusBadge(h, Number(area.capacidad_campo), Number(area.punto_marchitez));
                      const dot = getStatusDot(h, Number(area.capacidad_campo), Number(area.punto_marchitez));
                      return (
                          <button
                              key={area.id_area}
                              onClick={() => onNavigate('area-detail', area)}
                              className="w-full flex flex-col gap-2 p-4 rounded-[14px] text-left transition-colors"
                              style={{ background: '#f9fafb' }}
                              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#f3f4f6')}
                              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#f9fafb')}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: dot }} />
                                <span className="font-medium text-gray-900 text-base">{area.nombre}</span>
                              </div>
                              <span
                                  className="text-xs px-2 py-1 rounded-[10px] font-normal"
                                  style={{ background: badge.bg, color: badge.color }}
                              >
                          {badge.text}
                        </span>
                            </div>
                            <p className="text-sm text-gray-500 pl-6">
                              {area.nombre_predio} • {h}% humedad
                            </p>
                          </button>
                      );
                    })}
                    {areas.length > 5 && (
                        <button
                            onClick={() => onNavigate('areas')}
                            className="text-center text-sm text-blue-600 hover:text-blue-800 mt-1"
                        >
                          Ver todas las áreas →
                        </button>
                    )}
                  </div>
              )}
            </div>
          </div>

          {/* Alertas recientes (mini) */}
          {alertas.filter(a => !a.leida).length > 0 && (
              <div
                  className="bg-white rounded-2xl p-6"
                  style={{ border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl text-gray-900">Alertas Pendientes</h2>
                  <button
                      onClick={() => onNavigate('alertas')}
                      className="text-sm text-blue-600 hover:underline"
                  >
                    Ver todas →
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  {alertas.filter(a => !a.leida).slice(0, 3).map(alerta => (
                      <div
                          key={alerta.id_alerta}
                          className="p-3 rounded-xl border-l-4"
                          style={{
                            background: alerta.severidad === 'Crítica' ? '#fff5f5' : '#fffbeb',
                            borderLeftColor: alerta.severidad === 'Crítica' ? '#fb2c36' : '#f0b100',
                          }}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm font-medium text-gray-900">{alerta.tipo_alerta}</span>
                          <span
                              className="text-xs px-2 py-0.5 rounded-full text-white"
                              style={{ background: alerta.severidad === 'Crítica' ? '#fb2c36' : '#f0b100' }}
                          >
                      {alerta.severidad}
                    </span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-1">{alerta.mensaje}</p>
                      </div>
                  ))}
                </div>
              </div>
          )}
        </div>
      </div>
  );
}