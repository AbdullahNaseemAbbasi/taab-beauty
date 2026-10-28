import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase, isLive, toError } from "../api/client.js";

/*
 * Customer and admin authentication (Supabase Auth, email + password).
 * Exposes the session, the customer's profile, whether the user is an admin
 * and whether they are the store owner.
 */
const AuthContext = createContext(null);
const signedOut = { loading: false, session: null, profile: null, isAdmin: false, isOwner: false, recovery: false };
const MAX_RETRIES = 3;

/* Resolves to { data, error } even when the request itself throws. */
const settle = (request) => Promise.resolve(request).then((result) => result, (error) => ({ data: null, error }));

export function AuthProvider({ children }) {
  const [state, setState] = useState({ ...signedOut, loading: isLive });
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const retry = useRef({ timer: null, attempt: 0 });
  /* The user whose admin status has been loaded successfully at least once. */
  const verified = useRef(null);

  const load = useCallback(async (session, recovery = false) => {
    clearTimeout(retry.current.timer);
    if (!session) {
      retry.current.attempt = 0;
      verified.current = null;
      setState(signedOut);
      return;
    }
    const userId = session.user.id;
    const [profile, admin, owner] = await Promise.all([
      settle(supabase.from("profiles").select("*").eq("id", userId).maybeSingle()),
      settle(supabase.rpc("is_admin")),
      settle(supabase.rpc("is_owner")),
    ]);
    const failed = Boolean(profile.error || admin.error || owner.error);
    const attempt = failed ? retry.current.attempt + 1 : 0;
    retry.current.attempt = attempt;
    const known = verified.current === userId;
    if (!admin.error) verified.current = userId;

    /* A failed check (a network blip, a token refresh) keeps what we already knew and tries again, instead of locking an admin out. */
    setState((current) => {
      const sameUser = current.session?.user?.id === userId;
      return {
        loading: Boolean(admin.error) && !known && attempt <= MAX_RETRIES,
        session,
        profile: profile.error ? (sameUser ? current.profile : null) : profile.data || null,
        isAdmin: admin.error ? known && current.isAdmin : Boolean(admin.data),
        isOwner: owner.error ? known && current.isOwner : Boolean(owner.data),
        recovery: recovery || current.recovery,
      };
    });
    if (failed && attempt <= MAX_RETRIES) retry.current.timer = setTimeout(() => load(session), 1000 * 2 ** (attempt - 1));
  }, []);

  useEffect(() => () => clearTimeout(retry.current.timer), []);

  useEffect(() => {
    if (!isLive) return undefined;
    supabase.auth.getSession().then(({ data }) => load(data.session));
    // Never call Supabase from inside this callback directly (it can deadlock); defer instead.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setTimeout(() => load(session, event === "PASSWORD_RECOVERY"), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [load]);

  /* A password-reset link can land on any page; the new-password form lives on /account. */
  useEffect(() => {
    if (state.recovery && pathname !== "/account") navigate("/account", { replace: true });
  }, [state.recovery, pathname, navigate]);

  const value = useMemo(() => {
    const user = state.session?.user || null;
    return {
      ...state,
      user,
      available: isLive,
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw toError(error, "Could not sign you in.");
      },
      async signUp({ name, email, phone, password }) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim(), phone: phone.replace(/[\s-]/g, "") }, emailRedirectTo: `${window.location.origin}/account` },
        });
        if (error) throw toError(error, "Could not create your account.");
        return { needsConfirmation: !data.session };
      },
      async signOut() {
        await supabase.auth.signOut();
        /* The saved checkout details (name, phone, address) belong to whoever was signed in. */
        try {
          localStorage.removeItem("naz:customer");
        } catch {
          /* storage unavailable */
        }
      },
      async resetPassword(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/account` });
        if (error) throw toError(error, "Could not send the reset email.");
      },
      async updatePassword(password) {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw toError(error, "Could not update your password.");
        setState((current) => ({ ...current, recovery: false }));
      },
      async updateProfile(patch) {
        if (!user) return;
        const { data, error } = await supabase.from("profiles").upsert({ id: user.id, ...patch }, { onConflict: "id" }).select().single();
        if (error) throw toError(error, "Could not save your details.");
        setState((current) => ({ ...current, profile: data }));
      },
    };
  }, [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
