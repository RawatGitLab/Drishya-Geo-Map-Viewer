import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { MongoClient, GridFSBucket, ObjectId } from "mongodb";
import multer from "multer";
import { Readable } from "stream";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable JSON body parsing with reasonable size limit
app.use(express.json({ limit: "15mb" }));

// Configure Multer for processing file uploads in memory
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 }, // 12MB limit
  fileFilter: (req, file, cb) => {
    // Only accept common image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"));
    }
  }
});

// Lazy-loaded MongoDB client and connection state
let mongoClient: MongoClient | null = null;
let dbInstance: any = null;

async function getDB() {
  if (dbInstance) return dbInstance;

  const uri = process.env.MONGODB_URI || "mongodb+srv://varunrawatmailbox2507_db_user:GYVPiF8LG4HIbsSF@cluster0.8xfepsq.mongodb.net/?appName=Cluster0";
  const dbName = process.env.MONGODB_DB || "Photos-Database";

  try {
    console.log("Connecting to MongoDB...");
    mongoClient = new MongoClient(uri, {
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
    await mongoClient.connect();
    dbInstance = mongoClient.db(dbName);
    console.log(`Successfully connected to MongoDB: database "${dbName}"`);
    return dbInstance;
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    throw err;
  }
}

function getGridFSBucket(db: any) {
  const collectionName = process.env.MONGODB_COLLECTION || "Photos";
  return new GridFSBucket(db, { bucketName: collectionName });
}

// Ensure the database connection works
app.get("/api/health", async (req, res) => {
  try {
    const db = await getDB();
    const collectionName = process.env.MONGODB_COLLECTION || "Photos";
    const status = await db.command({ ping: 1 });
    res.json({
      status: "ok",
      database: db.databaseName,
      collection: collectionName,
      ping: status
    });
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to connect to MongoDB database."
    });
  }
});

// API: Get all Photos (only retrieves metadata and _id, avoiding heavy binary loads)
app.get("/api/photos", async (req, res) => {
  try {
    const db = await getDB();
    const collectionName = process.env.MONGODB_COLLECTION || "Photos";
    const filesCollection = db.collection(`${collectionName}.files`);

    // Find and sort files from GridFS
    const files = await filesCollection
      .find({})
      .sort({ "metadata.uploadedAt": -1 })
      .toArray();

    const photos = files.map((file) => ({
      id: file._id.toString(),
      filename: file.filename,
      length: file.length,
      contentType: file.metadata?.contentType || file.contentType || "image/jpeg",
      uploadDate: file.uploadDate,
      metadata: file.metadata || {}
    }));

    res.json({ photos });
  } catch (error: any) {
    console.error("Error fetching photos metadata:", error);
    res.status(500).json({ error: error.message || "Failed to retrieve photos metadata." });
  }
});

// API: Stream/Download image binary from GridFS
app.get("/api/photos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid photo ID." });
    }

    const db = await getDB();
    const bucket = getGridFSBucket(db);
    const objectId = new ObjectId(id);

    // Verify if the file exists first
    const collectionName = process.env.MONGODB_COLLECTION || "Photos";
    const filesCollection = db.collection(`${collectionName}.files`);
    const file = await filesCollection.findOne({ _id: objectId });

    if (!file) {
      return res.status(404).json({ error: "Photo not found in database." });
    }

    // Set appropriate headers
    res.set("Content-Type", file.metadata?.contentType || file.contentType || "image/jpeg");
    res.set("Content-Length", file.length.toString());
    res.set("Cache-Control", "public, max-age=31536000"); // Cache static uploaded images

    const downloadStream = bucket.openDownloadStream(objectId);

    downloadStream.on("error", (err) => {
      console.error("GridFS streaming error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error streaming image data from GridFS." });
      }
    });

    downloadStream.pipe(res);
  } catch (error: any) {
    console.error("Error retrieving photo:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || "Failed to stream photo binary." });
    }
  }
});

// API: Upload photo and save to MongoDB using GridFS
app.post("/api/photos", (req, res) => {
  upload.single("photo")(req, res, async (err) => {
    if (err) {
      console.error("Multer file upload error:", err);
      return res.status(400).json({ error: err.message || "Multer upload failed." });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided in 'photo' field." });
      }

      const { title, description, lat, lng } = req.body;

      if (!lat || !lng) {
        return res.status(400).json({ error: "Geographic coordinates (latitude and longitude) are required." });
      }

      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      if (isNaN(latitude) || latitude < -90 || latitude > 90) {
        return res.status(400).json({ error: "Latitude must be a valid number between -90 and 90." });
      }
      if (isNaN(longitude) || longitude < -180 || longitude > 180) {
        return res.status(400).json({ error: "Longitude must be a valid number between -180 and 180." });
      }

      const db = await getDB();
      const bucket = getGridFSBucket(db);

      const cleanedTitle = title ? title.trim() : "Untitled Photo";
      const ext = path.extname(req.file.originalname) || "";
      const filename = ext && !cleanedTitle.toLowerCase().endsWith(ext.toLowerCase()) 
        ? `${cleanedTitle}${ext}` 
        : cleanedTitle;
      
      const uploadStream = bucket.openUploadStream(filename, {
        metadata: {
          title: title ? title.trim() : "Untitled Photo",
          description: description ? description.trim() : "",
          lat: latitude,
          lng: longitude,
          contentType: req.file.mimetype,
          uploadedAt: new Date()
        }
      });

      uploadStream.on("error", (uploadError) => {
        console.error("GridFS Upload Stream Error:", uploadError);
        if (!res.headersSent) {
          res.status(500).json({ error: "GridFS write failure. Could not store image." });
        }
      });

      uploadStream.on("finish", () => {
        console.log(`Successfully stored file to GridFS with ID: ${uploadStream.id}`);
        if (!res.headersSent) {
          res.status(201).json({
            message: "Photo uploaded and saved successfully!",
            photo: {
              id: uploadStream.id.toString(),
              filename,
              contentType: req.file?.mimetype,
              metadata: {
                title: title ? title.trim() : "Untitled Photo",
                description: description ? description.trim() : "",
                lat: latitude,
                lng: longitude,
                uploadedAt: new Date()
              }
            }
          });
        }
      });

      // Write the buffer to GridFS bucket stream directly
      uploadStream.write(req.file.buffer);
      uploadStream.end();

    } catch (error: any) {
      console.error("Server exception inside file upload route:", error);
      res.status(500).json({ error: error.message || "An unexpected server error occurred." });
    }
  });
});

// API: Delete photo and chunks from GridFS
app.delete("/api/photos/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid photo ID." });
    }

    const db = await getDB();
    const bucket = getGridFSBucket(db);
    const objectId = new ObjectId(id);

    // Verify if the file exists
    const collectionName = process.env.MONGODB_COLLECTION || "Photos";
    const filesCollection = db.collection(`${collectionName}.files`);
    const file = await filesCollection.findOne({ _id: objectId });

    if (!file) {
      return res.status(404).json({ error: "Photo not found to delete." });
    }

    // Delete file and corresponding chunks
    await bucket.delete(objectId);
    console.log(`Successfully deleted GridFS file with ID: ${id}`);
    res.json({ message: "Photo deleted successfully from database." });
  } catch (error: any) {
    console.error("Error deleting photo:", error);
    res.status(500).json({ error: error.message || "Failed to delete photo from database." });
  }
});

async function startServer() {
  // Vite middleware for development vs static asset serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Geo Photo Map Backend] Server listening at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal server initialization error:", err);
});
