# Biometric-Based Access Control for EVMs using Blockchain

## 📌 Project Overview

This project is a secure Electronic Voting Machine (EVM) system that integrates **biometric authentication** and **blockchain technology** to ensure transparency, integrity, and security in voting.

It prevents unauthorised access, eliminates duplicate voting, and ensures tamper-proof vote storage.

---

## 🚀 Features

* 🔐 Secure Admin Login (Encrypted Credentials)
* 🧑‍💻 Biometric Authentication for Voters
* 🗳️ One Person One Vote System
* ⛓️ Blockchain-based Vote Storage
* 📊 Real-time Vote Counting
* 🛡️ Protection against Data Tampering
* ☁️ MongoDB Database Integration

## 🏗️ Tech Stack

* **Frontend:** HTML, CSS, JavaScript
* **Backend:** Python (Flask)
* **Database:** MongoDB
* **Security:** AES Encryption
* **Version Control:** Git & GitHub

---

## 📂 Project Structure

```
├── static/
│   ├── css/
│   ├── js/
│
├── templates/
│   ├── login.html
│   ├── admin.html
│   ├── voter.html
│
├── app.py
├── blockchain.py
├── requirements.txt
├── README.md
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
```

### 2️⃣ Install Dependencies

```bash
pip install -r requirements.txt
```

### 3️⃣ Configure MongoDB

* Create a MongoDB Atlas cluster
* Replace your connection string in `app.py`

### 4️⃣ Run the Application

```bash
python app.py
```

## 🔐 Security Implementation

* Admin credentials are encrypted using AES
* Sensitive voter data can be encrypted before storing in MongoDB
* Blockchain ensures votes cannot be modified once recorded

## 👨‍💻 Team Members

* Shashank K
* Anjan Kumar M

---

## 📈 Future Enhancements

* Face Recognition Integration
* Multi-admin Support
* Mobile App Version
* Advanced Blockchain Consensus Mechanism

## 📜 License

This project is for educational purposes.

## 🙌 Acknowledgements

* Open-source community
* Blockchain and cybersecurity research references
