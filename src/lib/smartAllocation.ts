import { supabase } from "@/integrations/supabase/client";

export interface SmartAllocationEnvelope<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  diagnostics?: Record<string, unknown>;
}

export async function callSmartAllocation<T = unknown>(payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("smart-allocation", {
    body: payload,
  });

  if (error) {
    throw new Error(error.message || "Smart allocation failed");
  }

  const envelope = data as SmartAllocationEnvelope<T> | null;

  if (!envelope) {
    throw new Error("Smart allocation returned no response");
  }

  if (!envelope.ok) {
    throw new Error(envelope.error || "Smart allocation failed");
  }

  return (envelope.data ?? {}) as T;
}

export function formatSupervisorList(names: string[] = []): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}