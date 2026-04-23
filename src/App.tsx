import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Button } from './components/ui/button';
import { Sidebar } from './components/Sidebar';
import { LoginScreen } from './components/LoginScreen';
import ActivarCuenta from './components/ActivarCuenta';
import { Dashboard } from './components/Dashboard';
import { PrediosScreen } from './components/PrediosScreen';
import { AreasScreen } from './components/AreasScreen';
import { AreaDetailScreen } from './components/AreaDetailScreen';
import { AreaConfigScreen } from './components/AreaConfigScreen';
import { SensoresScreen } from './components/SensoresScreen';
import { AlertasScreen } from './components/AlertasScreen';
import { ReportesScreen } from './components/ReportesScreen';
import { ConfiguracionScreen } from './components/ConfiguracionScreen';
import { UsuariosScreen } from './components/UsuariosScreen';
import { PerfilScreen } from './components/PerfilScreen';
import { api } from './api';

interface SessionUser {
  id_usuario: number;
  email: string;
  nombre_completo: string;
  rol: string;
}

export default function App() {
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'user'>('user');
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedData, setSelectedData] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Detectar si hay un token de activación en la URL
  const queryParams = new URLSearchParams(location.search);
  const activationToken = queryParams.get('token');
  const isActivating = activationToken !== null;

  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      const user = await api.getCurrentUser();

      if (!user) {
        api.logout();
        setSessionUser(null);
        setIsLoggedIn(false);
        return;
      }

      setSessionUser(user);
      setUserRole(
        user.rol === 'Administrador Sistema' || user.rol === 'Administrador Predio'
          ? 'admin'
          : 'user'
      );
      setIsLoggedIn(true);
    };

    restoreSession();
  }, []);

  const handleLogin = (user: any) => {
    setSessionUser(user);
    setUserRole(
        user.rol === 'Administrador Sistema' || user.rol === 'Administrador Predio'
            ? 'admin'
            : 'user'
    );
    setIsLoggedIn(true);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    api.logout();
    setSessionUser(null);
    setIsLoggedIn(false);
    setCurrentView('dashboard');
    setSelectedData(null);
  };

  const handleNavigate = (view: string, data?: any) => {
    setCurrentView(view);
    if (data) {
      setSelectedData(data);
    }
    setIsSidebarOpen(false); // Cerrar sidebar en móvil al navegar
  };

  if (!isLoggedIn) {
    if (isActivating) {
      return <ActivarCuenta />;
    }
    return <LoginScreen onLogin={handleLogin} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard data={selectedData} onNavigate={handleNavigate} />;
      case 'predios':
        return <PrediosScreen userRole={userRole} onNavigate={handleNavigate} />;
      case 'areas':
        return <AreasScreen userRole={userRole} onNavigate={handleNavigate} />;
      case 'area-detail':
        return <AreaDetailScreen area={selectedData} onNavigate={handleNavigate} />;
      case 'area-config':
        return <AreaConfigScreen area={selectedData} userRole={userRole} onNavigate={handleNavigate} />;
      case 'sensores':
        return <SensoresScreen />;
      case 'alertas':
        return <AlertasScreen />;
      case 'reportes':
        return <ReportesScreen />;
      case 'configuracion':
        return <ConfiguracionScreen userRole={userRole} />;
      case 'usuarios':
        return <UsuariosScreen userRole={userRole} />;
      case 'perfil':
        return <PerfilScreen userRole={userRole} sessionUser={sessionUser} />;
      default:
        return <Dashboard data={selectedData} onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar 
        currentView={currentView} 
        onNavigate={handleNavigate}
        userRole={userRole}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col w-full">
        {/* Mobile Header */}
        <div className="lg:hidden bg-gradient-to-r from-blue-900 to-blue-800 text-white p-4 sticky top-0 z-40 shadow-md">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(true)}
              className="text-white hover:bg-blue-700"
            >
              <Menu className="h-6 w-6" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/>
                </svg>
              </div>
              <span className="font-semibold">AgroRiego IoT</span>
            </div>
            <div className="w-10"></div>
          </div>
        </div>
        
        {renderView()}
      </div>
    </div>
  );
}