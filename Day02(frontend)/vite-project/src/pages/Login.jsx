import { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, NavLink } from "react-router";
import { loginUser } from "../authSlice";

const LoginSchema = z.object({
  emailId: z.string().email("Invalid Email"),
  password: z.string().min(8, "Password is too weak"),
});

function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { isAuthenticated, loading, error } = useSelector(
    (state) => state.auth,
  );

  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(LoginSchema) });

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = (data) => {
    dispatch(loginUser(data));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex justify-between mb-6">
          <h2 className="text-2xl font-bold tracking-wide text-white logo">
            LogicLab
          </h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* EMAIL */}
          <div className="space-y-2">
            <label className="text-sm text-slate-300">Email</label>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />

              <input
                type="email"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl py-3 pl-11 pr-4"
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
                type={showPassword ? "text" : "password"}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl py-3 pl-11 pr-12"
                {...register("password")}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {errors.password && (
              <p className="text-red-400 text-xs">{errors.password.message}</p>
            )}
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl
             bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-70 font-semibold shadow-[0_0_30px_rgba(168,85,247,0.45)] transition-all"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <p className="text-center text-slate-400 text-sm">
            Don't have an account?{" "}
            <NavLink to="/signup" className="text-indigo-400">
              Create account
            </NavLink>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;
