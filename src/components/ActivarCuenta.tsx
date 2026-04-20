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
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.22),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.22),_transparent_26%),radial-gradient(circle_at_bottom,_rgba(6,182,212,0.12),_transparent_34%),linear-gradient(135deg,_#f7fbff_0%,_#effcf8_48%,_#eef9ff_100%)] px-4 py-12 sm:px-6 lg:px-8">
            <div className="absolute left-[-4rem] top-20 h-56 w-56 rounded-full bg-blue-400/25 blur-3xl" />
            <div className="absolute bottom-[-5rem] right-[-4rem] h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />

            <div className="w-full max-w-xl mx-auto">
                <Card className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/96 shadow-[0_30px_80px_rgba(15,23,42,0.16)] backdrop-blur">
                    <div className="px-6 py-12 sm:px-10 sm:py-14">
                        <div className="mx-auto max-w-lg text-center">
                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-blue-600 via-cyan-500 to-emerald-500 text-white shadow-[0_16px_35px_rgba(37,99,235,0.28)] ring-1 ring-white/30">
                                <ShieldCheck className="h-10 w-10" strokeWidth={2.2} />
                            </div>

                            <div className="mt-8 space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.38em] text-cyan-700">
                                    Activación segura
                                </p>
                                <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                                    Activa Tu Cuenta
                                </h2>
                                <p className="mx-auto max-w-md text-sm leading-6 text-slate-600 sm:text-base">
                                    Crea una contraseña segura para completar tu acceso a AgroRiego.
                                </p>
                            </div>
                        </div>

                        <div className="mx-auto mt-12 max-w-lg">
                            <form onSubmit={handleSubmit} className="space-y-6 rounded-[1.5rem] border border-cyan-100 bg-gradient-to-b from-white to-cyan-50/60 p-6 sm:p-8 shadow-[0_16px_40px_rgba(8,145,178,0.08)]">
                                <div className="space-y-3">
                                    <Label htmlFor="password">Nueva Contraseña</Label>
                                    <div className="relative">
                                        <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-600" />
                                        <Input
                                            id="password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Mínimo 8 caracteres"
                                            className="h-12 rounded-2xl border-cyan-100 bg-white pl-10 shadow-sm transition focus-visible:ring-cyan-500"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                                    <div className="relative">
                                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                                        <Input
                                            id="confirmPassword"
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Repite la contraseña"
                                            className="h-12 rounded-2xl border-emerald-100 bg-white pl-10 shadow-sm transition focus-visible:ring-emerald-500"
                                            required
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                        {error}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="h-12 w-full rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-600 to-emerald-500 font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:from-blue-700 hover:via-cyan-700 hover:to-emerald-600"
                                >
                                    {loading ? 'Activando cuenta...' : 'Activar Cuenta'}
                                </Button>

                                <p className="pt-2 text-center text-xs text-slate-600">
                                    Al activar tu cuenta, podrás ingresar al panel de control.
                                </p>
                            </form>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default ActivarCuenta;
