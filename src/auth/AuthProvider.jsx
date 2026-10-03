import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase, isLive, toError } from "../api/client.js";

/*
 * Customer and admin authentication (Supabase Auth, email + password).
 * Exposes the session, the customer's profile and whether the user is an admin.
 */
const AuthContext = createContext(null);
const signedOut = { loading: false, session: null, profile: null, isAdmin: false, recovery: false };

export function AuthProvider({ children }) {
  const [state, setState] = useState({ ...signedOut, loading: isLive });
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const load = useCallback(async (session, recovery = false) => {
    if (!session) {
      setState(signedOut);
      return;
    }
    try {
      const [profile, admin] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle(),
        supabase.rpc("is_admin"),
      ]);
      setState((current) => ({ loading: false, session, profile: profile.data || null, isAdmin: Boolean(admin.data), recovery: recovery || current.recovery }));
    } catch {
      setState({ loading: false, session, profile: null, isAdmin: false, recovery });
    }
  }, []);

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
