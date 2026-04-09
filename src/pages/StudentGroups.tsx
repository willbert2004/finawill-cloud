import { useEffect, useState } from "react";
import { AuthenticatedLayout } from "@/components/AuthenticatedLayout";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";
import GroupManagement from "@/components/GroupManagement";
import { useToast } from "@/hooks/use-toast";

export default function StudentGroups() {
  const { user } = useAuth();
  const { isStudent, isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!roleLoading && user && !isStudent && !isAdmin) {
      toast({ title: "Access denied", description: "This page is for students and admins", variant: "destructive" });
      navigate("/");
    }
  }, [user, roleLoading, isStudent, isAdmin, navigate, toast]);

  if (roleLoading) return <AuthenticatedLayout><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AuthenticatedLayout>;

  if (!user || (!isStudent && !isAdmin)) return null;

  return (
    <AuthenticatedLayout>
      <div className="max-w-7xl mx-auto space-y-6 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold">{isAdmin ? 'Student Groups' : 'My Groups'}</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? 'View and manage all student groups' : 'Create and manage your project groups'}
          </p>
        </div>
        <GroupManagement />
      </div>
    </AuthenticatedLayout>
  );
}
