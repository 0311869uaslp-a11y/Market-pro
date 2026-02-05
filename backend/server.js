const path = require('path');
const express = require('express');
const cloudinary = require('cloudinary');
const cors = require('cors'); // Importar cors
const app = require('./backend/app');
const connectDatabase = require('./backend/config/database');
const PORT = process.env.PORT || 4000;

// UncaughtException Error
process.on('uncaughtException', (err) => {
    console.log(`Error: ${err.message}`);
    process.exit(1);
});

connectDatabase();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ========== CORS FLEXIBLE ==========
// Configuración de CORS más flexible para desarrollo y producción
const corsOptions = {
    origin: function (origin, callback) {
        // Permitir requests sin 'origin' (como móviles, Postman, curl, etc.)
        if (!origin) {
            console.log('Request sin origin header - permitido');
            return callback(null, true);
        }
        
        // Lista de orígenes permitidos
        const allowedOrigins = [
            // Desarrollo local
            'http://localhost:3000',
            'http://localhost:5173', // Vite
            'http://localhost:8080',
            
            // Netlify (tus posibles URLs)
            'https://glittering-churros-7a307b.netlify.app',
            'https://flipkart-ecommerce.netlify.app', // si cambias nombre
            
            // Render (para pruebas)
            'https://flipkart-backend.onrender.com',
            
            // Para desarrollo - cualquier subdominio localhost
            /^http:\/\/localhost:\d+$/,
            
            // Cualquier subdominio de netlify.app
            /^https:\/\/(.+\.)?netlify\.app$/,
        ];
        
        // Verificar si el origen está en la lista o coincide con un patrón
        const isAllowed = allowedOrigins.some(allowed => {
            if (typeof allowed === 'string') {
                return allowed === origin;
            } else if (allowed instanceof RegExp) {
                return allowed.test(origin);
            }
            return false;
        });
        
        if (isAllowed) {
            console.log(`CORS permitido para: ${origin}`);
            callback(null, true);
        } else {
            console.log(`CORS bloqueado para: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    exposedHeaders: ['set-cookie'] // Si usas cookies
};

app.use(cors(corsOptions));

// ========== RUTA PRINCIPAL ==========
app.get('/', (req, res) => {
    res.json({
        message: 'API Server is Running! 🚀',
        status: 'active',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        endpoints: {
            api: '/api/v1',
            health: '/api/health',
            docs: '/api/docs' // si tienes documentación
        }
    });
});

// ========== RUTA DE HEALTH CHECK (opcional pero recomendado) ==========
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'connected', // puedes verificar conexión a DB aquí
        memory: process.memoryUsage()
    });
});

// ========== INICIAR SERVIDOR ==========
const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 CORS enabled for multiple origins`);
});

// Unhandled Promise Rejection
process.on('unhandledRejection', (err) => {
    console.log(`❌ Unhandled Promise Rejection: ${err.message}`);
    console.log(err.stack);
    server.close(() => {
        process.exit(1);
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🔄 SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('✅ Process terminated');
    });
});
