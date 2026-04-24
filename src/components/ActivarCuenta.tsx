import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ShieldCheck, KeyRound, Lock } from 'lucide-react';
import { api } from '../api';

// UI (igual que usas en login)
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';


const ActivarCuenta = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const queryParams = new URLSearchParams(location.search);
    const token = queryParams.get('token');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }
        if (!token) {
            setError('Token de activación no encontrado');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await api.activarCuenta(token, password);
            if (res.ok) {
                navigate('/login', { replace: true });
            } else {
                setError(res.error || 'Error al activar cuenta');
            }
        } catch (err) {
            console.error('Error en activación:', err);
            setError('Error al activar cuenta');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-blue-100 flex items-center justify-center p-4 sm:p-8">
            <div className="w-full max-w-2xl mx-auto">
                <Card className="w-full p-8 sm:p-12 rounded-3xl shadow-2xl bg-white border-none">
                    <div className="text-center mb-16">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <ShieldCheck className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800">Activar Cuenta</h1>
                        <p className="text-gray-500 text-sm mt-1">Crea una contraseña segura para completar tu acceso</p>
                    </div>

                    <div className="flex justify-center w-full">
                        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
                            <div className="space-y-3">
                                <Label htmlFor="password">Nueva Contraseña</Label>
                                <div className="relative w-full">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                        <KeyRound className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Mínimo 8 caracteres"
                                        className="pl-10 rounded-xl w-full"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                                <div className="relative w-full">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                        <Lock className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Repite la contraseña"
                                        className="pl-10 rounded-xl w-full"
                                        required
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl p-3">
                                    {error}
                                </div>
                            )}

                            <div className="h-1" />

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-12 mt-6 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 rounded-xl font-bold text-white shadow-md"
                            >
                                {loading ? 'Activando...' : 'Activar Cuenta'}
                            </Button>

                            <p className="text-center text-xs text-gray-400 mt-8">
                                Al activar tu cuenta, podrás ingresar al panel de control.
                            </p>
                        </form>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default ActivarCuenta;
