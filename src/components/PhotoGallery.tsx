import React, { useState, useEffect } from "react";
import { Photo } from "../types";
import { Search, Image, Calendar, MapPin, Trash2, SlidersHorizontal, ArrowUpRight } from "lucide-react";

interface PhotoGalleryProps {
  photos: Photo[];
  selectedPhoto: Photo | null;
  onSelectPhoto: (photo: Photo | null) => void;
  onDeletePhoto: (id: string) => Promise<void>;
  onViewPhoto?: (photo: Photo) => void;
}

export default function PhotoGallery({
  photos,
  selectedPhoto,
  onSelectPhoto,
  onDeletePhoto,
  onViewPhoto
}: PhotoGalleryProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  // Scroll selected photo card into center of view
  useEffect(() => {
    if (selectedPhoto) {
      const element = document.getElementById(`gallery-item-${selectedPhoto.id}`);
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }
    }
  }, [selectedPhoto]);

  // Filtering based on search query (Title, Description, or coordinates)
  const filteredPhotos = photos.filter((photo) => {
    const query = searchQuery.toLowerCase();
    const title = (photo.metadata.title || "").toLowerCase();
    const desc = (photo.metadata.description || "").toLowerCase();
    const latStr = photo.metadata.lat.toString();
    const lngStr = photo.metadata.lng.toString();
    return title.includes(query) || desc.includes(query) || latStr.includes(query) || lngStr.includes(query);
  });

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "Unknown Date";
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-5 flex flex-col gap-4">
      
      {/* Header */}
      <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
            <Image className="w-4 h-4 text-indigo-600" />
            <span>Tagged Gallery ({filteredPhotos.length})</span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Click on a photo card to focus on the map tag.
          </p>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by title, desc or coords..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1.5 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
          id="gallery-search"
        />
      </div>

      {/* Gallery Content */}
      <div className="flex flex-col gap-3">
        {filteredPhotos.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 px-4 border border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Search className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700">
              {photos.length === 0 ? "No photos geotagged yet" : "No matches found"}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 max-w-xs">
              {photos.length === 0
                ? "Upload and submit your first photo on the map to start visualizing it."
                : "Try a different search keyword or coordinate query."}
            </p>
          </div>
        ) : (
          filteredPhotos.map((photo) => {
            const isSelected = selectedPhoto?.id === photo.id;
            return (
              <div
                key={photo.id}
                onClick={() => onSelectPhoto(photo)}
                className={`group relative border rounded-2xl overflow-hidden p-3 flex gap-3 cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? "border-amber-500 bg-amber-50/20 shadow-md ring-2 ring-amber-500/10"
                    : "border-slate-150 bg-white hover:border-slate-300 hover:shadow-sm"
                }`}
                id={`gallery-item-${photo.id}`}
              >
                {/* Photo Thumbnail */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onViewPhoto) onViewPhoto(photo);
                  }}
                  className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 group/thumb cursor-zoom-in"
                  title="Click to view large image"
                >
                  <img
                    src={`/api/photos/${photo.id}`}
                    alt={photo.metadata.title}
                    className="w-full h-full object-cover transition duration-300 group-hover/thumb:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-semibold gap-0.5">
                    <span>🔍 Expand</span>
                  </div>
                  <div className="absolute top-1 left-1 bg-slate-900/60 text-white text-[8px] font-mono px-1 py-0.5 rounded backdrop-blur-[2px]">
                    {(photo.length / (1024 * 1024)).toFixed(2)} MB
                  </div>
                </div>

                {/* Photo details */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <h3 className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-600 transition">
                        {photo.metadata.title}
                      </h3>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {deletingPhotoId === photo.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingPhotoId(null);
                            }}
                            className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-semibold transition cursor-pointer"
                            title="Cancel deletion"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (deletingPhotoId === photo.id) {
                              onDeletePhoto(photo.id).then(() => setDeletingPhotoId(null));
                            } else {
                              setDeletingPhotoId(photo.id);
                            }
                          }}
                          className={`p-1 rounded-md transition flex items-center gap-1 cursor-pointer ${
                            deletingPhotoId === photo.id
                              ? "bg-rose-600 text-white hover:bg-rose-700 text-[10px] px-2 py-0.5 font-bold animate-pulse"
                              : "text-slate-400 hover:text-rose-600 hover:bg-slate-50"
                          }`}
                          title={deletingPhotoId === photo.id ? "Click again to confirm" : "Delete Photo"}
                          id={`del-btn-${photo.id}`}
                        >
                          {deletingPhotoId === photo.id ? (
                            <span>Confirm?</span>
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 leading-normal italic">
                      {photo.metadata.description || "No description provided."}
                    </p>
                  </div>

                  <div className="flex flex-col gap-0.5 mt-2">
                    {/* Coordinates */}
                    <div className="flex items-center gap-1 text-[9px] font-mono text-indigo-600 font-semibold bg-indigo-50/60 px-1.5 py-0.5 rounded w-max">
                      <MapPin className="w-2.5 h-2.5" />
                      <span>{photo.metadata.lat.toFixed(5)}, {photo.metadata.lng.toFixed(5)}</span>
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center gap-1 text-[9px] text-slate-400">
                      <Calendar className="w-2.5 h-2.5" />
                      <span>{formatDate(photo.metadata.uploadedAt || photo.uploadDate)}</span>
                    </div>
                  </div>
                </div>

                {/* Absolute Top-Right Floating Icon */}
                <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition duration-200">
                  <span className="text-[9px] font-semibold text-indigo-600 flex items-center gap-0.5">
                    <span>Fly Here</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
