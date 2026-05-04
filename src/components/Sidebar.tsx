import { 
  LayoutDashboard, 
  MapPin, 
  Droplet, 
  Gauge, 
  Bell, 
  FileText, 
  Settings, 
  Users, 
  UserCircle,
  LogOut,
  X
} from "lucide-react";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "./ui/sheet";

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  userRole: 'system-admin' | 'admin' | 'user';
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ currentView, onNavigate, userRole, onLogout, isOpen, onClose }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'predios', label: 'Predios', icon: MapPin },
    { id: 'areas', label: 'Áreas de Riego', icon: Droplet },
    { id: 'sensores', label: 'Sensores', icon: Gauge },
    { id: 'alertas', label: 'Alertas', icon: Bell },
    { id: 'reportes', label: 'Reportes', icon: FileText },
    { id: 'configuracion', label: 'Configuración', icon: Settings },
    { id: 'usuarios', label: 'Usuarios y Roles', icon: Users, adminOnly: true },
    { id: 'perfil', label: 'Perfil y Cuenta', icon: UserCircle },
  ];

  const sidebarContent = (
    <div className="bg-gradient-to-b from-blue-900 to-blue-800 text-white h-full flex flex-col">
      <div className="p-6 border-b border-blue-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
              <Droplet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-semibold">AgroRiego IoT</h1>
              <p className="text-xs text-blue-200">Sistema de Riego</p>
            </div>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="lg:hidden text-white hover:bg-blue-700"
            >
            </Button>
          )}
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-1">
          {menuItems.map((item) => {
            if (item.adminOnly && userRole !== 'system-admin' && userRole !== 'admin') return null;
            
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-white text-blue-900 shadow-lg' 
                    : 'hover:bg-blue-700 text-blue-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="p-4 border-t border-blue-700">
        <div className="bg-blue-700 rounded-xl p-3 mb-3">
          <p className="text-xs text-blue-200">Rol actual</p>
          <p className="text-sm font-semibold">
            {userRole === 'system-admin' ? 'Administrador Sistema' : userRole === 'admin' ? 'Administrador Predio' : 'Usuario'}
          </p>
        </div>
        <Button
          onClick={onLogout}
          variant="ghost"
          className="w-full justify-start text-blue-100 hover:bg-blue-700 hover:text-white"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64 h-screen sticky top-0">
        {sidebarContent}
      </div>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
          <SheetDescription className="sr-only">
            Navegue por las diferentes secciones del sistema de riego IoT
          </SheetDescription>
          {sidebarContent}
        </SheetContent>
      </Sheet>
    </>
  );
}