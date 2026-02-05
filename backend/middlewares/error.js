const ErrorHandler = require("../utils/errorHandler");

module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || "Internal Server Error";

    // mongodb id error
    if (err.name === "CastError") {
        const message = `Resource Not Found. Invalid: ${err.path}`;
        err = new ErrorHandler(message, 400);
    }

    // mongoose duplicate key error
    if (err.code === 11000) {
        const message = `Duplicate ${Object.keys(err.keyValue)} entered`;
        err = new ErrorHandler(message, 400);
    }

    // wrong jwt error - CORREGIDO: usa err.name
    if (err.name === "JsonWebTokenError") {
        const message = 'JWT Error';
        err = new ErrorHandler(message, 400);
    }

    // jwt expire error - CORREGIDO: usa err.name
    if (err.name === "TokenExpiredError") {
        const message = 'JWT is Expired';
        err = new ErrorHandler(message, 400);
    }

    // AÑADE ESTA LÍNEA PARA DEBUG (elimínala después)
    console.error("Error middleware caught:", {
        message: err.message,
        statusCode: err.statusCode,
        name: err.name,
        code: err.code
    });

    // Asegúrate que statusCode sea un número
    const statusCode = Number(err.statusCode) || 500;
    
    res.status(statusCode).json({
        success: false,
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
};
