import React, { useState, useEffect } from "react";
import { BedDouble, X } from "lucide-react";
import api from "@/api/axios";
import { Room } from "./Rooms";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/components/confirm/ConfirmProvider";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";

const roomTypes = ["STANDARD", "DELUXE", "SUITE", "PRESIDENTIAL"];
const bedTypeOptions = [
  { label: "King Size", value: "King" },
  { label: "Queen Size", value: "Queen" },
  { label: "Twin Beds", value: "Twin" },
  { label: "Double Bed", value: "Double" },
  { label: "Single Bed", value: "Single" },
];
const amenityOptions = [
  "Free Wi-Fi",
  "Air Conditioning (AC)",
  "Television (TV)",
  "Mini Bar",
  "Balcony",
  "Room Service",
  "Wardrobe",
];

const EditRoom: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { branchId } = useParams();
  const toast = useToast();
  const { currencySymbol } = useSystemSettings();
  
  const room = location.state?.room as Room;

  const [editForm, setEditForm] = useState({
    roomNumber:    "",
    roomType:      "STANDARD",
    pricePerNight: "",
    capacity:      "2",
    floor:         "1",
    maxAdults:     "",
    maxChildren:   "",
    bedType:       "",
    amenities:     [] as string[],
  });

  useEffect(() => {
    if (!room) {
      if (branchId) {
        navigate(`/workspace/${branchId}/rooms`);
      }
      return;
    }
    setEditForm({
      roomNumber:    room.roomNumber,
      roomType:      room.roomType,
      pricePerNight: String(room.pricePerNight),
      capacity:      String(room.capacity),
      floor:         String(room.floor),
      maxAdults:     String(room.maxOccupancy?.adults ?? 0),
      maxChildren:   String(room.maxOccupancy?.children ?? 0),
      bedType:       room.bedType || "",
      amenities:     room.amenities || [],
    });
  }, [room, branchId, navigate]);

  if (!room) return null;

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleAmenityChange = (amenity: string) => {
    setEditForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((item) => item !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const handleUpdateRoom = async () => {
    if (editForm.maxAdults === "" || Number(editForm.maxAdults) < 0) {
      toast.warning("Adults occupancy is required and must be 0 or greater.");
      return;
    }

    if (editForm.maxChildren === "" || Number(editForm.maxChildren) < 0) {
      toast.warning("Children occupancy is required and must be 0 or greater.");
      return;
    }

    if (!editForm.bedType) {
      toast.warning("Please select a bed type.");
      return;
    }

    if (!editForm.amenities.length) {
      toast.warning("Please select at least one amenity.");
      return;
    }

    try {
      await api.put(`/rooms/${room._id}`, {
        roomNumber: editForm.roomNumber,
        roomType: editForm.roomType,
        pricePerNight: Number(editForm.pricePerNight),
        capacity:      Number(editForm.capacity),
        floor:         Number(editForm.floor),
        maxOccupancy: {
          adults: Number(editForm.maxAdults),
          children: Number(editForm.maxChildren),
        },
        bedType: editForm.bedType,
        amenities: editForm.amenities,
      });
      toast.success("Room updated successfully.");
      navigate(`/workspace/${branchId}/rooms`);
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Update failed");
    }
  };

  const handleClose = () => {
    navigate(`/workspace/${branchId}/rooms`);
  };

  return (
    <div className="rm-root animate-fade-in w-full flex justify-center px-4 sm:px-6 py-10 md:py-16">
      <div 
        className="rm-modal" 
        style={{ 
          position: "relative", 
          transform: "none", 
          top: "auto", 
          left: "auto", 
          margin: "0 auto", 
          height: "auto", 
          maxHeight: "none",
          width: "100%"
        }}
      >
        <div className="rm-modal-header">
          <div className="rm-modal-header-left">
            <div className="rm-modal-badge">
              <BedDouble size={17} />
            </div>
            <div>
              <h2 className="rm-modal-title">Edit Room</h2>
              <p className="rm-modal-subtitle">Update details for room {room.roomNumber}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rm-close-btn"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="rm-modal-body">
          <div className="rm-form-grid">
            <div className="rm-field">
              <label htmlFor="edit-roomNumber" className="rm-label">Room Number</label>
              <input
                id="edit-roomNumber"
                name="roomNumber"
                value={editForm.roomNumber}
                onChange={handleEditInputChange}
                className="luxury-input"
                placeholder="e.g. 101"
              />
            </div>

            <div className="rm-field">
              <label htmlFor="edit-roomType" className="rm-label">Room Type</label>
              <select
                id="edit-roomType"
                name="roomType"
                value={editForm.roomType}
                onChange={handleEditInputChange}
                className="luxury-input"
              >
                {roomTypes.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div className="rm-field">
              <label htmlFor="edit-price" className="rm-label">{`Price / Night (${currencySymbol})`}</label>
              <input
                id="edit-price"
                type="number"
                name="pricePerNight"
                value={editForm.pricePerNight}
                onChange={handleEditInputChange}
                className="luxury-input"
                placeholder="e.g. 250"
              />
            </div>

            <div className="rm-field">
              <label htmlFor="edit-capacity" className="rm-label">Capacity (guests)</label>
              <input
                id="edit-capacity"
                type="number"
                name="capacity"
                value={editForm.capacity}
                onChange={handleEditInputChange}
                className="luxury-input"
                placeholder="e.g. 2"
              />
            </div>

            <div className="rm-field rm-field-full">
              <label htmlFor="edit-floor" className="rm-label">Floor</label>
              <input
                id="edit-floor"
                type="number"
                name="floor"
                value={editForm.floor}
                onChange={handleEditInputChange}
                className="luxury-input"
                placeholder="e.g. 1"
              />
            </div>

            <div className="rm-field">
              <label htmlFor="edit-maxAdults" className="rm-label">Adults</label>
              <input
                id="edit-maxAdults"
                type="number"
                name="maxAdults"
                value={editForm.maxAdults}
                onChange={handleEditInputChange}
                className="luxury-input"
                min="0"
                placeholder="e.g. 2"
              />
            </div>

            <div className="rm-field">
              <label htmlFor="edit-maxChildren" className="rm-label">Children</label>
              <input
                id="edit-maxChildren"
                type="number"
                name="maxChildren"
                value={editForm.maxChildren}
                onChange={handleEditInputChange}
                className="luxury-input"
                min="0"
                placeholder="e.g. 1"
              />
            </div>

            <div className="rm-field rm-field-full">
              <label htmlFor="edit-bedType" className="rm-label">Bed Type</label>
              <select
                id="edit-bedType"
                name="bedType"
                value={editForm.bedType}
                onChange={handleEditInputChange}
                className="luxury-input"
              >
                <option value="">Select Bed Type</option>
                {bedTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="rm-field rm-field-full">
              <label className="rm-label">Amenities</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {amenityOptions.map((amenity) => (
                  <label key={amenity} className="flex items-center gap-3 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={editForm.amenities.includes(amenity)}
                      onChange={() => handleAmenityChange(amenity)}
                    />
                    <span>{amenity}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button onClick={handleUpdateRoom} className="luxury-btn luxury-btn-primary rm-save-btn">
            Update Room
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditRoom;
