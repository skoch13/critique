#!/usr/bin/env node
/**
 * Captures real opentui output for use in the web preview
 * Run: node --experimental-strip-types scripts/capture-example.ts
 * Or: npx tsx scripts/capture-example.ts
 */
import pty from "node-pty";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COLS = 240;
const ROWS = 1000;

// Create a sample diff
const oldContent = `import { useState } from "react";
import { fetchUser, fetchPosts } from "./api";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { Spinner } from "./components/Spinner";

interface User {
  id: number;
  name: string;
  email: string;
}

interface Post {
  id: number;
  title: string;
  body: string;
  userId: number;
}

export function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user data on mount
  useEffect(() => {
    fetchUser(1)
      .then(setUser)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Fetch posts when user is loaded
  useEffect(() => {
    if (user) {
      fetchPosts(user.id).then(setPosts);
    }
  }, [user]);

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="dashboard">
      <Header user={user} />
      <main>
        <h1>Welcome, {user?.name}</h1>
        <section className="posts">
          <h2>Your Posts</h2>
          {posts.map((post) => (
            <article key={post.id}>
              <h3>{post.title}</h3>
              <p>{post.body}</p>
            </article>
          ))}
        </section>
      </main>
      <Footer />
    </div>
  );
}

export function Settings() {
  const [theme, setTheme] = useState("light");
  const [notifications, setNotifications] = useState(true);

  return (
    <div className="settings">
      <h1>Settings</h1>
      <label>
        Theme:
        <select value={theme} onChange={(e) => setTheme(e.target.value)}>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          checked={notifications}
          onChange={(e) => setNotifications(e.target.checked)}
        />
        Enable notifications
      </label>
    </div>
  );
}`;

const newContent = `import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchUser, fetchPosts, updateUser, deletePost, createPost } from "./api";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { Spinner } from "./components/Spinner";
import { Modal } from "./components/Modal";
import { Toast } from "./components/Toast";
import { useAuth } from "./hooks/useAuth";
import { useLocalStorage } from "./hooks/useLocalStorage";

interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  role: "admin" | "user" | "guest";
  createdAt: Date;
}

interface Post {
  id: number;
  title: string;
  body: string;
  userId: number;
  tags: string[];
  publishedAt: Date;
  likes: number;
}

interface DashboardState {
  user: User | null;
  posts: Post[];
  loading: boolean;
  error: string | null;
  selectedPost: Post | null;
  isModalOpen: boolean;
}

const initialState: DashboardState = {
  user: null,
  posts: [],
  loading: true,
  error: null,
  selectedPost: null,
  isModalOpen: false,
};

export function Dashboard() {
  const { isAuthenticated, token } = useAuth();
  const [state, setState] = useState<DashboardState>(initialState);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "likes">("date");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const { user, posts, loading, error, selectedPost, isModalOpen } = state;

  // Memoized filtered and sorted posts
  const filteredPosts = useMemo(() => {
    let result = posts.filter(
      (post) =>
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (sortBy === "date") {
      result = result.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    } else {
      result = result.sort((a, b) => b.likes - a.likes);
    }

    return result;
  }, [posts, searchQuery, sortBy]);

  // Fetch user data on mount
  useEffect(() => {
    if (!isAuthenticated) return;

    const controller = new AbortController();

    async function loadData() {
      try {
        const userData = await fetchUser(token, { signal: controller.signal });
        setState((prev) => ({ ...prev, user: userData, loading: false }));
      } catch (err) {
        if (err.name !== "AbortError") {
          setState((prev) => ({ ...prev, error: err.message, loading: false }));
        }
      }
    }

    loadData();
    return () => controller.abort();
  }, [isAuthenticated, token]);

  // Fetch posts when user is loaded
  useEffect(() => {
    if (!user) return;

    const controller = new AbortController();

    fetchPosts(user.id, { signal: controller.signal })
      .then((data) => setState((prev) => ({ ...prev, posts: data })))
      .catch((err) => {
        if (err.name !== "AbortError") {
          setToast({ message: "Failed to load posts", type: "error" });
        }
      });

    return () => controller.abort();
  }, [user]);

  const handleDeletePost = useCallback(
    async (postId: number) => {
      try {
        await deletePost(postId, token);
        setState((prev) => ({
          ...prev,
          posts: prev.posts.filter((p) => p.id !== postId),
          isModalOpen: false,
          selectedPost: null,
        }));
        setToast({ message: "Post deleted successfully", type: "success" });
      } catch (err) {
        setToast({ message: "Failed to delete post", type: "error" });
      }
    },
    [token]
  );

  const handleCreatePost = useCallback(
    async (title: string, body: string, tags: string[]) => {
      try {
        const newPost = await createPost({ title, body, tags, userId: user!.id }, token);
        setState((prev) => ({
          ...prev,
          posts: [newPost, ...prev.posts],
          isModalOpen: false,
        }));
        setToast({ message: "Post created successfully", type: "success" });
      } catch (err) {
        setToast({ message: "Failed to create post", type: "error" });
      }
    },
    [token, user]
  );

  const openPostModal = useCallback((post: Post | null) => {
    setState((prev) => ({ ...prev, selectedPost: post, isModalOpen: true }));
  }, []);

  const closeModal = useCallback(() => {
    setState((prev) => ({ ...prev, selectedPost: null, isModalOpen: false }));
  }, []);

  if (!isAuthenticated) {
    return <div className="auth-required">Please log in to view your dashboard.</div>;
  }

  if (loading) {
    return <Spinner size="large" label="Loading your dashboard..." />;
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Something went wrong</h2>
        <p className="error-message">{error}</p>
        <button onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Header user={user} onLogout={() => {}} />
      <main>
        <section className="welcome-banner">
          <h1>Welcome back, {user?.name}!</h1>
          <p>You have {posts.length} posts and {posts.reduce((acc, p) => acc + p.likes, 0)} total likes.</p>
        </section>

        <section className="posts-controls">
          <input
            type="search"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "date" | "likes")}>
            <option value="date">Sort by Date</option>
            <option value="likes">Sort by Likes</option>
          </select>
          <button className="btn-primary" onClick={() => openPostModal(null)}>
            Create New Post
          </button>
        </section>

        <section className="posts-grid">
          <h2>Your Posts ({filteredPosts.length})</h2>
          {filteredPosts.length === 0 ? (
            <p className="no-posts">No posts found. Try a different search or create a new post!</p>
          ) : (
            filteredPosts.map((post) => (
              <article key={post.id} className="post-card">
                <header>
                  <h3>{post.title}</h3>
                  <span className="post-date">{new Date(post.publishedAt).toLocaleDateString()}</span>
                </header>
                <p>{post.body.slice(0, 150)}...</p>
                <footer>
                  <div className="tags">
                    {post.tags.map((tag) => (
                      <span key={tag} className="tag">#{tag}</span>
                    ))}
                  </div>
                  <div className="post-actions">
                    <span className="likes">❤️ {post.likes}</span>
                    <button onClick={() => openPostModal(post)}>Edit</button>
                    <button className="btn-danger" onClick={() => handleDeletePost(post.id)}>Delete</button>
                  </div>
                </footer>
              </article>
            ))
          )}
        </section>
      </main>

      {isModalOpen && (
        <Modal onClose={closeModal}>
          <PostForm
            post={selectedPost}
            onSubmit={selectedPost ? handleUpdatePost : handleCreatePost}
            onCancel={closeModal}
          />
        </Modal>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <Footer />
    </div>
  );
}

export function Settings() {
  const { user, updateProfile } = useAuth();
  const [theme, setTheme] = useLocalStorage("theme", "light");
  const [notifications, setNotifications] = useLocalStorage("notifications", true);
  const [emailDigest, setEmailDigest] = useLocalStorage("emailDigest", "weekly");
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    bio: "",
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(profileData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings">
      <h1>Settings</h1>

      <section className="settings-section">
        <h2>Profile</h2>
        <label>
          Name:
          <input
            type="text"
            value={profileData.name}
            onChange={(e) => setProfileData((prev) => ({ ...prev, name: e.target.value }))}
          />
        </label>
        <label>
          Email:
          <input
            type="email"
            value={profileData.email}
            onChange={(e) => setProfileData((prev) => ({ ...prev, email: e.target.value }))}
          />
        </label>
        <label>
          Bio:
          <textarea
            value={profileData.bio}
            onChange={(e) => setProfileData((prev) => ({ ...prev, bio: e.target.value }))}
            rows={4}
          />
        </label>
        <button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </section>

      <section className="settings-section">
        <h2>Appearance</h2>
        <label>
          Theme:
          <select value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </label>
      </section>

      <section className="settings-section">
        <h2>Notifications</h2>
        <label>
          <input
            type="checkbox"
            checked={notifications}
            onChange={(e) => setNotifications(e.target.checked)}
          />
          Enable push notifications
        </label>
        <label>
          Email digest:
          <select value={emailDigest} onChange={(e) => setEmailDigest(e.target.value)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="never">Never</option>
          </select>
        </label>
      </section>
    </div>
  );
}`;

// Write temp files
const tmpDir = "/tmp";
const oldFile = path.join(tmpDir, "capture-old.tsx");
const newFile = path.join(tmpDir, "capture-new.tsx");
const diffFile = path.join(tmpDir, "capture.diff");

fs.writeFileSync(oldFile, oldContent);
fs.writeFileSync(newFile, newContent);

// Generate diff
const { execSync } = await import("child_process");
try {
  execSync(`diff -u "${oldFile}" "${newFile}" > "${diffFile}"`, { stdio: "pipe" });
} catch {
  // diff returns non-zero when files differ, that's expected
}

console.log("Capturing opentui output...");

let output = "";

const ptyProcess = pty.spawn("bun", [
  path.join(__dirname, "../src/cli.tsx"),
  "web-render",
  diffFile,
  "--width", String(COLS),
  "--height", String(ROWS),
], {
  name: "xterm-256color",
  cols: COLS,
  rows: ROWS,
  cwd: process.cwd(),
  env: { ...process.env, TERM: "xterm-256color" },
});

ptyProcess.onData((data) => {
  output += data;
});

ptyProcess.onExit(() => {
  // Clean up temp files
  fs.unlinkSync(oldFile);
  fs.unlinkSync(newFile);
  fs.unlinkSync(diffFile);

  // Save output
  const outputFile = path.join(__dirname, "../web/example.ansi");
  fs.writeFileSync(outputFile, output);

  console.log(`Saved ${output.length} bytes to web/example.ansi`);
  process.exit(0);
});
