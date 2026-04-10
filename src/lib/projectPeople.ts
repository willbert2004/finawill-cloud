import { supabase } from "@/integrations/supabase/client";

export interface ProjectPerson {
  user_id: string;
  full_name: string | null;
  email?: string | null;
  department?: string | null;
}

const toMap = (profiles: ProjectPerson[]) =>
  profiles.reduce<Record<string, ProjectPerson>>((acc, profile) => {
    acc[profile.user_id] = profile;
    return acc;
  }, {});

export async function fetchProjectPeople(userIds: Array<string | null | undefined>) {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean) as string[])];

  if (uniqueUserIds.length === 0) {
    return {} as Record<string, ProjectPerson>;
  }

  try {
    const { data, error } = await supabase.functions.invoke("project-directory", {
      body: { userIds: uniqueUserIds },
    });

    if (error) throw error;

    return toMap((data?.profiles || []) as ProjectPerson[]);
  } catch (error) {
    console.error("Error fetching project people via function:", error);

    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name, department")
      .in("user_id", uniqueUserIds);

    return toMap((data || []) as ProjectPerson[]);
  }
}