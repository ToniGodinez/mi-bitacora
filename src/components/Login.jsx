import { useState } from 'react';
import './Login.css';

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const VALID_USERNAME = "tonyonly";
    const VALID_PASSWORD = "adeleadkins11";

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (username === VALID_USERNAME && password === VALID_PASSWORD) {
            // Guardar sesión
            localStorage.setItem('authenticated', 'true');
            localStorage.setItem('loginTime', Date.now());
            onLogin(true);
        } else {
            setError('❌ ACCESO DENEGADO - Credenciales incorrectas');
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="scan-line"></div>
                <form className="login-form" onSubmit={handleSubmit}>
                    <h2>🔐 ACCESO SEGURO</h2>
                    <div className="form-group">
                        <label htmlFor="username">USUARIO:</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Ingresa tu usuario"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">CONTRASEÑA:</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Ingresa tu contraseña"
                            required
                        />
                    </div>
                    <button type="submit" className="login-btn">
                        Iniciar Sesión
                    </button>
                    {error && <div className="error">{error}</div>}
                </form>
            </div>
        </div>
    );
};

export default Login;
