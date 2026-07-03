DrishyaGridFS v1.0
Store geographical information from the field & visualize dynamically on multiple base maps.
https://drishya-geo-map-viewer.onrender.com/ 

📌 Overview
DrishyaGridFS is a web application that allows users to upload geotagged photos, store them directly in MongoDB's GridFS, and visualize them on interactive maps. It bridges the gap between field data collection and geographical visualization, making it easy to manage location-based imagery.

✨ Features
GridFS Storage: Stores image binaries and metadata directly in MongoDB GridFS with strict isolation rules.

Interactive Mapping: Visualize photos on multiple base maps with dynamic pinning.

Multiple Coordinate Input Methods:

Auto-extraction: Automatically reads GPS tags from uploaded geotagged photos.

Map Click: Click anywhere on the map to pin precise coordinate targets.

Browser GPS: Uses browser geolocation (note: based on IP, may default to ISP hubs).

Gallery View: Browse uploaded photos with intuitive cards.

Map Focus: Click on any photo card to automatically focus on its location on the map.

🛠️ Tech Stack
Frontend: HTML, CSS, JavaScript, Vite.JS.

Map Integration: [Leaflet/OpenLayers]

Backend: [Node.js/Express]

Database: MongoDB with GridFS

🚀 Getting Started
Prerequisites
Node.js (v14 or higher)

MongoDB (local or cloud instance)

npm or yarn

Installation
Clone the repository:

bash
git clone https://github.com/yourusername/drishyagridfs.git
cd drishyagridfs
Install dependencies:

bash
npm install
Set up environment variables:
Create a .env file in the root directory:

env
MONGODB_URI=your_mongodb_connection_string
PORT=3000
Start the server:

bash
npm start
Open your browser and navigate to http://localhost:3000

📸 Usage
Uploading a Photo
Click the upload area or drag and drop a photo.

Choose your coordinate input method:

Geotagged Photo: Upload a photo with GPS metadata for auto-extraction.

Map Click: Click on the map to set coordinates.

Browser GPS: Use your browser's geolocation.

Fill in any additional metadata.

Submit to store in GridFS.

Viewing Gallery
Browse all uploaded photos in the gallery section.

Click any photo card to zoom to its location on the map.

🗺️ Map Features
Multiple base map options.

Click-to-pin functionality for coordinate selection.

Dynamic marker clustering (if applicable).

Smooth zoom and pan.

🤝 Contributing
Contributions are welcome! Please follow these steps:

Fork the repository.

Create your feature branch (git checkout -b feature/AmazingFeature).

Commit your changes (git commit -m 'Add some AmazingFeature').

Push to the branch (git push origin feature/AmazingFeature).

Open a Pull Request.

🐛 Issues
If you encounter any issues, please report them on the GitHub Issues page.

📝 License
This project is licensed under the MIT License - see the LICENSE file for details.

🙏 Acknowledgments
Open-source mapping libraries.

MongoDB GridFS for file storage.

All contributors and testers.
