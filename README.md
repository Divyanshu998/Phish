# 🕷️ PhishGuard AI

### Intelligent Phishing Detection & Threat Analysis Platform

> **PhishGuard AI helps users identify suspicious websites before they
> become victims of phishing attacks.**

PhishGuard AI combines an **AI/ML URL detection engine**, cybersecurity
rules, a browser extension, and a real-time security dashboard into one
platform.

------------------------------------------------------------------------

## 🚨 The Problem

Phishing websites are designed to look legitimate and trick users into
sharing passwords, banking information, or personal data.

The challenge is simple:

**A user may not know that a website is dangerous until it is too
late.**

------------------------------------------------------------------------

## 🛡️ The Solution

PhishGuard AI analyzes website URLs and converts complex security
signals into a simple risk assessment.

``` text
Website URL
     ↓
AI/ML Analysis
     +
Security Rules
     +
Threat Intelligence
     ↓
Risk Score
     ↓
SAFE / SUSPICIOUS / HIGH RISK / CRITICAL
```

------------------------------------------------------------------------

## ✨ Key Features

  -----------------------------------------------------------------------
  Feature                             Purpose
  ----------------------------------- -----------------------------------
  🤖 AI Detection                     Classifies suspicious URLs using a
                                      trained ML model

  🔍 URL Scanner                      Lets users manually analyze a
                                      website

  🕷️ Browser Extension                Checks websites directly from
                                      Chrome/Edge

  ⚡ Real-Time Protection             Detects threats during browsing

  📊 Risk Score                       Provides an easy 0--100 security
                                      score

  🛡️ Threat Analysis                  Explains suspicious URL
                                      characteristics

  📈 Security Dashboard               Displays scans and threat activity

  🔔 Real-Time Alerts                 Shows important security
                                      notifications

  📧 Email Alerts                     Alerts users about
                                      high-risk/critical threats

  🔐 Secure Authentication            Login, signup and protected user
                                      accounts

  ✉️ Email Verification               Verifies newly registered users

  📋 Scan History                     Stores previous security checks
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 🎯 Risk Levels

  ------------------------------------------------------------------------
                         Score Status                Meaning
  ---------------------------- --------------------- ---------------------
                        `0–30` 🟢 **SAFE**           No major warning
                                                     signs detected

                       `31–60` 🟡 **SUSPICIOUS**     Some unusual
                                                     characteristics
                                                     detected

                       `61–80` 🟠 **HIGH RISK**      Strong indicators of
                                                     a potentially
                                                     dangerous website

                      `81–100` 🔴 **CRITICAL**       Highly suspicious /
                                                     likely malicious
  ------------------------------------------------------------------------

> A risk score is an automated security assessment, not a guarantee that
> a website is safe or malicious.

------------------------------------------------------------------------

## 🧠 How the AI Works

The ML system is trained on a large collection of labeled URLs.

The model treats URLs as text and learns patterns such as:

-   URL length and complexity
-   Domain structure
-   Number of subdomains
-   Suspicious words
-   Special characters
-   IP-based URLs
-   HTTPS usage
-   Character-level patterns

The final decision combines:

``` text
AI/ML Prediction
       +
Heuristic Security Analysis
       +
Optional Threat Intelligence
       ↓
Final Risk Score
```

The model is trained with **PyTorch and NVIDIA GPU acceleration** and is
then loaded by the backend for inference.

------------------------------------------------------------------------

## 🕷️ Browser Extension

The extension connects to the same PhishGuard backend used by the
dashboard.

``` text
User opens website
        ↓
Extension gets current URL
        ↓
PhishGuard API
        ↓
AI + Security Analysis
        ↓
Risk Result
        ↓
Browser Alert
```

The extension is designed with privacy in mind:

-   No password collection
-   No cookie collection
-   No keystroke monitoring
-   No unnecessary browsing-history collection
-   Only the information needed for URL security analysis is processed

------------------------------------------------------------------------

## 🔔 Real-Time Alerts

When a high-risk or critical website is detected:

``` text
               Threat Detected
                     │
          ┌──────────┼──────────┐
          ↓          ↓          ↓
      Extension   Dashboard    Email
        Alert       Alert       Alert
```

Critical threats can trigger a prominent browser notification and an
email alert when enabled by the user.

------------------------------------------------------------------------

## 🔐 Authentication

PhishGuard includes a real authentication system.

Users can:

-   Create an account
-   Verify their email
-   Sign in
-   Reset their password
-   Manage security-alert preferences
-   View their own scan activity

Passwords are securely hashed and are never stored as plaintext.

------------------------------------------------------------------------

## 🎨 User Interface

The platform uses a professional **Spider/Web-inspired cybersecurity
identity** using:

-   Black
-   Red
-   Deep blue
-   Web/network geometry
-   Security shield elements
-   Subtle animations
-   SOC-style analytics

The design uses original branding rather than official copyrighted
superhero artwork.

------------------------------------------------------------------------

## 🏗️ System Architecture

``` text
                         PHISHGUARD AI
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
         Web Dashboard    Browser Extension   Login
              │               │               │
              └───────────────┼───────────────┘
                              ▼
                         FastAPI Backend
                              │
                 ┌────────────┼────────────┐
                 │            │            │
                 ▼            ▼            ▼
              ML Model    Security Rules  Threat Intel
                 │            │            │
                 └────────────┼────────────┘
                              ▼
                         Risk Scoring
                              │
                              ▼
                           MongoDB
                              │
                  ┌───────────┼───────────┐
                  ▼           ▼           ▼
              Dashboard    Alerts       Email
```

------------------------------------------------------------------------

## 🧰 Technology Stack

**Frontend** - React - Vite - TypeScript - Tailwind CSS - Framer
Motion - Recharts

**Backend** - Python - FastAPI - Pydantic

**AI/ML** - PyTorch - Character-level URL modeling - NVIDIA
GPU-accelerated training

**Database** - MongoDB

**Browser** - Chrome/Edge Extension - Manifest V3

**Security** - URL feature analysis - Heuristic detection - Risk
scoring - Threat intelligence integration - Secure authentication

------------------------------------------------------------------------

## 📁 Project Structure

``` text
phishguard-ai/
│
├── frontend/       # Web dashboard
├── backend/        # API, authentication & security engine
├── ml/             # Model training & inference
├── extension/      # Chrome/Edge browser extension
│
├── .env.example    # Safe configuration template
├── .gitignore      # Protects secrets and local files
└── README.md       # Project documentation
```

------------------------------------------------------------------------

## 🚀 Running Locally

### 1. Start MongoDB

Make sure MongoDB is running locally.

### 2. Start the Backend

``` bash
cd backend

python -m venv venv
source venv/bin/activate

pip install -r requirements.txt

uvicorn app.main:app --reload
```

### 3. Start the Frontend

``` bash
cd frontend

npm install
npm run dev
```

### 4. Open the Dashboard

Open the local address shown by Vite, normally:

``` text
http://localhost:5173
```

### 5. Build the Browser Extension

``` bash
cd extension

npm install
npm run build
```

Then open Chrome/Edge Extensions, enable **Developer Mode**, and load
the generated extension directory.

------------------------------------------------------------------------

## ⚙️ Configuration

Create a local `.env` file using `.env.example`.

Typical configuration includes:

-   MongoDB connection
-   Database name
-   Authentication secret
-   SMTP configuration
-   Application URL
-   CORS settings
-   Optional threat-intelligence API keys

**Never commit `.env` or real passwords/API keys to GitHub.**

------------------------------------------------------------------------

## 🧪 Example Security Flow

``` text
1. User visits a suspicious website
              ↓
2. Browser extension detects the URL
              ↓
3. URL is sent to PhishGuard
              ↓
4. ML model analyzes the URL
              ↓
5. Security rules check suspicious patterns
              ↓
6. Risk score is calculated
              ↓
7. User receives a warning
              ↓
8. Threat is stored for analysis
              ↓
9. High/Critical alert can trigger email
```

------------------------------------------------------------------------

## 👥 Who Can Use PhishGuard AI?

**Everyday Users**\
Quickly understand whether a website looks suspicious.

**Organizations**\
Monitor phishing-related activity and security events.

**Security Students**\
Learn how machine learning and cybersecurity can work together.

**Security Analysts**\
Review scan history, threats and security activity.

------------------------------------------------------------------------

## 🔒 Privacy & Safety

PhishGuard is designed as a defensive cybersecurity tool.

It does **not**:

-   Collect passwords
-   Steal cookies
-   Monitor keystrokes
-   Execute malware
-   Exploit websites
-   Automatically submit credentials
-   Intentionally collect unnecessary private data

URLs are treated as untrusted data for analysis.

------------------------------------------------------------------------

## ⚠️ Limitations

No automated phishing detector is perfect.

A website can be:

-   incorrectly classified as safe
-   incorrectly classified as suspicious
-   newly created and not represented in the training data
-   changed after the scan

Therefore:

> **PhishGuard AI should be treated as a security assistant, not an
> absolute guarantee of website safety.**

Users should continue following normal cybersecurity best practices.

------------------------------------------------------------------------

## 🔮 Future Enhancements

-   Advanced threat-intelligence integrations
-   Organization-wide monitoring
-   Improved ML models
-   Mobile application
-   Multi-user organization accounts
-   Advanced security reports
-   Domain reputation analysis
-   Additional browser support
-   Enterprise alert management

------------------------------------------------------------------------

## 🎓 Project Purpose

PhishGuard AI is a **cybersecurity-focused academic project**
demonstrating how:

``` text
Artificial Intelligence
        +
Cybersecurity
        +
Browser Protection
        +
Real-Time Monitoring
        +
Secure Authentication
```

can be combined into a practical security platform.

------------------------------------------------------------------------

## 🕷️ PhishGuard AI

### Detect. Analyze. Protect.

**Intelligent Phishing Detection & Threat Analysis**
