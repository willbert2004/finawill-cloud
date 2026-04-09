import { useState, useEffect, useMemo } from 'react';
import hitLogo from '@/assets/hit-logo.jpg';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, GraduationCap, User, Shield, ArrowLeft, Mail, CheckCircle, Eye, EyeOff, Check, X, Lock, AtSign } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');

const passwordRules = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /\d/.test(p) },
  { label: 'One special character (!@#$...)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

interface AuthFormProps {
  onSuccess?: () => void;
}

export function AuthForm({ onSuccess }: AuthFormProps) {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [userType] = useState<'student'>('student');
  const [school, setSchool] = useState('');
  const [department, setDepartment] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupPassword, setSignupPassword] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const { signIn, signUp, resetPassword, updatePassword } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (searchParams.get('type') === 'recovery') {
      setShowResetPassword(true);
    }
  }, [searchParams]);

  const [dbSchools, setDbSchools] = useState<{ id: string; name: string }[]>([]);
  const [dbDepartments, setDbDepartments] = useState<{ id: string; school_id: string; name: string }[]>([]);

  useEffect(() => {
    const fetchSchoolsAndDepts = async () => {
      const [{ data: s }, { data: d }] = await Promise.all([
        supabase.from('schools').select('id, name').eq('is_active', true).order('name'),
        supabase.from('departments').select('id, school_id, name').eq('is_active', true).order('name'),
      ]);
      setDbSchools(s || []);
      setDbDepartments(d || []);
    };
    fetchSchoolsAndDepts();
  }, []);

  const schoolOptions = useMemo(() => dbSchools.map(s => ({ value: s.name, label: s.name, id: s.id })), [dbSchools]);
  const departmentOptions = useMemo(() => {
    const selectedSchool = dbSchools.find(s => s.name === school);
    if (!selectedSchool) return [];
    return dbDepartments.filter(d => d.school_id === selectedSchool.id).map(d => ({ value: d.name, label: d.name }));
  }, [school, dbSchools, dbDepartments]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = activeTab === 'signin' ? loginEmail : (formData.get('email') as string);
    const password = activeTab === 'signin' ? loginPassword : (formData.get('password') as string);

    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);

      if (activeTab === 'signup' && !passwordRules.every((r) => r.test(password))) {
        toast({
          title: 'Weak Password',
          description: 'Please meet all password requirements before continuing.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      let result;
      if (activeTab === 'signin') {
        result = await signIn(email, password);
      } else {
        result = await signUp(email, password, userType, userType === 'student' ? { school, department } : undefined);
      }

      if (result.error) {
        toast({
          title: 'Authentication Error',
          description: result.error.message,
          variant: 'destructive',
        });
      } else {
        if (activeTab === 'signin') {
          toast({ title: 'Success', description: 'Successfully signed in!' });
          onSuccess?.();
        } else {
          setVerificationEmail(email);
          setShowVerificationMessage(true);
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: 'Validation Error', description: error.issues[0].message, variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('reset-email') as string;

    try {
      emailSchema.parse(email);
      const { error } = await resetPassword(email);

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Check your email', description: 'We sent you a password reset link.' });
        setShowForgotPassword(false);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: 'Validation Error', description: error.issues[0].message, variant: 'destructive' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const formData = new FormData(event.currentTarget);
    const newPassword = formData.get('new-password') as string;
    const confirmPassword = formData.get('confirm-password') as string;

    try {
      passwordSchema.parse(newPassword);
      if (newPassword !== confirmPassword) {
        toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
        return;
      }

      const { error } = await updatePassword(newPassword);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Your password has been updated.' });
        setShowResetPassword(false);
        onSuccess?.();
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: 'Validation Error', description: error.issues[0].message, variant: 'destructive' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Card wrapper - using a plain div to avoid remounting on every render

  if (showResetPassword) {
    return (
      <Card className="w-full max-w-md mx-auto overflow-hidden border-0 shadow-elegant"><div className="h-1 gradient-primary" />
        <CardHeader className="text-center pb-2 pt-8">
          <div className="mx-auto w-14 h-14 gradient-primary rounded-2xl flex items-center justify-center mb-3 shadow-card">
            <Lock className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Set New Password</CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleUpdatePassword} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-sm font-semibold text-foreground">New Password</Label>
              <div className="relative">
                <Input id="new-password" name="new-password" type={showNewPassword ? 'text' : 'password'} placeholder="Enter new password" className="pr-10 h-12 bg-muted/50 border-2 border-border focus:border-primary transition-colors" required />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors" tabIndex={-1}>
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-sm font-semibold text-foreground">Confirm Password</Label>
              <div className="relative">
                <Input id="confirm-password" name="confirm-password" type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm new password" className="pr-10 h-12 bg-muted/50 border-2 border-border focus:border-primary transition-colors" required />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors" tabIndex={-1}>
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-12 text-base font-semibold gradient-primary text-primary-foreground shadow-card hover:shadow-elegant transition-all" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  if (showVerificationMessage) {
    return (
      <Card className="w-full max-w-md mx-auto overflow-hidden border-0 shadow-elegant"><div className="h-1 gradient-primary" />
        <CardHeader className="text-center pb-2 pt-8">
          <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4 ring-4 ring-success/20">
            <Mail className="h-8 w-8 text-success" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Check Your Email</CardTitle>
          <CardDescription className="text-base mt-2">We've sent a verification link to</CardDescription>
          <p className="font-semibold text-primary mt-1">{verificationEmail}</p>
        </CardHeader>
        <CardContent className="px-8 pb-8 space-y-4">
          <div className="bg-muted/50 rounded-xl p-4 space-y-3 border border-border">
            <div className="flex items-start gap-3">
              <div className="p-1 bg-success/10 rounded-full"><CheckCircle className="h-4 w-4 text-success" /></div>
              <p className="text-sm text-muted-foreground">Click the link in the email to verify your account</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1 bg-success/10 rounded-full"><CheckCircle className="h-4 w-4 text-success" /></div>
              <p className="text-sm text-muted-foreground">Check your spam folder if you don't see it</p>
            </div>
          </div>
          <Button variant="outline" className="w-full h-11 border-2 font-medium" onClick={() => { setShowVerificationMessage(false); setActiveTab('signin'); }}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (showForgotPassword) {
    return (
      <Card className="w-full max-w-md mx-auto overflow-hidden border-0 shadow-elegant"><div className="h-1 gradient-primary" />
        <CardHeader className="text-center pb-2 pt-8">
          <div className="mx-auto w-14 h-14 bg-warning/10 rounded-2xl flex items-center justify-center mb-3 ring-4 ring-warning/20">
            <Mail className="h-7 w-7 text-warning" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Reset Password</CardTitle>
          <CardDescription>Enter your email to receive a reset link</CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleForgotPassword} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="reset-email" className="text-sm font-semibold text-foreground">Email Address</Label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="reset-email" name="reset-email" type="email" placeholder="Enter your email" className="pl-10 h-12 bg-muted/50 border-2 border-border focus:border-primary transition-colors" required />
              </div>
            </div>
            <Button type="submit" className="w-full h-12 text-base font-semibold gradient-primary text-primary-foreground shadow-card hover:shadow-elegant transition-all" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Reset Link
            </Button>
            <button type="button" onClick={() => setShowForgotPassword(false)} className="w-full text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-1 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden border-0 shadow-elegant"><div className="h-1 gradient-primary" />
      <CardHeader className="text-center pb-0 pt-4">
        <div className="flex items-center justify-center gap-2 mb-1">
          <img src={hitLogo} alt="HIT" className="h-8 w-8 rounded-lg object-contain" />
          <div className="text-left">
            <h1 className="text-base font-bold text-foreground leading-tight">CIIOS</h1>
            <p className="text-[10px] text-muted-foreground">Harare Institute of Technology</p>
          </div>
        </div>
        <CardDescription className="text-[11px]">Capstone Innovation & Idea Orchestration System</CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-4 pt-2">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-3 h-9 p-1 bg-muted/80">
            <TabsTrigger value="signin" className="h-7 font-semibold text-xs data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-card transition-all">Sign In</TabsTrigger>
            <TabsTrigger value="signup" className="h-7 font-semibold text-xs data-[state=active]:gradient-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-card transition-all">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs font-semibold text-foreground">Email Address</Label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input id="login-email" name="email" type="email" placeholder="Enter your email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="pl-9 h-9 text-sm bg-muted/50 border-2 border-border focus:border-primary transition-colors" required />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="password" className="text-xs font-semibold text-foreground">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input id="login-password" name="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="pl-9 pr-9 h-9 text-sm bg-muted/50 border-2 border-border focus:border-primary transition-colors" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors" tabIndex={-1}>
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full h-9 text-sm font-semibold gradient-primary text-primary-foreground shadow-card hover:shadow-elegant hover:scale-[1.02] transition-all" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
              <button type="button" onClick={() => setShowForgotPassword(true)} className="w-full text-xs text-primary hover:text-primary-dark font-medium hover:underline transition-colors">
                Forgot your password?
              </button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSubmit} className="space-y-2">

              {(
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="school" className="text-xs font-semibold text-foreground">School</Label>
                    <Select value={school} onValueChange={(value) => { setSchool(value); setDepartment(''); }}>
                      <SelectTrigger id="school" className="h-9 text-xs bg-muted/50 border-2 border-border focus:border-primary">
                        <SelectValue placeholder="Select school" />
                      </SelectTrigger>
                      <SelectContent>
                        {schoolOptions.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="department" className="text-xs font-semibold text-foreground">Department</Label>
                    <Select value={department} onValueChange={setDepartment} disabled={!school}>
                      <SelectTrigger id="department" className="h-9 text-xs bg-muted/50 border-2 border-border focus:border-primary">
                        <SelectValue placeholder="Select dept" />
                      </SelectTrigger>
                      <SelectContent>
                        {departmentOptions.map((d) => (<SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="signup-email" className="text-xs font-semibold text-foreground">Email Address</Label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input id="signup-email" name="email" type="email" placeholder="Enter your email" className="pl-9 h-9 text-sm bg-muted/50 border-2 border-border focus:border-primary transition-colors" required />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="signup-password" className="text-xs font-semibold text-foreground">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input id="signup-password" name="password" type={showSignupPassword ? 'text' : 'password'} placeholder="Create a strong password" className="pl-9 pr-9 h-9 text-sm bg-muted/50 border-2 border-border focus:border-primary transition-colors" required value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} />
                  <button type="button" onClick={() => setShowSignupPassword(!showSignupPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors" tabIndex={-1}>
                    {showSignupPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {signupPassword && (
                  <div className="bg-muted/50 rounded p-1.5 border border-border">
                    <div className="grid grid-cols-2 gap-0.5">
                      {passwordRules.map((rule) => {
                        const passed = rule.test(signupPassword);
                        return (
                          <div key={rule.label} className={`flex items-center gap-1 text-[10px] ${passed ? 'text-success' : 'text-muted-foreground'}`}>
                            {passed ? <Check className="h-2 w-2 shrink-0" /> : <X className="h-2 w-2 shrink-0" />}
                            {rule.label}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full h-9 text-sm font-semibold gradient-primary text-primary-foreground shadow-card hover:shadow-elegant hover:scale-[1.02] transition-all" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
