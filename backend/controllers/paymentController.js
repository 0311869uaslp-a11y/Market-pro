const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const ErrorHandler = require('../utils/errorHandler');

// Solo estas 2 funciones necesarias:
exports.processPayment = asyncErrorHandler(async (req, res, next) => {
    console.log("Processing payment for:", req.body.amount);
    
    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: req.body.amount, // En centavos
            currency: "inr",
            metadata: {
                customer_email: req.body.email,
                phone: req.body.phoneNo || "",
            },
        });

        res.status(200).json({
            success: true,
            client_secret: paymentIntent.client_secret,
        });
    } catch (error) {
        console.error("Stripe error:", error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

exports.getStripeApiKey = asyncErrorHandler(async (req, res, next) => {
    res.status(200).json({
        success: true,
        stripeApiKey: process.env.STRIPE_API_KEY,
    });
});
