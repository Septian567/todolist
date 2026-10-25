"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

import {
  createTodo,
  deleteTodo,
  getTodos,
  Todo,
  updateTodo,
} from "@/lib/todos";

type TodoFilter = "all" | "active" | "completed";

export default function Home() {
  // =========================
  // STATE
  // =========================

  const [session, setSession] = useState<Session | null>(null);

  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingTodos, setLoadingTodos] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [isRegister, setIsRegister] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [title, setTitle] = useState("");

  const [todos, setTodos] = useState<Todo[]>([]);
  const [filter, setFilter] = useState<TodoFilter>("all");

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // =========================
  // AUTHENTICATION
  // =========================

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const { data, error } =
          await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (mounted) {
          setSession(data.session);
        }
      } catch (error) {
        console.error("Gagal memeriksa sesi:", error);

        if (mounted) {
          setErrorMessage(
            "Gagal memeriksa sesi login. Silakan refresh halaman."
          );
        }
      } finally {
        if (mounted) {
          setLoadingAuth(false);
        }
      }
    }

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setMessage("");
        setErrorMessage("");
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // =========================
  // LOAD TODOS
  // =========================

  const loadTodos = useCallback(async () => {
    const user = session?.user;

    if (!user) {
      setTodos([]);
      setLoadingTodos(false);
      return;
    }

    setLoadingTodos(true);
    setErrorMessage("");

    try {
      const data = await getTodos(user.id);
      setTodos(data);
    } catch (error) {
      console.error("Gagal mengambil tugas:", error);

      setErrorMessage(
        "Gagal memuat tugas. Periksa koneksi dan konfigurasi Supabase."
      );
    } finally {
      setLoadingTodos(false);
    }
  }, [session?.user]);

  useEffect(() => {
    if (!loadingAuth) {
      void loadTodos();
    }
  }, [loadingAuth, loadTodos]);

  // =========================
  // REGISTER & LOGIN
  // =========================

  async function handleAuth(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setErrorMessage("");
    setSubmitting(true);

    try {
      const normalizedEmail = email.trim();

      if (!normalizedEmail || !password) {
        throw new Error("Email dan password wajib diisi.");
      }

      if (password.length < 6) {
        throw new Error(
          "Password harus memiliki minimal 6 karakter."
        );
      }

      if (isRegister) {
        const { data, error } =
          await supabase.auth.signUp({
            email: normalizedEmail,
            password,
          });

        if (error) {
          throw error;
        }

        setPassword("");

        if (data.session) {
          setMessage(
            "Pendaftaran berhasil! Kamu sudah login."
          );
        } else {
          setMessage(
            "Pendaftaran berhasil. Periksa email untuk konfirmasi akun sebelum login."
          );
        }
      } else {
        const { error } =
          await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });

        if (error) {
          throw error;
        }

        setPassword("");
        setMessage("Login berhasil!");
      }
    } catch (error) {
      console.error("Autentikasi gagal:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat login atau mendaftar."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // =========================
  // LOGOUT
  // =========================

  async function handleLogout() {
    setMessage("");
    setErrorMessage("");
    setSubmitting(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      setTodos([]);
      setTitle("");
      setPassword("");
      setFilter("all");
      setMessage("Kamu berhasil logout.");
    } catch (error) {
      console.error("Logout gagal:", error);

      setErrorMessage(
        "Gagal logout. Silakan coba lagi."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // =========================
  // ADD TODO
  // =========================

  async function handleAddTodo(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const user = session?.user;
    const trimmedTitle = title.trim();

    setMessage("");
    setErrorMessage("");

    if (!user) {
      setErrorMessage(
        "Silakan login terlebih dahulu."
      );
      return;
    }

    if (!trimmedTitle) {
      setErrorMessage(
        "Judul tugas tidak boleh kosong."
      );
      return;
    }

    if (trimmedTitle.length > 200) {
      setErrorMessage(
        "Judul tugas maksimal 200 karakter."
      );
      return;
    }

    setSubmitting(true);

    try {
      await createTodo(user.id, trimmedTitle);

      setTitle("");
      setMessage("Tugas berhasil ditambahkan.");

      await loadTodos();
    } catch (error) {
      console.error("Gagal menambahkan tugas:", error);

      setErrorMessage(
        "Gagal menambahkan tugas. Silakan coba lagi."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // =========================
  // TOGGLE TODO
  // =========================

  async function handleToggleTodo(todo: Todo) {
    const user = session?.user;

    if (!user) {
      return;
    }

    setMessage("");
    setErrorMessage("");

    try {
      await updateTodo(
        todo.id,
        user.id,
        !todo.completed
      );

      await loadTodos();
    } catch (error) {
      console.error(
        "Gagal memperbarui tugas:",
        error
      );

      setErrorMessage(
        "Gagal memperbarui tugas. Silakan coba lagi."
      );
    }
  }

  // =========================
  // DELETE TODO
  // =========================

  async function handleDeleteTodo(todoId: string) {
    const user = session?.user;

    if (!user) {
      return;
    }

    setMessage("");
    setErrorMessage("");

    try {
      await deleteTodo(todoId, user.id);

      setMessage("Tugas berhasil dihapus.");

      await loadTodos();
    } catch (error) {
      console.error("Gagal menghapus tugas:", error);

      setErrorMessage(
        "Gagal menghapus tugas. Silakan coba lagi."
      );
    }
  }

  // =========================
  // FILTER & STATISTICS
  // =========================

  const activeCount = todos.filter(
    (todo) => !todo.completed
  ).length;

  const completedCount = todos.filter(
    (todo) => todo.completed
  ).length;

  const filteredTodos = todos.filter((todo) => {
    if (filter === "active") {
      return !todo.completed;
    }

    if (filter === "completed") {
      return todo.completed;
    }

    return true;
  });

  const filters: {
    value: TodoFilter;
    label: string;
  }[] = [
    { value: "all", label: "Semua" },
    { value: "active", label: "Belum Selesai" },
    { value: "completed", label: "Selesai" },
  ];

  // =========================
  // LOADING SCREEN
  // =========================

  if (loadingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold">
            Todo List
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Memeriksa sesi login...
          </p>
        </div>
      </main>
    );
  }

  // =========================
  // MAIN UI
  // =========================

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 text-gray-900 sm:py-12">
      <div className="mx-auto max-w-2xl">

        {/* HEADER */}

        <header className="mb-8 text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-3xl text-white shadow-md">
            ✓
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Todo List
          </h1>

          <p className="mt-2 text-gray-500">
            Rencanakan tugasmu, selesaikan satu per satu.
          </p>
        </header>

        {/* NOTIFICATIONS */}

        {message && (
          <div
            role="status"
            className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
          >
            {message}
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {errorMessage}
          </div>
        )}

        {/* AUTHENTICATION FORM */}

        {!session ? (
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">
                {isRegister
                  ? "Buat Akun"
                  : "Selamat Datang"}
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                {isRegister
                  ? "Daftar untuk mulai mengelola tugasmu."
                  : "Login untuk melihat dan mengelola tugasmu."}
              </p>
            </div>

            <form
              onSubmit={handleAuth}
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium"
                >
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="nama@email.com"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium"
                >
                  Password
                </label>

                <input
                  id="password"
                  type="password"
                  autoComplete={
                    isRegister
                      ? "new-password"
                      : "current-password"
                  }
                  minLength={6}
                  required
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Minimal 6 karakter"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? "Memproses..."
                  : isRegister
                    ? "Daftar Sekarang"
                    : "Login"}
              </button>
            </form>

            <div className="mt-6 border-t border-gray-100 pt-5 text-center">
              <p className="text-sm text-gray-600">
                {isRegister
                  ? "Sudah punya akun?"
                  : "Belum punya akun?"}
              </p>

              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setMessage("");
                  setErrorMessage("");
                }}
                className="mt-2 font-semibold text-blue-600 hover:text-blue-700"
              >
                {isRegister
                  ? "Login di sini"
                  : "Buat akun baru"}
              </button>
            </div>
          </section>
        ) : (
          <>
            {/* USER PROFILE */}

            <section className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                  {(session.user.email?.[0] ?? "U").toUpperCase()}
                </div>

                <div className="min-w-0">
                  <p className="text-xs text-gray-500">
                    Login sebagai
                  </p>

                  <p className="truncate text-sm font-semibold sm:text-base">
                    {session.user.email}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={submitting}
                className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-60"
              >
                Logout
              </button>
            </section>

            {/* STATISTICS */}

            <section className="mb-5 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-medium text-blue-700 sm:text-sm">
                  Semua
                </p>

                <p className="mt-2 text-2xl font-bold text-blue-800 sm:text-3xl">
                  {todos.length}
                </p>

                <p className="mt-1 text-xs text-blue-700">
                  Total tugas
                </p>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <p className="text-xs font-medium text-amber-700 sm:text-sm">
                  Aktif
                </p>

                <p className="mt-2 text-2xl font-bold text-amber-800 sm:text-3xl">
                  {activeCount}
                </p>

                <p className="mt-1 text-xs text-amber-700">
                  Belum selesai
                </p>
              </div>

              <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
                <p className="text-xs font-medium text-green-700 sm:text-sm">
                  Selesai
                </p>

                <p className="mt-2 text-2xl font-bold text-green-800 sm:text-3xl">
                  {completedCount}
                </p>

                <p className="mt-1 text-xs text-green-700">
                  Tuntas
                </p>
              </div>
            </section>

            {/* ADD TODO */}

            <section className="mb-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="mb-4 text-lg font-bold">
                Tambahkan Tugas
              </h2>

              <form
                onSubmit={handleAddTodo}
                className="flex flex-col gap-3 sm:flex-row"
              >
                <input
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  placeholder="Apa yang ingin kamu kerjakan?"
                  maxLength={200}
                  className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  + Tambah
                </button>
              </form>

              <p className="mt-2 text-xs text-gray-400">
                Maksimal 200 karakter.
              </p>
            </section>

            {/* TODO LIST */}

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold">
                  Daftar Tugas
                </h2>

                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                  {filteredTodos.length} tugas
                </span>
              </div>

              {/* FILTER BUTTONS */}

              <div className="mb-5 flex flex-wrap gap-2">
                {filters.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFilter(item.value)}
                    aria-pressed={filter === item.value}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition sm:px-4 ${
                      filter === item.value
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* LOADING */}

              {loadingTodos ? (
                <div className="py-12 text-center">
                  <p className="font-medium text-gray-600">
                    Memuat tugas...
                  </p>

                  <p className="mt-1 text-sm text-gray-400">
                    Tunggu sebentar.
                  </p>
                </div>
              ) : filteredTodos.length === 0 ? (
                /* EMPTY STATE */

                <div className="rounded-xl border border-dashed border-gray-300 px-4 py-12 text-center">
                  <div className="mb-3 text-4xl">
                    {filter === "completed"
                      ? "🎉"
                      : filter === "active"
                        ? "✨"
                        : "📝"}
                  </div>

                  <p className="font-semibold text-gray-700">
                    {filter === "active"
                      ? "Semua tugas sudah selesai!"
                      : filter === "completed"
                        ? "Belum ada tugas yang selesai."
                        : "Belum ada tugas."}
                  </p>

                  <p className="mt-2 text-sm text-gray-500">
                    {filter === "all"
                      ? "Tambahkan tugas pertamamu menggunakan formulir di atas."
                      : "Coba pilih filter lainnya untuk melihat tugas."}
                  </p>
                </div>
              ) : (
                /* TODO ITEMS */

                <ul className="space-y-3">
                  {filteredTodos.map((todo) => (
                    <li
                      key={todo.id}
                      className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 transition hover:border-blue-200 hover:shadow-sm"
                    >
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() =>
                          handleToggleTodo(todo)
                        }
                        aria-label={`Tandai ${todo.title} sebagai ${
                          todo.completed
                            ? "belum selesai"
                            : "selesai"
                        }`}
                        className="h-5 w-5 shrink-0 cursor-pointer accent-blue-600"
                      />

                      <div className="min-w-0 flex-1">
                        <p
                          className={`break-words font-medium ${
                            todo.completed
                              ? "text-gray-400 line-through"
                              : "text-gray-800"
                          }`}
                        >
                          {todo.title}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {todo.completed
                            ? "✓ Tugas selesai"
                            : "○ Belum selesai"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteTodo(todo.id)
                        }
                        aria-label={`Hapus tugas ${todo.title}`}
                        className="shrink-0 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
                      >
                        Hapus
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* FOOTER */}

              {!loadingTodos && todos.length > 0 && (
                <div className="mt-5 border-t border-gray-100 pt-4 text-center text-xs text-gray-500">
                  {completedCount} dari {todos.length} tugas selesai
                </div>
              )}
            </section>
          </>
        )}

        {/* APP FOOTER */}

        <footer className="mt-8 text-center text-sm text-gray-400">
          Todo List · Dibuat dengan Next.js dan Supabase
        </footer>
      </div>
    </main>
  );
}