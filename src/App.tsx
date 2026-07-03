import { useState, useEffect } from "react";
import InteractiveMap from "./components/InteractiveMap";
import UploadForm from "./components/UploadForm";
import PhotoGallery from "./components/PhotoGallery";
import { Photo } from "./types";
import { Compass, Database, Layers, ShieldCheck, MapPin, Loader2, Sparkles, AlertCircle, X, Calendar, ArrowLeft } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export default function App() {
  // Main states
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<Photo | null>(null);

  // Status states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dbStatus, setDbStatus] = useState<{ status: string; db: string; coll: string } | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Handle Escape key to close big view lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setViewingPhoto(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 1. Fetch Database Health
  const checkDatabaseHealth = async () => {
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      if (res.ok && data.status === "ok") {
        setDbStatus({
          status: "connected",
          db: data.database,
          coll: data.collection
        });
      } else {
        setDbStatus({
          status: "failed",
          db: "Shapefile",
          coll: "photos"
        });
        setGlobalError("MongoDB is offline or misconfigured. Running in offline/fallback state.");
      }
    } catch (err) {
      console.error("Health check error:", err);
      setDbStatus({
        status: "failed",
        db: "Shapefile",
        coll: "photos"
      });
    }
  };

  // 2. Fetch Photos
  const fetchPhotos = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/photos");
      if (!res.ok) {
        throw new Error("Failed to load photo metadata.");
      }
      const data = await res.json();
      setPhotos(data.photos || []);
      setGlobalError(null);
    } catch (err: any) {
      console.error("Error fetching photos:", err);
      setGlobalError("Could not retrieve photos. Please verify server connectivity.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Delete Photo
  const handleDeletePhoto = async (id: string) => {
    try {
      const res = await fetch(`/api/photos/${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete photo from GridFS.");
      }
      // Success: clean selected state if the deleted photo was active
      if (selectedPhoto?.id === id) {
        setSelectedPhoto(null);
      }
      // Refresh list
      await fetchPhotos();
    } catch (err: any) {
      console.error("Error deleting photo:", err);
      setGlobalError(err.message || "An error occurred during photo deletion.");
      // Automatically clear after 5 seconds
      setTimeout(() => {
        setGlobalError(null);
      }, 5000);
    }
  };

  // 4. Handle map click to stage a photo placement
  const handleMapClick = (lat: number, lng: number) => {
    setPendingCoords({ lat, lng });
    // Clear selected photo so user can focus on the placement
    setSelectedPhoto(null);
  };

  // Initial load
  useEffect(() => {
    checkDatabaseHealth();
    fetchPhotos();
  }, []);

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased selection:bg-indigo-500/10 selection:text-indigo-900 overflow-hidden">
      
      {/* Dynamic Grid Header */}
      <header className="bg-white border-b border-slate-200/80 shadow-sm px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/10">
            <Compass className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-display tracking-tight text-slate-900 flex items-center gap-2">
              <span>Drishya</span>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100 font-mono">
                GridFS v1.0
              </span>
            </h1>
            <p className="text-xs text-slate-500 leading-none mt-1">
              Store geogrphical informaition from field & visualize dynamically on multiple base maps.
            </p>
          </div>
        </div>

        {/* Status indicator bar */}
        <div className="flex items-center gap-3 flex-wrap justify-end">
          
          {/* MongoDB Connection Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <Database className="w-4 h-4 text-slate-500" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-mono leading-none uppercase">Database Status</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${
                  dbStatus?.status === "connected" ? "bg-emerald-500" : "bg-rose-500 animate-pulse"
                }`} />
                <span className="font-bold text-slate-700 text-[11px]">
                  {dbStatus?.status === "connected" ? `${dbStatus.db}.${dbStatus.coll}` : "Connecting..."}
                </span>
              </div>
            </div>
          </div>

          {/* Secure Rules Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-mono leading-none uppercase font-semibold">GridFS Rules</span>
              <span className="font-semibold text-slate-700 text-[11px] mt-0.5">Strict Isolation</span>
            </div>
          </div>

        </div>
      </header>

      {/* Main Body Layout */}
      <main className="flex-1 p-6 flex flex-col xl:flex-row gap-6 overflow-hidden min-h-0">
        
        {/* Left column: Controls & Upload */}
        <div className="w-full xl:w-[450px] flex flex-col gap-6 h-full overflow-y-auto pr-1.5 flex-shrink-0">
          
          {/* Upload form */}
          <div className="flex-shrink-0">
            <UploadForm
              onUploadSuccess={fetchPhotos}
              pendingCoords={pendingCoords}
              setPendingCoords={setPendingCoords}
              clearPendingCoords={() => setPendingCoords(null)}
            />
          </div>

          {/* Photo list Gallery index */}
          <div>
            {isLoading ? (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center shadow-md">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
                <p className="text-xs font-semibold text-slate-700">Loading Geotagged Database...</p>
                <p className="text-[10px] text-slate-400 mt-1">Retrieving image coordinates & metadata from MongoDB GridFS files...</p>
              </div>
            ) : (
              <PhotoGallery
                photos={photos}
                selectedPhoto={selectedPhoto}
                onSelectPhoto={setSelectedPhoto}
                onDeletePhoto={handleDeletePhoto}
                onViewPhoto={setViewingPhoto}
              />
            )}
          </div>
        </div>

        {/* Right column: Immersive Leaflet Map */}
        <div className="flex-1 h-[400px] xl:h-auto min-h-0 relative">
          
          {globalError && (
            <div className="absolute top-16 left-4 right-4 z-50 p-3 bg-rose-500/95 backdrop-blur text-white text-xs font-semibold rounded-xl shadow-xl flex items-center gap-2.5 border border-rose-600">
              <AlertCircle className="w-4 h-4" />
              <span>{globalError}</span>
            </div>
          )}

          <InteractiveMap
            photos={photos}
            selectedPhoto={selectedPhoto}
            onMapClick={handleMapClick}
            pendingCoords={pendingCoords}
            onDeletePhoto={handleDeletePhoto}
            onSelectPhoto={setSelectedPhoto}
            onViewPhoto={setViewingPhoto}
          />
        </div>

      </main>

      {/* Immersive Photo Fullscreen Lightbox / Big View */}
      <AnimatePresence>
        {viewingPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-8 overflow-y-auto"
            onClick={() => setViewingPhoto(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden max-w-5xl w-full shadow-2xl flex flex-col md:flex-row"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Image Section */}
              <div className="flex-1 bg-slate-950 flex items-center justify-center relative p-4 min-h-[300px] md:min-h-[500px]">
                <img
                  src={`/api/photos/${viewingPhoto.id}`}
                  alt={viewingPhoto.metadata.title}
                  className="max-h-[50vh] md:max-h-[75vh] max-w-full object-contain rounded-lg shadow-lg"
                  referrerPolicy="no-referrer"
                />
                
                {/* Float indicator */}
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur px-2.5 py-1 rounded-lg text-[10px] font-mono text-slate-400">
                  {(viewingPhoto.length / (1024 * 1024)).toFixed(2)} MB • {viewingPhoto.contentType}
                </div>
              </div>

              {/* Sidebar Info Section */}
              <div className="w-full md:w-[350px] bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 p-6 flex flex-col justify-between gap-6">
                
                {/* Header & Meta */}
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                        Geotagged Photo
                      </span>
                      <h2 className="text-xl font-bold font-display text-white mt-2 leading-tight truncate">
                        {viewingPhoto.metadata.title}
                      </h2>
                    </div>
                    {/* Return/Close Button */}
                    <button
                      onClick={() => setViewingPhoto(null)}
                      className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-xl transition-all cursor-pointer shadow-md flex-shrink-0"
                      title="Close"
                      id="close-lightbox-btn"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <p className="text-sm text-slate-400 leading-relaxed italic bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 max-h-[120px] overflow-y-auto">
                    {viewingPhoto.metadata.description || "No description provided."}
                  </p>

                  {/* GPS Coordinates panel */}
                  <div className="flex flex-col gap-2.5 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs">
                      <MapPin className="w-4 h-4" />
                      <span>GPS Meta Location</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="bg-slate-900 p-2 rounded border border-slate-800/40">
                        <span className="text-[10px] text-slate-500 uppercase block">Latitude</span>
                        <span className="text-slate-300 font-bold">{viewingPhoto.metadata.lat.toFixed(6)}</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded border border-slate-800/40">
                        <span className="text-[10px] text-slate-500 uppercase block">Longitude</span>
                        <span className="text-slate-300 font-bold">{viewingPhoto.metadata.lng.toFixed(6)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Date details */}
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-medium px-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Uploaded: {new Date(viewingPhoto.uploadDate).toLocaleString()}</span>
                  </div>
                </div>

                {/* Return to Map & Zoom Actions */}
                <div className="flex flex-col gap-2 pt-4 border-t border-slate-800">
                  <button
                    onClick={() => {
                      // Center map on photo location and select it
                      setSelectedPhoto(viewingPhoto);
                      setViewingPhoto(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 px-4 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <Compass className="w-4 h-4" />
                    <span>Show on Interactive Map</span>
                  </button>
                  
                  <button
                    onClick={() => setViewingPhoto(null)}
                    className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 px-4 rounded-xl font-semibold text-xs transition cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Return to Gallery</span>
                  </button>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
