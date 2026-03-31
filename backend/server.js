require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');

const User = require('./models/User');
const Tesseract = require('tesseract.js');
const Groq = require('groq-sdk');
const { generatePHash, checkDuplicate } = require('./phashUtils');

// groq api requests count starts from 0
let groqRequestCount = 0;
let lastRequestTime = Date.now();

// if 1 minute passed reset the count
const now = Date.now();
if (now - lastRequestTime > 60000) {
  groqRequestCount = 0;
  latestRequestTime = now;
}

// First key from .env, plus two extra fallback keys for bursts
const GROQ_KEYS = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3
].filter(Boolean);

// Pre-instantiate one Groq client per key — avoids repeated construction on every job
const groqClients = GROQ_KEYS.map(key => new Groq({ apiKey: key }));
const groq = groqClients.length > 0 ? true : null; //if key exists then true otherwise false
const VERIFICATION_RULES = {
  1: "The screenshot text must clearly show evidence of a file named 'data.csv' or the Kaggle dataset 'Global Data on Sustainable Energy'.",
  2: "The screenshot text must show the output of 'node -v' returning a version number (like v18 or v20) AND/OR 'git --version' returning a version.",
  3: "The screenshot text must show a cloud dashboard or text related to 'MongoDB Atlas', 'Cluster0', or database configuration.",
  4: "The screenshot text must contain the IP address '0.0.0.0/0' and the word 'Active'. It proves the student opened their MongoDB network.",
  5: "The screenshot text must show terminal logs related to 'npm install' or a 'package.json' file showing 'mongodb' and 'csv-parser' installed.",
  6: "The screenshot text must show a '.env' file containing 'MONGO_URI=' and either a 'mongodb://' or 'mongodb+srv://' connection string. CRITICAL: The student was instructed to HIDE their password for security, so DO NOT penalize if the password is starred out, obscured, or missing. Seeing 'mongodb://' or 'MONGO_URI=' is enough to pass.",
  7: "The screenshot text must show JavaScript or Node.js code that appears to be an ETL or data import script. Look for ANY of these keywords: 'MongoClient', 'mongodb', 'require', 'createReadStream', 'csv', 'runETL', 'insertMany', 'dotenv', 'MONGO_URI'. If at least 3 of these words are visible in the OCR text, the student has passed. Be very lenient — OCR on dark VS Code themes may garble special characters like hyphens and dots.",
  8: "The screenshot text must show MongoDB Atlas collections view with documents populated, specifically referencing the 'energy_database' or pipeline collections."
};

//one user 1request - key one 
//25 users 25request - key one 
//30 users 30requests same time -key one(25requests) + key two(5requests)
//30 users 30requests after 1min interval - key one

const http = require('http');
const { Server } = require('socket.io');

const app = express(); // creates backend server interface (our api machine)
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // allow all domains for simplicity or restrict to frontend
    methods: ["GET", "POST"]
  }
});
app.use(cors()); // allows frontend to backend communication basically browser sends requests to the backend then backend respond with headers(cors) browser checks headers(cors) if allowed then show responce if not allowed then blocks the requesest error - blocked by cors policy
app.use(express.json()); // allows frontend to send json data to the backend

const PORT = process.env.PORT || 5000; // if its local then use backend port for server else if deployed then uses platform port for that
//after deployment render provides port for to use backend on server
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID"); // verifys user login token
const JWT_SECRET = process.env.JWT_SECRET || "fallback_super_secret_for_jwt"; // used for signing and verifying jwt tokens
//google login key allows you login at first time only then after that everyday when you load the app it auto login to home page because of jwt key from browser everytime till you sign out


// Set up disk storage for background processing
const fs = require('fs');
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, '_'))
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// BullMQ Queue Setup
const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');

let ocrQueue = null;
if (process.env.REDIS_URL) {
  const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
  ocrQueue = new Queue('ocrQueue', { connection });

  // ── True Concurrency with Tesseract Scheduler ──
  // Creates a pool of 3 workers to process multiple images in parallel instantly,
  // preventing BullMQ jobs from blocking each other on a single OCR instance.
  const scheduler = Tesseract.createScheduler();
  const CONCURRENCY = 3;

  (async () => {
    try {
      console.log(`Starting ${CONCURRENCY} Tesseract Workers for parallel processing...`);
      for (let i = 0; i < CONCURRENCY; i++) {
        const worker = await Tesseract.createWorker('eng');
        scheduler.addWorker(worker);
      }
      console.log(`Tesseract Scheduler ready with ${CONCURRENCY} workers!`);
    } catch (err) {
      console.error("Failed to initialize Tesseract workers:", err);
    }
  })();

  // ── Background Worker — concurrency matches the scheduler ──
  new Worker('ocrQueue', async job => {
    const { imagePath, userId, stepId, mimeType } = job.data;
    const user = await User.findById(userId);
    if (!user) return;

    try {
      // ── pHash Duplicate Detection (runs BEFORE OCR to save API calls) ──
      let newPhash = null;
      try {
        newPhash = await generatePHash(imagePath);

        // Collect all pHashes already stored for THIS specific step across ALL users
        const usersWithStep = await User.find(
          { 'submissions.stepId': stepId },
          { 'submissions.$': 1 }
        );
        const storedHashes = usersWithStep
          .flatMap(u => u.submissions)
          .filter(s => s.stepId === stepId && s.phash)
          .map(s => s.phash);

        const { isDuplicate, reason } = checkDuplicate(newPhash, storedHashes);
        if (isDuplicate) {
          user.ocrStatus = 'REJECTED';
          user.ocrFeedback = `❌ ${reason}.`;
          user.rejectionCount = (user.rejectionCount || 0) + 1;
          await user.save();
          if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
          return;
        }
      } catch (hashErr) {
        // Non-fatal: if pHash generation fails, log and continue with OCR
        console.warn('pHash generation failed, skipping duplicate check:', hashErr.message);
      }

      // ── OCR Extraction ──
      const { data: { text: extractedText } } = await scheduler.addJob('recognize', imagePath);
      const minLength = user.currentStep === 7 ? 3 : 5;
      if (!extractedText || extractedText.trim().length < minLength) {
        user.ocrStatus = 'REJECTED';
        user.ocrFeedback = "Could not read any clear text from the screenshot. Please upload a higher quality, legible image.";
        user.rejectionCount = (user.rejectionCount || 0) + 1;
        await user.save();
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        return;
      }

      const rule = VERIFICATION_RULES[user.currentStep];
      const step7Note = user.currentStep === 7 ? '\n\nSPECIAL RULE FOR THIS STEP: The student submitted a VS Code dark-theme code screenshot. OCR on dark themes is unreliable; hyphens, dots, and special characters are often lost. If the OCR text contains ANY of these words (even partially): mongo, require, client, csv, const, async, function, db, col, insert, stream, env, URI, dotenv, ReadStream — respond COMPLETED immediately. Only REJECT if the text is completely empty or entirely unrelated to programming.' : '';

      const prompt = `You are an automated grading assistant for a Senior Data Engineering boot-camp.\nThe student is submitting their proof for Step ${user.currentStep}.\nThe strict requirement to pass this step is: "${rule}"${step7Note}\n\nWe extracted the following text from their uploaded screenshot using an Optical Character Recognition (OCR) script:\n---\n${extractedText}\n---\n\nBased solely on the provided OCR text, did the student satisfy the requirement? \nYou must respond strictly in JSON format. Do not include markdown formatting or extra dialogue. Use this exact schema:\n{"status": "COMPLETED" | "REJECTED", "reason": "A 1-sentence hindi friend like trolling funny supportive explanation of why it was approved or rejected directed at the student."}`;

      // ── Key Rotation: pick pre-built client by index ──
      const now = Date.now();
      if (now - lastRequestTime > 60000) groqRequestCount = 0;
      lastRequestTime = now;
      const currentCycleIndex = Math.floor(groqRequestCount / 25) % groqClients.length;
      const groqDynamicClient = groqClients[currentCycleIndex];
      groqRequestCount++;

      const completion = await groqDynamicClient.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.1-8b-instant",
        response_format: { type: "json_object" }
      });

      const aiResult = JSON.parse(completion.choices[0].message.content);
      if (aiResult.status !== "COMPLETED") {
        user.ocrStatus = 'REJECTED';
        user.ocrFeedback = `AI Rejected: ${aiResult.reason}`;
        user.rejectionCount = (user.rejectionCount || 0) + 1;
        await user.save();
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        return;
      }

      // Read image for MongoDB storage at the point of saving (not in queue payload)
      const imgBuffer = fs.existsSync(imagePath) ? fs.readFileSync(imagePath) : null;
      const base64Image = imgBuffer ? `data:${mimeType || 'image/jpeg'};base64,${imgBuffer.toString('base64')}` : null;

      user.submissions.push({ stepId: user.currentStep, imageData: base64Image, phash: newPhash || null });
      user.currentStep += 1;
      if (user.currentStep > 8 && !user.isCompleted) {
        user.isCompleted = true;
        user.completedAt = new Date();
      }

      user.ocrStatus = 'IDLE';
      user.ocrFeedback = null;
      await user.save();

      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);

    } catch (error) {
      console.error("Worker OCR Error:", error);

      // ── Groq API limit / auth issues — friendly message, NO rejection penalty ──
      const groqStatus = error?.status || error?.error?.status;
      const isRateLimit = groqStatus === 429 || error?.message?.toLowerCase().includes('rate limit');
      const isAuthError = groqStatus === 401 || error?.message?.toLowerCase().includes('invalid api key');

      if (isRateLimit || isAuthError) {
        user.ocrStatus = 'REJECTED';
        user.ocrFeedback = "⚠️ AI API limit is over right now. Please wait a few minutes and try again. If it keeps happening, contact Dhairyashil.";
        // Do NOT increment rejectionCount — this is not the student's fault
        await user.save();
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        return;
      }

      user.ocrStatus = 'REJECTED';
      user.ocrFeedback = "Internal OCR Processing Error. Please try again.";
      user.rejectionCount = (user.rejectionCount || 0) + 1;
      await user.save();
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }
  }, { connection, concurrency: CONCURRENCY });
}

// Database connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected via Mongoose for Tracked Users"))
  .catch(err => console.error("MongoDB connection error:", err));

// Authentication Middleware — validates JWT AND checks session token in DB
const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Verify the session token still matches DB (blocks old sessions from other devices)
    const user = await User.findById(decoded.userId).select('sessionToken');
    if (!user) return res.status(401).json({ error: "User not found" });
    if (user.sessionToken !== decoded.sessionToken) {
      return res.status(401).json({
        error: "SESSION_CONFLICT",
        message: "You have been signed in from another device. Please sign in again."
      });
    }
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Routes
// 1. Google OAuth Verification & Login
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;

    if (!process.env.GOOGLE_CLIENT_ID) {
      console.warn("CRITICAL: GOOGLE_CLIENT_ID is missing from backend/.env ! Authentication will fail.");
      return res.status(500).json({ error: "Server misconfiguration. Please contact the administrator." });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    let user = await User.findOne({ googleId: payload.sub });
    if (!user) {
      user = new User({
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        currentStep: 1
      });
      await user.save();
    }

    // Check for an already-active session on a different device
    if (user.sessionToken) {
      return res.status(409).json({
        error: "ALREADY_LOGGED_IN",
        message: `${user.officialName || user.name} (${user.rollNumber || user.email}) is already logged in from another browser or device. Please sign out there first before logging in here.`
      });
    }

    // Generate a unique session token and embed it in the JWT
    const crypto = require('crypto');
    const newSessionToken = crypto.randomBytes(32).toString('hex');
    user.sessionToken = newSessionToken;
    await user.save();

    const jwtToken = jwt.sign(
      { userId: user._id, sessionToken: newSessionToken },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token: jwtToken, user });

  } catch (error) {
    console.error("Auth Error:", error);
    res.status(400).json({ error: "Invalid Google Token" });
  }
});

// 1b. Logout — clears the session token so the student can log in from another device
app.post('/api/auth/logout', requireAuth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.userId, { sessionToken: null });
    res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed.' });
  }
});

// 2. Fetch User Progress
app.get('/api/progress', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    res.json({
      currentStep: user.currentStep,
      submissions: user.submissions,
      isCompleted: user.isCompleted,
      completedAt: user.completedAt,
      name: user.name,
      email: user.email,
      rollNumber: user.rollNumber,
      officialName: user.officialName,
      ocrStatus: user.ocrStatus,
      ocrFeedback: user.ocrFeedback,
      rejectionCount: user.rejectionCount || 0
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch progress" });
  }
});

// 3. Save Roll Number (first-time setup)
app.patch('/api/profile/roll', requireAuth, async (req, res) => {
  try {
    const { rollNumber, officialName } = req.body;
    if (!rollNumber) return res.status(400).json({ error: 'Roll number is required.' });

    const clean = rollNumber.toUpperCase();

    // Check if this roll number is already claimed by ANOTHER account
    const existing = await User.findOne({ rollNumber: clean });
    if (existing && existing._id.toString() !== req.userId) {
      return res.status(409).json({
        error: `Roll number ${clean} is already registered to another Google account. Each roll number can only be linked to one account.`
      });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { rollNumber: clean, officialName: officialName || null },
      { new: true }
    );
    res.json({ message: 'Roll number saved.', rollNumber: user.rollNumber, officialName: user.officialName });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save roll number.' });
  }
});

// 4. Submit Step Screenshot Verification (Queues automatically)
app.post('/api/progress/submit', requireAuth, upload.single('screenshot'), async (req, res) => {
  try {
    const { stepId } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "A screenshot proof is required." });
    }

    if (!ocrQueue) {
      // Cleanup the file if BullMQ is missing
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(500).json({ error: "Architecture Missing: Add REDIS_URL to backend/.env and install bullmq/ioredis to enable background processing." });
    }

    if (!groq) {
      return res.status(500).json({ error: "Missing GROQ_API_KEY in backend/.env. AI Verification is paused." });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // LOCK: Prevent resubmission if the course is already completed
    if (user.isCompleted) {
      return res.status(403).json({ error: `This course has already been completed by ${user.rollNumber || 'your account'}. No further submissions are accepted.` });
    }

    // Validate step alignment (ensure they don't skip steps)
    if (parseInt(stepId) !== user.currentStep) {
      return res.status(400).json({ error: `You must submit step ${user.currentStep}` });
    }

    // Mark user as processing
    user.ocrStatus = 'PROCESSING';
    user.ocrFeedback = null;
    await user.save();

    // Add to Redis Queue with only essential metadata (no binary blob in Redis)
    await ocrQueue.add('processOCR', {
      imagePath: req.file.path,
      userId: req.userId,
      stepId: parseInt(stepId),
      mimeType: req.file.mimetype
    });

    res.json({ message: "Processing started", status: "PROCESSING" });

  } catch (error) {
    console.error("Submission Error:", error);
    res.status(500).json({ error: "Failed to queue screenshot submission" });
  }
});

// 5. Leaderboard — race standings for all enrolled students
app.get('/api/leaderboard', requireAuth, async (req, res) => {
  try {
    const users = await User.find(
      { rollNumber: { $exists: true, $ne: null } },
      'name officialName rollNumber currentStep isCompleted completedAt rejectionCount picture createdAt'
    );

    const MAX_SCORE = 800; // 8 steps × 100

    const validUsers = users.filter(u => !u.rollNumber?.startsWith('ADMIN_'));

    const ranked = validUsers
      .map(u => {
        const steps = Math.max(0, (u.currentStep || 1) - 1); // completed steps = currentStep - 1
        const rejections = u.rejectionCount || 0;
        const netScore = steps * 100 - rejections * 25;
        const scorePercent = Math.max(0, Math.round((netScore / MAX_SCORE) * 100));
        return {
          name: u.officialName || u.name,   // prefer real name entered at roll number setup
          rollNumber: u.rollNumber,
          currentStep: u.currentStep,
          isCompleted: u.isCompleted,
          completedAt: u.completedAt,
          createdAt: u.createdAt,
          picture: u.picture,
          rejectionCount: rejections,
          netScore,
          scorePercent
        };
      })
      .sort((a, b) => {
        if (b.netScore !== a.netScore) return b.netScore - a.netScore; // higher score first
        return a.rejectionCount - b.rejectionCount;                    // fewer rejections wins tie
      });

    res.json(ranked);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// 6. Admin Authentication Middleware
const requireAdmin = async (req, res, next) => {
  await requireAuth(req, res, async () => {
    try {
      const user = await User.findById(req.userId);
      if (!user || (user.rollNumber !== 'ADMIN_7755' && user.rollNumber !== 'ADMIN__6715')) {
        return res.status(403).json({ error: 'Admin access required' });
      }
      next();
    } catch (err) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
};

// 7. Admin Dashboard Data
app.get('/api/admin/dashboard', requireAdmin, async (req, res) => {
  try {
    const users = await User.find(
      { rollNumber: { $exists: true, $ne: null } },
      'name email picture officialName rollNumber currentStep ocrStatus ocrFeedback isCompleted completedAt rejectionCount submissions'
    ).sort({ currentStep: -1 });

    const stats = {
      totalStudents: users.filter(u => !u.rollNumber.startsWith('ADMIN_')).length,
      completedStudents: users.filter(u => u.isCompleted && !u.rollNumber.startsWith('ADMIN_')).length,
    };

    res.json({ stats, users });
  } catch (error) {
    console.error('Admin Dashboard Error:', error);
    res.status(500).json({ error: 'Failed to fetch admin dashboard data' });
  }
});

// 8. WebSocket for Live Camera
const userSockets = new Map(); // Map rollNumber/userId -> socketId

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // When a user logs in, they register their socket
  socket.on('register', (data) => {
    // data should contain { userId, rollNumber }
    if (data.userId) {
      userSockets.set(data.userId, socket.id);
      socket.userId = data.userId; // attach to socket for cleanup
      console.log(`User registered socket: ${data.userId} -> ${socket.id}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (socket.userId) {
      userSockets.delete(socket.userId);
    }
  });

  // ------- Signaling for WebRTC -------
  
  // Admin requests camera from a student
  socket.on('camera_request', (data) => {
    // data = { targetUserId, adminId }
    const targetSocket = userSockets.get(data.targetUserId);
    if (targetSocket) {
      io.to(targetSocket).emit('camera_request', { adminSocketId: socket.id, adminId: data.adminId });
    } else {
      socket.emit('camera_error', { message: 'Student is not currently online.' });
    }
  });

  // Student responds (allow/deny)
  socket.on('camera_response', (data) => {
    // data = { adminSocketId, accepted, reason }
    io.to(data.adminSocketId).emit('camera_response', { 
      studentSocketId: socket.id, 
      studentId: socket.userId,
      accepted: data.accepted,
      reason: data.reason
    });
  });

  // WebRTC Offers, Answers, ICE Candidates
  socket.on('webrtc_offer', (data) => {
    // data = { targetSocketId, offer }
    io.to(data.targetSocketId).emit('webrtc_offer', {
      senderSocketId: socket.id,
      offer: data.offer
    });
  });

  socket.on('webrtc_answer', (data) => {
    // data = { targetSocketId, answer }
    io.to(data.targetSocketId).emit('webrtc_answer', {
      senderSocketId: socket.id,
      answer: data.answer
    });
  });

  socket.on('webrtc_ice_candidate', (data) => {
    // data = { targetSocketId, candidate }
    io.to(data.targetSocketId).emit('webrtc_ice_candidate', {
      senderSocketId: socket.id,
      candidate: data.candidate
    });
  });
  
  // Stop camera signaling
  socket.on('camera_stop', (data) => {
    if (data.targetSocketId) {
      io.to(data.targetSocketId).emit('camera_stop', { senderSocketId: socket.id });
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});