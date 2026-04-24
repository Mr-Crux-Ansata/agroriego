import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { UserPlus, Shield, Eye, Trash2, AlertCircle, Home } from 'lucide-react';
import { api } from '../api';



interface UsuariosScreenProps {
  userRole: 'admin' | 'user';
}

export function UsuariosScreen({ userRole }: UsuariosScreenProps) {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [error, setError] = useState('');
  const RFC_REGEX = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

  const normalizarRFC = (value: string) =>
    value.toUpperCase().replace(/[^A-Z0-9Ñ&]/g, '');

  const [formData, setFormData] = useState({
    nombre_completo: '',
    email: '',
    rfc: '',
    fecha_nacimiento: '',
    rol: 'Operador Campo',
  });

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = () => {
    setLoading(true);

    api.getUsuarios()
      .then(data => {
        console.log("USUARIOS:", data);
        setUsuarios(data || []);
      })
      .catch(() => {
        setUsuarios([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const rfcNormalizado = normalizarRFC(formData.rfc);

    if (!formData.email || !formData.nombre_completo || !rfcNormalizado || !formData.fecha_nacimiento) {
      setError('Todos los campos son obligatorios');
      return;
    }

    const fechaNacimiento = new Date(`${formData.fecha_nacimiento}T00:00:00`);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (Number.isNaN(fechaNacimiento.getTime()) || fechaNacimiento > hoy) {
      setError('Fecha de nacimiento inválida.');
      return;
    }

    if (!RFC_REGEX.test(rfcNormalizado)) {
      setError('RFC inválido. Usa formato de 12 o 13 caracteres (ej: XAXX010101000).');
      return;
    }

    try {
      const result = await api.crearUsuario({
        ...formData,
        rfc: rfcNormalizado,
      });

      if (result.ok) {
        setShowDialog(false);
        setFormData({
          nombre_completo: '',
          email: '',
          rfc: '',
          fecha_nacimiento: '',
          rol: 'Operador Campo'
        });
        cargarUsuarios();
      } else {
        setError(result.error || 'Error al crear usuario');
      }
    } catch {
      setError('No se pudo conectar con el servidor');
    }
  };

  const handleDelete = async (id: number, nombre: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar al usuario ${nombre}?`)) return;
    try {
      await api.eliminarUsuario(id);
      cargarUsuarios();
    } catch {
      alert('Error al eliminar usuario');
    }
  };

  const getRoleConfig = (rol: string) => {
    switch (rol) {
      case 'Administrador Sistema':
        return {
          icon: Shield,
          colorClass: 'text-purple-600',
          bgClass: 'bg-purple-100',
          badgeClass: 'bg-purple-100 text-purple-700',
          desc: 'Control total del sistema'
        };
      case 'Administrador Predio':
        return {
          icon: Home,
          colorClass: 'text-blue-600',
          bgClass: 'bg-blue-100',
          badgeClass: 'bg-blue-100 text-blue-700',
          desc: 'Gestiona predios asignados'
        };
      default:
        return {
          icon: Eye,
          colorClass: 'text-green-600',
          bgClass: 'bg-green-100',
          badgeClass: 'bg-green-100 text-green-700',
          desc: 'Visualización y tareas de campo'
        };
    }
  };

  if (userRole !== 'admin') {
    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <Card className="p-6 md:p-8 rounded-2xl shadow-sm text-center">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl mb-2">Acceso Restringido</h2>
            <p className="text-gray-600">
              Solo los administradores pueden gestionar usuarios y roles
            </p>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-gray-500 animate-pulse">Cargando usuarios...</div>
      </div>
    );
  }

  const totalAdmins = usuarios.filter(u => u.rol.includes('Administrador')).length;
  const totalOperadores = usuarios.filter(u => u.rol === 'Operador Campo').length;

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl mb-2">Gestión de Usuarios y Roles</h1>
            <p className="text-sm md:text-base text-gray-600">Administra los usuarios del sistema</p>
          </div>
          <Button
            onClick={() => { setShowDialog(true); setError(''); }}
            className="bg-gradient-to-r from-blue-600 to-green-600 rounded-xl"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Crear Usuario
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card className="p-6 rounded-2xl shadow-sm">
            <p>Total</p>
            <p className="text-3xl">{usuarios.length}</p>
          </Card>
          <Card className="p-6 rounded-2xl shadow-sm">
            <p>Admins</p>
            <p className="text-3xl">{totalAdmins}</p>
          </Card>
          <Card className="p-6 rounded-2xl shadow-sm">
            <p>Operadores</p>
            <p className="text-3xl">{totalOperadores}</p>
          </Card>
        </div>

        {usuarios.map(usuario => {
          const config = getRoleConfig(usuario.rol);
          const Icon = config.icon;
          const fotoSrc = usuario.foto_perfil_url
            ? `http://localhost:3001${usuario.foto_perfil_url}`
            : null;

          return (
            <Card key={usuario.id_usuario} className="p-4 flex justify-between">
              <div className="flex gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${config.bgClass}`}>
                  {fotoSrc ? (
                    <img src={fotoSrc} alt={usuario.nombre_completo} className="w-full h-full object-cover" />
                  ) : (
                    <Icon className={`w-5 h-5 ${config.colorClass}`} />
                  )}
                </div>
                <div>
                  <h3>{usuario.nombre_completo}</h3>
                  <p>{usuario.email}</p>
                  <Badge className={config.badgeClass}>{usuario.rol}</Badge>
                </div>
              </div>

              <Button 
                onClick={() => handleDelete(usuario.id_usuario, usuario.nombre_completo)}
                variant="outline"
                size="sm"
                className="!bg-black !text-white rounded-xl hover:!bg-gray-800 dark:!bg-black dark:!text-white dark:hover:!bg-gray-800"
              >
                <Trash2 />
              </Button>
            </Card>
          );
        })}

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Usuario</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-4">

              {error && (
                <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}

              <Input
                placeholder="Nombre"
                value={formData.nombre_completo}
                onChange={e => setFormData({ ...formData, nombre_completo: e.target.value })}
              />

              <Input
                placeholder="Email"
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />

              <Input
                placeholder="RFC"
                value={formData.rfc}
                maxLength={13}
                onChange={e => setFormData({ ...formData, rfc: normalizarRFC(e.target.value) })}
              />

              <div className="space-y-2">
                <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento</Label>
                <Input
                  id="fecha_nacimiento"
                  type="date"
                  value={formData.fecha_nacimiento}
                  onChange={e => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                />
              </div>

              <Select
                value={formData.rol}
                onValueChange={(value: string) => setFormData({ ...formData, rol: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Administrador Sistema">Admin Sistema</SelectItem>
                  <SelectItem value="Administrador Predio">Admin Predio</SelectItem>
                  <SelectItem value="Operador Campo">Operador</SelectItem>
                </SelectContent>
              </Select>

              <Button type="submit">Crear</Button>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
