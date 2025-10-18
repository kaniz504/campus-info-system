// auth.js - Authentication Middleware
const jwt = require('jsonwebtoken');

// Secret key for JWT (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'campus-info-secret-key-2025';
const JWT_EXPIRES_IN = '24h';

// Generate JWT token
function generateToken(user) {
    return jwt.sign(
        { 
            id: user.id, 
            student_id: user.student_id, 
            role: user.role,
            name: user.name
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

// Verify JWT token middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// Admin role check middleware
function requireAdmin(req, res, next) {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}

// Student or Admin role check middleware
function requireAuth(req, res, next) {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'student')) {
        return res.status(403).json({ error: 'Valid user access required' });
    }
    next();
}

module.exports = {
    generateToken,
    authenticateToken,
    requireAdmin,
    requireAuth,
    JWT_SECRET
};