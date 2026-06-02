const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'claim-management-app-super-secret-key-12345';

app.use(cors());
app.use(express.json());

// Paths to JSON storage
const usersPath = path.join(__dirname, 'data', 'users.json');
const claimsPath = path.join(__dirname, 'data', 'claims.json');

// Ensure data folder exists
const ensureDataFolder = () => {
  const dir = path.join(__dirname, 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Seed Users if not present
const seedUsers = () => {
  ensureDataFolder();
  if (!fs.existsSync(usersPath) || fs.readFileSync(usersPath, 'utf8').trim() === '') {
    const defaultUsers = [
      {
        id: 1,
        username: 'admin',
        password: bcrypt.hashSync('password123', 10),
        name: 'Administrator',
        role: 'Admin'
      }
    ];
    fs.writeFileSync(usersPath, JSON.stringify(defaultUsers, null, 2));
    console.log('Seeded default admin user');
  }
};

// Seed Claims if not present
const seedClaims = () => {
  ensureDataFolder();
  if (!fs.existsSync(claimsPath) || fs.readFileSync(claimsPath, 'utf8').trim() === '') {
    const defaultClaims = [
      {
        id: 'CLM-1001',
        accountNumber: 'LN987654321',
        borrowerName: 'John Doe',
        loanAmount: 250000,
        outstandingAmount: 210000,
        interestRate: 8.5,
        dpd: 125,
        lastPaymentDate: '2026-01-20',
        npaStatus: true,
        npaCategory: 'Substandard',
        status: 'Pending Review',
        aiRecommendation: 'Approve',
        aiConfidence: 92,
        justification: 'Loan is overdue by 125 days (NPA status confirmed). Outstanding balance is 84% of the original loan. Recommend filing for collateral guarantee recovery.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    fs.writeFileSync(claimsPath, JSON.stringify(defaultClaims, null, 2));
    console.log('Seeded default claim');
  }
};

// Helper methods to read/write files safely
const readJsonFile = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading file ${filePath}:`, err);
    return [];
  }
};

const writeJsonFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error(`Error writing file ${filePath}:`, err);
    return false;
  }
};

// Seed initial databases
seedUsers();
seedClaims();

// Middleware: Verify JWT
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Access denied. No token provided.' });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
    req.user = user;
    next();
  });
};

// NPA evaluation rule engine function
const evaluateClaimLogic = (loanData) => {
  const dpd = parseInt(loanData.dpd) || 0;
  const outstandingAmount = parseFloat(loanData.outstandingAmount) || 0;
  
  const npaStatus = dpd > 90;
  let npaCategory = 'Standard';
  let aiRecommendation = 'Reject';
  let aiConfidence = 95;
  let justification = '';

  if (npaStatus) {
    if (dpd > 360) {
      npaCategory = 'Loss';
      aiRecommendation = 'Approve';
      aiConfidence = 99;
      justification = `Account is non-performing for over 360 days (classified as Loss Asset). Immediate claim approval is recommended for total outstanding amount of $${outstandingAmount.toLocaleString()}.`;
    } else if (dpd > 180) {
      npaCategory = 'Doubtful';
      aiRecommendation = 'Approve';
      aiConfidence = 95;
      justification = `Account is non-performing for over 180 days (classified as Doubtful Asset). Claim approval recommended due to prolonged default.`;
    } else {
      npaCategory = 'Substandard';
      aiRecommendation = 'Manual Review';
      aiConfidence = 85;
      justification = `Account is overdue by ${dpd} days (classified as Substandard Asset). Recommended for manual claim review to determine recovery options.`;
    }
  } else {
    npaCategory = 'Standard';
    aiRecommendation = 'Reject';
    aiConfidence = 98;
    justification = `Account is overdue by only ${dpd} days, which is within the standard asset threshold (<= 90 days). Claim cannot be recommended for approval.`;
  }

  return {
    npaStatus,
    npaCategory,
    aiRecommendation,
    aiConfidence,
    justification
  };
};

// Route: Auth Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const users = readJsonFile(usersPath);
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    }
  });
});

// Route: Auth Current User
app.get('/api/auth/me', authenticateJWT, (req, res) => {
  res.json({ user: req.user });
});

// Route: Evaluate Claim details without saving
app.post('/api/claims/evaluate', authenticateJWT, (req, res) => {
  const loanData = req.body;
  const evaluation = evaluateClaimLogic(loanData);
  res.json(evaluation);
});

// Route: Get all Claims
app.get('/api/claims', authenticateJWT, (req, res) => {
  const claims = readJsonFile(claimsPath);
  res.json(claims);
});

// Route: Get Claim by ID
app.get('/api/claims/:id', authenticateJWT, (req, res) => {
  const claims = readJsonFile(claimsPath);
  const claim = claims.find(c => c.id === req.params.id);
  if (!claim) return res.status(404).json({ error: 'Claim not found' });
  res.json(claim);
});

// Route: Create Claim
app.post('/api/claims', authenticateJWT, (req, res) => {
  const loanData = req.body;
  
  if (!loanData.accountNumber || !loanData.borrowerName || !loanData.loanAmount || !loanData.outstandingAmount) {
    return res.status(400).json({ error: 'Missing required loan information.' });
  }

  const claims = readJsonFile(claimsPath);
  
  // Calculate evaluation on the fly if not provided or to ensure integrity
  const evaluation = evaluateClaimLogic(loanData);
  
  // Generate claim ID
  const nextIdNum = claims.reduce((max, c) => {
    const num = parseInt(c.id.split('-')[1]);
    return num > max ? num : max;
  }, 1000) + 1;
  
  const newClaim = {
    id: `CLM-${nextIdNum}`,
    accountNumber: loanData.accountNumber,
    borrowerName: loanData.borrowerName,
    loanAmount: parseFloat(loanData.loanAmount),
    outstandingAmount: parseFloat(loanData.outstandingAmount),
    interestRate: parseFloat(loanData.interestRate) || 0,
    dpd: parseInt(loanData.dpd) || 0,
    lastPaymentDate: loanData.lastPaymentDate || '',
    npaStatus: evaluation.npaStatus,
    npaCategory: evaluation.npaCategory,
    status: 'Pending Review',
    aiRecommendation: loanData.aiRecommendation || evaluation.aiRecommendation,
    aiConfidence: evaluation.aiConfidence,
    justification: loanData.justification || evaluation.justification,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  claims.push(newClaim);
  if (writeJsonFile(claimsPath, claims)) {
    res.status(201).json(newClaim);
  } else {
    res.status(500).json({ error: 'Failed to write claim data' });
  }
});

// Route: Update Claim Details / Template
app.put('/api/claims/:id', authenticateJWT, (req, res) => {
  const claims = readJsonFile(claimsPath);
  const index = claims.findIndex(c => c.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Claim not found' });
  }

  const updatedClaim = {
    ...claims[index],
    ...req.body,
    updatedAt: new Date().toISOString()
  };

  claims[index] = updatedClaim;
  if (writeJsonFile(claimsPath, claims)) {
    res.json(updatedClaim);
  } else {
    res.status(500).json({ error: 'Failed to update claim data' });
  }
});

// Route: Generate Downloadable PDF Claim Letter
app.get('/api/claims/:id/pdf', (req, res) => {
  const claims = readJsonFile(claimsPath);
  const claim = claims.find(c => c.id === req.params.id);
  
  if (!claim) {
    return res.status(404).json({ error: 'Claim not found' });
  }

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  
  // Set headers for download
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=Claim_Letter_${claim.id}.pdf`);
  
  doc.pipe(res);

  // Styling properties
  const primaryColor = '#1e3a8a'; // dark blue
  const accentColor = '#3b82f6'; // light blue
  const darkTextColor = '#1f2937'; // dark grey
  
  // Header Logo / Info
  doc.rect(0, 0, 595.28, 15).fill(primaryColor);
  doc.moveDown(2);
  
  doc.fillColor(primaryColor).fontSize(22).font('Helvetica-Bold').text('CLAIM ASSESSMENT REPORT', { align: 'center' });
  doc.fillColor(darkTextColor).fontSize(9).font('Helvetica').text('Automated Claim Management AI System', { align: 'center' });
  
  doc.moveDown(1.5);
  doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, doc.y).lineTo(545.28, doc.y).stroke();
  doc.moveDown(1.5);

  // Meta details (Claim ID and Date)
  const metaY = doc.y;
  doc.fontSize(10).font('Helvetica-Bold').text(`Claim ID: ${claim.id}`, 50, metaY);
  doc.font('Helvetica').text(`Current Status: ${claim.status.toUpperCase()}`, 50, metaY + 15);
  
  doc.font('Helvetica-Bold').text(`Generated Date: ${new Date(claim.createdAt).toLocaleDateString()}`, 350, metaY);
  doc.font('Helvetica').text(`Last Updated: ${new Date(claim.updatedAt).toLocaleDateString()}`, 350, metaY + 15);
  
  doc.moveDown(2.5);

  // Section 1: Borrower Information
  doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text('1. Borrower & Account Details');
  doc.strokeColor(accentColor).lineWidth(1.5).moveTo(50, doc.y + 2).lineTo(250, doc.y + 2).stroke();
  doc.moveDown(0.8);
  
  doc.fillColor(darkTextColor).fontSize(10).font('Helvetica');
  
  const detailsY = doc.y;
  doc.font('Helvetica-Bold').text('Borrower Name:', 60, detailsY);
  doc.font('Helvetica').text(claim.borrowerName, 170, detailsY);
  
  doc.font('Helvetica-Bold').text('Account Number:', 60, detailsY + 15);
  doc.font('Helvetica').text(claim.accountNumber, 170, detailsY + 15);
  
  doc.font('Helvetica-Bold').text('Loan Amount:', 320, detailsY);
  doc.font('Helvetica').text(`$${claim.loanAmount.toLocaleString()}`, 450, detailsY);
  
  doc.font('Helvetica-Bold').text('Outstanding Bal:', 320, detailsY + 15);
  doc.font('Helvetica').text(`$${claim.outstandingAmount.toLocaleString()}`, 450, detailsY + 15);
  
  doc.font('Helvetica-Bold').text('Interest Rate:', 60, detailsY + 30);
  doc.font('Helvetica').text(`${claim.interestRate}% per annum`, 170, detailsY + 30);

  doc.moveDown(3);

  // Section 2: NPA Evaluation Details
  doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text('2. NPA Assessment');
  doc.strokeColor(accentColor).lineWidth(1.5).moveTo(50, doc.y + 2).lineTo(200, doc.y + 2).stroke();
  doc.moveDown(0.8);
  
  doc.fillColor(darkTextColor).fontSize(10);
  const npaY = doc.y;
  doc.font('Helvetica-Bold').text('Days Past Due (DPD):', 60, npaY);
  doc.font('Helvetica').text(`${claim.dpd} days`, 170, npaY);
  
  doc.font('Helvetica-Bold').text('Last Payment Date:', 60, npaY + 15);
  doc.font('Helvetica').text(claim.lastPaymentDate || 'N/A', 170, npaY + 15);

  doc.font('Helvetica-Bold').text('NPA Status:', 320, npaY);
  doc.font('Helvetica-Bold').fillColor(claim.npaStatus ? '#dc2626' : '#16a34a').text(claim.npaStatus ? 'YES (Non-Performing)' : 'NO (Standard)', 450, npaY);
  
  doc.fillColor(darkTextColor).font('Helvetica-Bold').text('NPA Classification:', 320, npaY + 15);
  doc.font('Helvetica').text(claim.npaCategory, 450, npaY + 15);

  doc.moveDown(3);

  // Section 3: Recommendation Details
  doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text('3. Claim Recommendation');
  doc.strokeColor(accentColor).lineWidth(1.5).moveTo(50, doc.y + 2).lineTo(230, doc.y + 2).stroke();
  doc.moveDown(0.8);

  // Shaded Box for recommendation
  const recBoxY = doc.y;
  doc.rect(50, recBoxY, 495.28, 90).fill('#f3f4f6');
  
  doc.fillColor(darkTextColor).fontSize(10);
  doc.font('Helvetica-Bold').text('AI Recommendation Decision:', 65, recBoxY + 12);
  
  let recColor = '#3b82f6'; // manual review (blue)
  if (claim.aiRecommendation === 'Approve') recColor = '#16a34a'; // green
  if (claim.aiRecommendation === 'Reject') recColor = '#dc2626'; // red
  
  doc.font('Helvetica-Bold').fillColor(recColor).fontSize(12).text(claim.aiRecommendation.toUpperCase(), 230, recBoxY + 11);
  
  doc.fillColor(darkTextColor).fontSize(10).font('Helvetica-Bold').text('AI Confidence Index:', 350, recBoxY + 12);
  doc.font('Helvetica').text(`${claim.aiConfidence}%`, 460, recBoxY + 12);
  
  doc.font('Helvetica-Bold').text('Justification Report:', 65, recBoxY + 35);
  doc.font('Helvetica').fontSize(9).text(claim.justification || 'No justification provided.', 65, recBoxY + 50, { width: 460 });

  doc.moveDown(7.5);

  // Signature Block
  const sigY = doc.y;
  doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, sigY).lineTo(545.28, sigY).stroke();
  doc.moveDown(2);
  
  const signatureLineY = doc.y + 40;
  doc.fontSize(9).font('Helvetica');
  doc.text('Prepared By: System AI Audit Engine', 50, signatureLineY);
  doc.text('Date: ' + new Date().toLocaleDateString(), 50, signatureLineY + 15);
  
  doc.text('Authorized Approver: ________________________', 300, signatureLineY);
  doc.text('Designation: ________________________', 300, signatureLineY + 15);
  doc.text('Signature: ________________________', 300, signatureLineY + 30);
  
  // Footer
  doc.fontSize(8).fillColor('#9ca3af').text('Confidential - Claims Management Internal System Document', 50, 770, { align: 'center' });

  doc.end();
});

// Serve frontend static assets in production (Render single service deployment)
if (process.env.NODE_ENV === 'production' || process.env.RENDER === 'true') {
  const distPath = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(distPath));
  
  // Any request that doesn't match API endpoints should serve index.html
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});
