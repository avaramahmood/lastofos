import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SignIn, useAuth } from "@clerk/react";
import { exchangeClerkToken, auth, onAuthStateChanged, signOut } from "@/lib/auth";
import { joinLobby } from "@/lib/api";

export default function Game() {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const exchanging = useRef(false);

  // Already has a game session -> straight to the lobby, which routes by game status and role
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && !exchanging.current) navigate("/lobby", { replace: true });
      setAuthChecking(false);
    });
    return unsub;
  }, [navigate]);

  // Clerk finished signing the student in -> swap its token for a game session and join the game
  useEffect(() => {
    if (!isLoaded || !isSignedIn || auth.currentUser || exchanging.current) return;
    exchanging.current = true;
    setWorking(true);
    setError(null);
    (async () => {
      try {
        const clerkToken = await getToken();
        if (!clerkToken) throw new Error("Could not get a sign-in token. Try again.");
        await exchangeClerkToken(clerkToken);
        // Everyone shares one open game; join it (or start a fresh lobby if none exists)
        const { sessionId } = await joinLobby();
        localStorage.setItem("sessionId", sessionId);
        navigate("/lobby", { replace: true });
      } catch (err: any) {
        setError(err.message ?? "Login failed. Try again.");
        await signOut(); // ends the Clerk session too, so a wrong (non-VIT) account can retry
      } finally {
        exchanging.current = false;
        setWorking(false);
      }
    })();
  }, [isLoaded, isSignedIn, getToken, navigate]);

  // Show loading while checking initial auth state
  if (authChecking) {
    return (
      <div className="min-h-screen w-full bg-pixel-navy flex items-center justify-center">
        <span className="font-pixel text-sm text-pixel-cyan animate-pulse">LOADING...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-pixel-navy flex items-center justify-center overflow-auto relative">
      {/* Background image - pixel art cityscape */}
      <img
        src="https://api.builder.io/api/v1/image/assets/TEMP/37dd726e68a0725cf6d40157a803bb41645d6400?width=2880"
        alt="Cyberpunk pixel art cityscape"
        className="absolute inset-0 w-full h-full object-cover pixelated"
      />

      {/* Content container */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <h1 className="font-tiny text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-pixel-cream text-center leading-tight mb-8 sm:mb-12">
          THE LAST
          <br />
          OF O.S
        </h1>

        {error && (
          <p className="mb-4 max-w-md font-pixel text-[10px] sm:text-xs text-red-300 text-center bg-black/70 border border-red-400/50 px-3 py-2">
            {error}
          </p>
        )}

        {working || (isLoaded && isSignedIn) ? (
          <p className="font-pixel text-sm text-pixel-cyan animate-pulse">ENTERING THE GAME...</p>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <p className="font-pixel text-[10px] sm:text-xs text-white bg-black/60 px-3 py-2 text-center">
              SIGN IN WITH YOUR @VITSTUDENT.AC.IN EMAIL
            </p>
            <SignIn routing="hash" appearance={{ variables: { colorPrimary: "#6ec4e5" } }} />
          </div>
        )}

        {/* Back button */}
        <button
          onClick={() => navigate("/")}
          className="mt-8 sm:mt-12 px-5 py-2 bg-black/50 border border-pixel-cyan/40 font-pixel text-xs sm:text-sm text-pixel-cyan hover:bg-pixel-cyan/20 hover:text-white transition-colors uppercase tracking-wider"
        >
          BACK
        </button>
      </div>
    </div>
  );
}
