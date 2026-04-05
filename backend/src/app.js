const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
require('dotenv').config();

const { analyzeSectionController, checkBatchController, uploadBatchController, fetchSubjectsController } = require('./controllers/batchController');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// // Security: Trust proxy for Render so rate limiter gets actual IPs
app.set('trust proxy', 1);

// Security: Helmet for HTTP header safeguarding
app.use(helmet());

// Security: Rate limiting (10 requests per 15 mins)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50, // increased max a bit for testing
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Main Endpoint: POST /api/analyze-section
app.post('/api/analyze-section', analyzeSectionController);

// Database check: GET /api/check-batch
app.get('/api/check-batch', checkBatchController);

// Database upload: POST /api/upload-batch
app.post('/api/upload-batch', upload.single('file'), uploadBatchController);

// Fetch subjective list: GET /api/fetch-subjects
app.get('/api/fetch-subjects', fetchSubjectsController);

// Root Health Check Route
app.get('/', (req, res) => {
    res.status(200).json({ status: 'online', message: 'BatchGrad Analytics API is live.' });
});

const { supabase } = require('./config/supabase');

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    // Purposely avoiding request data logs for security reasons.
    console.log(`Server running on port ${PORT}`);
    
    // // CRON JOB: Ping Supabase every 5 minutes to keep it active
setInterval(async () => {
    try {
        console.log("Sending keep-alive ping to Supabase...");
        await supabase.from('student_registry').select('reg_no').limit(1);
    } catch (error) {
        console.error("Keep-alive ping failed:", error.message);
    }
}, 5 * 60 * 1000); // 5 minutes
});
