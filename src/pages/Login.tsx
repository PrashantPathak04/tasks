import React, { useState, useEffect, JSX,useRef } from "react";
import { signInWithEmailAndPassword, signInWithPopup, createUserWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth, provider } from "../util/firebase";
import { useNavigate } from "react-router-dom";

export default function Login(): JSX.Element {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSignup, setIsSignup] = useState(false);
    const [serverUuid, setServerUuid] = useState<string | null>(null);
    const [isAuthChecking, setIsAuthChecking] = useState(true);
    const navigate = useNavigate();
    const sessionTimer = useRef<number | null>(null);

    useEffect(() => {
        // Check if user has valid session token
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user && isSessionValid()) {
                try {
                    // const idToken = await user.getIdToken();
                    // const uuid = await fetchUuidFromToken(idToken);
                    // Store token with 1-hour expiration
                    storeAuthSession(user.uid);
                    setServerUuid(user.uid);
                    navigate("/dashboard", { state: { uuid: user.uid } });
                } catch (err) {
                    console.error("Error fetching UUID:", err);
                    setIsAuthChecking(false);
                }
            } else {
                setIsAuthChecking(false);
            }
        });
        restoreAndScheduleSessionClear();

        return () => {
            unsubscribe();
            clearScheduledSessionClear();
        };
    }, [navigate]);

    function isJsonResponse(res: Response) {
        const ct = res.headers.get("content-type");
        return ct && ct.indexOf("application/json") !== -1;
    }

    function storeAuthSession(uuid: string) {
        // const expirationTime = new Date().getTime() + 60 * 60 * 1000; // 1 hour from now
        const expirationTime = new Date().getTime() +  60*10000;
        const sessionData = {
            uuid: uuid,
            expiresAt: expirationTime,
        };
        localStorage.setItem("authSession", JSON.stringify(sessionData));
    }

   function isSessionValid() {
        const session = localStorage.getItem("authSession");
        if (!session) return false;
        try {
            const sessionData = JSON.parse(session);
            const valid = new Date().getTime() < sessionData.expiresAt;
            if (!valid) {
                // clear expired session immediately
                localStorage.removeItem("authSession");
                clearScheduledSessionClear();
            }
            return valid;
        } catch {
            localStorage.removeItem("authSession");
            return false;
        }
    }

      // schedule clearing authSession when it expires
    function scheduleSessionClear(expiresAt: number) {
        clearScheduledSessionClear();
        const ms = expiresAt - Date.now();
        if (ms <= 0) {
            localStorage.removeItem("authSession");
            return;
        }
        // store timer id so we can clear on unmount or refresh
        sessionTimer.current = window.setTimeout(() => {
            localStorage.removeItem("authSession");
            sessionTimer.current = null;
        }, ms) as unknown as number;
    }

    function clearScheduledSessionClear() {
        if (sessionTimer.current != null) {
            clearTimeout(sessionTimer.current);
            sessionTimer.current = null;
        }
    }


     function restoreAndScheduleSessionClear() {
        const session = localStorage.getItem("authSession");
        if (!session) return;
        try {
            const sessionData = JSON.parse(session);
            const expiresAt = sessionData.expiresAt as number;
            if (typeof expiresAt === "number") {
                if (Date.now() >= expiresAt) {
                    localStorage.removeItem("authSession");
                } else {
                    // schedule clear for remaining time
                    scheduleSessionClear(expiresAt);
                }
            } else {
                localStorage.removeItem("authSession");
            }
        } catch {
            localStorage.removeItem("authSession");
        }
    }

    // async function fetchUuidFromToken(idToken: string): Promise<string> {
    //     const res = await fetch("/api/users/from-token", {
    //         method: "POST",
    //         headers: {
    //             Authorization: `Bearer ${idToken}`,
    //         },
    //     });
    //     if (!res.ok) {
    //         const txt = await res.text();
    //         throw new Error(txt || "Server error fetching UUID");
    //     }
    //     const data = isJsonResponse(res) ? await res.json() : null;
    //     const uuid = data?.uuid;
    //     if (!uuid) throw new Error("UUID not returned from server");
    //     return uuid;
    // }

    async function handleLocalSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        setError(null);
        setServerUuid(null);

        try {
            if (isSignup) {
                const userCred = await createUserWithEmailAndPassword(auth, email, password);
                // const idToken = await userCred.user.getIdToken();
                // const uuid = await fetchUuidFromToken(idToken);
                storeAuthSession(userCred.user.uid);
                setServerUuid(userCred.user.uid);
                navigate("/dashboard", { state: { uuid: userCred.user.uid } });
            } else {
                const userCred = await signInWithEmailAndPassword(auth, email, password);
                // const idToken = await userCred.user.getIdToken();
                // const uuid = await fetchUuidFromToken(idToken);
                storeAuthSession(userCred.user.uid);
                setServerUuid(userCred.user.uid);
                navigate("/dashboard", { state: { uuid: userCred.user.uid } });
            }
        } catch (err: any) {
            setError(err.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    }

    async function handleGoogleSignIn() {
        if (loading) return;
        setLoading(true);
        setError(null);
        setServerUuid(null);
        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            // const idToken = await user.getIdToken();
            // const uuid = await fetchUuidFromToken(idToken);
            storeAuthSession( user.uid);
            setServerUuid( user.uid);
            navigate("/dashboard", { state: { uuid: user.uid } });
        } catch (err: any) {
            setError(err.message || "Failed to sign in with Google");
        } finally {
            setLoading(false);
        }
    }

    if (isAuthChecking) {
        return <div style={{ textAlign: "center", marginTop: "6rem" }}>Loading...</div>;
    }

    return (
        <div style={{ maxWidth: 420, margin: "6rem auto", padding: 24, border: "1px solid #eee", borderRadius: 8 }}>
            <h2 style={{ marginBottom: 8 }}>{isSignup ? "Sign up" : "Sign in"}</h2>

            <div style={{ marginBottom: 16 }}>
                <button
                    onClick={handleGoogleSignIn}
                    style={{ width: "100%", padding: "10px 12px", marginBottom: 8, backgroundColor: "#0066cc", color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 14 }}
                    aria-label="Sign in with Google"
                    disabled={loading}
                >
                    {loading ? "Please wait…" : (isSignup ? "Sign up with Google" : "Sign in with Google")}
                </button>
            </div>

            <hr style={{ margin: "16px 0" }} />

            <form onSubmit={handleLocalSubmit}>
                <label style={{ display: "block", marginBottom: 8 }}>
                    Email
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ display: "block", width: "100%", padding: "10px 12px", marginTop: 6, border: "1px solid #ccc", borderRadius: 4, fontSize: 14, boxSizing: "border-box" }}
                    />
                </label>

                <label style={{ display: "block", marginBottom: 12 }}>
                    Password
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ display: "block", width: "100%", padding: "10px 12px", marginTop: 6, border: "1px solid #ccc", borderRadius: 4, fontSize: 14, boxSizing: "border-box" }}
                    />
                </label>

                {error && <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>}

                <button type="submit" disabled={loading} style={{ padding: "10px 12px", width: "100%", backgroundColor: "#0066cc", color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 14 }}>
                    {loading ? (isSignup ? "Signing up…" : "Signing in…") : (isSignup ? "Sign up" : "Sign in")}
                </button>
            </form>

            <div style={{ marginTop: 12, fontSize: 13 }}>
                {isSignup ? "Already have an account? " : "Don't have an account? "}
                <button
                    onClick={() => { setIsSignup(!isSignup); setError(null); setServerUuid(null); }}
                    style={{ background: "none", border: "none", color: "#0066cc", cursor: "pointer", padding: 0, marginLeft: 4 }}
                >
                    {isSignup ? "Sign in" : "Sign up"}
                </button>
            </div>

            {serverUuid && (
                <div style={{ marginTop: 12, padding: 12, background: "#f6f8ff", borderRadius: 4 }}>
                    <strong>UUID:</strong> {serverUuid}
                </div>
            )}
        </div>
    );
}