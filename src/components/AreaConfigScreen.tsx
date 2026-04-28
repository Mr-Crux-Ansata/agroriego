import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { ArrowLeft, Save } from 'lucide-react';
import { api } from '../api';

interface AreaConfigScreenProps {
  area: any;
  userRole: 'admin' | 'user';
  onNavigate: (view: string, data?: any) => void;
}

export function AreaConfigScreen({ area, userRole, onNavigate }: AreaConfigScreenProps) {
  const [form, setForm] = useState({
    nombre: area?.nombre || '',
    tipo_cultivo: area?.tipo_cultivo || 'Nogal',
    tipo_tierra: area?.tipo_tierra || '',
    tamano_hectareas: area?.tamano_hectareas || 0,
    capacidad_campo: area?.capacidad_campo || 35,
    punto_marchitez: area?.punto_marchitez || 15,
    umbral_humedad_min: area?.umbral_humedad_min ?? 10,
    umbral_humedad_max: area?.umbral_humedad_max ?? 40,
    umbral_temp_suelo_min: area?.umbral_temp_suelo_min ?? 10,
    umbral_temp_suelo_max: area?.umbral_temp_suelo_max ?? 35,
    umbral_ce_min: area?.umbral_ce_min ?? 0.2,
    umbral_ce_max: area?.umbral_ce_max ?? 4.0,
    umbral_potencial_min: area?.umbral_potencial_min ?? -1500,
    umbral_potencial_max: area?.umbral_potencial_max ?? -10,
    umbral_et_min: area?.umbral_et_min ?? 2,
    umbral_et_max: area?.umbral_et_max ?? 8,
    umbral_temp_amb_min: area?.umbral_temp_amb_min ?? 10,
    umbral_temp_amb_max: area?.umbral_temp_amb_max ?? 40,
    umbral_hr_min: area?.umbral_hr_min ?? 20,
    umbral_hr_max: area?.umbral_hr_max ?? 90,
    umbral_viento_min: area?.umbral_viento_min ?? 0,
    umbral_viento_max: area?.umbral_viento_max ?? 10,
    umbral_ndvi_min: area?.umbral_ndvi_min ?? 0.2,
    umbral_ndvi_max: area?.umbral_ndvi_max ?? 0.9,
    umbral_flujo_min: area?.umbral_flujo_min ?? 10,
    umbral_flujo_max: area?.umbral_flujo_max ?? 1000,
    umbral_radiacion_min: area?.umbral_radiacion_min ?? 100,
    umbral_radiacion_max: area?.umbral_radiacion_max ?? 1000,
    estatus_activo: area?.estatus_activo === 1 || area?.estatus_activo === true,
  });
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (userRole !== 'admin') {
    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
          <div className="max-w-4xl mx-auto">
            <Card className="p-8 rounded-2xl shadow-sm text-center">
              <div className="text-4xl mb-4">🔒</div>
              <h2 className="text-2xl mb-2">Acceso Restringido</h2>
              <p className="text-gray-600 mb-6">Solo los administradores pueden configurar áreas de riego</p>
              <Button onClick={() => onNavigate('areas')}
                      className="bg-gradient-to-r from-blue-600 to-green-600 rounded-xl">
                Volver a Áreas
              </Button>
            </Card>
          </div>
        </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await api.updateAreaConfig(area?.id_area || area?.id, {
        ...form,
        estatus_activo: form.estatus_activo ? 1 : 0,
      });
      if (result.ok) {
        setGuardado(true);
        setTimeout(() => setGuardado(false), 3000);
      } else {
        setError(result.error || 'Error al guardar');
      }
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const field = (key: string, label: string, type = 'text') => (
      <div>
        <Label htmlFor={key}>{label}</Label>
        <Input
            id={key}
            type={type}
            value={(form as any)[key]}
            onChange={e => setForm({ ...form, [key]: type === 'number' ? parseFloat(e.target.value) : e.target.value })}
            className="rounded-xl mt-1"
            required
        />
      </div>
  );

  return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto space-y-6">

          <div className="flex items-center gap-4">
            <Button onClick={() => onNavigate('areas')} variant="ghost" className="rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-2" /> Volver
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Configurar Área</h1>
              <p className="text-sm text-gray-600">{area?.nombre} · {area?.id_area || area?.id}</p>
            </div>
          </div>

          {guardado && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700 font-medium">
                ✅ Configuración guardada exitosamente
              </div>
          )}
          {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
                ❌ {error}
              </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <Card className="p-6 rounded-2xl shadow-sm space-y-4">
                <h2 className="font-bold text-gray-800">Información General</h2>
                {field('nombre', 'Nombre del Área')}
                <div>
                  <Label>Tipo de Cultivo</Label>
                  <Select
                      value={form.tipo_cultivo}
                      onValueChange={v => setForm({ ...form, tipo_cultivo: v })}
                  >
                    <SelectTrigger className="rounded-xl mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['Nogal', 'Manzana', 'Alfalfa', 'Maíz', 'Chile', 'Algodón'].map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {field('tipo_tierra', 'Tipo de Tierra')}
                {field('tamano_hectareas', 'Tamaño (hectáreas)', 'number')}
                <div>
                  <Label>Estado del Área</Label>
                  <div className="flex items-center gap-3 mt-2 p-3 bg-gray-50 rounded-xl">
                    <Switch
                        checked={form.estatus_activo}
                        onCheckedChange={v => setForm({ ...form, estatus_activo: v })}
                    />
                    <span className="text-sm">
                    {form.estatus_activo ? 'Activa (monitoreando)' : 'Inactiva'}
                  </span>
                  </div>
                </div>
              </Card>

              <Card className="p-6 rounded-2xl shadow-sm space-y-4">
                <h2 className="font-bold text-gray-800">Parámetros Hídricos</h2>
                {field('capacidad_campo', 'Capacidad de Campo (%)', 'number')}
                {field('punto_marchitez', 'Punto de Marchitez (%)', 'number')}
                <div className="p-4 bg-blue-50 rounded-xl text-sm text-blue-800">
                  <p className="font-medium mb-1">Rango óptimo configurado:</p>
                  <p>{form.punto_marchitez}% — {form.capacidad_campo}%</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Las alertas se generan automáticamente fuera de este rango.
                  </p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-xl text-sm text-yellow-800">
                  <p className="font-medium">⚠️ Recuerda:</p>
                  <p className="text-xs mt-1">
                    El punto de marchitez debe ser menor que la capacidad de campo.
                  </p>
                </div>
              </Card>

              <Card className="p-6 rounded-2xl shadow-sm space-y-4 md:col-span-2">
                <h2 className="font-bold text-gray-800">Umbrales por Variable (Por Área)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {field('umbral_humedad_min', 'Humedad mín (%)', 'number')}
                  {field('umbral_humedad_max', 'Humedad máx (%)', 'number')}
                  {field('umbral_temp_suelo_min', 'Temp suelo mín (°C)', 'number')}
                  {field('umbral_temp_suelo_max', 'Temp suelo máx (°C)', 'number')}
                  {field('umbral_ce_min', 'CE mín (dS/m)', 'number')}
                  {field('umbral_ce_max', 'CE máx (dS/m)', 'number')}
                  {field('umbral_potencial_min', 'Potencial hídrico mín (kPa)', 'number')}
                  {field('umbral_potencial_max', 'Potencial hídrico máx (kPa)', 'number')}
                  {field('umbral_et_min', 'ET mín (mm/día)', 'number')}
                  {field('umbral_et_max', 'ET máx (mm/día)', 'number')}
                  {field('umbral_temp_amb_min', 'Temp amb mín (°C)', 'number')}
                  {field('umbral_temp_amb_max', 'Temp amb máx (°C)', 'number')}
                  {field('umbral_hr_min', 'Humedad relativa mín (%)', 'number')}
                  {field('umbral_hr_max', 'Humedad relativa máx (%)', 'number')}
                  {field('umbral_viento_min', 'Viento mín (m/s)', 'number')}
                  {field('umbral_viento_max', 'Viento máx (m/s)', 'number')}
                  {field('umbral_ndvi_min', 'NDVI mín', 'number')}
                  {field('umbral_ndvi_max', 'NDVI máx', 'number')}
                  {field('umbral_flujo_min', 'Flujo mín', 'number')}
                  {field('umbral_flujo_max', 'Flujo máx', 'number')}
                  {field('umbral_radiacion_min', 'Radiación mín (W/m²)', 'number')}
                  {field('umbral_radiacion_max', 'Radiación máx (W/m²)', 'number')}
                </div>
              </Card>
            </div>

            <div className="flex gap-4 justify-end">
              <Button type="button" variant="outline" onClick={() => onNavigate('areas')} className="rounded-xl">
                Cancelar
              </Button>
              <Button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 rounded-xl"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Guardando...' : 'Guardar Configuración'}
              </Button>
            </div>
          </form>
        </div>
      </div>
  );
}