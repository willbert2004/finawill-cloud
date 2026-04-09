import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Supervisor {
  id: string;
  user_id: string;
  current_projects: number;
  max_projects: number;
  research_areas?: string[];
  department?: string;
  office_location?: string;
  profiles: {
    user_id: string;
    full_name: string;
    email: string;
  };
}

interface SupervisorListProps {
  supervisors: Supervisor[];
}

export default function SupervisorList({ supervisors }: SupervisorListProps) {
  return (
    <section>
      <h2 className="text-2xl font-semibold mb-4">Registered Supervisors ({supervisors.length})</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {supervisors.map((supervisor) => {
          const capacityPercentage = (supervisor.current_projects / supervisor.max_projects) * 100;
          const isAtCapacity = supervisor.current_projects >= supervisor.max_projects;
          
          return (
            <Card key={supervisor.id}>
              <CardHeader>
                <CardTitle className="text-lg">{supervisor.profiles.full_name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium text-xs">{supervisor.profiles.email}</span>
                  </div>
                  {supervisor.department && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Department:</span>
                      <span className="font-medium text-xs">{supervisor.department}</span>
                    </div>
                  )}
                  {supervisor.office_location && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Office:</span>
                      <span className="font-medium text-xs">{supervisor.office_location}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Projects:</span>
                    <Badge variant={isAtCapacity ? "destructive" : "secondary"}>
                      {supervisor.current_projects}/{supervisor.max_projects}
                    </Badge>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        isAtCapacity ? "bg-destructive" : "bg-primary"
                      }`}
                      style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
                    />
                  </div>
                  {supervisor.research_areas && supervisor.research_areas.length > 0 && (
                    <div className="pt-2">
                      <span className="text-sm text-muted-foreground mb-2 block">Research Areas:</span>
                      <div className="flex flex-wrap gap-1">
                        {supervisor.research_areas.map((area, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
