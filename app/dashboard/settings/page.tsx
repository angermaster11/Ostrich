"use client";

import { useEffect, useState } from "react";
import {
  User,
  Palette,
  Globe,
  Shield,
  Download,
  Plug,
  Moon,
  Sun,
  Monitor,
  ChevronRight,
  LogOut,
  Trash2,
  Mail,
  Mic,
  Plus,
  X,
  RefreshCw,
  Users,
  Phone,
  MapPin,
  Search,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useNotesStore } from "@/lib/store";
import { apiFetch } from "@/lib/api";

interface GmailAccount {
  id: string;
  email: string;
  is_primary: boolean;
  created_at: string;
}

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  age: number | null;
  gender: string | null;
  source: string;
  created_at: string;
}

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { voiceLanguage, voiceSpeaker, setVoiceLanguage, setVoiceSpeaker } = useNotesStore();
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [fontSize, setFontSize] = useState("medium");
  const [workspaceName, setWorkspaceName] = useState("My Workspace");
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("profile");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [bio, setBio] = useState("");

  // Friends (follow system) state
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [followRequests, setFollowRequests] = useState<any[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);

  // Gmail & Contacts state
  const [gmailAccounts, setGmailAccounts] = useState<GmailAccount[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", email: "", phone: "", address: "", age: "", gender: "" });
  const [gmailLoading, setGmailLoading] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [syncingGoogle, setSyncingGoogle] = useState(false);

  useEffect(() => {
    setMounted(true);
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUser(data.user);
        setDisplayName(
          data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || ""
        );
        // Load social profile
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("avatar_url, is_private, bio")
          .eq("id", data.user.id)
          .single();
        if (profile) {
          setAvatarUrl(profile.avatar_url);
          setIsPrivate(profile.is_private || false);
          setBio(profile.bio || "");
        }
      }
    });

    // Load preferences from localStorage
    const savedFontSize = localStorage.getItem("font-size") || "medium";
    const savedWorkspace = localStorage.getItem("workspace-name") || "My Workspace";
    setFontSize(savedFontSize);
    setWorkspaceName(savedWorkspace);
  }, [supabase]);

  const handleSaveName = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.auth.updateUser({ data: { full_name: displayName } });
    // Also update user_profiles
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/social/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ full_name: displayName, bio, is_private: isPrivate }),
      });
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    // Validate size (max 5MB) and type
    if (file.size > 5 * 1024 * 1024) { alert("Image must be under 5MB"); return; }
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) { alert("Use JPG, PNG, WebP or GIF"); return; }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      // Always overwrite the same path so URL stays fresh without cache issues
      const path = `avatars/${user.id}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadErr) {
        console.error("Upload error:", uploadErr.message);
        alert(`Upload failed: ${uploadErr.message}\n\nMake sure the "avatars" bucket exists and is PUBLIC in Supabase Storage.`);
        return;
      }

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      // Cache-bust so browser doesn't show stale image
      const url = `${urlData.publicUrl}?v=${Date.now()}`;

      setAvatarUrl(url);

      // Update user_profiles table
      await supabase.from("user_profiles").upsert(
        { id: user.id, avatar_url: url },
        { onConflict: "id" }
      );

      // Also update auth.users metadata so avatar shows everywhere
      await supabase.auth.updateUser({ data: { avatar_url: url } });
    } catch (e: any) {
      console.error("Avatar upload failed:", e);
      alert("Upload failed. Check console for details.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePrivacyToggle = async (val: boolean) => {
    setIsPrivate(val);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/social/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ is_private: val }),
      });
    }
  };

  const handleFontSizeChange = (size: string) => {
    setFontSize(size);
    localStorage.setItem("font-size", size);
    document.documentElement.style.fontSize =
      size === "small" ? "14px" : size === "large" ? "18px" : "16px";
  };

  const handleExport = async () => {
    // Export all notes as JSON
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const { data: notes } = await supabase
      .from("notes")
      .select("*")
      .eq("created_by", user.id);

    if (notes) {
      const blob = new Blob([JSON.stringify(notes, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ostrich-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        "Are you sure you want to delete your account? This action cannot be undone."
      )
    )
      return;
    // Sign out — actual deletion would require admin API
    await supabase.auth.signOut();
    router.push("/");
  };

  // Gmail functions
  const loadGmailAccounts = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setGmailLoading(true);
    try {
      const res = await apiFetch("/gmail/accounts", session.access_token);
      if (res.ok) setGmailAccounts(await res.json());
    } catch {} finally { setGmailLoading(false); }
  };

  const linkGmail = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const redirectUri = `${window.location.origin}/dashboard/settings`;
    try {
      const res = await apiFetch(`/gmail/auth-url?redirect_uri=${encodeURIComponent(redirectUri)}`, session.access_token);
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      }
    } catch {}
  };

  const unlinkGmail = async (accountId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      await apiFetch(`/gmail/accounts/${accountId}`, session.access_token, { method: "DELETE" });
      setGmailAccounts((prev) => prev.filter((a) => a.id !== accountId));
    } catch {}
  };

  const setPrimaryGmail = async (accountId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      await apiFetch(`/gmail/accounts/${accountId}/primary`, session.access_token, { method: "PATCH" });
      setGmailAccounts((prev) => prev.map((a) => ({ ...a, is_primary: a.id === accountId })));
    } catch {}
  };

  // Contacts functions
  const loadContacts = async (search = "") => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setContactsLoading(true);
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await apiFetch(`/gmail/contacts${params}`, session.access_token);
      if (res.ok) setContacts(await res.json());
    } catch {} finally { setContactsLoading(false); }
  };

  const addContact = async () => {
    if (!newContact.name.trim()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      const body: any = { name: newContact.name };
      if (newContact.email) body.email = newContact.email;
      if (newContact.phone) body.phone = newContact.phone;
      if (newContact.address) body.address = newContact.address;
      if (newContact.age) body.age = parseInt(newContact.age);
      if (newContact.gender) body.gender = newContact.gender;
      const res = await apiFetch("/gmail/contacts", session.access_token, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const contact = await res.json();
        setContacts((prev) => [contact, ...prev]);
        setNewContact({ name: "", email: "", phone: "", address: "", age: "", gender: "" });
        setShowAddContact(false);
      }
    } catch {}
  };

  const deleteContact = async (contactId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      await apiFetch(`/gmail/contacts/${contactId}`, session.access_token, { method: "DELETE" });
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
    } catch {}
  };

  const deleteAllContacts = async () => {
    if (!confirm("Delete ALL contacts? This cannot be undone.")) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    try {
      await apiFetch("/gmail/contacts", session.access_token, { method: "DELETE" });
      setContacts([]);
    } catch {}
  };

  const syncGoogleContacts = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setSyncingGoogle(true);
    try {
      const res = await apiFetch("/gmail/contacts/sync-google", session.access_token, { method: "POST" });
      if (res.ok) {
        await loadContacts();
      }
    } catch {} finally { setSyncingGoogle(false); }
  };

  // Handle Gmail OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) return;

    let cancelled = false;
    const handleCallback = async () => {
      // Wait for session to be ready
      let session = null;
      for (let i = 0; i < 10; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) { session = data.session; break; }
        await new Promise((r) => setTimeout(r, 500));
      }
      if (!session || cancelled) return;

      const redirectUri = `${window.location.origin}/dashboard/settings`;
      try {
        const res = await apiFetch("/gmail/callback", session.access_token, {
          method: "POST",
          body: JSON.stringify({ code, redirect_uri: redirectUri }),
        });
        if (res.ok) {
          const data = await res.json();
          alert(`Gmail linked: ${data.email}`);
        }
      } catch (err) {
        console.error("Gmail callback failed:", err);
      }
      window.history.replaceState({}, "", "/dashboard/settings");
      setActiveSection("integrations");
      loadGmailAccounts();
    };
    handleCallback();
    return () => { cancelled = true; };
  }, []);

  // Load Gmail accounts and contacts when integrations tab is active
  useEffect(() => {
    if (activeSection === "integrations") {
      loadGmailAccounts();
      loadContacts();
    }
    if (activeSection === "friends") {
      loadFriends();
    }
  }, [activeSection]);

  const loadFriends = async () => {
    setFriendsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const [fwRes, fwingRes, reqRes] = await Promise.all([
        apiFetch("/social/followers", session.access_token),
        apiFetch("/social/following", session.access_token),
        apiFetch("/social/follow-requests", session.access_token),
      ]);
      if (fwRes.ok) setFollowers(await fwRes.json());
      if (fwingRes.ok) setFollowing(await fwingRes.json());
      if (reqRes.ok) setFollowRequests(await reqRes.json());
    } catch {}
    setFriendsLoading(false);
  };

  const handleAcceptRequest = async (followerId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await apiFetch(`/social/follow-requests/${followerId}/accept`, session.access_token, { method: "POST" });
    setFollowRequests((prev) => prev.filter((r) => r.id !== followerId));
    loadFriends();
  };

  const handleDeclineRequest = async (followerId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await apiFetch(`/social/follow-requests/${followerId}/decline`, session.access_token, { method: "DELETE" });
    setFollowRequests((prev) => prev.filter((r) => r.id !== followerId));
  };

  const handleUnfollow = async (userId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await apiFetch(`/social/follow/${userId}`, session.access_token, { method: "DELETE" });
    setFollowing((prev) => prev.filter((f) => f.id !== userId));
  };

  const sections = [
    { id: "profile", name: "Profile", icon: User },
    { id: "friends", name: "Friends", icon: Users },
    { id: "appearance", name: "Appearance", icon: Palette },
    { id: "voice", name: "Voice & AI", icon: Mic },
    { id: "workspace", name: "Workspace", icon: Globe },
    { id: "account", name: "Account", icon: Shield },
    { id: "export", name: "Export", icon: Download },
    { id: "integrations", name: "Integrations", icon: Plug },
  ];

  if (!mounted) return null;

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* Settings sidebar — horizontal scroll on mobile, vertical on desktop */}
      <div className="md:w-52 shrink-0 md:border-r border-b md:border-b-0 border-[var(--brd)] p-3 md:p-4 overflow-x-auto">
        <h2 className="text-lg font-heading font-bold mb-3 md:mb-4 text-[var(--t)] hidden md:block">
          Settings
        </h2>
        <nav className="flex md:flex-col gap-1 md:gap-0.5">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-[12px] md:text-[13px] font-medium transition-colors text-left whitespace-nowrap ${
                  activeSection === section.id
                    ? "bg-[var(--bg-s2)] text-[var(--t)]"
                    : "text-[var(--t2)] hover:bg-[var(--bg-s2)] hover:text-[var(--t)]"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {section.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Settings content */}
      <div className="flex-1 overflow-y-auto">
        <div className="settings-container">
          {/* Profile */}
          {activeSection === "profile" && (
            <div className="animate-fadeIn">
              <h3 className="text-lg font-heading font-bold mb-6 text-[var(--t)]">
                Profile
              </h3>

              <div className="settings-section">
                {/* Avatar */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative group">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleAvatarUpload(f);
                        }}
                      />
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatarUrl}
                          alt="Avatar"
                          className="w-16 h-16 rounded-full object-cover border-2 border-[var(--brd2)]"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                          {displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        {uploadingAvatar ? (
                          <RefreshCw className="w-5 h-5 text-white animate-spin" />
                        ) : (
                          <span className="text-[10px] text-white font-medium">Edit</span>
                        )}
                      </div>
                    </label>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--t)]">
                      {displayName || "User"}
                    </h4>
                    <p className="text-xs text-[var(--t2)]">{user?.email}</p>
                    <p className="text-[11px] text-[var(--t3)] mt-0.5">Click avatar to upload photo</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[13px] font-medium text-[var(--t)] block mb-1.5">
                      Display name
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="settings-input flex-1"
                      />
                      <button
                        onClick={handleSaveName}
                        disabled={saving}
                        className="px-4 py-2 text-xs font-medium bg-[var(--btn)] text-[var(--btn-t)] rounded-md hover:bg-[var(--btn-hover)] transition-colors disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[13px] font-medium text-[var(--t)] block mb-1.5">
                      Bio
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={2}
                      placeholder="Tell people about yourself..."
                      className="settings-input w-full resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[13px] font-medium text-[var(--t)] block mb-1.5">
                      Email
                    </label>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[var(--t3)]" />
                      <span className="text-sm text-[var(--t2)]">
                        {user?.email}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-s2)] text-[var(--t3)]">
                        Read-only
                      </span>
                    </div>
                  </div>

                  {/* Private account */}
                  <div className="flex items-center justify-between py-3 border-t border-[var(--brd)]">
                    <div>
                      <p className="text-[13px] font-medium text-[var(--t)]">Private account</p>
                      <p className="text-[11px] text-[var(--t3)] mt-0.5">
                        When on, new followers must send a request
                      </p>
                    </div>
                    <button
                      onClick={() => handlePrivacyToggle(!isPrivate)}
                      className={`relative w-10 h-6 rounded-full transition-colors ${
                        isPrivate ? "bg-[var(--accent)]" : "bg-[var(--bg-s3)]"
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          isPrivate ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Billing shortcut */}
              <div className="settings-section">
                <h3>Billing</h3>
                <a
                  href="/dashboard/billing"
                  className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-[var(--brd)] bg-[var(--bg-s1)] hover:bg-[var(--bg-s2)] transition-colors group"
                >
                  <span className="text-[13px] font-medium text-[var(--t)]">Manage subscription &amp; billing</span>
                  <ChevronRight className="w-4 h-4 text-[var(--t3)] group-hover:text-[var(--t)] transition-colors" />
                </a>
              </div>

              {/* Logout */}
              <div className="settings-section">
                <h3>Session</h3>
                <button
                  onClick={async () => { await supabase.auth.signOut(); router.push("/"); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--brd)] text-[13px] font-medium text-[var(--t2)] hover:bg-[var(--bg-s2)] hover:text-[var(--danger)] transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Log out
                </button>
              </div>
            </div>
          )}

          {/* Appearance */}
          {activeSection === "appearance" && (
            <div className="animate-fadeIn">
              <h3 className="text-lg font-heading font-bold mb-6 text-[var(--t)]">
                Appearance
              </h3>

              <div className="settings-section">
                <h3>Theme</h3>
                <div className="settings-toggle mb-6">
                  <button
                    onClick={() => setTheme("light")}
                    className={theme === "light" ? "active" : ""}
                  >
                    <Sun className="w-3.5 h-3.5 inline mr-1.5" />
                    Light
                  </button>
                  <button
                    onClick={() => setTheme("dark")}
                    className={theme === "dark" ? "active" : ""}
                  >
                    <Moon className="w-3.5 h-3.5 inline mr-1.5" />
                    Dark
                  </button>
                  <button
                    onClick={() => setTheme("system")}
                    className={theme === "system" ? "active" : ""}
                  >
                    <Monitor className="w-3.5 h-3.5 inline mr-1.5" />
                    System
                  </button>
                </div>
              </div>

              <div className="settings-section">
                <h3>Font size</h3>
                <div className="settings-toggle">
                  {["small", "medium", "large"].map((size) => (
                    <button
                      key={size}
                      onClick={() => handleFontSizeChange(size)}
                      className={fontSize === size ? "active" : ""}
                    >
                      {size.charAt(0).toUpperCase() + size.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Voice & AI */}
          {activeSection === "voice" && (
            <div className="animate-fadeIn">
              <h3 className="text-lg font-heading font-bold mb-6 text-[var(--t)]">
                Voice & AI
              </h3>

              <div className="settings-section">
                <h3>Input Language</h3>
                <p className="text-xs text-[var(--t2)] mb-3">
                  Select the language you speak in voice mode.
                </p>
                <div className="grid grid-cols-2 gap-2 max-w-sm">
                  {[
                    { code: "hi-IN", label: "Hindi" },
                    { code: "en-IN", label: "English (India)" },
                    { code: "ta-IN", label: "Tamil" },
                    { code: "te-IN", label: "Telugu" },
                    { code: "bn-IN", label: "Bengali" },
                    { code: "mr-IN", label: "Marathi" },
                    { code: "gu-IN", label: "Gujarati" },
                    { code: "kn-IN", label: "Kannada" },
                  ].map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setVoiceLanguage(lang.code)}
                      className={`px-3 py-2 rounded-lg text-[13px] font-medium border transition-colors ${
                        voiceLanguage === lang.code
                          ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                          : "border-[var(--brd)] text-[var(--t2)] hover:border-[var(--accent)]/50"
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-section mt-6">
                <h3>AI Voice</h3>
                <p className="text-xs text-[var(--t2)] mb-3">
                  Choose the voice for AI responses.
                </p>
                <div className="grid grid-cols-3 gap-2 max-w-md">
                  {[
                    { id: "anushka", label: "Anushka", gender: "F" },
                    { id: "manisha", label: "Manisha", gender: "F" },
                    { id: "vidya", label: "Vidya", gender: "F" },
                    { id: "arya", label: "Arya", gender: "F" },
                    { id: "priya", label: "Priya", gender: "F" },
                    { id: "kavya", label: "Kavya", gender: "F" },
                    { id: "shreya", label: "Shreya", gender: "F" },
                    { id: "neha", label: "Neha", gender: "F" },
                    { id: "abhilash", label: "Abhilash", gender: "M" },
                    { id: "karun", label: "Karun", gender: "M" },
                    { id: "hitesh", label: "Hitesh", gender: "M" },
                    { id: "rahul", label: "Rahul", gender: "M" },
                    { id: "amit", label: "Amit", gender: "M" },
                    { id: "dev", label: "Dev", gender: "M" },
                    { id: "rohan", label: "Rohan", gender: "M" },
                    { id: "varun", label: "Varun", gender: "M" },
                  ].map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setVoiceSpeaker(v.id)}
                      className={`px-3 py-2 rounded-lg text-[13px] font-medium border transition-colors ${
                        voiceSpeaker === v.id
                          ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                          : "border-[var(--brd)] text-[var(--t2)] hover:border-[var(--accent)]/50"
                      }`}
                    >
                      {v.label}
                      <span className="ml-1 text-[10px] opacity-60">{v.gender}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Workspace */}
          {activeSection === "workspace" && (
            <div className="animate-fadeIn">
              <h3 className="text-lg font-heading font-bold mb-6 text-[var(--t)]">
                Workspace
              </h3>

              <div className="settings-section">
                <div>
                  <label className="text-[13px] font-medium text-[var(--t)] block mb-1.5">
                    Workspace name
                  </label>
                  <input
                    type="text"
                    value={workspaceName}
                    onChange={(e) => {
                      setWorkspaceName(e.target.value);
                      localStorage.setItem("workspace-name", e.target.value);
                    }}
                    className="settings-input w-full max-w-sm"
                  />
                </div>

                <div className="mt-4">
                  <label className="text-[13px] font-medium text-[var(--t)] block mb-1.5">
                    Workspace icon
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
                      {workspaceName?.[0]?.toUpperCase() || "W"}
                    </div>
                    <p className="text-xs text-[var(--t3)]">
                      Workspace icon is auto-generated from the name.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Account */}
          {/* Friends */}
          {activeSection === "friends" && (
            <div className="animate-fadeIn">
              <h3 className="text-lg font-heading font-bold mb-6 text-[var(--t)]">Friends</h3>

              {friendsLoading ? (
                <div className="flex items-center gap-2 py-8 text-[var(--t3)]">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Loading...
                </div>
              ) : (
                <>
                  {/* Follow Requests */}
                  {followRequests.length > 0 && (
                    <div className="settings-section">
                      <h3>Follow Requests ({followRequests.length})</h3>
                      <div className="flex flex-col gap-2">
                        {followRequests.map((req) => (
                          <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--brd)] bg-[var(--bg-s1)]">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] text-white flex items-center justify-center text-[13px] font-bold shrink-0">
                              {(req.full_name?.[0] || "?").toUpperCase()}
                            </div>
                            <span className="flex-1 text-[13px] font-medium text-[var(--t)]">{req.full_name || "Unknown"}</span>
                            <button
                              onClick={() => handleAcceptRequest(req.id)}
                              className="px-3 py-1 text-[12px] font-medium rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleDeclineRequest(req.id)}
                              className="px-3 py-1 text-[12px] font-medium rounded-lg border border-[var(--brd)] text-[var(--t2)] hover:bg-[var(--bg-s2)] transition-colors"
                            >
                              Decline
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Followers */}
                  <div className="settings-section">
                    <h3>Followers ({followers.length})</h3>
                    {followers.length === 0 ? (
                      <p className="text-[13px] text-[var(--t3)]">No followers yet.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {followers.map((f) => (
                          <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--brd)] bg-[var(--bg-s1)]">
                            {f.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={f.avatar_url} alt={f.full_name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] text-white flex items-center justify-center text-[13px] font-bold shrink-0">
                                {(f.full_name?.[0] || "?").toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-medium text-[var(--t)] truncate">{f.full_name || "Unknown"}</p>
                              {!f.i_follow_back && (
                                <p className="text-[11px] text-[var(--t3)]">Not following back</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Following */}
                  <div className="settings-section">
                    <h3>Following ({following.length})</h3>
                    {following.length === 0 ? (
                      <p className="text-[13px] text-[var(--t3)]">Not following anyone yet.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {following.map((f) => (
                          <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--brd)] bg-[var(--bg-s1)]">
                            {f.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={f.avatar_url} alt={f.full_name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] text-white flex items-center justify-center text-[13px] font-bold shrink-0">
                                {(f.full_name?.[0] || "?").toUpperCase()}
                              </div>
                            )}
                            <span className="flex-1 text-[13px] font-medium text-[var(--t)] truncate">{f.full_name || "Unknown"}</span>
                            <button
                              onClick={() => handleUnfollow(f.id)}
                              className="px-3 py-1 text-[12px] font-medium rounded-lg border border-[var(--brd)] text-[var(--t2)] hover:bg-[var(--bg-s2)] hover:text-[var(--danger)] transition-colors"
                            >
                              Unfollow
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeSection === "account" && (
            <div className="animate-fadeIn">
              <h3 className="text-lg font-heading font-bold mb-6 text-[var(--t)]">
                Account
              </h3>

              <div className="settings-section">
                <h3>Session</h3>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.push("/");
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium border border-[var(--brd)] text-[var(--t2)] hover:bg-[var(--bg-s2)] hover:text-[var(--t)] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>

              <div className="settings-section">
                <h3>Danger zone</h3>
                <div className="p-4 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/5">
                  <h4 className="text-sm font-semibold text-[var(--danger)] mb-1">
                    Delete account
                  </h4>
                  <p className="text-xs text-[var(--t2)] mb-3">
                    Permanently delete your account and all your data. This
                    action cannot be undone.
                  </p>
                  <button
                    onClick={handleDeleteAccount}
                    className="px-4 py-2 text-xs font-medium bg-[var(--danger)] text-white rounded-md hover:opacity-90 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5 inline mr-1.5" />
                    Delete my account
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Export */}
          {activeSection === "export" && (
            <div className="animate-fadeIn">
              <h3 className="text-lg font-heading font-bold mb-6 text-[var(--t)]">
                Export
              </h3>

              <div className="settings-section">
                <h3>Export all data</h3>
                <p className="text-sm text-[var(--t2)] mb-4">
                  Download all your notes as a JSON file for backup or
                  migration.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium bg-[var(--btn)] text-[var(--btn-t)] hover:bg-[var(--btn-hover)] transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export as JSON
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Integrations — Gmail & Contacts */}
          {activeSection === "integrations" && (
            <div className="animate-fadeIn">
              <h3 className="text-lg font-heading font-bold mb-6 text-[var(--t)]">
                Integrations
              </h3>

              {/* Gmail Accounts */}
              <div className="settings-section">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="flex items-center gap-2">
                      <Mail className="w-4 h-4" /> Gmail Accounts
                    </h3>
                    <p className="text-xs text-[var(--t2)] mt-1">
                      Link Gmail to read, send, and manage emails via AI Brain.
                    </p>
                  </div>
                  <button
                    onClick={linkGmail}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[var(--btn)] text-[var(--btn-t)] rounded-md hover:bg-[var(--btn-hover)] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Link Gmail
                  </button>
                </div>

                {gmailLoading ? (
                  <p className="text-xs text-[var(--t3)]">Loading...</p>
                ) : gmailAccounts.length === 0 ? (
                  <p className="text-sm text-[var(--t2)] p-4 rounded-lg border border-dashed border-[var(--brd)] text-center">
                    No Gmail accounts linked yet. Click &quot;Link Gmail&quot; to get started.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {gmailAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-[var(--brd)] bg-[var(--bg)]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                            <Mail className="w-4 h-4 text-red-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[var(--t)]">{account.email}</p>
                            {account.is_primary && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent)]/10 text-[var(--accent)]">
                                Primary
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!account.is_primary && (
                            <button
                              onClick={() => setPrimaryGmail(account.id)}
                              className="text-[11px] px-2 py-1 rounded border border-[var(--brd)] text-[var(--t2)] hover:bg-[var(--bg-s2)]"
                            >
                              Set Primary
                            </button>
                          )}
                          <button
                            onClick={() => unlinkGmail(account.id)}
                            className="text-[11px] px-2 py-1 rounded border border-[var(--danger)]/30 text-[var(--danger)] hover:bg-[var(--danger)]/10"
                          >
                            Unlink
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Contacts */}
              <div className="settings-section mt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="flex items-center gap-2">
                      <Users className="w-4 h-4" /> Contacts
                    </h3>
                    <p className="text-xs text-[var(--t2)] mt-1">
                      Manage contacts. AI can use these to send emails by name.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={syncGoogleContacts}
                      disabled={syncingGoogle || gmailAccounts.length === 0}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-[var(--brd)] text-[var(--t2)] rounded-md hover:bg-[var(--bg-s2)] transition-colors disabled:opacity-40"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncingGoogle ? "animate-spin" : ""}`} />
                      Sync Google
                    </button>
                    <button
                      onClick={() => setShowAddContact(true)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[var(--btn)] text-[var(--btn-t)] rounded-md hover:bg-[var(--btn-hover)] transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--t3)]" />
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    value={contactSearch}
                    onChange={(e) => {
                      setContactSearch(e.target.value);
                      loadContacts(e.target.value);
                    }}
                    className="settings-input w-full pl-9"
                  />
                </div>

                {/* Add Contact Form */}
                {showAddContact && (
                  <div className="p-4 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-[var(--t)]">New Contact</h4>
                      <button onClick={() => setShowAddContact(false)}>
                        <X className="w-4 h-4 text-[var(--t3)]" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Name *"
                        value={newContact.name}
                        onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                        className="settings-input"
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={newContact.email}
                        onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                        className="settings-input"
                      />
                      <input
                        type="tel"
                        placeholder="Phone"
                        value={newContact.phone}
                        onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                        className="settings-input"
                      />
                      <input
                        type="text"
                        placeholder="Address"
                        value={newContact.address}
                        onChange={(e) => setNewContact({ ...newContact, address: e.target.value })}
                        className="settings-input"
                      />
                      <input
                        type="number"
                        placeholder="Age"
                        value={newContact.age}
                        onChange={(e) => setNewContact({ ...newContact, age: e.target.value })}
                        className="settings-input"
                      />
                      <select
                        value={newContact.gender}
                        onChange={(e) => setNewContact({ ...newContact, gender: e.target.value })}
                        className="settings-input"
                      >
                        <option value="">Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <button
                      onClick={addContact}
                      className="mt-3 px-4 py-2 text-xs font-medium bg-[var(--btn)] text-[var(--btn-t)] rounded-md hover:bg-[var(--btn-hover)]"
                    >
                      Save Contact
                    </button>
                  </div>
                )}

                {/* Contacts List */}
                {contactsLoading ? (
                  <p className="text-xs text-[var(--t3)]">Loading contacts...</p>
                ) : contacts.length === 0 ? (
                  <p className="text-sm text-[var(--t2)] p-4 rounded-lg border border-dashed border-[var(--brd)] text-center">
                    No contacts yet. Add manually or sync from Google.
                  </p>
                ) : (
                  <>
                    <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                      {contacts.map((contact) => (
                        <div
                          key={contact.id}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--brd)] bg-[var(--bg)] hover:bg-[var(--bg-s2)] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-xs font-bold text-[var(--accent)]">
                              {contact.name?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[var(--t)]">{contact.name}</p>
                              <div className="flex items-center gap-3 text-[11px] text-[var(--t3)]">
                                {contact.email && (
                                  <span className="flex items-center gap-0.5">
                                    <Mail className="w-3 h-3" /> {contact.email}
                                  </span>
                                )}
                                {contact.phone && (
                                  <span className="flex items-center gap-0.5">
                                    <Phone className="w-3 h-3" /> {contact.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-s2)] text-[var(--t3)]">
                              {contact.source}
                            </span>
                            <button
                              onClick={() => deleteContact(contact.id)}
                              className="p-1 rounded hover:bg-[var(--danger)]/10 text-[var(--t3)] hover:text-[var(--danger)]"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {contacts.length > 0 && (
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={deleteAllContacts}
                          className="text-[11px] px-3 py-1.5 rounded border border-[var(--danger)]/30 text-[var(--danger)] hover:bg-[var(--danger)]/10"
                        >
                          <Trash2 className="w-3 h-3 inline mr-1" /> Delete All
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
