import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Search, Filter } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface AllocationFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedDepartment: string;
  setSelectedDepartment: (value: string) => void;
  selectedKeyword: string;
  setSelectedKeyword: (value: string) => void;
  minMatchScore: number;
  setMinMatchScore: (value: number) => void;
  selectedStatus: string;
  setSelectedStatus: (value: string) => void;
  departments: string[];
  keywords: string[];
  statuses: string[];
  onClearAll: () => void;
}

export default function AllocationFilters({
  searchTerm,
  setSearchTerm,
  selectedDepartment,
  setSelectedDepartment,
  selectedKeyword,
  setSelectedKeyword,
  minMatchScore,
  setMinMatchScore,
  selectedStatus,
  setSelectedStatus,
  departments,
  keywords,
  statuses,
  onClearAll,
}: AllocationFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeFiltersCount = [
    searchTerm,
    selectedDepartment !== "all",
    selectedKeyword !== "all",
    minMatchScore > 0,
    selectedStatus !== "all",
  ].filter(Boolean).length;

  return (
    <Card className="border-2">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search Bar - Always Visible */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by project title or student name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="relative">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge 
                      variant="secondary" 
                      className="ml-2 h-5 min-w-5 rounded-full p-1"
                    >
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </CollapsibleTrigger>
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClearAll}
                  aria-label="Clear all filters"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Advanced Filters - Collapsible */}
            <CollapsibleContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 pt-4 border-t">
                {/* Department Filter */}
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="All departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Keyword Filter */}
                <div className="space-y-2">
                  <Label>Keyword</Label>
                  <Select value={selectedKeyword} onValueChange={setSelectedKeyword}>
                    <SelectTrigger>
                      <SelectValue placeholder="All keywords" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All keywords</SelectItem>
                      {keywords.map((keyword) => (
                        <SelectItem key={keyword} value={keyword}>
                          {keyword}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {statuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Match Score Filter */}
                <div className="space-y-2">
                  <Label>Min Match Score: {minMatchScore}%</Label>
                  <div className="pt-2">
                    <Slider
                      value={[minMatchScore]}
                      onValueChange={(values) => setMinMatchScore(values[0])}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </CardContent>
      </Collapsible>
    </Card>
  );
}
