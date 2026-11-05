import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SignIn, useAuth } from "@clerk/react";
import { exchangeClerkToken, auth, onAuthStateChanged, signOut } from "@/lib/auth";
import { joinLobby } from "@/lib/api";
import { PixelButton, PixelPanel } from "@/components/pixel";

// Clerk's own widget, restyled to sit inside the game's panels.
// Newer Clerk UI versions renamed several variables, so both spellings are set.
const clerkAppearance: any = {
  variables: {
    colorPrimary: "#00e5ff",
    colorBackground: "#05080f",
    colorForeground: "#ffffff",
    colorMutedForeground: "#9ca3af",
    colorPrimaryForeground: "#000000",
    colorInput: "#000000",
    colorInputForeground: "#ffffff",
    colorText: "#ffffff",
    colorTextSecondary: "#9ca3af",
    colorTextOnPrimaryBackground: "#000000",
    colorInputBackground: "#000000",
    colorInputText: "#ffffff",
    colorNeutral: "#ffffff",
    colorDanger: "#f87171",
    fontFamily: "'Jura', sans-serif",
    borderRadius: "0px",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full !shadow-none !rounded-none !bg-transparent",
    card: "!shadow-none !bg-transparent !border-0 !rounded-none !p-0 w-full",
    header: "text-center",
    headerTitle: "!font-pixel !text-xs !uppercase !text-white",
    headerSubtitle: "!text-gray-400",
    formFieldLabel: "!text-gray-300",
    formFieldInput: "!rounded-none !bg-black !text-white !border-gray-600 focus:!border-[#00e5ff] !shadow-none",
    formFieldInputShowPasswordButton: "!text-gray-300",
    formButtonPrimary:
      "!font-pixel !text-[10px] !uppercase !rounded-none !bg-transparent !border !border-[#00e5ff] !text-[#00e5ff] hover:!bg-[#00e5ff]/20 !shadow-none",
    socialButtonsBlockButton: "!rounded-none !bg-black/40 !border-gray-600 !text-white hover:!bg-white/10",
    socialButtonsBlockButtonText: "!text-white",
    dividerLine: "!bg-gray-600",
    dividerText: "!text-gray-400",
    otpCodeFieldInput: "!rounded-none !bg-black !text-white !border-gray-600",
    formResendButton: "!text-[#00e5ff]",
    backLink: "!text-[#00e5ff]",
    footerActionText: "!text-gray-400",
    footerActionLink: "!text-[#00e5ff]",
    identityPreview: "!rounded-none !border-gray-600 !bg-transparent",
    identityPreviewText: "!text-white",
    identityPreviewEditButton: "!text-[#00e5ff]",
    alertText: "!text-red-300",
  },
};

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

      <div className="relative z-10 flex flex-col items-center justify-center w-full min-h-screen py-8 px-4 sm:px-6 lg:px-8">
        <h1 className="font-tiny text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-pixel-cream text-center leading-tight mb-8 sm:mb-12">
          THE LAST
          <br />
          OF O.S
        </h1>

        <PixelPanel className="w-full max-w-md p-6 sm:p-8">
          <h2 className="font-pixel text-base sm:text-lg md:text-xl text-white text-center mb-2">
            PLAYER
            <br />
            LOGIN
          </h2>
          <p className="font-jura text-xs sm:text-sm text-gray-300 text-center mb-6">
            Use your <span className="text-pixel-cyan">@vitstudent.ac.in</span> email. We send you a one-time code.
          </p>

          {error && (
            <p className="mb-4 font-jura text-xs sm:text-sm text-red-300 text-center border border-red-400/50 bg-red-950/40 px-3 py-2">
              {error}
            </p>
          )}

          {working || (isLoaded && isSignedIn) ? (
            <p className="font-pixel text-xs text-pixel-cyan text-center animate-pulse py-6">ENTERING THE O.S...</p>
          ) : (
            <div className="flex justify-center">
              <SignIn routing="hash" appearance={clerkAppearance} />
            </div>
          )}
        </PixelPanel>

        <PixelButton onClick={() => navigate("/")} className="mt-8 sm:mt-10 tracking-wider">
          BACK
        </PixelButton>
      </div>
    </div>
  );
}
