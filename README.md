# SecureVote — Biometric Voting System

SecureVote is a student project demonstrating an election portal with voter sign-in, constituency-based ballots, image-based fingerprint verification, and an administrator dashboard.

> **Project/demo use only.** This application is not certified or suitable for conducting a real public election. The image-matching approach and the rest of the system have not been independently audited for security, accessibility, or election integrity.

## Features

- Voter and administrator sign-in
- Election schedule and open/closed status
- Candidate selection based on constituency
- Fingerprint image upload and verification before vote submission
- Prevention of a second vote by the same voter
- Administrator election settings, constituency results, and reports
- MongoDB storage for voters, administrators, candidates, votes, and election settings
- Flask API and static web pages, deployable on Vercel

## Technology

- Python and Flask
- MongoDB with PyMongo
- HTML, CSS, and JavaScript
- OpenCV, NumPy, Pillow, and scikit-image for fingerprint image processing
- Vercel deployment configuration

## Run locally

1. Install Python and make sure `pip` is available.
2. Clone this repository and open a terminal in its root folder.
3. Create and activate a virtual environment, then install the Python packages:

   ```bash
   python -m venv .venv
   # Windows PowerShell:
   .venv\Scripts\Activate.ps1
   # macOS/Linux:
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

4. Set the MongoDB connection string and Flask session secret in your terminal. For Windows PowerShell:

   ```text
   $env:MONGO_URI="your_mongodb_connection_string"
   $env:FLASK_SECRET_KEY="your_long_random_secret"
   ```

   Use the equivalent environment-variable syntax for your terminal if you are not using PowerShell. Never commit database credentials or secret keys.

5. Start the app:

   ```bash
   python app.py
   ```

   Then open `http://127.0.0.1:5000` in your browser. MongoDB must be reachable and its network access rules must allow your computer to connect.

## Deploy on Vercel

1. Import the GitHub repository into Vercel.
2. In the Vercel project settings, add `MONGO_URI` and `FLASK_SECRET_KEY` under **Environment Variables**. Use secret values and select the environments you deploy to.
3. Redeploy after changing environment variables.

The repository includes `vercel.json` to configure the Flask function and include the static frontend files.

## Project layout

```text
app.py                         Flask routes and API
db.py                          MongoDB connection and collections
fingerprint_pipeline.py        Fingerprint image preprocessing
fingerprint_matcher.py         Fingerprint comparison
evm_voting_system/public/      HTML, CSS, JavaScript, and frontend data
vercel.json                    Vercel deployment configuration
requirements.txt               Python dependencies
```

## One-click demo access

The sign-in page can show **Try voter experience** and **Try admin dashboard** buttons when the optional demo mode is enabled. These buttons do not expose or hard-code account passwords.

To enable the demo, set this Vercel environment variable:

```text
ENABLE_DEMO_MODE=true
```

Then redeploy. The app creates fictional sample records in a separate MongoDB database named `evm_voting_demo_db`; the normal election collections stay in `evm_voting_db`. The MongoDB account in `MONGO_URI` must be allowed to read and write that demo database. Demo voter sessions use generated sample accounts, demo votes remain in that database, and fingerprint verification is clearly labeled as simulated. Turn the feature off by removing the variable or setting it to `false`, then redeploy.

## Fingerprint verification note

Voters upload a fingerprint image. The server processes it and compares its extracted representation with the fingerprint record associated with that voter. This is an educational demonstration, not a substitute for certified biometric hardware or a professionally validated identity-verification system. Use only fingerprint data you have permission to process, and avoid publishing real biometric images or records.


