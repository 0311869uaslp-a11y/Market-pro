const Product = require('../models/productModel');
const asyncErrorHandler = require('../middlewares/asyncErrorHandler');
const SearchFeatures = require('../utils/searchFeatures');
const ErrorHandler = require('../utils/errorHandler');
// const cloudinary = require('cloudinary'); // COMENTADO - No usamos Cloudinary

// Get All Products
exports.getAllProducts = asyncErrorHandler(async (req, res, next) => {

    const resultPerPage = 12;
    const productsCount = await Product.countDocuments();
    // console.log(req.query);

    const searchFeature = new SearchFeatures(Product.find(), req.query)
        .search()
        .filter();

    let products = await searchFeature.query;
    let filteredProductsCount = products.length;

    searchFeature.pagination(resultPerPage);

    products = await searchFeature.query.clone();

    res.status(200).json({
        success: true,
        products,
        productsCount,
        resultPerPage,
        filteredProductsCount,
    });
});

// Get All Products ---Product Sliders
exports.getProducts = asyncErrorHandler(async (req, res, next) => {
    const products = await Product.find();

    res.status(200).json({
        success: true,
        products,
    });
});

// Get Product Details
exports.getProductDetails = asyncErrorHandler(async (req, res, next) => {

    const product = await Product.findById(req.params.id);

    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    res.status(200).json({
        success: true,
        product,
    });
});

// Get All Products ---ADMIN
exports.getAdminProducts = asyncErrorHandler(async (req, res, next) => {
    const products = await Product.find();

    res.status(200).json({
        success: true,
        products,
    });
});

// Create Product ---ADMIN
exports.createProduct = asyncErrorHandler(async (req, res, next) => {
    console.log("=== CREATE PRODUCT DEBUG ===");
    console.log("Request body:", req.body);
    console.log("User ID:", req.user?.id);
    console.log("========================");

    // Validar campos requeridos
    const requiredFields = ['name', 'description', 'price', 'category', 'stock'];
    for (const field of requiredFields) {
        if (!req.body[field]) {
            return next(new ErrorHandler(`Please provide ${field}`, 400));
        }
    }

    // Manejar imágenes
    let images = [];
    if (req.body.images) {
        if (typeof req.body.images === "string") {
            images.push(req.body.images);
        } else if (Array.isArray(req.body.images)) {
            images = req.body.images;
        }
    }

    const imagesLink = [];

    // SIN Cloudinary - usar imágenes por defecto o URLs
    if (images.length > 0) {
        for (let i = 0; i < images.length; i++) {
            if (images[i] && (images[i].startsWith('http') || images[i].startsWith('data:'))) {
                // Si es URL o base64, usarla
                imagesLink.push({
                    public_id: `product_${Date.now()}_${i}`,
                    url: images[i],
                });
            }
        }
    }

    // Si no hay imágenes válidas, usar una por defecto
    if (imagesLink.length === 0) {
        imagesLink.push({
            public_id: `default_product_${Date.now()}`,
            url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
        });
    }

    // Logo de marca
    const brandLogo = {
        public_id: `brand_${Date.now()}`,
        url: "https://images.unsplash.com/photo-1567446537710-0c5ff5a6ac32?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    };

    if (req.body.logo && req.body.logo.startsWith('http')) {
        brandLogo.url = req.body.logo;
    }

    // Especificaciones
    let specs = [];
    if (req.body.specifications) {
        if (Array.isArray(req.body.specifications)) {
            req.body.specifications.forEach((s) => {
                try {
                    if (typeof s === 'string') {
                        specs.push(JSON.parse(s));
                    } else {
                        specs.push(s);
                    }
                } catch (e) {
                    specs.push({ key: "Feature", value: String(s) });
                }
            });
        }
    }

    // Crear el producto
    const product = await Product.create({
        name: req.body.name,
        description: req.body.description,
        price: price,
        cuttedPrice: cuttedPrice, // <-- CAMPO REQUERIDO AÑADIDO
        category: req.body.category,
        stock: Number(req.body.stock),
        images: imagesLink,
        brand: {
            name: req.body.brandname || "Generic Brand",
            logo: brandLogo
        },
        specifications: specs,
        user: req.user.id
    });

    res.status(201).json({
        success: true,
        product
    });
});

// Update Product ---ADMIN
exports.updateProduct = asyncErrorHandler(async (req, res, next) => {
    console.log("=== UPDATE PRODUCT DEBUG ===");
    console.log("Product ID:", req.params.id);
    console.log("Update data:", req.body);
    console.log("========================");

    let product = await Product.findById(req.params.id);

    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    // Copiar datos existentes primero
    const updateData = { ...req.body };

    // Manejar imágenes si se proporcionan
    if (req.body.images !== undefined) {
        let images = [];
        if (typeof req.body.images === "string") {
            images.push(req.body.images);
        } else {
            images = req.body.images || [];
        }
        
        const imagesLink = [];

        for (let i = 0; i < images.length; i++) {
            if (images[i] && images[i].startsWith('http')) {
                imagesLink.push({
                    public_id: `product_${Date.now()}_${i}`,
                    url: images[i],
                });
            }
        }
        
        // Si hay imágenes nuevas válidas, actualizar
        if (imagesLink.length > 0) {
            updateData.images = imagesLink;
        }
    }

    // Logo de marca
    if (req.body.logo && req.body.logo.length > 0 && req.body.logo.startsWith('http')) {
        updateData.brand = {
            name: req.body.brandname || product.brand?.name || "Generic Brand",
            logo: {
                public_id: `brand_${Date.now()}`,
                url: req.body.logo,
            }
        };
    } else if (req.body.brandname) {
        // Solo actualizar nombre de marca si no hay logo
        updateData.brand = {
            name: req.body.brandname,
            logo: product.brand?.logo || {
                public_id: `brand_${Date.now()}`,
                url: "https://images.unsplash.com/photo-1567446537710-0c5ff5a6ac32?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
            }
        };
    }

    // Especificaciones
    if (req.body.specifications) {
        let specs = [];
        if (Array.isArray(req.body.specifications)) {
            req.body.specifications.forEach((s) => {
                try {
                    specs.push(typeof s === 'string' ? JSON.parse(s) : s);
                } catch (e) {
                    specs.push({ key: "Feature", value: String(s) });
                }
            });
            updateData.specifications = specs;
        }
    }

    // Convertir números
    if (req.body.price) updateData.price = Number(req.body.price);
    if (req.body.stock) updateData.stock = Number(req.body.stock);

    updateData.user = req.user.id;

    product = await Product.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true,
        useFindAndModify: false,
    });

    res.status(200).json({
        success: true,
        product
    });
});

// Delete Product ---ADMIN
exports.deleteProduct = asyncErrorHandler(async (req, res, next) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    await product.deleteOne();

    res.status(200).json({
        success: true,
        message: "Product deleted successfully"
    });
});

// Create OR Update Reviews
exports.createProductReview = asyncErrorHandler(async (req, res, next) => {

    const { rating, comment, productId } = req.body;

    const review = {
        user: req.user._id,
        name: req.user.name,
        rating: Number(rating),
        comment,
    }

    const product = await Product.findById(productId);

    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    const isReviewed = product.reviews.find(review => review.user.toString() === req.user._id.toString());

    if (isReviewed) {

        product.reviews.forEach((rev) => { 
            if (rev.user.toString() === req.user._id.toString())
                (rev.rating = rating, rev.comment = comment);
        });
    } else {
        product.reviews.push(review);
        product.numOfReviews = product.reviews.length;
    }

    let avg = 0;

    product.reviews.forEach((rev) => {
        avg += rev.rating;
    });

    product.ratings = avg / product.reviews.length;

    await product.save({ validateBeforeSave: false });

    res.status(200).json({
        success: true
    });
});

// Get All Reviews of Product
exports.getProductReviews = asyncErrorHandler(async (req, res, next) => {

    const product = await Product.findById(req.query.id);

    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    res.status(200).json({
        success: true,
        reviews: product.reviews
    });
});

// Delete Reveiws
exports.deleteReview = asyncErrorHandler(async (req, res, next) => {

    const product = await Product.findById(req.query.productId);

    if (!product) {
        return next(new ErrorHandler("Product Not Found", 404));
    }

    const reviews = product.reviews.filter((rev) => rev._id.toString() !== req.query.id.toString());

    let avg = 0;

    reviews.forEach((rev) => {
        avg += rev.rating;
    });

    let ratings = 0;

    if (reviews.length === 0) {
        ratings = 0;
    } else {
        ratings = avg / reviews.length;
    }

    const numOfReviews = reviews.length;

    await Product.findByIdAndUpdate(req.query.productId, {
        reviews,
        ratings: Number(ratings),
        numOfReviews,
    }, {
        new: true,
        runValidators: true,
        useFindAndModify: false,
    });

    res.status(200).json({
        success: true,
    });
});
