#  MilkRoute – Smart Dairy Collection System

MilkRoute is a full-stack web application designed to optimize dairy milk collection.
It helps manage farmers, track daily milk records, and calculate the most efficient routes between farmer locations.

---

## 🚀 Features

### 📍 Farmer Management

* Add, edit, and delete farmers
* Store farmer details (name, phone, location)
* Display farmers as markers on the map

### 🗺️ Route Optimization

* Select multiple farmers
* Calculate shortest route between locations
* Optimize route using TSP (Nearest Neighbor + 2-opt)
* Show distance and estimated time

### 🥛 Milk Management

* Add daily milk collection records
* Track milk per farmer
* View historical milk data

### 📊 Dashboard & Analytics

* Total milk collected
* Route distance and time
* Per-farmer insights
* Data visualization (charts)

### 🔍 Search & UI

* Search farmers easily
* Clean and modern dashboard UI
* Interactive map using Leaflet


### GPS live tracking
---

## 🛠️ Tech Stack

### Frontend

* React (Vite)
* Leaflet (Maps)
* Axios

### Backend

* Node.js
* Express.js

### Database

* MongoDB Atlas

### APIs

* OpenRouteService (Routing API)

---

## 📂 Project Structure

```
milkroute/
├── milkroute-frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── milkroute-backend/
│   ├── models/
│   ├── routes/
│   ├── config/
│   └── server.js
```

---

## ⚙️ Setup Instructions

### 1️⃣ Clone the repository

```
git clone https://github.com/your-username/milkroute.git
```

---

### 2️⃣ Backend Setup

```
cd milkroute-backend
npm install
```

Create `.env` file:

```
MONGO_URI=your_mongodb_connection_string
PORT=5000
```

Run backend:

```
npm run dev
```

---

### 3️⃣ Frontend Setup

```
cd milkroute-frontend
npm install
npm run dev
```

---

## 🌍 Deployment

### Backend

* Deploy using Render

### Frontend

* Deploy using Vercel

---

## 🔐 Environment Variables

### Backend (.env)

```
MONGO_URI=your_mongodb_uri
PORT=5000
```

### Frontend (.env)

```
VITE_API_URL=your_backend_url/api
```

---

## 📸 Screenshots (Optional)

*<img width="1919" height="923" alt="image" src="https://github.com/user-attachments/assets/3c508fb1-87bf-48a2-8e43-07f0eee95ea3" />
<img width="1919" height="910" alt="image" src="https://github.com/user-attachments/assets/71de90a4-0c76-4822-9a76-06dbeb93eceb" />
<img width="1913" height="894" alt="image" src="https://github.com/user-attachments/assets/68726bce-a0ea-4f5c-9497-df4a39a45d06" />
*

---

## 💡 Future Improvements

* Multi-vehicle routing
* Notifications for farmers
* Offline support
* Fuel cost analytics

---

## 👨‍💻 Author

**Chamodya Mihirath**

---

## ⭐ If you like this project

Give it a star ⭐ on GitHub!
