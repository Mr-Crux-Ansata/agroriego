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
    const [telefono, setTelefono] = useState('');
    const [codigoSms, setCodigoSms] = useState('');
    const [codigoEnviado, setCodigoEnviado] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const queryParams = new URLSearchParams(location.search);
    const token = queryParams.get('token');

    const handleEnviarCodigo = async (e) => {
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
            const res = await api.enviarCodigoSms(token, telefono);
            if (res.ok) {
                setCodigoEnviado(true);
            } else {
                setError(res.error || 'No se pudo enviar el SMS');
            }
        } catch (err) {
            console.error('ERROR ENVIAR CODIGO:', err);
            setError('Error al enviar el código SMS');
        }
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!token) {
            setError('Token de activación no encontrado');
            return;
        }

        setLoading(true);
        setError('');
        console.log('ACTIVAR TOKEN:', token);

        try {
            const res = await api.activarCuenta(token, password, telefono, codigoSms);
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

                {!codigoEnviado ? (
                    <form onSubmit={handleEnviarCodigo}>
                        <div className="mb-4">
                            <Label htmlFor="telefono">Número de teléfono</Label>
                            <Input
                                id="telefono"
                                type="tel"
                                placeholder="+521234567890"
                                value={telefono}
                                onChange={(e) => setTelefono(e.target.value)}
                                required
                            />
                        </div>
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
                            {loading ? 'Enviando...' : 'Enviar código SMS'}
                        </Button>
                    </form>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <p className="text-sm text-gray-600 mb-4">
                            Se envió un código de verificación al número <strong>{telefono}</strong>. Ingrésalo a continuación.
                        </p>
                        <div className="mb-4">
                            <Label htmlFor="codigoSms">Código de verificación</Label>
                            <Input
                                id="codigoSms"
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="123456"
                                value={codigoSms}
                                onChange={(e) => setCodigoSms(e.target.value)}
                                required
                            />
                        </div>
                        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                        <Button type="submit" disabled={loading} className="w-full mb-2">
                            {loading ? 'Activando...' : 'Activar Cuenta'}
                        </Button>
                        <button
                            type="button"
                            className="w-full text-sm text-gray-500 underline"
                            onClick={() => { setCodigoEnviado(false); setError(''); setCodigoSms(''); }}
                        >
                            Cambiar número o reenviar código
                        </button>
                    </form>
                )}
            </Card>
        </div>
    );
};

export default ActivarCuenta;
