import { useNavigate } from "react-router-dom";
import { Compass, ArrowLeft, Home } from "lucide-react";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Subtle background glow circles */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-md w-full text-center">
        {/* Glowing badge */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-6 shadow-inner">
          <Compass className="w-10 h-10 animate-pulse" />
        </div>

        {/* 404 Number */}
        <h1 className="text-8xl sm:text-9xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-300 to-teal-300 bg-clip-text text-transparent">
          404
        </h1>

        <h2 className="text-2xl sm:text-3xl font-bold text-white mt-4 mb-3">
          Page not found
        </h2>

        <p className="text-gray-400 text-sm sm:text-base max-w-sm mx-auto mb-8">
          The page you are looking for doesn't exist, was moved, or you might not have permission to view it.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-gray-800 bg-gray-900/80 text-gray-200 hover:bg-gray-800 hover:text-white transition-all text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all text-sm font-medium shadow-lg shadow-indigo-600/25"
          >
            <Home className="w-4 h-4" />
            Return Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
