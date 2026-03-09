import React, { useEffect, useState } from "react";
import { User, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, NavLink } from "react-router";
import { registerUser } from "../authSlice";

const signupSchema = z.object({
  firstName: z.string().min(3, "Minimum character should be 3"),
  emailId: z.string().email("Invalid Email"),
  password: z.string().min(8, "Password is too weak"),
});

function Signup() {
  const [showpassword, setShowpassword] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { isAuthenticated, loading, error } = useSelector(
    (state) => state.auth,
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(signupSchema) });

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = (data) => {
    dispatch(registerUser(data));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
        {/* HEADER */}
        <h2 className="text-2xl font-bold text-white mb-6 logo">LogicLab</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* NAME */}
          <div className="space-y-2">
            <label className="text-sm text-slate-300">Full Name</label>

            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />

              <input
                type="text"
                placeholder="John Doe"
                className={`w-full bg-slate-800 border ${
                  errors.firstName ? "border-red-500" : "border-slate-700"
                } text-white rounded-xl py-3 pl-11 pr-4 focus:outline-none`}
                {...register("firstName")}
              />
            </div>

            {errors.firstName && (
              <p className="text-red-400 text-xs">{errors.firstName.message}</p>
            )}
          </div>

          {/* EMAIL */}
          <div className="space-y-2">
            <label className="text-sm text-slate-300">Email</label>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />

              <input
                type="email"
                placeholder="name@company.com"
                className={`w-full bg-slate-800 border ${
                  errors.emailId ? "border-red-500" : "border-slate-700"
                } text-white rounded-xl py-3 pl-11 pr-4`}
                {...register("emailId")}
              />
            </div>

            {errors.emailId && (
              <p className="text-red-400 text-xs">{errors.emailId.message}</p>
            )}
          </div>

          {/* PASSWORD */}
          <div className="space-y-2">
            <label className="text-sm text-slate-300">Password</label>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />

              <input
                type={showpassword ? "text" : "password"}
                placeholder="At least 8 characters"
                className={`w-full bg-slate-800 border ${
                  errors.password ? "border-red-500" : "border-slate-700"
                } text-white rounded-xl py-3 pl-11 pr-12`}
                {...register("password")}
              />

              <button
                type="button"
                onClick={() => setShowpassword(!showpassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                {showpassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {errors.password && (
              <p className="text-red-400 text-xs">{errors.password.message}</p>
            )}
          </div>

          {/* BACKEND ERROR */}
          {error && <p className="text-red-500 text-sm text-center">{error.message}</p>}

          {/* BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="
              w-full
              bg-linear-to-r
              from-indigo-500
              via-purple-500
              to-pink-500
              hover:opacity-95
              text-white
              font-semibold
              py-3.5
              rounded-xl
              shadow-[0_0_30px_rgba(168,85,247,0.45)]
              transition-all
              flex items-center justify-center gap-2
            "
          >
            {loading ? "Signing Up..." : "SignUp"}
            <ArrowRight size={18} />
          </button>

          {/* FOOTER */}
          <p className="text-center text-slate-400 text-sm">
            Already have an account?{" "}
            <NavLink
              to="/login"
              className="text-indigo-400 font-semibold hover:text-indigo-300"
            >
              Login
            </NavLink>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Signup;

