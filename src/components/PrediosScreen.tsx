import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { MapPin, Plus, Edit } from 'lucide-react';
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { api } from '../api';

interface PrediosScreenProps {
  userRole: 'admin' | 'user';
  onNavigate: (view: string, data?: any) => void;
}

type MapPointType = 'predio' | 'area' | 'sensor';

interface MapPoint {
  key: string;
  label: string;
  type: MapPointType;
  id_predio: number;
  id_area?: string;
  lat: number;
  lng: number;
  syntheticPosition: boolean;
}

interface MapFocusTarget {
  key: string;
  lat: number;
  lng: number;
  zoom: number;
}

const markerStyles: Record<MapPointType, { bg: string; text: string; border: string }> = {
  predio: { bg: '#1d4ed8', text: 'P', border: '#bfdbfe' },
  area: { bg: '#059669', text: 'A', border: '#bbf7d0' },
  sensor: { bg: '#f59e0b', text: 'S', border: '#fde68a' },
};

const markerIcons: Record<MapPointType, L.DivIcon> = {
  predio: L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;border-radius:9999px;background:${markerStyles.predio.bg};color:#fff;border:2px solid ${markerStyles.predio.border};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,.25);">${markerStyles.predio.text}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  }),
  area: L.divIcon({
    className: '',
    html: `<div style="width:24px;height:24px;border-radius:9999px;background:${markerStyles.area.bg};color:#fff;border:2px solid ${markerStyles.area.border};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;box-shadow:0 2px 8px rgba(0,0,0,.2);">${markerStyles.area.text}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  }),
  sensor: L.divIcon({
    className: '',
    html: `<div style="width:22px;height:22px;border-radius:9999px;background:${markerStyles.sensor.bg};color:#111827;border:2px solid ${markerStyles.sensor.border};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;box-shadow:0 2px 8px rgba(0,0,0,.2);">${markerStyles.sensor.text}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  }),
};

function MapViewportController({ points, focusTarget }: { points: MapPoint[]; focusTarget: MapFocusTarget | null }) {
  const map = useMap();

  useEffect(() => {
    if (focusTarget) {
      map.setView([focusTarget.lat, focusTarget.lng], focusTarget.zoom, { animate: true });
      return;
    }

    if (points.length === 0) return;

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 16, { animate: true });
      return;
    }

    const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng] as [number, number]));
    map.fitBounds(bounds.pad(0.25), { animate: true });
  }, [map, points, focusTarget]);

  return null;
}

export function PrediosScreen({ userRole, onNavigate }: PrediosScreenProps) {
  const [predios, setPredios] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPredio, setEditingPredio] = useState<any>(null);
  const [error, setError] = useState('');
  const [selectedPredioId, setSelectedPredioId] = useState<number | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    latitud: '',
    longitud: '',
  });

  const cargarDatos = () => {
    Promise.all([api.getPredios(), api.getAreas()])
        .then(([p, a]) => {
          setPredios(Array.isArray(p) ? p : []);
          setAreas(Array.isArray(a) ? a : []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleCreate = () => {
    setEditingPredio(null);
    setFormData({ nombre: '', latitud: '', longitud: '' });
    setError('');
    setShowDialog(true);
  };

  const handleEdit = (predio: any) => {
    setEditingPredio(predio);
    setFormData({
      nombre: predio.nombre,
      latitud: predio.latitud?.toString() || '',
      longitud: predio.longitud?.toString() || '',
    });
    setError('');
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const result = await api.crearPredio({
        nombre: formData.nombre,
        latitud: parseFloat(formData.latitud),
        longitud: parseFloat(formData.longitud),
        id_usuario: 2,
      });
      if (result.ok) {
        setShowDialog(false);
        cargarDatos();
      } else {
        setError(result.error || 'Error al guardar');
      }
    } catch {
      setError('No se pudo conectar con el servidor');
    }
  };

    const getAreasDePredio = (id_predio: number) =>
      areas.filter(a => Number(a.id_predio) === Number(id_predio));

  const parseCoordinate = (value: any) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const prediosMapeados = predios.map((predio, index) => {
    const lat = parseCoordinate(predio.latitud);
    const lng = parseCoordinate(predio.longitud);

    if (lat !== null && lng !== null) {
      return { ...predio, lat, lng, syntheticPosition: false };
    }

    const total = Math.max(predios.length, 1);
    const columns = Math.min(3, total);
    const row = Math.floor(index / columns);
    const col = index % columns;

    return {
      ...predio,
      lat: 28.6353 - row * 0.01,
      lng: -106.0889 + col * 0.015,
      syntheticPosition: true,
    };
  });

  const getAreaMarkerPosition = (predioLat: number, predioLng: number, index: number, total: number) => {
    const angle = (index / Math.max(total, 1)) * Math.PI * 2;
    const ring = 0.0012 + (index % 3) * 0.00035;
    return {
      lat: predioLat + Math.sin(angle) * ring,
      lng: predioLng + Math.cos(angle) * ring,
    };
  };

  const allMapPoints: MapPoint[] = prediosMapeados.flatMap((predio) => {
    const predioPoint = [{
      key: `predio-${predio.id_predio}`,
      label: predio.nombre,
      type: 'predio' as const,
      id_predio: Number(predio.id_predio),
      lat: predio.lat,
      lng: predio.lng,
      syntheticPosition: predio.syntheticPosition,
    }];

    const areasPredio = getAreasDePredio(predio.id_predio);
    const areaPoints = areasPredio.flatMap((area: any, index: number) => {
      const areaPos = getAreaMarkerPosition(predio.lat, predio.lng, index, areasPredio.length);
      return [
        {
          key: `area-${area.id_area}`,
          label: area.nombre,
          type: 'area' as const,
          id_predio: Number(predio.id_predio),
          id_area: area.id_area,
          lat: areaPos.lat,
          lng: areaPos.lng,
          syntheticPosition: predio.syntheticPosition,
        },
        {
          key: `sensor-${area.id_area}`,
          label: `Sensor ${area.nombre}`,
          type: 'sensor' as const,
          id_predio: Number(predio.id_predio),
          id_area: area.id_area,
          lat: areaPos.lat + 0.00018,
          lng: areaPos.lng - 0.00016,
          syntheticPosition: predio.syntheticPosition,
        },
      ];
    });

    return [...predioPoint, ...areaPoints];
  });

  const latitudes = allMapPoints.map((point) => point.lat);
  const longitudes = allMapPoints.map((point) => point.lng);
  const fallbackLat = prediosMapeados[0]?.lat ?? 28.6353;
  const fallbackLng = prediosMapeados[0]?.lng ?? -106.0889;
  const prediosSinCoordenadas = prediosMapeados.filter((predio) => predio.syntheticPosition).length;

  const predioSeleccionado = selectedPredioId
    ? prediosMapeados.find((predio) => Number(predio.id_predio) === Number(selectedPredioId))
    : null;

  const areasDelPredioSeleccionado = predioSeleccionado
    ? getAreasDePredio(predioSeleccionado.id_predio)
    : [];

  const visibleMapPoints = allMapPoints.filter((point) => {
    if (selectedAreaId) {
      return point.id_area === selectedAreaId || (point.type === 'predio' && point.id_predio === Number(selectedPredioId));
    }
    if (selectedPredioId) {
      return point.id_predio === Number(selectedPredioId);
    }
    return true;
  });

  const selectedAreaPoint = selectedAreaId
    ? visibleMapPoints.find((point) => point.type === 'area' && point.id_area === selectedAreaId)
    : null;

  const selectedPredioPoint = selectedPredioId
    ? visibleMapPoints.find((point) => point.type === 'predio' && point.id_predio === Number(selectedPredioId))
    : null;

  const focusTarget: MapFocusTarget | null = selectedAreaPoint
    ? {
        key: `focus-area-${selectedAreaPoint.id_area}`,
        lat: selectedAreaPoint.lat,
        lng: selectedAreaPoint.lng,
        zoom: 17,
      }
    : selectedPredioPoint
      ? {
          key: `focus-predio-${selectedPredioPoint.id_predio}`,
          lat: selectedPredioPoint.lat,
          lng: selectedPredioPoint.lng,
          zoom: 15,
        }
      : null;

  const minLat = latitudes.length ? Math.min(...latitudes) : fallbackLat - 0.01;
  const maxLat = latitudes.length ? Math.max(...latitudes) : fallbackLat + 0.01;
  const minLng = longitudes.length ? Math.min(...longitudes) : fallbackLng - 0.01;
  const maxLng = longitudes.length ? Math.max(...longitudes) : fallbackLng + 0.01;

  const formatCoordinate = (value: any) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed.toFixed(4) : 'Sin coordenadas';
  };

  if (loading) {
    return (
        <div className="p-8 flex items-center justify-center min-h-screen">
          <div className="text-gray-500">Cargando predios...</div>
        </div>
    );
  }

  return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl mb-2">Gestión de Predios</h1>
              <p className="text-sm text-gray-600">Administra los predios registrados</p>
            </div>
            {userRole === 'admin' && (
                <Button
                    onClick={handleCreate}
                    className="bg-gradient-to-r from-blue-600 to-green-600 rounded-xl"
                >
                  <Plus className="w-5 h-5 mr-2" /> Crear Predio
                </Button>
            )}
          </div>

          <Card className="p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200 bg-white">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-gray-600" />
              <p className="text-base font-medium text-gray-900">
                Mapa general de predios
              </p>
            </div>

            <div className="mt-1 rounded-2xl border border-gray-200 bg-white p-4">
              <p className="mb-3 text-sm text-gray-600">
                Vista general de ubicaciones
              </p>
              {prediosSinCoordenadas > 0 && (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {prediosSinCoordenadas} predio(s) no tienen coordenadas guardadas. Se muestran en posiciones esquemáticas.
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-3 md:items-start">
                <div
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white md:col-span-2"
                  style={{ height: 'clamp(560px, 78vh, 920px)' }}
                >
                  <MapContainer
                    center={[fallbackLat, fallbackLng]}
                    zoom={14}
                    scrollWheelZoom={false}
                    className="h-full w-full"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapViewportController points={visibleMapPoints} focusTarget={focusTarget} />
                    {visibleMapPoints.map((point) => (
                      <Marker
                        key={point.key}
                        position={[point.lat, point.lng]}
                        icon={markerIcons[point.type]}
                        eventHandlers={{
                          click: () => {
                            if (point.type === 'predio') {
                              setSelectedPredioId(point.id_predio);
                              setSelectedAreaId(null);
                              return;
                            }
                            setSelectedPredioId(point.id_predio);
                            if (point.id_area) setSelectedAreaId(point.id_area);
                          },
                        }}
                      >
                        <Tooltip direction="top" offset={[0, -8]}>
                          {point.label}
                        </Tooltip>
                      </Marker>
                    ))}
                  </MapContainer>
                </div>

                <div
                  className="rounded-2xl border border-gray-200 bg-white p-3 md:overflow-auto"
                  style={{ maxHeight: 'clamp(560px, 78vh, 920px)' }}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-700">Ubicaciones detectadas</p>
                    {selectedPredioId && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 rounded-lg px-2 text-xs"
                        onClick={() => {
                          setSelectedPredioId(null);
                          setSelectedAreaId(null);
                        }}
                      >
                        Ver todos
                      </Button>
                    )}
                  </div>
                  {prediosMapeados.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-4 text-sm text-gray-500">
                      No hay predios para mostrar.
                    </div>
                  ) : selectedPredioId && predioSeleccionado ? (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-3 w-3 rounded-full bg-blue-700" />
                          <p className="text-sm font-semibold text-gray-800">{predioSeleccionado.nombre}</p>
                        </div>
                        <p className="mt-1 text-xs text-gray-600">
                          {predioSeleccionado.syntheticPosition
                            ? 'Ubicacion esquematica temporal'
                            : `${predioSeleccionado.lat.toFixed(6)}, ${predioSeleccionado.lng.toFixed(6)}`}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">Areas del predio</p>
                        {areasDelPredioSeleccionado.length === 0 ? (
                          <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-xs text-gray-500">
                            Este predio no tiene areas registradas.
                          </div>
                        ) : (
                          areasDelPredioSeleccionado.map((area: any) => {
                            const isSelected = selectedAreaId === area.id_area;
                            return (
                              <button
                                key={`menu-area-${area.id_area}`}
                                type="button"
                                onClick={() => setSelectedAreaId(area.id_area)}
                                className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                                  isSelected
                                    ? 'border-emerald-300 bg-emerald-50'
                                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-600" />
                                  <p className="text-sm font-medium text-gray-800">{area.nombre}</p>
                                </div>
                                <p className="mt-1 text-xs text-gray-500">{area.tipo_cultivo} · {area.id_area}</p>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {prediosMapeados.map((predio) => {
                        const areasPredio = getAreasDePredio(predio.id_predio);
                        return (
                          <button
                            key={`summary-${predio.id_predio}`}
                            type="button"
                            onClick={() => {
                              setSelectedPredioId(Number(predio.id_predio));
                              setSelectedAreaId(null);
                            }}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-left transition-colors hover:bg-gray-100"
                          >
                            <div className="flex items-center gap-2">
                              <span className="inline-block h-3 w-3 rounded-full bg-blue-700" />
                              <p className="text-sm font-semibold text-gray-800">{predio.nombre}</p>
                            </div>
                            <p className="mt-1 text-xs text-gray-600">
                              {predio.syntheticPosition
                                ? 'Ubicacion esquematica temporal'
                                : `${predio.lat.toFixed(6)}, ${predio.lng.toFixed(6)}`}
                            </p>
                            <div className="mt-2 space-y-1">
                              {areasPredio.length === 0 ? (
                                <p className="text-xs text-gray-400">Sin areas asociadas</p>
                              ) : (
                                areasPredio.slice(0, 4).map((area: any) => (
                                  <div key={`summary-area-${area.id_area}`} className="flex items-center gap-2 text-xs text-gray-700">
                                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-600" />
                                    <span>{area.nombre}</span>
                                  </div>
                                ))
                              )}
                              {areasPredio.length > 4 && (
                                <p className="text-xs text-gray-400">+{areasPredio.length - 4} areas mas</p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">
              <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-blue-700" /> Predio</span>
              <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-600" /> Área de riego</span>
              <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-500" /> Sensor</span>
            </div>
          </Card>

          {predios.length === 0 ? (
              <Card className="p-12 rounded-2xl text-center">
                <p className="text-gray-500">No hay predios registrados</p>
              </Card>
          ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {predios.map(predio => {
                  const areasPredio = getAreasDePredio(predio.id_predio);
                  const activas = areasPredio.filter(a => a.estatus_activo).length;

                  return (
                      <Card key={predio.id_predio} className="p-4 md:p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4 gap-2">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="w-3 h-3 flex-shrink-0 rounded-full bg-green-500 mt-2" />
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-semibold mb-1">{predio.nombre}</h3>
                              <p className="text-xs text-gray-600 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {formatCoordinate(predio.latitud)}, {formatCoordinate(predio.longitud)}
                              </p>
                            </div>
                          </div>
                          {userRole === 'admin' && (
                              <Button onClick={() => handleEdit(predio)} variant="ghost" size="sm" className="rounded-xl">
                                <Edit className="w-4 h-4" />
                              </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <div className="p-3 bg-gray-50 rounded-xl text-center">
                            <p className="text-xs text-gray-500">Áreas</p>
                            <p className="text-xl font-bold text-gray-700">{areasPredio.length}</p>
                          </div>
                          <div className="p-3 bg-green-50 rounded-xl text-center">
                            <p className="text-xs text-gray-500">Activas</p>
                            <p className="text-xl font-bold text-green-700">{activas}</p>
                          </div>
                          <div className="p-3 bg-blue-50 rounded-xl text-center">
                            <p className="text-xs text-gray-500">ID</p>
                            <p className="text-xl font-bold text-blue-700">#{predio.id_predio}</p>
                          </div>
                        </div>

                        <div className="space-y-1 mb-4 text-xs text-gray-500">
                          {areasPredio.slice(0, 3).map(a => (
                              <div key={a.id_area} className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${a.estatus_activo ? 'bg-green-500' : 'bg-gray-300'}`} />
                                <span>{a.nombre} — {a.tipo_cultivo}</span>
                              </div>
                          ))}
                          {areasPredio.length > 3 && (
                              <p className="text-gray-400">+{areasPredio.length - 3} más...</p>
                          )}
                        </div>

                        <Button
                            onClick={() => onNavigate('areas', predio.id_predio)}
                            variant="outline"
                            className="w-full rounded-xl"
                        >
                          Ver Áreas de Riego
                        </Button>
                      </Card>
                  );
                })}
              </div>
          )}
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>{editingPredio ? 'Editar Predio' : 'Crear Nuevo Predio'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                    {error}
                  </div>
              )}
              <div className="space-y-2">
                <Label>Nombre del Predio</Label>
                <Input
                    value={formData.nombre}
                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Predio El Mezquital"
                    className="rounded-xl"
                    required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Latitud</Label>
                  <Input
                      type="number"
                      step="any"
                      value={formData.latitud}
                      onChange={e => setFormData({ ...formData, latitud: e.target.value })}
                      placeholder="28.6353"
                      className="rounded-xl"
                      required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Longitud</Label>
                  <Input
                      type="number"
                      step="any"
                      value={formData.longitud}
                      onChange={e => setFormData({ ...formData, longitud: e.target.value })}
                      placeholder="-106.0889"
                      className="rounded-xl"
                      required
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="flex-1 rounded-xl">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 bg-gradient-to-r from-blue-600 to-green-600 rounded-xl">
                  {editingPredio ? 'Guardar Cambios' : 'Crear Predio'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
  );
}