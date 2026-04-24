import { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { FileDown, FileText } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { api } from '../api';

export function ReportesScreen() {
  const [areas, setAreas] = useState<any[]>([]);
  const [areaSeleccionada, setAreaSeleccionada] = useState('todas');
  const [lecturas, setLecturas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const chartHumedadRef   = useRef<HTMLDivElement>(null);
  const chartTempRef      = useRef<HTMLDivElement>(null);
  const chartAmbientalRef = useRef<HTMLDivElement>(null);
  const chartNDVIRef      = useRef<HTMLDivElement>(null);
  const chartConsumoRef   = useRef<HTMLDivElement>(null);
  const chartHidricoRef   = useRef<HTMLDivElement>(null);
  const chartVientoRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getAreas().then(data => {
      setAreas(Array.isArray(data) ? data : []);
    }).catch(() => setAreas([]));
  }, []);

  useEffect(() => {
    const cargarLecturas = async () => {
      if (areas.length === 0) { setLecturas([]); return; }
      setLoading(true);
      try {
        if (areaSeleccionada === 'todas') {
          const respuestas = await Promise.all(
            areas.map(async area => {
              const data = await api.getTelemetria(area.id_area, desde, hasta);
              return Array.isArray(data)
                ? data.map((l: any) => ({ ...l, nombre_area: area.nombre }))
                : [];
            })
          );
          setLecturas(respuestas.flat().sort(
            (a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime()
          ));
          return;
        }
        const data = await api.getTelemetria(areaSeleccionada, desde, hasta);
        setLecturas(Array.isArray(data) ? data.slice().reverse() : []);
      } catch (e) {
        console.error('Error cargando lecturas:', e);
        setLecturas([]);
      } finally {
        setLoading(false);
      }
    };
    cargarLecturas();
  }, [areaSeleccionada, areas, desde, hasta]);

  const calcStat = (key: string) => {
    if (!lecturas.length) return { prom: '-', min: '-', max: '-' };
    const vals = lecturas.map(l => Number(l[key] ?? 0));
    return {
      prom: (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2),
      min:  Math.min(...vals).toFixed(2),
      max:  Math.max(...vals).toFixed(2),
    };
  };

  const humProm      = lecturas.length ? calcStat('humedad_suelo').prom : '-';
  const tempProm     = lecturas.length ? calcStat('temperatura_ambiental').prom : '-';
  const consumoTotal = lecturas.filter(l => l.estatus_riego)
      .reduce((s, l) => s + (l.flujo_riego || 0), 0).toFixed(1);
  const sessionesRiego = lecturas.filter(l => l.estatus_riego).length;
  const ndviProm = lecturas.some(l => l.ndvi != null)
    ? (lecturas.filter(l => l.ndvi != null).reduce((s, l) => s + Number(l.ndvi), 0)
       / lecturas.filter(l => l.ndvi != null).length).toFixed(3)
    : null;

  const formatFecha = (str: string) =>
      new Date(str).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });

  const mostrarArea = areaSeleccionada === 'todas';

  const exportarCSV = () => {
    if (lecturas.length === 0) { alert('No hay datos para exportar.'); return; }
    const headers = Object.keys(lecturas[0]).join(',');
    const filas   = lecturas.map(r => Object.values(r).join(','));
    const csv     = [headers, ...filas].join('\n');
    const blob    = new Blob([csv], { type: 'text/csv' });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    a.href = url; a.download = `reporte_${areaSeleccionada}_${desde}_${hasta}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportarPDF = async () => {
    if (lecturas.length === 0) { alert('No hay datos para exportar.'); return; }
    const { default: jsPDF }       = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');

    const chartToPng = async (container: HTMLDivElement): Promise<string | null> => {
      const chartRoot = (container.querySelector('.recharts-wrapper') as HTMLElement) ?? container;
      const svg = chartRoot.querySelector('svg') as SVGSVGElement | null;

      if (svg) {
        try {
          const svgRect = svg.getBoundingClientRect();
          const width = Math.max(700, Math.floor(svgRect.width || chartRoot.clientWidth || 700));
          const height = Math.max(220, Math.floor(svgRect.height || chartRoot.clientHeight || 220));

          const cloned = svg.cloneNode(true) as SVGSVGElement;
          cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          cloned.setAttribute('width', String(width));
          cloned.setAttribute('height', String(height));
          if (!cloned.getAttribute('viewBox')) {
            cloned.setAttribute('viewBox', `0 0 ${width} ${height}`);
          }

          const serialized = new XMLSerializer().serializeToString(cloned);
          const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
          const url = URL.createObjectURL(blob);

          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('No se pudo cargar SVG serializado'));
            img.src = url;
          });

          const canvas = document.createElement('canvas');
          const scale = 2;
          canvas.width = width * scale;
          canvas.height = height * scale;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(url);
            return null;
          }

          ctx.scale(scale, scale);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          URL.revokeObjectURL(url);
          return canvas.toDataURL('image/png');
        } catch {
          // Si falla SVG, usa fallback con html2canvas.
        }
      }

      const canvas = await html2canvas(chartRoot, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      return canvas.toDataURL('image/png');
    };

    const pdf   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const mg    = 15;
    let y       = mg;

    pdf.setFillColor(37, 99, 235); pdf.rect(0, 0, pageW, 32, 'F');
    pdf.setTextColor(255, 255, 255); pdf.setFontSize(16); pdf.setFont('helvetica', 'bold');
    pdf.text('AgroRiego IoT - Reporte de Telemetria', mg, 14);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9);
    const areaLabel = areaSeleccionada === 'todas'
      ? 'Todas las areas'
      : areas.find(a => a.id_area === areaSeleccionada)?.nombre ?? areaSeleccionada;
    const periodo = (desde && hasta) ? `${desde} -> ${hasta}` : desde ? `Desde ${desde}` : hasta ? `Hasta ${hasta}` : 'Todo el periodo';
    pdf.text(`Area: ${areaLabel}   |   Periodo: ${periodo}   |   Generado: ${new Date().toLocaleString('es-MX')}`, mg, 26);
    y = 42;

    const drawSection = (title: string) => {
      pdf.setFillColor(243, 244, 246); pdf.roundedRect(mg, y, pageW - mg*2, 7, 2, 2, 'F');
      pdf.setTextColor(37, 99, 235); pdf.setFontSize(11); pdf.setFont('helvetica', 'bold');
      pdf.text(title, mg + 3, y + 5); pdf.setFont('helvetica', 'normal');
      y += 12;
    };

    drawSection('Resumen General');
    const gs: [string, string][] = [
      ['Total de lecturas', String(lecturas.length)],
      ['Sesiones de riego activo', String(sessionesRiego)],
      ['Consumo total de agua', `${consumoTotal} m3`],
      ['Humedad suelo promedio', `${humProm}%`],
      ['Temperatura ambiental promedio', `${tempProm} C`],
      ...(ndviProm ? [['NDVI promedio', ndviProm] as [string,string]] : []),
    ];
    pdf.setFontSize(9.5);
    gs.forEach(([lbl, val]) => {
      pdf.setTextColor(80,80,80); pdf.text(`${lbl}:`, mg+4, y);
      pdf.setTextColor(20,20,20); pdf.setFont('helvetica','bold'); pdf.text(val, mg+80, y);
      pdf.setFont('helvetica','normal'); y += 6;
    });
    y += 6;

    if (y + 90 > pageH - mg) { pdf.addPage(); y = mg; }
    drawSection('Estadisticas por Variable (Min / Max / Promedio)');
    const cols = [mg+4, mg+68, mg+95, mg+122];
    pdf.setFontSize(9); pdf.setFont('helvetica','bold'); pdf.setTextColor(60,60,60);
    ['Variable','Minimo','Maximo','Promedio'].forEach((h,i) => pdf.text(h, cols[i], y));
    pdf.setFont('helvetica','normal'); y += 5;
    pdf.setDrawColor(200,200,200); pdf.line(mg, y, pageW-mg, y); y += 4;
    const vrows: [string,string][] = [
      ['Humedad Suelo (%)','humedad_suelo'],
      ['Potencial Hidrico (bar)','potencial_hidrico'],
      ['Electroconductividad','electroconductividad'],
      ['Temperatura Suelo (C)','temperatura_suelo'],
      ['Temperatura Ambiental (C)','temperatura_ambiental'],
      ['Humedad Relativa (%)','humedad_relativa'],
      ['Velocidad Viento (m/s)','velocidad_viento'],
      ['Radiacion Solar (W/m2)','radiacion_solar'],
      ['Evapotranspiracion (mm)','evapotranspiracion'],
      ['Flujo de Riego (m3/h)','flujo_riego'],
    ];
    vrows.forEach(([lbl,key],idx) => {
      if (idx%2===0) { pdf.setFillColor(249,250,251); pdf.rect(mg, y-3, pageW-mg*2, 6, 'F'); }
      const s = calcStat(key);
      pdf.setFontSize(8.5);
      pdf.setTextColor(40,40,40);   pdf.text(lbl,   cols[0], y);
      pdf.setTextColor(30,100,200); pdf.text(s.min,  cols[1], y);
      pdf.setTextColor(200,60,60);  pdf.text(s.max,  cols[2], y);
      pdf.setTextColor(20,160,80);  pdf.text(s.prom, cols[3], y);
      y += 6;
    });
    y += 8;

    const charts = [
      { ref: chartHumedadRef,   title: 'Humedad del Suelo (%)' },
      { ref: chartTempRef,      title: 'Temperatura Suelo y Ambiental (C)' },
      { ref: chartAmbientalRef, title: 'Humedad Relativa y Radiacion Solar' },
      { ref: chartNDVIRef,      title: 'Evapotranspiracion y Electroconductividad' },
      { ref: chartConsumoRef,   title: 'Flujo de Riego - Sesiones Activas (m3/h)' },
      { ref: chartHidricoRef,   title: 'Potencial Hidrico y NDVI' },
      { ref: chartVientoRef,    title: 'Velocidad del Viento (m/s)' },
    ];
    await new Promise<void>(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

    let graficasInsertadas = 0;
    for (const { ref, title } of charts) {
      if (!ref.current) continue;
      const imgData = await chartToPng(ref.current);
      if (!imgData) continue;
      const imgW    = pageW - mg*2;
      const imgMeta = pdf.getImageProperties(imgData);
      const imgH    = (imgMeta.height / imgMeta.width) * imgW;
      if (y + imgH + 14 > pageH - mg) { pdf.addPage(); y = mg; }
      drawSection(title);
      pdf.addImage(imgData, 'PNG', mg, y, imgW, imgH);
      y += imgH + 8;
      graficasInsertadas += 1;
    }

    if (graficasInsertadas === 0) {
      alert('No se pudieron capturar las graficas para el PDF. Intenta nuevamente en unos segundos.');
      return;
    }
    pdf.save(`reporte_${areaSeleccionada}_${desde||'inicio'}_${hasta||'fin'}.pdf`);
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl mb-2">Reportes y An&aacute;lisis</h1>
            <p className="text-sm text-gray-600">Consulta y exporta datos hist&oacute;ricos</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportarPDF} variant="outline" className="rounded-xl">
              <FileText className="w-4 h-4 mr-2" /> PDF
            </Button>
            <Button onClick={exportarCSV} className="bg-gradient-to-r from-blue-600 to-green-600 rounded-xl">
              <FileDown className="w-4 h-4 mr-2" /> Exportar CSV
            </Button>
          </div>
        </div>

        <Card className="p-6 rounded-2xl shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-600 font-medium">&Aacute;rea de Riego</label>
              <Select value={areaSeleccionada} onValueChange={setAreaSeleccionada}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecciona un area" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las areas</SelectItem>
                  {areas.map(a => <SelectItem key={a.id_area} value={a.id_area}>{a.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600 font-medium">Desde</label>
              <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-600 font-medium">Hasta</label>
              <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            </div>
          </div>
          {loading && <p className="text-sm text-gray-500 mt-3">Cargando datos...</p>}
          {!loading && lecturas.length > 0 && <p className="text-sm text-green-600 mt-3">{lecturas.length} lecturas encontradas</p>}
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Lecturas',          value: lecturas.length,                             color: '#7c3aed' },
            { label: 'Hum. Prom. Suelo',  value: `${humProm}%`,                              color: '#00c950' },
            { label: 'Temp. Amb. Prom.',  value: `${tempProm} C`,                            color: '#f97316' },
            { label: 'Consumo Total',     value: `${consumoTotal} m3`,                       color: '#2b7fff' },
            { label: 'Sesiones Riego',    value: sessionesRiego,                             color: '#0891b2' },
            { label: 'Temp. Suelo Prom.', value: `${calcStat('temperatura_suelo').prom} C`,  color: '#dc2626' },
            { label: 'Rad. Solar Prom.',  value: `${calcStat('radiacion_solar').prom} W/m2`, color: '#d97706' },
            ...(ndviProm ? [{ label: 'NDVI Promedio', value: ndviProm, color: '#16a34a' }] : []),
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-4" style={{ border: '1px solid rgba(0,0,0,0.1)' }}>
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {lecturas.length > 0 && (
          <>
            <div ref={chartHumedadRef}>
              <Card className="p-6 rounded-2xl shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Humedad del Suelo (%)</h2>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={lecturas}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="fecha_hora" stroke="#6b7280" style={{ fontSize: '11px' }} tickFormatter={formatFecha} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} labelFormatter={v => new Date(v).toLocaleString('es-MX')} formatter={(v: any) => [`${Number(v).toFixed(2)}%`, 'Humedad Suelo']} />
                  <Legend />
                  <Line type="monotone" dataKey="humedad_suelo" stroke="#10b981" strokeWidth={2} dot={false} name="Humedad Suelo %" />
                </LineChart>
              </ResponsiveContainer>
              </Card>
            </div>

            <div ref={chartTempRef}>
              <Card className="p-6 rounded-2xl shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Temperatura Suelo y Ambiental</h2>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={lecturas}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="fecha_hora" stroke="#6b7280" style={{ fontSize: '11px' }} tickFormatter={formatFecha} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} labelFormatter={v => new Date(v).toLocaleString('es-MX')} formatter={(v: any, n: any) => [`${Number(v).toFixed(2)} C`, n]} />
                  <Legend />
                  <Line type="monotone" dataKey="temperatura_suelo"     stroke="#f97316" strokeWidth={2} dot={false} name="Temp. Suelo" />
                  <Line type="monotone" dataKey="temperatura_ambiental" stroke="#ef4444" strokeWidth={2} dot={false} name="Temp. Ambiental" strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
              </Card>
            </div>

            <div ref={chartAmbientalRef}>
              <Card className="p-6 rounded-2xl shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Humedad Relativa (%) y Radiacion Solar</h2>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={lecturas}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="fecha_hora" stroke="#6b7280" style={{ fontSize: '11px' }} tickFormatter={formatFecha} />
                  <YAxis yAxisId="left"  stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} labelFormatter={v => new Date(v).toLocaleString('es-MX')} />
                  <Legend />
                  <Line yAxisId="left"  type="monotone" dataKey="humedad_relativa" stroke="#6366f1" strokeWidth={2} dot={false} name="Hum. Relativa %" />
                  <Line yAxisId="right" type="monotone" dataKey="radiacion_solar"  stroke="#f59e0b" strokeWidth={2} dot={false} name="Radiacion Solar W/m2" />
                </LineChart>
              </ResponsiveContainer>
              </Card>
            </div>

            <div ref={chartNDVIRef}>
              <Card className="p-6 rounded-2xl shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Evapotranspiracion y Electroconductividad</h2>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={lecturas}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="fecha_hora" stroke="#6b7280" style={{ fontSize: '11px' }} tickFormatter={formatFecha} />
                  <YAxis yAxisId="left"  stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} labelFormatter={v => new Date(v).toLocaleString('es-MX')} />
                  <Legend />
                  <Line yAxisId="left"  type="monotone" dataKey="evapotranspiracion"   stroke="#14b8a6" strokeWidth={2} dot={false} name="Evapotranspiracion mm" />
                  <Line yAxisId="right" type="monotone" dataKey="electroconductividad" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Electroconductividad" />
                </LineChart>
              </ResponsiveContainer>
              </Card>
            </div>

            <div ref={chartConsumoRef}>
              <Card className="p-6 rounded-2xl shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Flujo de Riego - Sesiones Activas</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={lecturas.filter(l => l.estatus_riego)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="fecha_hora" stroke="#6b7280" style={{ fontSize: '11px' }} tickFormatter={formatFecha} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} formatter={(v: any) => [`${Number(v).toFixed(2)} m3/h`, 'Flujo Riego']} />
                  <Legend />
                  <Bar dataKey="flujo_riego" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Flujo Riego m3/h" />
                </BarChart>
              </ResponsiveContainer>
              </Card>
            </div>

            <div ref={chartHidricoRef}>
              <Card className="p-6 rounded-2xl shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Potencial Hidrico y NDVI</h2>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={lecturas}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="fecha_hora" stroke="#6b7280" style={{ fontSize: '11px' }} tickFormatter={formatFecha} />
                  <YAxis yAxisId="left" stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#6b7280" style={{ fontSize: '11px' }} domain={[0, 1]} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} labelFormatter={v => new Date(v).toLocaleString('es-MX')} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="potencial_hidrico" stroke="#0ea5e9" strokeWidth={2} dot={false} name="Potencial Hidrico (bar)" />
                  <Line yAxisId="right" type="monotone" dataKey="ndvi" stroke="#16a34a" strokeWidth={2} dot={false} name="NDVI" strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
              </Card>
            </div>

            <div ref={chartVientoRef}>
              <Card className="p-6 rounded-2xl shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Velocidad del Viento (m/s)</h2>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={lecturas}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="fecha_hora" stroke="#6b7280" style={{ fontSize: '11px' }} tickFormatter={formatFecha} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '11px' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} labelFormatter={v => new Date(v).toLocaleString('es-MX')} formatter={(v: any) => [`${Number(v).toFixed(2)} m/s`, 'Velocidad Viento']} />
                  <Legend />
                  <Line type="monotone" dataKey="velocidad_viento" stroke="#2563eb" strokeWidth={2} dot={false} name="Velocidad Viento (m/s)" />
                </LineChart>
              </ResponsiveContainer>
              </Card>
            </div>

            <Card className="p-6 rounded-2xl shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Tabla Detallada ({lecturas.length} registros)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      {[...(mostrarArea ? ['Area'] : []), 'Fecha/Hora', 'Hum. %', 'Temp. Suelo', 'Temp. Amb.', 'H. Relativa', 'Radiacion', 'ET', 'E. Cond.', 'Riego', 'Flujo']
                        .map(h => <th key={h} className="text-left p-3 text-gray-600 font-medium whitespace-nowrap">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {lecturas.slice(0, 50).map((l, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        {mostrarArea && <td className="p-3 whitespace-nowrap text-gray-600">{l.nombre_area || l.id_area}</td>}
                        <td className="p-3 whitespace-nowrap text-gray-600">{new Date(l.fecha_hora).toLocaleString('es-MX')}</td>
                        <td className="p-3 font-bold text-green-700">{l.humedad_suelo}%</td>
                        <td className="p-3">{l.temperatura_suelo}</td>
                        <td className="p-3">{l.temperatura_ambiental}</td>
                        <td className="p-3">{l.humedad_relativa}%</td>
                        <td className="p-3">{l.radiacion_solar}</td>
                        <td className="p-3">{l.evapotranspiracion}</td>
                        <td className="p-3">{l.electroconductividad}</td>
                        <td className="p-3">{l.estatus_riego ? 'ON' : 'OFF'}</td>
                        <td className="p-3">{l.flujo_riego}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {lecturas.length > 50 && <p className="text-center text-xs text-gray-400 mt-3">Mostrando 50 de {lecturas.length} - usa Exportar CSV para todos los datos</p>}
              </div>
            </Card>
          </>
        )}

        {!loading && lecturas.length === 0 && (
          <Card className="p-12 rounded-2xl text-center">
            <p className="text-gray-500">No hay lecturas para los filtros seleccionados</p>
          </Card>
        )}
      </div>
    </div>
  );
}
