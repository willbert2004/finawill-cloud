import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { AlertTriangle, Copy, ArrowLeft, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface DuplicateProject {
  id: string;
  title: string;
  department: string | null;
  status: string;
  similarity_score: number | null;
  created_at: string;
}

export default function Duplicates() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [duplicates, setDuplicates] = useState<DuplicateProject[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user) fetchDuplicates();
  }, [user, authLoading]);

  const fetchDuplicates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('id, title, department, status, similarity_score, created_at')
        .eq('is_duplicate', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDuplicates(data || []);
    } catch (e) {
      console.error('Error fetching duplicates:', e);
      toast({ title: 'Error', description: 'Failed to load duplicate projects', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filtered = duplicates.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    (d.department || '').toLowerCase().includes(search.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              Duplicate Projects Reference
            </h1>
            <p className="text-sm text-muted-foreground">
              Projects flagged as potential duplicates — review before submitting similar topics
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-destructive to-destructive/70 shadow-md">
                <Copy className="h-5 w-5 text-destructive-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{duplicates.length}</p>
                <p className="text-[11px] text-muted-foreground font-medium">Total Duplicates</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-[hsl(0,84%,60%)] to-[hsl(0,60%,45%)] shadow-md">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {duplicates.filter(d => (d.similarity_score ?? 0) >= 80).length}
                </p>
                <p className="text-[11px] text-muted-foreground font-medium">High Similarity (≥80%)</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-[hsl(38,92%,50%)] to-[hsl(38,80%,40%)] shadow-md">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {duplicates.filter(d => {
                    const s = d.similarity_score ?? 0;
                    return s >= 50 && s < 80;
                  }).length}
                </p>
                <p className="text-[11px] text-muted-foreground font-medium">Medium Similarity</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search + Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-lg">All Flagged Duplicates</CardTitle>
                <CardDescription>
                  Use this as a reference to avoid submitting project topics that already exist
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title or department..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filtered.length > 0 ? (
              <div className="rounded-md border overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Similarity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((dup) => (
                      <TableRow key={dup.id}>
                        <TableCell className="font-medium max-w-[250px] truncate">{dup.title}</TableCell>
                        <TableCell className="max-w-[150px] truncate">{dup.department || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={
                            (dup.similarity_score ?? 0) >= 80 ? 'destructive' :
                            (dup.similarity_score ?? 0) >= 50 ? 'secondary' : 'outline'
                          }>
                            {dup.similarity_score != null ? `${dup.similarity_score}%` : 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{dup.status}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(dup.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">
                  {search ? 'No matching duplicates found' : 'No duplicate projects detected'}
                </p>
                <p className="text-sm">
                  {search ? 'Try a different search term' : 'The system hasn\'t flagged any projects as duplicates yet.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
