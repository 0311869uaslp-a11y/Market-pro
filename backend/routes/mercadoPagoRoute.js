const express = require('express');
const { createPreference, mpWebhook } = require('../controllers/mercadoPagoController');
const { isAuthenticatedUser } = require('../middlewares/auth');

const router = express.Router();

router.route('/mp/create-preference').post(isAuthenticatedUser, createPreference);
router.route('/mp/webhook').post(mpWebhook);

module.exports = router;
