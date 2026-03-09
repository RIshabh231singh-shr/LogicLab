import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import {
  User,
  ArrowLeft,
  Save,
  Loader2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Camera,
} from "lucide-react";
import axiosClient from "../utility/axios";

function UpdateProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentPicture, setCurrentPicture] = useState(null);
  const [firstName, setFirstNameState] = useState("");
  const fileInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axiosClient.get("/user/getprofile");
        const { firstName, lastName, age, profilePicture } = response.data.user;
        reset({ firstName, lastName, age });
        setFirstNameState(firstName || "");
        setCurrentPicture(profilePicture || null);
      } catch (error) {
        console.error("Error fetching profile:", error);
        setStatus({ type: "error", message: "Failed to load profile data." });
      } finally {
        setFetching(false);
      }
    };
    fetchProfile();
  }, [reset]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewImage(URL.createObjectURL(file));
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setStatus({ type: "", message: "" });
    try {
      const formData = new FormData();
      formData.append("firstName", data.firstName);
      if (data.lastName) formData.append("lastName", data.lastName);
      if (data.age) formData.append("age", data.age);
      if (selectedFile) formData.append("profilePicture", selectedFile);

      const response = await axiosClient.put("/user/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setStatus({ type: "success", message: "Profile updated successfully!" });
      setTimeout(() => navigate("/profile"), 1500);
    } catch (error) {
      console.error("Error updating profile:", error);
      setStatus({
        type: "error",
        message: error.response?.data || "Failed to update profile. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const displayImage = previewImage || currentPicture;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in-95 duration-500">

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors group mb-4"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold uppercase tracking-widest">Back</span>
        </button>

        <div className="glass rounded-4xl p-10 border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-20 -top-20 bg-indigo-500/10 w-64 h-64 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative space-y-4 text-center mb-10">
            {/* Avatar / Upload Area */}
            <div className="relative w-24 h-24 mx-auto group">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-3xl overflow-hidden cursor-pointer ring-4 ring-white/5 hover:ring-indigo-500/40 transition-all relative"
              >
                {displayImage ? (
                  <img
                    src={displayImage}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full vibrant-gradient flex items-center justify-center text-white text-4xl font-black">
                    {firstName?.[0]?.toUpperCase() || <User size={36} />}
                  </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={22} className="text-white" />
                </div>
              </div>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 bg-indigo-600 p-1.5 rounded-xl border-2 border-slate-950 cursor-pointer hover:bg-indigo-500 transition-colors"
              >
                <Camera size={12} className="text-white" />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
            <p className="text-xs text-slate-500">Click avatar to change photo</p>

            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Update Profile</h1>
              <p className="text-slate-500 text-sm mt-2">Fine-tune your LogicLab identity</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 relative">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">First Name</label>
              <div className="glass border border-white/10 focus-within:border-indigo-500/50 rounded-2xl overflow-hidden transition-all">
                <input
                  type="text"
                  placeholder="e.g. John"
                  className="w-full bg-transparent border-none focus:ring-0 text-white px-5 py-3.5 placeholder:text-slate-700 font-medium"
                  {...register("firstName", { required: "First name is required", minLength: 3 })}
                />
              </div>
              {errors.firstName && <span className="text-xs text-rose-500 px-1">{errors.firstName.message}</span>}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Last Name</label>
              <div className="glass border border-white/10 focus-within:border-indigo-500/50 rounded-2xl overflow-hidden transition-all">
                <input
                  type="text"
                  placeholder="e.g. Doe"
                  className="w-full bg-transparent border-none focus:ring-0 text-white px-5 py-3.5 placeholder:text-slate-700 font-medium"
                  {...register("lastName", { minLength: 3 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Age</label>
              <div className="glass border border-white/10 focus-within:border-indigo-500/50 rounded-2xl overflow-hidden transition-all flex items-center">
                <input
                  type="number"
                  placeholder="25"
                  className="w-full bg-transparent border-none focus:ring-0 text-white px-5 py-3.5 placeholder:text-slate-700 font-medium font-mono"
                  {...register("age", { min: 6, max: 100 })}
                />
                <Calendar size={18} className="mr-5 text-slate-700" />
              </div>
            </div>

            {status.message && (
              <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${
                status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <p className="text-xs font-bold uppercase tracking-wider">{status.message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (!isDirty && !selectedFile)}
              className={`w-full py-4 rounded-2xl font-black text-white shadow-xl transition-all flex items-center justify-center gap-2 mt-4 ${
                !isDirty && !selectedFile ? 'bg-slate-900 text-slate-700 cursor-not-allowed border border-white/5' : 'vibrant-gradient hover:scale-[1.02] active:scale-95 shadow-indigo-500/20'
              }`}
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
              {loading ? 'SAVING...' : 'SAVE CHANGES'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default UpdateProfile;
