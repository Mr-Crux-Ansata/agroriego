import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {api} from '../api';
console.log(api);

// UI (igual que usas en login)
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

console.log("API COMPLETA:", api);
console.log("TIPO activarCuenta:", typeof api?.activarCuenta);


const ActivarCuenta = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const queryParams = new URLSearchParams(location.search);
    const token = queryParams.get('token');

    const handleSubmit = async (e: React.FormEvent) => {
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
        console.log('ACTIVAR TOKEN:', token);

        try {
            const res = await api.activarCuenta(token, password);
            console.log('ACTIVAR RESPONSE:', res);
            if (res.ok) {
                navigate('/login', { replace: true });
            } else {
                setError(res.error || 'Error al activar cuenta');
            }
        } catch (err) {
            console.error('ACTIVAR CATCH:', err);
            setError('Error al activar cuenta');
        }
        setLoading(false);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <Card className="w-full max-w-md p-6">
                <h2 className="text-2xl font-bold text-center mb-4">Activar Cuenta</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <Label htmlFor="password">Nueva Contraseña</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                    <Button type="submit" disabled={loading} className="w-full">
                        {loading ? 'Activando...' : 'Activar Cuenta'}
                    </Button>
                </form>
            </Card>
        </div>
    );
};

export default ActivarCuenta;
