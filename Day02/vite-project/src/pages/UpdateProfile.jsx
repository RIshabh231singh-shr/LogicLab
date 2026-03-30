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
  MapPin,
  Link,
  Github,
  Linkedin,
  Briefcase,
  GraduationCap,
  Wrench,
  Plus,
  Trash2,
  ChevronDown,
  Mail,
  Shield,
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
  const [emailId, setEmailId] = useState("");
  const [role, setRole] = useState("");
  const [locationVal, setLocationVal] = useState("");
  const [genderVal, setGenderVal] = useState("");
  const [ageVal, setAgeVal] = useState("");

  // Experience state
  const [work, setWork] = useState([]);
  const [education, setEducation] = useState([]);
  const [skillsInput, setSkillsInput] = useState(""); // comma-separated

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
        const { firstName, lastName, nickname, age, profilePicture, gender, location, birthday, websites, github, linkedin, work: w, education: e, skills, emailId: email, role: r } = response.data.user;
        reset({
          firstName,
          lastName,
          nickname: nickname || "",
          age,
          gender: gender || "",
          location: location || "",
          birthday: birthday ? new Date(birthday).toISOString().split("T")[0] : "",
          websites: websites || "",
          github: github || "",
          linkedin: linkedin || "",
        });
        setFirstNameState(firstName || "");
        setEmailId(email || "");
        setRole(r || "");
        setLocationVal(location || "");
        setGenderVal(gender || "");
        setAgeVal(age || "");
        setCurrentPicture(profilePicture || null);
        setWork(w || []);
        setEducation(e || []);
        setSkillsInput((skills || []).join(", "));
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

  // Work helpers
  const addWork = () => setWork([...work, { company: "", role: "", from: "", to: "" }]);
  const removeWork = (i) => setWork(work.filter((_, idx) => idx !== i));
  const updateWork = (i, field, val) => {
    const updated = [...work];
    updated[i] = { ...updated[i], [field]: val };
    setWork(updated);
  };

  // Education helpers
  const addEducation = () => setEducation([...education, { institution: "", degree: "", from: "", to: "" }]);
  const removeEducation = (i) => setEducation(education.filter((_, idx) => idx !== i));
  const updateEducation = (i, field, val) => {
    const updated = [...education];
    updated[i] = { ...updated[i], [field]: val };
    setEducation(updated);
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setStatus({ type: "", message: "" });
    try {
      const formData = new FormData();
      formData.append("firstName", data.firstName);
      if (data.lastName !== undefined) formData.append("lastName", data.lastName);
      if (data.nickname !== undefined) formData.append("nickname", data.nickname);
      if (data.age) formData.append("age", data.age);
      if (data.gender !== undefined) formData.append("gender", data.gender);
      if (data.location !== undefined) formData.append("location", data.location);
      if (data.birthday !== undefined) formData.append("birthday", data.birthday);
      if (data.websites !== undefined) formData.append("websites", data.websites);
      if (data.github !== undefined) formData.append("github", data.github);
      if (data.linkedin !== undefined) formData.append("linkedin", data.linkedin);
      formData.append("skills", skillsInput);
      formData.append("work", JSON.stringify(work));
      formData.append("education", JSON.stringify(education));
      if (selectedFile) formData.append("profilePicture", selectedFile);

      await axiosClient.put("/user/profile", formData, {
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
  const skillsArr = skillsInput.split(",").map(s => s.trim()).filter(Boolean);

  const inputCls = "w-full bg-slate-800 border-none focus:ring-0 text-white px-5 py-3.5 placeholder:text-slate-400 font-medium";
  const wrapCls = "bg-slate-800 border border-slate-500 focus-within:border-indigo-400 rounded-2xl overflow-hidden transition-all";
  const labelCls = "text-xs font-black text-white uppercase tracking-widest px-1";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-3 flex justify-center">
      <div className="w-[98%] space-y-8 animate-in fade-in zoom-in-95 duration-500 py-8">

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors group mb-4"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold uppercase tracking-widest">Back</span>
        </button>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

          {/* ── PROFILE HERO CARD — LANDSCAPE ── */}
          <div className="bg-slate-900 rounded-3xl border border-slate-600 shadow-2xl relative overflow-hidden">
            {/* Decorative blobs */}
            <div className="absolute -right-20 -top-20 bg-indigo-500/10 w-64 h-64 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-16 -bottom-16 bg-purple-500/10 w-56 h-56 rounded-full blur-3xl pointer-events-none" />

            {/* Landscape layout: avatar left, info right */}
            <div className="flex flex-col md:flex-row gap-0">
              {/* Avatar column */}
              <div className="md:w-56 flex flex-col items-center justify-center p-8 border-b md:border-b-0 md:border-r border-slate-700 bg-slate-800/50 shrink-0 gap-4">
                <div className="relative group">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-28 h-28 rounded-3xl overflow-hidden cursor-pointer ring-4 ring-white/5 hover:ring-indigo-500/40 transition-all relative shadow-xl shadow-indigo-900/30"
                  >
                    {displayImage ? (
                      <img src={displayImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full vibrant-gradient flex items-center justify-center text-white text-4xl font-black">
                        {firstName?.[0]?.toUpperCase() || <User size={36} />}
                      </div>
                    )}
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
                  <input ref={fileInputRef} type="file" accept="image/png, image/jpeg, image/webp" className="hidden" onChange={handleFileChange} />
                </div>
                <p className="text-xs text-slate-200 text-center uppercase tracking-wider font-bold">Click to change photo</p>
              </div>

              {/* Info column */}
              <div className="flex-1 p-8 space-y-5">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <h2 className="text-xl font-black text-white">Edit Profile</h2>
                    <p className="text-sm text-slate-200 mt-0.5">Manage your personal information</p>
                  </div>
                  {role && (
                    <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-black text-indigo-300 uppercase tracking-widest">
                      {role}
                    </span>
                  )}
                </div>

                {/* Quick info chips */}
                <div className="flex flex-wrap gap-2">
                  {emailId && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700 border border-slate-500 text-xs text-white">
                      <Mail size={11} className="text-indigo-400" />
                      <span className="font-medium">{emailId}</span>
                    </div>
                  )}
                  {locationVal && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700 border border-slate-500 text-xs text-white">
                      <MapPin size={11} className="text-indigo-400" />
                      <span className="font-medium">{locationVal}</span>
                    </div>
                  )}
                  {genderVal && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700 border border-slate-500 text-xs text-white">
                      <User size={11} className="text-indigo-400" />
                      <span className="font-medium">{genderVal}</span>
                    </div>
                  )}
                  {ageVal && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700 border border-slate-500 text-xs text-white">
                      <Calendar size={11} className="text-indigo-400" />
                      <span className="font-medium">{ageVal} yrs</span>
                    </div>
                  )}
                </div>

                {/* Skills preview */}
                {skillsArr.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {skillsArr.map((skill, i) => (
                      <span key={i} className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-bold text-indigo-300">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                {/* Work preview */}
                {work.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {work.map((w, i) => w.role && (
                      <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300">
                        <Briefcase size={11} className="text-purple-400" />
                        <span className="font-medium">{w.role}{w.company ? ` @ ${w.company}` : ""}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Education preview */}
                {education.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {education.map((e, i) => e.institution && (
                      <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-xs text-slate-300">
                        <GraduationCap size={11} className="text-emerald-400" />
                        <span className="font-medium">{e.degree || e.institution}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── GENERAL SECTION ── */}
          <div className="bg-slate-900 rounded-3xl p-8 border border-slate-600 shadow-2xl relative overflow-hidden space-y-6">
            <div>
              <h2 className="text-xl font-black text-white mb-1">General</h2>
              <p className="text-sm text-slate-200">Manage your basic profile information.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* First Name */}
              <div className="space-y-2">
                <label className={labelCls}><User size={12} className="inline mr-1" />Display Name</label>
                <div className={wrapCls}>
                  <input type="text" placeholder="e.g. John" className={inputCls}
                    {...register("firstName", { required: "First name is required", minLength: 3 })} />
                </div>
                {errors.firstName && <span className="text-xs text-rose-500 px-1">{errors.firstName.message}</span>}
              </div>

              {/* Last Name */}
              <div className="space-y-2">
                <label className={labelCls}>Last Name</label>
                <div className={wrapCls}>
                  <input type="text" placeholder="e.g. Doe" className={inputCls}
                    {...register("lastName", { minLength: 3 })} />
                </div>
              </div>

              {/* Nickname / Handle */}
              <div className="space-y-2">
                <label className={labelCls}>@ Nickname / Handle</label>
                <div className={wrapCls}>
                  <input type="text" placeholder="e.g. shadow_coder" className={inputCls}
                    {...register("nickname")} />
                </div>
              </div>

              {/* Gender */}
              <div className="space-y-2">
                <label className={labelCls}>Gender</label>
                <div className={`${wrapCls} flex items-center`}>
                  <select className={`${inputCls} appearance-none`}
                    {...register("gender")}
                    onChange={e => { setGenderVal(e.target.value); }}>
                    <option value="" className="bg-slate-800">Prefer not to say</option>
                    <option value="Male" className="bg-slate-800">Male</option>
                    <option value="Female" className="bg-slate-800">Female</option>
                    <option value="Non-binary" className="bg-slate-800">Non-binary</option>
                  </select>
                  <ChevronDown size={16} className="mr-4 text-slate-300 flex-shrink-0" />
                </div>
              </div>

              {/* Age */}
              <div className="space-y-2">
                <label className={labelCls}><Calendar size={12} className="inline mr-1" />Age</label>
                <div className={`${wrapCls} flex items-center`}>
                  <input type="number" placeholder="25" className={`${inputCls} font-mono`}
                    {...register("age", { min: 6, max: 100 })}
                    onChange={e => setAgeVal(e.target.value)} />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2 md:col-span-2">
                <label className={labelCls}><MapPin size={12} className="inline mr-1" />Location</label>
                <div className={wrapCls}>
                  <input type="text" placeholder="e.g. India, Kerala, Kozhikode" className={inputCls}
                    {...register("location")}
                    onChange={e => setLocationVal(e.target.value)} />
                </div>
              </div>

              {/* Birthday */}
              <div className="space-y-2">
                <label className={labelCls}><Calendar size={12} className="inline mr-1" />Birthday</label>
                <div className={`${wrapCls} flex items-center`}>
                  <input type="date" className={`${inputCls} [color-scheme:dark]`}
                    {...register("birthday")} />
                </div>
              </div>

              {/* Websites */}
              <div className="space-y-2">
                <label className={labelCls}><Link size={12} className="inline mr-1" />Website</label>
                <div className={wrapCls}>
                  <input type="url" placeholder="https://yourwebsite.com" className={inputCls}
                    {...register("websites")} />
                </div>
              </div>

              {/* Github */}
              <div className="space-y-2">
                <label className={labelCls}><Github size={12} className="inline mr-1" />GitHub</label>
                <div className={wrapCls}>
                  <input type="text" placeholder="https://github.com/username" className={inputCls}
                    {...register("github")} />
                </div>
              </div>

              {/* LinkedIn */}
              <div className="space-y-2">
                <label className={labelCls}><Linkedin size={12} className="inline mr-1" />LinkedIn</label>
                <div className={wrapCls}>
                  <input type="text" placeholder="https://linkedin.com/in/username" className={inputCls}
                    {...register("linkedin")} />
                </div>
              </div>
            </div>
          </div>

          {/* ── EXPERIENCE SECTION ── */}
          <div className="bg-slate-900 rounded-3xl p-8 border border-slate-600 shadow-2xl space-y-8">
            <div>
              <h2 className="text-xl font-black text-white mb-1">Experience</h2>
              <p className="text-sm text-slate-200">Share your growth from learning to career.</p>
            </div>

            {/* Work */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className={labelCls}><Briefcase size={12} className="inline mr-1" />Work</label>
                <button type="button" onClick={addWork}
                  className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
                  <Plus size={14} /> Add
                </button>
              </div>
              {work.length === 0 && (
                <p className="text-sm text-slate-200 italic px-1">No work experience added yet.</p>
              )}
              {work.map((w, i) => (
                <div key={i} className="bg-slate-800 border border-slate-600 rounded-2xl p-5 space-y-3 relative">
                  <button type="button" onClick={() => removeWork(i)}
                    className="absolute top-3 right-3 text-slate-600 hover:text-rose-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs text-white uppercase tracking-wider font-black">Company</label>
                      <input type="text" value={w.company} onChange={e => updateWork(i, "company", e.target.value)}
                        placeholder="Company name" className="w-full bg-slate-700 border border-slate-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-400" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-white uppercase tracking-wider font-black">Role</label>
                      <input type="text" value={w.role} onChange={e => updateWork(i, "role", e.target.value)}
                        placeholder="Job title" className="w-full bg-slate-700 border border-slate-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-400" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-white uppercase tracking-wider font-black">From</label>
                      <input type="text" value={w.from} onChange={e => updateWork(i, "from", e.target.value)}
                        placeholder="e.g. 2022" className="w-full bg-slate-700 border border-slate-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-400" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-white uppercase tracking-wider font-black">To</label>
                      <input type="text" value={w.to} onChange={e => updateWork(i, "to", e.target.value)}
                        placeholder="e.g. Present" className="w-full bg-slate-700 border border-slate-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Education */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className={labelCls}><GraduationCap size={12} className="inline mr-1" />Education</label>
                <button type="button" onClick={addEducation}
                  className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-bold transition-colors">
                  <Plus size={14} /> Add
                </button>
              </div>
              {education.length === 0 && (
                <p className="text-sm text-slate-200 italic px-1">No education added yet.</p>
              )}
              {education.map((e, i) => (
                <div key={i} className="bg-slate-800 border border-slate-600 rounded-2xl p-5 space-y-3 relative">
                  <button type="button" onClick={() => removeEducation(i)}
                    className="absolute top-3 right-3 text-slate-400 hover:text-rose-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 col-span-2">
                      <label className="text-xs text-white uppercase tracking-wider font-black">Institution</label>
                      <input type="text" value={e.institution} onChange={ev => updateEducation(i, "institution", ev.target.value)}
                        placeholder="School / University" className="w-full bg-slate-700 border border-slate-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-400" />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label className="text-xs text-white uppercase tracking-wider font-black">Degree</label>
                      <input type="text" value={e.degree} onChange={ev => updateEducation(i, "degree", ev.target.value)}
                        placeholder="e.g. B.Tech Computer Science" className="w-full bg-slate-700 border border-slate-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-400" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-white uppercase tracking-wider font-black">From</label>
                      <input type="text" value={e.from} onChange={ev => updateEducation(i, "from", ev.target.value)}
                        placeholder="e.g. 2020" className="w-full bg-slate-700 border border-slate-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-400" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-white uppercase tracking-wider font-black">To</label>
                      <input type="text" value={e.to} onChange={ev => updateEducation(i, "to", ev.target.value)}
                        placeholder="e.g. 2024" className="w-full bg-slate-700 border border-slate-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <label className={labelCls}><Wrench size={12} className="inline mr-1" />Skills</label>
              <div className={wrapCls}>
                <input
                  type="text"
                  value={skillsInput}
                  onChange={e => setSkillsInput(e.target.value)}
                  placeholder="e.g. JavaScript, React, Node.js  (comma separated)"
                  className={inputCls}
                />
              </div>
              <p className="text-xs text-slate-200 px-1">Separate skills with commas.</p>
              {skillsInput && (
                <div className="flex flex-wrap gap-2 pt-1 px-1">
                  {skillsInput.split(",").map(s => s.trim()).filter(Boolean).map((skill, i) => (
                    <span key={i} className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs font-bold text-indigo-300">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Status message */}
          {status.message && (
            <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${
              status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <p className="text-xs font-bold uppercase tracking-wider">{status.message}</p>
            </div>
          )}

          {/* Save button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl font-black text-white shadow-xl transition-all flex items-center justify-center gap-2 vibrant-gradient hover:scale-[1.02] active:scale-95 shadow-indigo-500/20 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {loading ? "SAVING..." : "SAVE CHANGES"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default UpdateProfile;
