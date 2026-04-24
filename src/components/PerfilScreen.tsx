import { useEffect, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { UserCircle, Save, Shield, Eye, Mail } from 'lucide-react';
import { api } from '../api';

interface PerfilScreenProps {
  userRole: 'admin' | 'user';
  sessionUser: {
    id_usuario: number;
    email: string;
    nombre_completo: string;
    rol: string;
  } | null;
}

export function PerfilScreen({ userRole, sessionUser }: PerfilScreenProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    nombre: sessionUser?.nombre_completo || 'Usuario',
    email: sessionUser?.email || '',
    cargo: sessionUser?.rol || '',
  });
  const [fotoPerfilUrl, setFotoPerfilUrl] = useState('');
  const [subiendoFoto, setSubiendoFoto] = useState(false);

  const [passwordData, setPasswordData] = useState({
    actual: '',
    nueva: '',
    confirmar: '',
  });

  useEffect(() => {
    if (!sessionUser) return;

    setFormData((prev) => ({
      ...prev,
      nombre: sessionUser.nombre_completo,
      email: sessionUser.email,
      cargo: sessionUser.rol,
    }));
  }, [sessionUser]);

  useEffect(() => {
    const cargarPerfil = async () => {
      const res = await api.getMiPerfil();
      if (!res.ok || !res.data?.perfil) return;

      const perfil = res.data.perfil;
      setFormData((prev) => ({
        ...prev,
        nombre: perfil.nombre_completo || prev.nombre,
        email: perfil.email || prev.email,
        cargo: perfil.rol || prev.cargo,
      }));
      setFotoPerfilUrl(perfil.foto_perfil_url || '');
    };

    cargarPerfil();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.actualizarMiPerfil({
      nombre_completo: formData.nombre,
    });

    if (!res.ok) {
      alert(res.error || 'No se pudo actualizar el perfil');
      return;
    }

    if (res.data?.perfil) {
      const perfil = res.data.perfil;
      setFormData((prev) => ({
        ...prev,
        nombre: perfil.nombre_completo || prev.nombre,
      }));
      setFotoPerfilUrl(perfil.foto_perfil_url || '');
    }

    alert('Perfil actualizado exitosamente');
    setIsEditing(false);
  };

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubiendoFoto(true);
    const res = await api.subirFotoPerfil(file);
    setSubiendoFoto(false);

    if (!res.ok) {
      alert(res.error || 'No se pudo subir la foto');
      return;
    }

    if (res.data?.foto_perfil_url) {
      setFotoPerfilUrl(res.data.foto_perfil_url);
    }
  };

  const fotoSrc = fotoPerfilUrl ? `http://localhost:3001${fotoPerfilUrl}` : '';

  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    if (passwordData.nueva !== passwordData.confirmar) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }

    if (passwordData.nueva.length < 6) {
      setPasswordError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    setSavingPassword(true);
    const res = await api.cambiarPassword(passwordData.actual, passwordData.nueva);
    setSavingPassword(false);

    if (!res.ok) {
      setPasswordError(res.error || 'No se pudo cambiar la contraseña');
      return;
    }

    setPasswordSuccess(true);
    setPasswordData({ actual: '', nueva: '', confirmar: '' });
  };

  const actividadReciente = [
    { fecha: '2024-12-04 10:30', accion: 'Inicio de sesión', detalle: 'Desde navegador web' },
    { fecha: '2024-12-04 09:15', accion: 'Configuración actualizada', detalle: 'Área de Riego A-002' },
    { fecha: '2024-12-03 16:45', accion: 'Reporte exportado', detalle: 'Reporte mensual en PDF' },
    { fecha: '2024-12-03 14:20', accion: 'Alerta atendida', detalle: 'Alerta AL-003' },
    { fecha: '2024-12-03 11:30', accion: 'Inicio de sesión', detalle: 'Desde navegador web' },
  ];

  return (
      <div className="p-3 sm:p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl mb-1 sm:mb-2 font-semibold">Perfil y Cuenta</h1>
            <p className="text-sm md:text-base text-gray-600">Administra tu información personal y configuración de cuenta</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Información del Usuario */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-4 sm:p-6 rounded-2xl shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-600 to-green-500 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden">
                      {fotoSrc ? (
                        <img src={fotoSrc} alt="Foto de perfil" className="w-full h-full object-cover" />
                      ) : (
                        <UserCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg sm:text-2xl font-medium truncate">{formData.nombre}</h2>
                      <div className="flex items-center mt-1">
                        <Badge className={
                          userRole === 'admin'
                              ? 'bg-purple-100 text-purple-700 whitespace-nowrap'
                              : 'bg-blue-100 text-blue-700 whitespace-nowrap'
                        }>
                          {userRole === 'admin' ? (
                              <><Shield className="w-3 h-3 mr-1" /> Administrador</>
                          ) : (
                              <><Eye className="w-3 h-3 mr-1" /> Usuario</>
                          )}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                      onClick={() => setIsEditing(!isEditing)}
                      variant={isEditing ? 'outline' : 'default'}
                      className="rounded-xl w-full sm:w-auto"
                  >
                    {isEditing ? 'Cancelar' : 'Editar Perfil'}
                  </Button>
                </div>

                <div className="mb-5">
                  <Label htmlFor="fotoPerfil">Foto de Perfil</Label>
                  <Input
                    id="fotoPerfil"
                    type="file"
                    accept="image/*"
                    onChange={handleFotoChange}
                    disabled={subiendoFoto}
                    className="mt-2 rounded-xl"
                  />
                  {subiendoFoto && <p className="text-xs text-gray-500 mt-2">Subiendo imagen...</p>}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre Completo</Label>
                      <div className="relative">
                        <UserCircle className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <Input
                            id="nombre"
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            className="pl-10 rounded-xl"
                            disabled={!isEditing}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="pl-10 rounded-xl"
                            disabled={!isEditing}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cargo">Cargo</Label>
                      <Input
                          id="cargo"
                          value={formData.cargo}
                          onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                          className="rounded-xl"
                          disabled={!isEditing}
                      />
                    </div>

                  </div>

                  {isEditing && (
                      <Button
                          type="submit"
                          className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 rounded-xl mt-4"
                      >
                        <Save className="w-5 h-5 mr-2" />
                        Guardar Cambios
                      </Button>
                  )}
                </form>
              </Card>

              {/* Cambiar Contraseña */}
              <Card className="p-4 sm:p-6 rounded-2xl shadow-sm">
                <h2 className="text-lg sm:text-xl mb-4 font-medium">Cambiar Contraseña</h2>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="actual">Contraseña Actual</Label>
                    <Input
                        id="actual"
                        type="password"
                        value={passwordData.actual}
                        onChange={(e) => setPasswordData({ ...passwordData, actual: e.target.value })}
                        className="rounded-xl"
                        required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nueva">Nueva Contraseña</Label>
                    <Input
                        id="nueva"
                        type="password"
                        value={passwordData.nueva}
                        onChange={(e) => setPasswordData({ ...passwordData, nueva: e.target.value })}
                        className="rounded-xl"
                        required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmar">Confirmar Nueva Contraseña</Label>
                    <Input
                        id="confirmar"
                        type="password"
                        value={passwordData.confirmar}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmar: e.target.value })}
                        className="rounded-xl"
                        required
                    />
                  </div>

                  {passwordError && (
                    <p className="text-red-500 text-sm">{passwordError}</p>
                  )}
                  {passwordSuccess && (
                    <p className="text-green-600 text-sm">Contraseña actualizada correctamente</p>
                  )}

                  <Button
                      type="submit"
                      disabled={savingPassword}
                      className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 rounded-xl"
                  >
                    {savingPassword ? 'Guardando...' : 'Actualizar Contraseña'}
                  </Button>
                </form>
              </Card>
            </div>

            {/* Sidebar / Actividad Reciente */}
            <div className="space-y-6">
              <Card className="p-4 sm:p-6 rounded-2xl shadow-sm">
                <h2 className="text-lg mb-4 font-medium">Permisos del Rol</h2>
                <div className="space-y-3">
                  {userRole === 'admin' ? (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 shrink-0 bg-green-500 rounded-full" />
                          <span>Editar configuraciones</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 shrink-0 bg-green-500 rounded-full" />
                          <span>Gestionar usuarios</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 shrink-0 bg-green-500 rounded-full" />
                          <span>Crear y editar predios</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 shrink-0 bg-green-500 rounded-full" />
                          <span>Configurar áreas de riego</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 shrink-0 bg-green-500 rounded-full" />
                          <span>Exportar reportes</span>
                        </div>
                      </>
                  ) : (
                      <>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 shrink-0 bg-blue-500 rounded-full" />
                          <span>Visualizar dashboards</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 shrink-0 bg-blue-500 rounded-full" />
                          <span>Ver predios y áreas</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 shrink-0 bg-blue-500 rounded-full" />
                          <span>Ver reportes</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 shrink-0 bg-gray-400 rounded-full" />
                          <span className="text-gray-500">Editar configuraciones</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 shrink-0 bg-gray-400 rounded-full" />
                          <span className="text-gray-500">Gestionar usuarios</span>
                        </div>
                      </>
                  )}
                </div>
              </Card>

              <Card className="p-4 sm:p-6 rounded-2xl shadow-sm">
                <h2 className="text-lg mb-4 font-medium">Actividad Reciente</h2>
                <div className="space-y-3">
                  {actividadReciente.map((actividad, index) => (
                      <div key={index} className="pb-3 border-b last:border-0 last:pb-0">
                        <p className="text-sm font-medium">{actividad.accion}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{actividad.detalle}</p>
                        <p className="text-xs text-gray-400 mt-1">{actividad.fecha}</p>
                      </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
  );
}