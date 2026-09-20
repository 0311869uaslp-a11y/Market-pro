const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const ErrorHandler = require('../utils/errorHandler');
const Order = require('../models/orderModel');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

const client = new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN,
});

// ============================================
// CREAR PREFERENCIA DE PAGO (Checkout Pro)
// ============================================
exports.createPreference = asyncErrorHandler(async (req, res, next) => {
    const { orderItems, shippingInfo, totalPrice, orderId } = req.body;

    if (!orderItems || orderItems.length === 0) {
        return next(new ErrorHandler('No hay productos en el pedido', 400));
    }

    try {
        const items = orderItems.map((item) => ({
            id: item.product,
            title: item.name,
            description: item.description || 'Producto de Flipkart',
            quantity: Number(item.quantity),
            unit_price: Number(item.price),
            currency_id: 'MXN', // Cambia según tu país
        }));

        const preference = new Preference(client);

        const body = {
            items: items,
            back_urls: {
                success: `${process.env.FRONTEND_URL}/orders/success`,
                failure: `${process.env.FRONTEND_URL}/orders/failed`,
                pending: `${process.env.FRONTEND_URL}/orders/pending`,
            },
           // auto_return: 'approved',
            // ¡CLAVE! Guardamos el orderId real para actualizarlo en el webhook
            external_reference: orderId,
            notification_url: `${process.env.BACKEND_URL}/api/v1/mp/webhook`,
            payer: {
                name: req.user.name,
                email: req.user.email,
            },
            statement_descriptor: 'FLIPKART',
        };

        const result = await preference.create({ body });

        res.status(200).json({
            success: true,
            preferenceId: result.id,
            initPoint: result.init_point,
            sandboxInitPoint: result.sandbox_init_point,
        });
    } catch (error) {
        console.error('Error creando preferencia MP:', error);
        return next(new ErrorHandler(`Error de Mercado Pago: ${error.message}`, 500));
    }
});

// ============================================
// WEBHOOK DE MERCADO PAGO
// ============================================
exports.mpWebhook = asyncErrorHandler(async (req, res, next) => {
    console.log('=== WEBHOOK MERCADO PAGO ===');
    console.log('Body:', JSON.stringify(req.body, null, 2));

    try {
        const { type, data } = req.body;

        if (type === 'payment' && data?.id) {
            const payment = new Payment(client);
            const paymentInfo = await payment.get({ id: data.id });

            console.log('Payment info:', paymentInfo);

            const status = paymentInfo.status;
            const orderId = paymentInfo.external_reference;

            if (orderId) {
                const order = await Order.findById(orderId);
                if (order) {
                    order.paymentInfo = {
                        id: String(data.id),
                        status: status,
                        paidAt: status === 'approved' ? new Date() : null,
                    };

                    if (status === 'approved') {
                        order.orderStatus = 'Processing';
                        order.paidAt = Date.now();
                    } else if (status === 'rejected' || status === 'cancelled') {
                        order.orderStatus = 'Cancelled';
                    }

                    await order.save({ validateBeforeSave: false });
                    console.log(`Pedido ${orderId} actualizado a ${status}`);
                }
            }
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Error en webhook MP:', error);
        res.status(200).json({ received: true, error: error.message });
    }
});
