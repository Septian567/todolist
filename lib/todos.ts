import { supabase } from "@/lib/supabase";

export type Todo = {
  id: string;
  user_id: string;
  title: string;
  completed: boolean;
  created_at: string;
};

// Mengambil semua tugas milik pengguna yang sedang login
export async function getTodos(userId: string) {
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data as Todo[];
}

// Menambahkan tugas baru
export async function createTodo(
  userId: string,
  title: string
) {
  const { data, error } = await supabase
    .from("todos")
    .insert({
      user_id: userId,
      title: title.trim(),
      completed: false,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Todo;
}

// Mengubah status tugas
export async function updateTodo(
  todoId: string,
  userId: string,
  completed: boolean
) {
  const { data, error } = await supabase
    .from("todos")
    .update({ completed })
    .eq("id", todoId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Todo;
}

// Menghapus tugas
export async function deleteTodo(
  todoId: string,
  userId: string
) {
  const { error } = await supabase
    .from("todos")
    .delete()
    .eq("id", todoId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}
