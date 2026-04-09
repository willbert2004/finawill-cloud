import { useRef } from 'react';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Copy, Printer, BookOpen, Database, Shield, Server, Layout, Users, GraduationCap, UserCog, ShieldCheck, Workflow, FileText, GitGraph, Code, TestTube, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import hitLogo from '@/assets/hit-logo.jpg';
import erdDiagram from '@/assets/erd-diagram.png';
import MermaidDiagram from '@/components/MermaidDiagram';

const SystemDocumentation = () => {
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = async () => {
    if (!contentRef.current) return;
    try {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(contentRef.current);
      selection?.removeAllRanges();
      selection?.addRange(range);
      
      // Copy as rich text (HTML) so it pastes formatted into Word
      const html = contentRef.current.innerHTML;
      const blob = new Blob([html], { type: 'text/html' });
      const textBlob = new Blob([contentRef.current.innerText], { type: 'text/plain' });
      
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': blob,
          'text/plain': textBlob,
        }),
      ]);
      
      selection?.removeAllRanges();
      toast.success('Documentation copied! Paste it into Microsoft Word.');
    } catch {
      // Fallback: select all text for manual copy
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(contentRef.current);
      selection?.removeAllRanges();
      selection?.addRange(range);
      toast.info('Text selected — press Ctrl+C (or Cmd+C) to copy.');
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="max-w-5xl mx-auto space-y-2 p-4 sm:p-6">
        {/* Header — hidden in print */}
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">System Documentation</h1>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCopy} variant="outline" className="gap-2">
              <Copy className="h-4 w-4" /> Copy for Word
            </Button>
            <Button onClick={handlePrint} variant="outline" className="gap-2">
              <Printer className="h-4 w-4" /> Print / Save PDF
            </Button>
          </div>
        </div>

        <div ref={contentRef}>
        {/* ================================================================ */}
        {/* COVER PAGE (print only) */}
        {/* ================================================================ */}
        <div className="hidden print:block text-center py-10 border-b-2 border-primary mb-8">
          <img src={hitLogo} alt="HIT Logo" className="h-24 w-24 mx-auto mb-4 rounded-xl object-contain" />
          <p className="text-sm text-muted-foreground uppercase tracking-widest mb-2">Harare Institute of Technology</p>
          <p className="text-sm text-muted-foreground mb-6">School of Information Science and Technology</p>
          <h1 className="text-3xl font-bold mb-2">CIIOS — Capstone Innovation &amp; Idea Orchestration System</h1>
          <p className="text-base text-muted-foreground mt-2">HIT 200 Final Year Project Documentation</p>
          <div className="mt-8 text-sm text-muted-foreground space-y-1">
            <p>Student: H240203R</p>
            <p>Supervisor: To Be Assigned</p>
            <p>Date: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>

        {/* ================================================================ */}
        {/* TABLE OF CONTENTS */}
        {/* ================================================================ */}
        <DocSection icon={<FileText className="h-5 w-5" />} title="Table of Contents">
          <div className="columns-2 gap-8">
            <ol className="list-none space-y-1 text-sm text-muted-foreground">
              <li className="font-semibold text-foreground">Chapter 1: Introduction</li>
              <li className="pl-4">1.1 Background</li>
              <li className="pl-4">1.2 Problem Statement</li>
              <li className="pl-4">1.3 Objectives</li>
              <li className="pl-4">1.4 Significance of the Project</li>
              <li className="pl-4">1.5 Scope</li>
              <li className="pl-4">1.6 Expected Results</li>
              <li className="pl-4">1.7 Project Timeline</li>
              <li className="font-semibold text-foreground mt-3">Chapter 2: Requirements Analysis</li>
              <li className="pl-4">2.1 Introduction</li>
              <li className="pl-4">2.2 Description of Current System</li>
              <li className="pl-4">2.3 Description of Proposed Solution</li>
              <li className="pl-4">2.4 Functional Requirements</li>
              <li className="pl-4">2.5 Non-Functional Requirements</li>
              <li className="pl-4">2.6 Feasibility Study</li>
              <li className="font-semibold text-foreground mt-3">Chapter 3: Design</li>
              <li className="pl-4">3.1 System Design Overview</li>
              <li className="pl-4">3.2 Context DFD (Level 0)</li>
              <li className="pl-4">3.3 Level 1 DFD</li>
              <li className="pl-4">3.4 Level 2 DFDs</li>
              <li className="pl-4">3.5 Use Case Diagram</li>
              <li className="pl-4">3.6 Class Diagram</li>
              <li className="pl-4">3.7 Sequence Diagrams</li>
              <li className="pl-4">3.8 Activity Diagrams</li>
              <li className="pl-4">3.9 ERD &amp; Database Normalization</li>
              <li className="pl-4">3.10 System Architecture Flowchart</li>
              <li className="pl-4">3.11 Security Design</li>
              <li className="pl-4">3.12 Interface Design</li>
              <li className="font-semibold text-foreground mt-3">Chapter 4: Implementation</li>
              <li className="pl-4">4.1 Code Structure</li>
              <li className="pl-4">4.2 Code Conventions</li>
              <li className="pl-4">4.3 Frontend Implementation</li>
              <li className="pl-4">4.4 Backend Implementation</li>
              <li className="pl-4">4.5 System Integration</li>
              <li className="font-semibold text-foreground mt-3">Chapter 5: System Testing</li>
              <li className="pl-4">5.1 Testing Categories</li>
              <li className="pl-4">5.2 Testing Strategy</li>
              <li className="pl-4">5.3 Functional Testing Results</li>
              <li className="pl-4">5.4 Non-Functional Testing Results</li>
              <li className="font-semibold text-foreground mt-3">Chapter 6: Conclusion</li>
              <li className="pl-4">6.1 Results Summary</li>
              <li className="pl-4">6.2 Recommendations &amp; Future Work</li>
              <li className="pl-4">6.3 System Maintenance</li>
              <li className="font-semibold text-foreground mt-3">Appendix</li>
              <li className="pl-4">A. Code Snippets</li>
              <li className="pl-4">B. Edge Functions</li>
            </ol>
          </div>
        </DocSection>

        <Separator className="my-6" />

        {/* ================================================================ */}
        {/* CHAPTER 1: INTRODUCTION */}
        {/* ================================================================ */}
        <DocSection icon={<BookOpen className="h-5 w-5" />} title="Chapter 1: Introduction">

          <h4 className="font-semibold text-foreground mt-2 mb-2">1.1 Background</h4>
          <p>
            The Harare Institute of Technology (HIT) requires final-year students across all schools to complete a capstone project as part of their degree programme. This process involves students submitting project proposals, being allocated supervisors, receiving feedback, tracking milestones, and eventually submitting final deliverables. Historically, this process has been managed through a combination of manual paper-based systems, spreadsheets, and informal email communication.
          </p>
          <p className="mt-2">
            As the number of students and programmes at HIT has grown, the manual approach has become increasingly unsustainable. Supervisors struggle to manage multiple student groups, administrators spend excessive time on allocation, and students lack visibility into their project status. There is a clear need for a centralized, intelligent system to manage the entire capstone project lifecycle.
          </p>

          <h4 className="font-semibold text-foreground mt-4 mb-2">1.2 Problem Statement</h4>
          <p>
            The current capstone project management process at HIT suffers from several critical problems:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>Manual allocation</strong> — Supervisor-student matching is done manually by department coordinators, leading to mismatches between supervisor expertise and student project topics.</li>
            <li><strong>Duplicate projects</strong> — Without a centralized repository, students unknowingly submit proposals similar to previously completed projects, undermining academic integrity.</li>
            <li><strong>Poor progress tracking</strong> — There is no standardized way to monitor project milestones, deadlines, or supervisor engagement.</li>
            <li><strong>Communication gaps</strong> — Feedback, meeting schedules, and milestone updates are scattered across email, WhatsApp, and verbal communication.</li>
            <li><strong>No institutional knowledge base</strong> — Completed projects are not searchable or accessible for future reference.</li>
          </ul>

          <h4 className="font-semibold text-foreground mt-4 mb-2">1.3 Objectives</h4>
          <p>The primary objectives of CIIOS are:</p>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>To develop a web-based system that manages the complete capstone project lifecycle from submission to archival.</li>
            <li>To implement AI-powered duplicate detection that analyzes project proposals against existing projects for similarity.</li>
            <li>To create a smart supervisor allocation engine that matches student groups with supervisors based on expertise, department, and workload.</li>
            <li>To provide role-based dashboards for students, supervisors, administrators, and super administrators with appropriate access controls.</li>
            <li>To build a searchable project repository that serves as an institutional knowledge base.</li>
            <li>To implement real-time notifications, milestone tracking, meeting scheduling, and structured feedback mechanisms.</li>
          </ol>

          <h4 className="font-semibold text-foreground mt-4 mb-2">1.4 Significance of the Project</h4>
          <p>
            CIIOS addresses a real institutional need at HIT by digitizing and automating capstone project management. The system improves efficiency for administrators (who no longer need to manually allocate supervisors), ensures academic integrity through duplicate detection, gives students visibility into their project status, and provides supervisors with structured tools for feedback and progress monitoring. The AI-powered features differentiate CIIOS from simple project management tools by adding intelligence to allocation and plagiarism checking.
          </p>

          <h4 className="font-semibold text-foreground mt-4 mb-2">1.5 Scope</h4>
          <p>CIIOS covers the following functional areas:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>User registration and authentication with email verification</li>
            <li>Role-based access control (student, supervisor, admin, super admin)</li>
            <li>Project proposal submission with validation</li>
            <li>AI-powered duplicate detection</li>
            <li>Smart supervisor allocation using AI matching</li>
            <li>Student group management</li>
            <li>Milestone and phase tracking</li>
            <li>Meeting scheduling with video call links</li>
            <li>Structured supervisor feedback with ratings</li>
            <li>Versioned document management</li>
            <li>Searchable project repository</li>
            <li>Analytics dashboard for administrators</li>
            <li>School and department management</li>
            <li>Comprehensive audit logging</li>
          </ul>
          <p className="mt-2"><strong>Out of scope:</strong> Video conferencing infrastructure (external links are used), plagiarism checking of document content (only title/description similarity), and mobile native applications (web-responsive design is used instead).</p>

          <h4 className="font-semibold text-foreground mt-4 mb-2">1.6 Expected Results</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>A fully functional web application accessible to all HIT stakeholders</li>
            <li>Reduction of supervisor allocation time from days to minutes through AI matching</li>
            <li>Automated duplicate detection preventing redundant project submissions</li>
            <li>Real-time progress visibility for all parties</li>
            <li>A growing institutional repository of completed projects</li>
          </ul>

          <h4 className="font-semibold text-foreground mt-4 mb-2">1.7 Project Timeline</h4>
          <MermaidDiagram
            title="Figure 1.1 — Project Development Timeline (Gantt Chart)"
            chart={`gantt
    title CIIOS Development Timeline
    dateFormat YYYY-MM-DD
    section Planning
        Requirements Analysis     :done, 2025-01-15, 2025-02-15
        Literature Review          :done, 2025-01-20, 2025-02-28
    section Design
        System Architecture        :done, 2025-02-15, 2025-03-15
        Database Design            :done, 2025-03-01, 2025-03-20
        UI/UX Design               :done, 2025-03-10, 2025-04-01
    section Implementation
        Auth and User Management   :done, 2025-03-20, 2025-04-15
        Project Management Module  :done, 2025-04-01, 2025-05-01
        AI Features                :done, 2025-04-15, 2025-05-15
        Groups and Allocation      :done, 2025-05-01, 2025-06-01
        Notifications and Feedback :done, 2025-05-15, 2025-06-15
    section Testing
        Unit Testing               :done, 2025-06-01, 2025-06-20
        Integration Testing        :done, 2025-06-10, 2025-06-30
        UAT                        :active, 2025-06-20, 2025-07-15
    section Deployment
        Production Deployment      :2025-07-01, 2025-07-15
        Documentation              :active, 2025-06-15, 2025-07-15
`}
          />
          <div className="bg-muted/30 border border-border rounded-lg p-4 mt-2">
            <p className="font-medium text-foreground mb-1">Explanation</p>
            <p>The Gantt chart above shows the project development timeline divided into five phases: Planning, Design, Implementation, Testing, and Deployment. The project followed an iterative approach where design and implementation phases overlapped, allowing feedback from early modules to inform later development. The AI features (duplicate detection and smart allocation) were developed in parallel with core project management, ensuring they could be integrated seamlessly.</p>
          </div>
        </DocSection>

        <Separator className="my-6" />

        {/* ================================================================ */}
        {/* CHAPTER 2: REQUIREMENTS ANALYSIS */}
        {/* ================================================================ */}
        <DocSection icon={<Users className="h-5 w-5" />} title="Chapter 2: Requirements Analysis">

          <h4 className="font-semibold text-foreground mt-2 mb-2">2.1 Introduction</h4>
          <p>
            This chapter presents the requirements analysis for CIIOS, including a description of the current manual system, the proposed automated solution, functional and non-functional requirements, and a feasibility study. Requirements were gathered through interviews with HIT staff, observation of the existing paper-based process, and analysis of similar systems at other institutions.
          </p>

          <h4 className="font-semibold text-foreground mt-4 mb-2">2.2 Description of Current System</h4>
          <p>
            The current capstone project management system at HIT is largely manual. Students submit proposals on paper or via email to department coordinators. Supervisors are assigned based on the coordinator's knowledge of available staff, without a systematic matching process. Progress tracking relies on periodic face-to-face meetings with no centralized record. Completed projects are stored in physical filing cabinets with no digital indexing or searchability.
          </p>

          <h5 className="font-medium text-foreground mt-3 mb-2">Current System DFD</h5>
          <MermaidDiagram
            title="Figure 2.1 — DFD of the Current Manual System"
            chart={`flowchart LR
    STUDENT(["Student"])
    COORD(["Department\nCoordinator"])
    SUPERVISOR(["Supervisor"])
    FILING(["Filing\nCabinet"])

    STUDENT -->|"Paper proposal"| COORD
    COORD -->|"Manual review"| COORD
    COORD -->|"Assign supervisor\n(verbal/email)"| SUPERVISOR
    SUPERVISOR -->|"Verbal feedback"| STUDENT
    STUDENT -->|"Final report\n(printed)"| COORD
    COORD -->|"Archive"| FILING
`}
          />
          <div className="bg-muted/30 border border-border rounded-lg p-4 mt-2">
            <p className="font-medium text-foreground mb-1">Explanation</p>
            <p>The current system DFD shows a linear, paper-based flow. The department coordinator is the central bottleneck — all proposals flow through them, allocation is manual, and there is no feedback loop or progress tracking mechanism. The filing cabinet represents the final storage with no searchability or digital access.</p>
          </div>

          <h4 className="font-semibold text-foreground mt-4 mb-2">2.3 Description of Proposed Solution</h4>
          <p>
            CIIOS replaces the manual process with a web-based platform that automates project submission, supervisor allocation, progress tracking, and repository management. The system uses AI for intelligent duplicate detection and supervisor matching, database-level security for access control, and real-time notifications to keep all stakeholders informed.
          </p>

          <h5 className="font-medium text-foreground mt-3 mb-2">Solution Architecture</h5>
          <MermaidDiagram
            title="Figure 2.2 — Proposed Solution Architecture"
            chart={`flowchart TB
    subgraph FRONTEND["Frontend - React + TypeScript"]
        UI["UI Components\nshadcn/ui"]
        ROUTER["React Router"]
        QUERY["React Query"]
    end
    subgraph BACKEND["Backend - Lovable Cloud"]
        AUTH["Auth Service"]
        EDGE["Edge Functions"]
        DB["PostgreSQL + RLS"]
        STORAGE["File Storage"]
    end
    subgraph AI["AI Services"]
        DUP["Duplicate Detection"]
        ALLOC["Smart Allocation"]
    end
    UI --> QUERY
    QUERY --> DB
    ROUTER --> AUTH
    EDGE --> AI
    EDGE --> DB
    UI --> STORAGE
`}
          />
          <div className="bg-muted/30 border border-border rounded-lg p-4 mt-2">
            <p className="font-medium text-foreground mb-1">Explanation</p>
            <p>The solution architecture follows a three-tier model: a React frontend for the user interface, a Lovable Cloud backend providing authentication, database, edge functions, and file storage, and external AI services for intelligent features. React Query handles data synchronization between frontend and backend, while Row-Level Security (RLS) enforces access control at the database level.</p>
          </div>

          <h4 className="font-semibold text-foreground mt-4 mb-2">2.4 Functional Requirements</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 font-semibold text-foreground">ID</th>
                  <th className="text-left p-2 font-semibold text-foreground">Requirement</th>
                  <th className="text-left p-2 font-semibold text-foreground">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><td className="p-2">FR-01</td><td className="p-2">Users shall register with email, password, and role-specific details</td><td className="p-2">High</td></tr>
                <tr><td className="p-2">FR-02</td><td className="p-2">System shall verify user email before account activation</td><td className="p-2">High</td></tr>
                <tr><td className="p-2">FR-03</td><td className="p-2">Students shall submit project proposals with title, description, objectives, and keywords</td><td className="p-2">High</td></tr>
                <tr><td className="p-2">FR-04</td><td className="p-2">System shall check submitted projects for duplicates using AI similarity analysis</td><td className="p-2">High</td></tr>
                <tr><td className="p-2">FR-05</td><td className="p-2">Admins shall allocate supervisors to student groups using AI-powered matching</td><td className="p-2">High</td></tr>
                <tr><td className="p-2">FR-06</td><td className="p-2">Supervisors shall accept or decline allocation requests</td><td className="p-2">High</td></tr>
                <tr><td className="p-2">FR-07</td><td className="p-2">Supervisors shall provide structured feedback with ratings on projects</td><td className="p-2">Medium</td></tr>
                <tr><td className="p-2">FR-08</td><td className="p-2">Supervisors shall schedule meetings with video call links</td><td className="p-2">Medium</td></tr>
                <tr><td className="p-2">FR-09</td><td className="p-2">System shall track milestones with status, due dates, and threaded updates</td><td className="p-2">Medium</td></tr>
                <tr><td className="p-2">FR-10</td><td className="p-2">Students shall upload versioned documents to their projects</td><td className="p-2">Medium</td></tr>
                <tr><td className="p-2">FR-11</td><td className="p-2">System shall provide a searchable repository of approved projects</td><td className="p-2">Medium</td></tr>
                <tr><td className="p-2">FR-12</td><td className="p-2">System shall send real-time notifications for key events</td><td className="p-2">Medium</td></tr>
                <tr><td className="p-2">FR-13</td><td className="p-2">Super admin shall manage schools, departments, and user accounts</td><td className="p-2">High</td></tr>
                <tr><td className="p-2">FR-14</td><td className="p-2">System shall maintain an immutable audit log of all critical actions</td><td className="p-2">High</td></tr>
              </tbody>
            </table>
          </div>

          <h4 className="font-semibold text-foreground mt-4 mb-2">2.5 Non-Functional Requirements</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 font-semibold text-foreground">ID</th>
                  <th className="text-left p-2 font-semibold text-foreground">Requirement</th>
                  <th className="text-left p-2 font-semibold text-foreground">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><td className="p-2">NFR-01</td><td className="p-2">Pages shall load within 3 seconds on standard broadband</td><td className="p-2">Performance</td></tr>
                <tr><td className="p-2">NFR-02</td><td className="p-2">System shall support 500+ concurrent users</td><td className="p-2">Scalability</td></tr>
                <tr><td className="p-2">NFR-03</td><td className="p-2">All data access shall be enforced by Row-Level Security policies</td><td className="p-2">Security</td></tr>
                <tr><td className="p-2">NFR-04</td><td className="p-2">UI shall be responsive across desktop, tablet, and mobile</td><td className="p-2">Usability</td></tr>
                <tr><td className="p-2">NFR-05</td><td className="p-2">System shall have 99.9% uptime via cloud hosting</td><td className="p-2">Availability</td></tr>
                <tr><td className="p-2">NFR-06</td><td className="p-2">Passwords shall be hashed using bcrypt; JWTs shall expire after session timeout</td><td className="p-2">Security</td></tr>
                <tr><td className="p-2">NFR-07</td><td className="p-2">System shall support light and dark mode themes</td><td className="p-2">Usability</td></tr>
              </tbody>
            </table>
          </div>

          <h4 className="font-semibold text-foreground mt-4 mb-2">2.6 Feasibility Study</h4>
          <p><strong>Technical Feasibility:</strong> The system is built using mature, well-documented technologies (React, TypeScript, PostgreSQL, Lovable Cloud). AI capabilities are provided through integrated services requiring no external API keys. All selected technologies are open-source or included in the cloud platform.</p>
          <p className="mt-2"><strong>Economic Feasibility:</strong> CIIOS runs on Lovable Cloud, eliminating the need for on-premise server infrastructure. The development uses free and open-source tools. Ongoing costs are limited to cloud hosting, which scales with usage.</p>
          <p className="mt-2"><strong>Operational Feasibility:</strong> The system's role-based design means each user type sees only relevant functionality, minimizing training requirements. The interface follows established web conventions (forms, tables, dashboards) familiar to academic staff and students.</p>
        </DocSection>

        <Separator className="my-6" />

        {/* ================================================================ */}
        {/* CHAPTER 3: DESIGN */}
        {/* ================================================================ */}
        <DocSection icon={<Layout className="h-5 w-5" />} title="Chapter 3: Design">

          <h4 className="font-semibold text-foreground mt-2 mb-2">3.1 System Design Overview</h4>
          <p>
            CIIOS follows a three-tier architecture: a React single-page application (SPA) frontend, a serverless backend powered by Lovable Cloud (PostgreSQL database, authentication, edge functions, file storage), and external AI services for intelligent features. The system is designed with security-first principles — every data access is controlled by Row-Level Security policies at the database level, ensuring that even direct API access cannot bypass authorization.
          </p>

          {/* --- 3.2 Context DFD --- */}
          <h4 className="font-semibold text-foreground mt-6 mb-2">3.2 Context DFD (Level 0)</h4>
          <div className="bg-muted/30 border border-border rounded-lg p-3 mb-3">
            <p className="font-medium text-foreground mb-1">What is a Context DFD?</p>
            <p>A Context Diagram (Level 0 DFD) shows the entire system as a single process and identifies all external entities that interact with it. It establishes the system boundary and shows what data flows in and out.</p>
          </div>
          <MermaidDiagram
            title="Figure 3.1 — Context Diagram (Level 0 DFD)"
            chart={`flowchart LR
    STUDENT(["Student"])
    SUPERVISOR(["Supervisor"])
    ADMIN(["Administrator"])
    SUPERADMIN(["Super Admin"])
    AI(["AI Service"])
    EMAIL(["Email Service"])

    STUDENT -->|"Project proposals\nDocuments\nGroup details"| CIIOS["CIIOS\nCapstone Innovation\nand Idea Orchestration\nSystem"]
    CIIOS -->|"Notifications\nFeedback\nAllocation results"| STUDENT

    SUPERVISOR -->|"Feedback\nMilestones\nMeeting schedules"| CIIOS
    CIIOS -->|"Allocated groups\nProject details\nNotifications"| SUPERVISOR

    ADMIN -->|"Allocation requests\nProject approvals\nDuplicate checks"| CIIOS
    CIIOS -->|"Analytics reports\nAudit logs\nAllocation results"| ADMIN

    SUPERADMIN -->|"User management\nSchool config\nRole assignments"| CIIOS
    CIIOS -->|"System reports\nAudit trails\nUser lists"| SUPERADMIN

    AI -->|"Similarity scores\nMatch rankings"| CIIOS
    CIIOS -->|"Project data\nSupervisor data"| AI

    EMAIL -->|"Delivery status"| CIIOS
    CIIOS -->|"Verification emails\nNotifications"| EMAIL
`}
          />
          <div className="bg-muted/30 border border-border rounded-lg p-4 mt-2">
            <p className="font-medium text-foreground mb-1">Explanation</p>
            <p>The Context Diagram shows CIIOS interacting with six external entities. <strong>Students</strong> send project proposals and receive feedback. <strong>Supervisors</strong> send milestones and feedback, receiving allocated groups. <strong>Administrators</strong> trigger allocations and receive analytics. The <strong>Super Admin</strong> manages users and institutional structure. <strong>AI Service</strong> provides intelligence for duplicate detection and allocation matching. <strong>Email Service</strong> handles verification and notification delivery. Each arrow represents a specific data flow crossing the system boundary.</p>
          </div>

          {/* --- 3.3 Level 1 DFD --- */}
          <h4 className="font-semibold text-foreground mt-6 mb-2">3.3 Level 1 Data Flow Diagram</h4>
          <div className="bg-muted/30 border border-border rounded-lg p-3 mb-3">
            <p className="font-medium text-foreground mb-1">What is a Level 1 DFD?</p>
            <p>A Level 1 DFD decomposes the single process from the Context Diagram into its major sub-processes, showing the data stores (databases) that each process reads from and writes to, and the data flows between processes and external entities.</p>
          </div>
          <MermaidDiagram
            title="Figure 3.2 — Level 1 Data Flow Diagram"
            chart={`flowchart TB
    STUDENT(["Student"])
    SUPERVISOR(["Supervisor"])
    ADMIN(["Admin"])
    SUPERADMIN(["Super Admin"])
    AI(["AI Service"])

    P1["1.0\nUser\nManagement"]
    P2["2.0\nProject\nManagement"]
    P3["3.0\nDuplicate\nDetection"]
    P4["4.0\nSupervisor\nAllocation"]
    P5["5.0\nProgress\nTracking"]
    P6["6.0\nNotification\nSystem"]
    P7["7.0\nAnalytics"]
    P8["8.0\nRepository"]

    D1[("D1: Users")]
    D2[("D2: Projects")]
    D3[("D3: Groups")]
    D4[("D4: Milestones")]
    D5[("D5: Documents")]
    D6[("D6: Notifications")]
    D7[("D7: Audit Log")]

    STUDENT -->|"Registration"| P1
    SUPERVISOR -->|"Profile updates"| P1
    SUPERADMIN -->|"User commands"| P1
    P1 --> D1
    D1 --> P1

    STUDENT -->|"Proposals"| P2
    SUPERVISOR -->|"Approvals"| P2
    P2 --> D2
    D2 --> P2

    ADMIN -->|"Check request"| P3
    D2 -->|"Existing projects"| P3
    P3 --> AI
    AI --> P3
    P3 -->|"Duplicate flags"| D2

    ADMIN -->|"Allocate request"| P4
    D3 --> P4
    D1 -->|"Supervisors"| P4
    P4 --> AI
    AI --> P4
    P4 --> D3

    SUPERVISOR -->|"Milestones"| P5
    STUDENT -->|"Documents"| P5
    SUPERVISOR -->|"Feedback"| P5
    P5 --> D4
    P5 --> D5

    P2 -->|"Events"| P6
    P4 -->|"Events"| P6
    P5 -->|"Events"| P6
    P6 --> D6
    D6 --> STUDENT
    D6 --> SUPERVISOR

    D2 --> P7
    D3 --> P7
    P7 --> ADMIN

    D2 -->|"Approved"| P8
    P8 --> STUDENT

    P1 --> D7
    P2 --> D7
    D7 --> SUPERADMIN
`}
          />
          <div className="bg-muted/30 border border-border rounded-lg p-4 mt-2">
            <p className="font-medium text-foreground mb-1">Explanation</p>
            <p className="mb-2">The Level 1 DFD decomposes CIIOS into <strong>8 major processes</strong> and <strong>7 data stores</strong>:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>1.0 User Management</strong> — Registration, authentication, profile management, and role assignment. Reads/writes D1 (Users).</li>
              <li><strong>2.0 Project Management</strong> — Full project lifecycle from submission to approval. Uses D2 (Projects).</li>
              <li><strong>3.0 Duplicate Detection</strong> — Takes existing projects from D2, sends to AI for analysis, writes duplicate flags back.</li>
              <li><strong>4.0 Supervisor Allocation</strong> — Reads group data (D3) and supervisor profiles (D1), consults AI, creates allocation records.</li>
              <li><strong>5.0 Progress Tracking</strong> — Manages milestones (D4), documents (D5), and feedback.</li>
              <li><strong>6.0 Notification System</strong> — Receives events from processes 2.0, 4.0, and 5.0; delivers to users via D6.</li>
              <li><strong>7.0 Analytics</strong> — Aggregates data from D2 and D3 for admin dashboards.</li>
              <li><strong>8.0 Repository</strong> — Exposes approved projects from D2 to students and supervisors.</li>
            </ul>
          </div>

          {/* --- 3.4 Level 2 DFDs --- */}
          <h4 className="font-semibold text-foreground mt-6 mb-2">3.4 Level 2 Data Flow Diagrams</h4>
          <div className="bg-muted/30 border border-border rounded-lg p-3 mb-3">
            <p className="font-medium text-foreground mb-1">What is a Level 2 DFD?</p>
            <p>Level 2 DFDs further decompose each Level 1 process into its detailed sub-processes, showing exactly how data is transformed within each major function.</p>
          </div>

          <h5 className="font-medium text-foreground mt-3 mb-2">3.4.1 Level 2 DFD — Process 2.0: Project Management</h5>
          <MermaidDiagram
            title="Figure 3.3 — Level 2 DFD: Project Management"
            chart={`flowchart TB
    STUDENT(["Student"])
    SUPERVISOR(["Supervisor"])

    P2_1["2.1\nCreate\nProposal"]
    P2_2["2.2\nValidate\nData"]
    P2_3["2.3\nStore\nProject"]
    P2_4["2.4\nReview\nProject"]
    P2_5["2.5\nApprove"]
    P2_6["2.6\nRequest\nRevision"]
    P2_7["2.7\nReject"]

    D2[("D2: Projects")]
    D5[("D5: Documents")]
    DR[("D2R: Revisions")]

    STUDENT -->|"Title, description,\nkeywords"| P2_1
    P2_1 --> P2_2
    P2_2 -->|"Valid"| P2_3
    P2_2 -->|"Errors"| STUDENT
    P2_3 --> D2
    P2_3 -->|"Confirmation"| STUDENT

    D2 -->|"Pending projects"| P2_4
    SUPERVISOR -->|"Decision"| P2_4

    P2_4 -->|"Approved"| P2_5
    P2_4 -->|"Needs revision"| P2_6
    P2_4 -->|"Rejected"| P2_7

    P2_5 --> D2
    P2_5 -->|"Notification"| STUDENT
    P2_6 --> DR
    P2_6 -->|"Feedback"| D5
    P2_6 -->|"Notification"| STUDENT
    STUDENT -->|"Revised data"| P2_1
    P2_7 --> D2
    P2_7 -->|"Notification"| STUDENT
`}
          />
          <div className="bg-muted/30 border border-border rounded-lg p-4 mt-2">
            <p className="font-medium text-foreground mb-1">Explanation</p>
            <p>This Level 2 DFD breaks Process 2.0 into 7 sub-processes: <strong>2.1</strong> receives raw proposal data, <strong>2.2</strong> validates using Zod schemas, <strong>2.3</strong> stores in the database, <strong>2.4</strong> presents to supervisors for review, and <strong>2.5-2.7</strong> handle the three possible outcomes (approve, revise, reject). The revision path loops back to 2.1, allowing students to resubmit. Each outcome generates a notification and updates the project record.</p>
          </div>

          <h5 className="font-medium text-foreground mt-4 mb-2">3.4.2 Level 2 DFD — Process 4.0: Supervisor Allocation</h5>
          <MermaidDiagram
            title="Figure 3.4 — Level 2 DFD: Supervisor Allocation"
            chart={`flowchart TB
    ADMIN(["Admin"])
    SUPERVISOR(["Supervisor"])
    AI(["AI Service"])

    P4_1["4.1\nSelect\nGroup"]
    P4_2["4.2\nGather\nData"]
    P4_3["4.3\nAI\nMatching"]
    P4_4["4.4\nPresent\nResults"]
    P4_5["4.5\nConfirm\nAllocation"]
    P4_6["4.6\nSupervisor\nResponse"]

    D1[("D1: Users")]
    D3[("D3: Groups")]

    ADMIN -->|"Select group"| P4_1
    D3 --> P4_1
    P4_1 --> P4_2
    D3 --> P4_2
    D1 -->|"Supervisors"| P4_2
    P4_2 --> P4_3
    P4_3 --> AI
    AI --> P4_3
    P4_3 --> P4_4
    P4_4 --> ADMIN
    ADMIN -->|"Confirm"| P4_5
    P4_5 --> D3
    P4_5 -->|"Notify"| SUPERVISOR
    SUPERVISOR -->|"Accept/Decline"| P4_6
    P4_6 --> D3
    P4_6 -->|"Update count"| D1
`}
          />
          <div className="bg-muted/30 border border-border rounded-lg p-4 mt-2">
            <p className="font-medium text-foreground mb-1">Explanation</p>
            <p>This diagram decomposes the smart allocation process: <strong>4.1</strong> selects an unallocated group, <strong>4.2</strong> gathers group details and available supervisors, <strong>4.3</strong> sends to AI for compatibility scoring, <strong>4.4</strong> presents ranked results, <strong>4.5</strong> confirms the admin's selection, and <strong>4.6</strong> processes the supervisor's accept/decline response, updating allocation status and project counts.</p>
          </div>

          <h5 className="font-medium text-foreground mt-4 mb-2">3.4.3 Level 2 DFD — Process 1.0: User Management</h5>
          <MermaidDiagram
            title="Figure 3.5 — Level 2 DFD: User Management"
            chart={`flowchart TB
    STUDENT(["Student"])
    SUPERVISOR(["Supervisor"])
    SUPERADMIN(["Super Admin"])
    EMAIL(["Email Service"])

    P1_1["1.1\nRegister"]
    P1_2["1.2\nVerify\nEmail"]
    P1_3["1.3\nAuthenticate"]
    P1_4["1.4\nManage\nProfiles"]
    P1_5["1.5\nManage\nRoles"]
    P1_6["1.6\nCreate\nAccounts"]
    P1_7["1.7\nDelete\nUser"]

    D1[("D1: Users")]
    DR[("D1R: Roles")]
    D7[("D7: Audit")]

    STUDENT -->|"Registration"| P1_1
    SUPERVISOR -->|"Registration"| P1_1
    P1_1 --> D1
    P1_1 --> DR
    P1_1 --> P1_2
    P1_2 --> EMAIL
    P1_2 -->|"Activated"| D1

    STUDENT -->|"Login"| P1_3
    SUPERVISOR -->|"Login"| P1_3
    D1 --> P1_3
    P1_3 -->|"JWT token"| STUDENT

    STUDENT -->|"Updates"| P1_4
    SUPERVISOR -->|"Updates"| P1_4
    P1_4 --> D1

    SUPERADMIN -->|"Role changes"| P1_5
    P1_5 --> DR
    P1_5 --> D7

    SUPERADMIN -->|"Create"| P1_6
    P1_6 --> D1
    P1_6 --> DR
    P1_6 --> D7

    SUPERADMIN -->|"Delete"| P1_7
    P1_7 -->|"Remove"| D1
    P1_7 --> D7
`}
          />
          <div className="bg-muted/30 border border-border rounded-lg p-4 mt-2">
            <p className="font-medium text-foreground mb-1">Explanation</p>
            <p>User Management is decomposed into 7 sub-processes: <strong>1.1</strong> creates user accounts with role assignments, <strong>1.2</strong> handles email verification, <strong>1.3</strong> authenticates and issues JWT tokens, <strong>1.4</strong> manages profile updates, <strong>1.5-1.7</strong> are privileged operations (role management, account creation, user deletion) restricted to the super admin with full audit logging.</p>
          </div>

          {/* --- 3.5 Use Case Diagram --- */}
          <h4 className="font-semibold text-foreground mt-6 mb-2">3.5 Use Case Diagram</h4>
          <div className="bg-muted/30 border border-border rounded-lg p-3 mb-3">
            <p className="font-medium text-foreground mb-1">What is a Use Case Diagram?</p>
            <p>A Use Case Diagram captures the functional requirements from the users' perspective, showing which actors (user roles) can perform which actions. It is a key artifact from the requirements analysis stage.</p>
          </div>
          <MermaidDiagram
            title="Figure 3.6 — CIIOS Use Case Diagram"
            chart={`flowchart TB
    subgraph SA["SUPER ADMIN"]
        SA1["Create Admin Accounts"]
        SA2["Create Supervisor Accounts"]
        SA3["Manage User Roles"]
        SA4["Delete Users"]
        SA5["Reset Passwords"]
        SA6["Manage Schools"]
        SA7["Manage Departments"]
        SA8["View Audit Logs"]
    end

    subgraph AD["ADMINISTRATOR"]
        A1["View All Projects"]
        A2["Run Smart Allocation"]
        A3["Approve/Reject Projects"]
        A4["View Analytics"]
        A5["Run Duplicate Detection"]
        A6["Manage Phase Templates"]
    end

    subgraph SV["SUPERVISOR"]
        V1["View Assigned Projects"]
        V2["Accept/Decline Allocation"]
        V3["Provide Feedback"]
        V4["Set Milestones"]
        V5["Schedule Meetings"]
        V6["Review Documents"]
    end

    subgraph ST["STUDENT"]
        S1["Register with School/Dept"]
        S2["Submit Project Proposal"]
        S3["Create Student Group"]
        S4["Add Group Members"]
        S5["Request Allocation"]
        S6["Upload Documents"]
        S7["Track Milestones"]
        S8["View Feedback"]
        S9["Browse Repository"]
    end
`}
          />
          <div className="bg-muted/30 border border-border rounded-lg p-4 mt-2">
            <p className="font-medium text-foreground mb-1">Explanation</p>
            <p className="mb-2">The Use Case Diagram organizes CIIOS functionality into four actor groups with distinct responsibilities:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Student</strong> — Primary users who submit proposals, form groups, upload documents, and track progress.</li>
              <li><strong>Supervisor</strong> — Academic guides who accept allocations, provide feedback, set milestones, and schedule meetings.</li>
              <li><strong>Administrator</strong> — Oversight role managing the project ecosystem, running AI allocation, and accessing analytics.</li>
              <li><strong>Super Admin</strong> — Highest authority with user management, institutional configuration, and full audit access.</li>
            </ul>
            <p className="mt-2">The hierarchy follows the principle of least privilege — each role has only the permissions necessary for their function.</p>
          </div>

          {/* --- 3.6 Class Diagram --- */}
          <h4 className="font-semibold text-foreground mt-6 mb-2">3.6 Class Diagram</h4>
          <div className="bg-muted/30 border border-border rounded-lg p-3 mb-3">
            <p className="font-medium text-foreground mb-1">What is a Class Diagram?</p>
            <p>A Class Diagram shows the static structure of the system — the classes (entities), their attributes, methods, and relationships. It maps to the database schema and application models.</p>
          </div>
          <MermaidDiagram
            title="Figure 3.7 — CIIOS Class Diagram"
            chart={`classDiagram
    class User {
        +UUID id
        +String email
        +String full_name
        +String user_type
        +String school
        +String department
        +signUp()
        +signIn()
        +updateProfile()
    }
    class Student {
        +String student_number
        +Int year_of_study
        +submitProject()
        +createGroup()
        +uploadDocument()
    }
    class Supervisor {
        +Int max_projects
        +Int current_projects
        +String[] research_areas
        +acceptAllocation()
        +giveFeedback()
        +scheduleMeeting()
        +setMilestone()
    }
    class Project {
        +UUID id
        +String title
        +String description
        +String status
        +String[] keywords
        +Float similarity_score
        +submit()
        +approve()
        +reject()
        +checkDuplicate()
    }
    class StudentGroup {
        +UUID id
        +String name
        +String department
        +addMember()
        +requestAllocation()
    }
    class GroupAllocation {
        +String status
        +Float match_score
        +String match_reason
        +accept()
        +decline()
    }
    class Milestone {
        +String title
        +String status
        +Date due_date
        +addUpdate()
        +markComplete()
    }
    class Meeting {
        +String title
        +DateTime scheduled_at
        +String meeting_link
        +schedule()
        +cancel()
    }
    class Feedback {
        +String title
        +String content
        +Int rating
        +create()
    }
    class Document {
        +String file_name
        +Int version
        +String document_type
        +upload()
        +download()
    }
    class School {
        +String name
        +Boolean is_active
        +addDepartment()
    }
    class Department {
        +String name
        +Boolean is_active
    }

    User <|-- Student
    User <|-- Supervisor
    Student "1" --> "*" Project : submits
    Student "1" --> "*" StudentGroup : creates
    Supervisor "1" --> "*" Feedback : provides
    Supervisor "1" --> "*" Meeting : schedules
    Project "1" --> "*" Document : contains
    Project "1" --> "*" Feedback : receives
    StudentGroup "1" --> "*" GroupAllocation : has
    StudentGroup "1" --> "*" Milestone : tracks
    StudentGroup "1" --> "*" Meeting : attends
    GroupAllocation "*" --> "1" Supervisor : assigned_to
    School "1" --> "*" Department : contains
`}
          />
          <div className="bg-muted/30 border border-border rounded-lg p-4 mt-2">
            <p className="font-medium text-foreground mb-1">Explanation</p>
            <p className="mb-2">The class diagram shows 12 core classes with their relationships:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Inheritance</strong> — <code>Student</code> and <code>Supervisor</code> extend <code>User</code> with role-specific attributes and methods.</li>
              <li><strong>Composition</strong> — A <code>Project</code> contains <code>Documents</code> and <code>Feedback</code> items (cascade-deleted).</li>
              <li><strong>Association</strong> — <code>StudentGroup</code> connects to <code>Supervisor</code> via <code>GroupAllocation</code>, modeling the AI-powered matching relationship.</li>
              <li><strong>Methods</strong> — Each class defines its supported operations (e.g., Project: submit, approve, reject; Supervisor: giveFeedback, scheduleMeeting).</li>
            </ul>
          </div>

          {/* --- 3.7 Sequence Diagrams --- */}
          <h4 className="font-semibold text-foreground mt-6 mb-2">3.7 Sequence Diagrams</h4>
          <div className="bg-muted/30 border border-border rounded-lg p-3 mb-3">
            <p className="font-medium text-foreground mb-1">What is a Sequence Diagram?</p>
            <p>A Sequence Diagram shows the chronological order of interactions between objects during a specific workflow. Time flows top to bottom, with arrows showing messages exchanged between participants.</p>
          </div>

          <h5 className="font-medium text-foreground mt-3 mb-2">3.7.1 Project Submission and Approval</h5>
          <MermaidDiagram
            title="Figure 3.8 — Project Submission Sequence"
            chart={`sequenceDiagram
    actor Student
    participant Form as Project Form
    participant Validator as Zod Validator
    participant DB as Database
    participant Edge as Edge Function
    participant AI as AI Model
    actor Supervisor

    Student->>Form: Fill title, description, keywords
    Form->>Validator: Validate fields
    Validator-->>Form: Validation passed
    Student->>Form: Click Submit
    Form->>DB: INSERT project record
    DB-->>Form: Return project ID
    Form-->>Student: Success notification

    Note over Student,AI: Optional Duplicate Check

    Student->>Edge: Check for Duplicates
    Edge->>DB: Fetch existing projects
    DB-->>Edge: Project list
    Edge->>AI: Analyze similarity
    AI-->>Edge: Similarity scores
    Edge-->>Student: Duplicate report

    Note over Student,Supervisor: Supervisor Review

    Supervisor->>DB: View pending projects
    alt Approved
        Supervisor->>DB: Update status=approved
        DB->>DB: Trigger notifies student
    else Needs Revision
        Supervisor->>DB: Update status=needs_revision
        DB->>DB: Create revision record
        Student->>Form: Edit and resubmit
    else Rejected
        Supervisor->>DB: Update status=rejected
        DB->>DB: Trigger notifies student
    end
`}
          />
          <div className="bg-muted/30 border border-border rounded-lg p-4 mt-2">
            <p className="font-medium text-foreground mb-1">Explanation</p>
            <p>This sequence traces three phases: (1) <strong>Submission</strong> — student fills the form, Zod validates, project is stored; (2) <strong>Duplicate Detection</strong> — optional AI check against existing projects returning similarity scores; (3) <strong>Review</strong> — supervisor approves, requests revision, or rejects. Database triggers automatically create notifications and audit records.</p>
          </div>

          <h5 className="font-medium text-foreground mt-4 mb-2">3.7.2 Smart Supervisor Allocation</h5>
          <MermaidDiagram
            title="Figure 3.9 — Smart Allocation Sequence"
            chart={`sequenceDiagram
    actor Admin
    participant UI as Allocation UI
    participant Edge as Edge Function
    participant DB as Database
    participant AI as AI Model
    actor Supervisor

    Admin->>UI: Select group for allocation
    Admin->>UI: Click Smart Allocate
    UI->>Edge: POST /smart-allocation
    Edge->>DB: Fetch group details
    Edge->>DB: Fetch available supervisors
    Edge->>DB: Fetch workload data
    Edge->>AI: Match group with supervisors
    AI-->>Edge: Ranked matches with scores
    Edge-->>UI: Display suggestions

    Admin->>UI: Confirm supervisor selection
    UI->>DB: Create allocation record
    DB->>DB: Notify supervisor

    alt Accepted
        Supervisor->>DB: Accept allocation
        DB->>DB: Update project count
        DB->>DB: Notify students
    else Declined
        Supervisor->>DB: Decline allocation
        DB->>DB: Notify admin
    end
`}
          />
          <div className="bg-muted/30 border border-border rounded-lg p-4 mt-2">
            <p className="font-medium text-foreground mb-1">Explanation</p>
            <p>The smart allocation sequence shows: (1) Admin selects a group and triggers AI matching; (2) Edge function gathers group data, supervisor profiles, and workload, sends to AI for scoring; (3) Admin reviews ranked suggestions and confirms; (4) Supervisor accepts or declines, with automated notifications and workload updates.</p>
          </div>

          <h5 className="font-medium text-foreground mt-4 mb-2">3.7.3 Authentication Flow</h5>
          <MermaidDiagram
            title="Figure 3.10 — Authentication Sequence"
            chart={`sequenceDiagram
    actor User
    participant Form as Auth Form
    participant Auth as Auth Service
    participant DB as Database
    participant Email as Email Service

    User->>Form: Enter email and password
    Form->>Auth: signUp(email, password, metadata)
    Auth->>DB: Create auth user
    Auth->>DB: Trigger creates profile + role
    Auth->>Email: Send verification email
    Auth-->>Form: Account created
    Form-->>User: Check email for verification

    User->>Email: Click verification link
    Email->>Auth: Verify token
    Auth->>DB: Activate account
    
    User->>Form: Enter login credentials
    Form->>Auth: signIn(email, password)
    Auth->>DB: Validate credentials
    Auth-->>Form: JWT session token
    Form->>DB: Fetch user role
    DB-->>Form: Role data
    Form-->>User: Redirect to dashboard
`}
          />
          <div className="bg-muted/30 border border-border rounded-lg p-4 mt-2">
            <p className="font-medium text-foreground mb-1">Explanation</p>
            <p>The authentication sequence covers registration (with email verification) and login. On signup, a database trigger automatically creates profile, role, and student/supervisor records. After email verification, users can log in to receive a JWT token. The frontend fetches the user's role to determine which dashboard to display.</p>
          </div>

          {/* --- 3.8 Activity Diagrams --- */}
          <h4 className="font-semibold text-foreground mt-6 mb-2">3.8 Activity Diagrams</h4>
          <div className="bg-muted/30 border border-border rounded-lg p-3 mb-3">
            <p className="font-medium text-foreground mb-1">What is an Activity Diagram?</p>
            <p>An Activity Diagram shows the flow of activities in a workflow, including decision points (diamonds), parallel actions, and end states. It models the dynamic behavior of a process.</p>
          </div>

          <h5 className="font-medium text-foreground mt-3 mb-2">3.8.1 Project Lifecycle Activity</h5>
          <MermaidDiagram
            title="Figure 3.11 — Project Lifecycle Activity Diagram"
            chart={`flowchart TD
    START(["Start"])
    START --> CREATE["Student creates project proposal"]
    CREATE --> VALIDATE{"Form\nvalid?"}
    VALIDATE -->|"No"| FIX["Fix validation errors"]
    FIX --> CREATE
    VALIDATE -->|"Yes"| SUBMIT["Submit to database"]
    SUBMIT --> PENDING["Status: Pending"]

    PENDING --> DUP_CHECK{"Run duplicate\ncheck?"}
    DUP_CHECK -->|"Yes"| AI_CHECK["AI analyzes similarity"]
    AI_CHECK --> DUP_RESULT{"High\nsimilarity?"}
    DUP_RESULT -->|"Yes"| FLAG["Flag as potential duplicate"]
    DUP_RESULT -->|"No"| REVIEW
    FLAG --> REVIEW
    DUP_CHECK -->|"No"| REVIEW

    REVIEW["Supervisor reviews project"]
    REVIEW --> DECISION{"Supervisor\ndecision?"}

    DECISION -->|"Approve"| APPROVED["Status: Approved"]
    DECISION -->|"Revision"| NEEDS_REV["Status: Needs Revision"]
    DECISION -->|"Reject"| REJECTED["Status: Rejected"]

    NEEDS_REV --> STUDENT_REVISE["Student revises and resubmits"]
    STUDENT_REVISE --> REVIEW
    REJECTED --> END_REJ(["End: Rejected"])

    APPROVED --> TRACKING["Progress tracking begins"]
    TRACKING --> MILESTONES["Supervisor sets milestones"]
    MILESTONES --> WORK["Student works on deliverables"]
    WORK --> FEEDBACK["Supervisor provides feedback"]
    FEEDBACK --> COMPLETE{"All milestones\ncompleted?"}
    COMPLETE -->|"No"| WORK
    COMPLETE -->|"Yes"| FINALIZE["Status: Finalized"]
    FINALIZE --> ARCHIVE["Archived to Repository"]
    ARCHIVE --> END_OK(["End: Completed"])
`}
          />
          <div className="bg-muted/30 border border-border rounded-lg p-4 mt-2">
            <p className="font-medium text-foreground mb-1">Explanation</p>
            <p>This activity diagram traces the complete project lifecycle: proposal creation → validation → submission → optional duplicate check → supervisor review (approve/revise/reject) → progress tracking with milestones and feedback → finalization → repository archival. The revision loop allows students to resubmit, and the milestone tracking loop continues until all deliverables are completed.</p>
          </div>

          <h5 className="font-medium text-foreground mt-4 mb-2">3.8.2 User Registration Activity</h5>
          <MermaidDiagram
            title="Figure 3.12 — Registration and Login Activity Diagram"
            chart={`flowchart TD
    START(["Start"])
    START --> AUTH_Q{"New or\nexisting user?"}
    AUTH_Q -->|"New"| SIGNUP["Click Sign Up"]
    AUTH_Q -->|"Existing"| LOGIN["Click Sign In"]

    SIGNUP --> ROLE{"Select\nrole"}
    ROLE -->|"Student"| STU["Fill school, dept, student number"]
    ROLE -->|"Supervisor"| SUP["Fill research areas, department"]
    STU --> CREDS["Enter email and password"]
    SUP --> CREDS

    CREDS --> SUBMIT["Click Register"]
    SUBMIT --> VALID{"Form\nvalid?"}
    VALID -->|"No"| ERRORS["Show validation errors"]
    ERRORS --> CREDS
    VALID -->|"Yes"| CREATE["Create account"]
    CREATE --> TRIGGER["DB trigger: create profile + role"]
    TRIGGER --> EMAIL["Send verification email"]
    EMAIL --> VERIFY{"Email\nverified?"}
    VERIFY -->|"No"| RESEND["Resend verification"]
    RESEND --> VERIFY
    VERIFY -->|"Yes"| ACTIVE["Account activated"]

    LOGIN --> LOGIN_FORM["Enter email and password"]
    LOGIN_FORM --> CHECK{"Valid\ncredentials?"}
    CHECK -->|"No"| ERR["Show error"]
    ERR --> LOGIN_FORM
    CHECK -->|"Yes"| ACTIVE

    ACTIVE --> FETCH["Fetch user role"]
    FETCH --> ROUTE{"Role?"}
    ROUTE -->|"Student"| S_DASH["Student Dashboard"]
    ROUTE -->|"Supervisor"| V_DASH["Supervisor Dashboard"]
    ROUTE -->|"Admin"| A_DASH["Admin Dashboard"]
    ROUTE -->|"Super Admin"| SA_DASH["Super Admin Dashboard"]

    S_DASH --> ENDD(["End"])
    V_DASH --> ENDD
    A_DASH --> ENDD
    SA_DASH --> ENDD
`}
          />
          <div className="bg-muted/30 border border-border rounded-lg p-4 mt-2">
            <p className="font-medium text-foreground mb-1">Explanation</p>
            <p>This activity diagram shows two entry paths — registration (new users) and login (existing users) — converging at account activation. Registration branches by role (student vs. supervisor) for role-specific form fields. Database triggers automatically create profile and role records. Email verification is required before activation. After authentication, the system routes users to their role-specific dashboard.</p>
          </div>

          {/* --- 3.9 ERD --- */}
          <h4 className="font-semibold text-foreground mt-6 mb-2">3.9 Entity Relationship Diagram &amp; Database Normalization</h4>
          <div className="bg-muted/30 border border-border rounded-lg p-3 mb-3">
            <p className="font-medium text-foreground mb-1">What is an ERD?</p>
            <p>An Entity Relationship Diagram shows the database tables, their columns, and the relationships (foreign keys) between them. It is the blueprint for the system's data layer.</p>
          </div>
          
          {/* ERD Image - larger and clearer than Mermaid */}
          <div className="print:break-inside-avoid my-4">
            <p className="text-sm font-semibold text-foreground mb-2 text-center">Figure 3.13 — CIIOS Entity Relationship Diagram</p>
            <div className="overflow-x-auto bg-card border border-border rounded-lg p-4">
              <img 
                src={erdDiagram} 
                alt="CIIOS Entity Relationship Diagram showing all database tables and their relationships" 
                className="w-full max-w-4xl mx-auto"
              />
            </div>
          </div>
          <div className="bg-muted/30 border border-border rounded-lg p-4 mt-2">
            <p className="font-medium text-foreground mb-1">Explanation</p>
            <p className="mb-2">The database consists of <strong>18 tables</strong> organized into functional groups:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Identity</strong> — <code>profiles</code>, <code>user_roles</code>, <code>students</code>, <code>supervisors</code></li>
              <li><strong>Projects</strong> — <code>projects</code>, <code>project_documents</code>, <code>project_phases</code>, <code>project_revisions</code></li>
              <li><strong>Groups</strong> — <code>student_groups</code>, <code>group_members</code>, <code>group_allocations</code>, <code>group_milestones</code></li>
              <li><strong>Communication</strong> — <code>meetings</code>, <code>supervisor_feedback</code>, <code>notifications</code></li>
              <li><strong>Administration</strong> — <code>schools</code>, <code>departments</code>, <code>audit_log</code></li>
            </ul>
            <p className="mt-2"><strong>Normalization:</strong> The schema is in Third Normal Form (3NF). Roles are stored in a separate <code>user_roles</code> table (not on profiles) to prevent privilege escalation. Student and supervisor-specific attributes are in separate extension tables, avoiding null columns for role-irrelevant fields. The <code>schools → departments</code> hierarchy avoids repeating school data.</p>
          </div>

          {/* --- 3.10 System Architecture --- */}
          <h4 className="font-semibold text-foreground mt-6 mb-2">3.10 System Architecture Flowchart</h4>
          <MermaidDiagram
            title="Figure 3.14 — System Architecture Overview"
            chart={`flowchart TB
    subgraph FRONT["Frontend - React + Vite"]
        UI["UI Components"]
        ROUTER["React Router"]
        QUERY["React Query"]
        FORMS["Hook Form + Zod"]
    end
    subgraph BACK["Backend - Lovable Cloud"]
        AUTH["Auth Service"]
        subgraph EDGE["Edge Functions"]
            EF1["create-admin"]
            EF2["create-supervisor"]
            EF3["delete-user"]
            EF4["check-duplicate"]
            EF5["smart-allocation"]
            EF6["deadline-reminders"]
        end
        subgraph DB["PostgreSQL"]
            TABLES["18 Tables"]
            RLS["50+ RLS Policies"]
            TRIGGERS["Database Triggers"]
        end
        STORE["File Storage"]
    end
    subgraph EXT["External"]
        AI["Lovable AI"]
        MAIL["Email Service"]
    end
    UI --> QUERY --> DB
    ROUTER --> AUTH
    EDGE --> AI
    EDGE --> DB
    AUTH --> DB
    DB --> MAIL
`}
          />
          <div className="bg-muted/30 border border-border rounded-lg p-4 mt-2">
            <p className="font-medium text-foreground mb-1">Explanation</p>
            <p>CIIOS uses a three-tier architecture: <strong>Frontend</strong> (React SPA with routing, state management, and form validation), <strong>Backend</strong> (Lovable Cloud providing authentication, 6 edge functions, PostgreSQL with 50+ RLS policies, and file storage), and <strong>External Services</strong> (AI for intelligent features, email for verification). React Query synchronizes frontend state with the database, while edge functions handle privileged operations.</p>
          </div>

          {/* --- 3.11 Security Design --- */}
          <h4 className="font-semibold text-foreground mt-6 mb-2">3.11 Security Design</h4>

          <h5 className="font-medium text-foreground mt-3 mb-2">3.11.1 User Authentication</h5>
          <p>Authentication uses JWT (JSON Web Tokens) issued by the auth service. Users register with email and password; passwords are hashed with bcrypt. Email verification is required before account activation. Sessions are managed client-side using the auth hook, which checks token validity on each page load.</p>

          <h5 className="font-medium text-foreground mt-3 mb-2">3.11.2 Access Control (Three-Layer Security)</h5>
          <MermaidDiagram
            title="Figure 3.15 — Three-Layer Authorization Flow"
            chart={`flowchart TD
    REQ(["Client Request"])
    REQ --> L1{"Layer 1:\nFrontend\nRoute Guard"}
    L1 -->|"Not authenticated"| BLOCK1["Redirect to Login"]
    L1 -->|"Wrong role"| BLOCK2["Redirect to Dashboard"]
    L1 -->|"Authorized"| RENDER["Render Page"]

    RENDER --> L2{"Layer 2:\nDatabase RLS"}
    L2 -->|"Policy check"| RLS["PostgreSQL evaluates\nRLS policy"]
    RLS -->|"Pass"| DATA["Return data"]
    RLS -->|"Fail"| EMPTY["Empty result"]

    RENDER --> L3{"Layer 3:\nEdge Function\nJWT Check"}
    L3 -->|"Verify token"| ROLE["Check role via\nhas_role()"]
    ROLE -->|"Authorized"| EXEC["Execute operation"]
    ROLE -->|"Unauthorized"| DENY["403 Forbidden"]
`}
          />
          <div className="bg-muted/30 border border-border rounded-lg p-4 mt-2">
            <p className="font-medium text-foreground mb-1">Explanation</p>
            <p>CIIOS uses defense-in-depth with three independent authorization layers: <strong>Layer 1</strong> — Frontend route guards check authentication and role before rendering pages. <strong>Layer 2</strong> — PostgreSQL RLS policies enforce data access at the database level, even if the frontend is bypassed. <strong>Layer 3</strong> — Edge functions independently verify JWT tokens and check roles using a security-definer function before executing privileged operations. No single point of failure can compromise security.</p>
          </div>

          <h5 className="font-medium text-foreground mt-3 mb-2">3.11.3 Data Encryption</h5>
          <p>All data in transit is encrypted via HTTPS/TLS. Passwords are hashed with bcrypt (never stored in plaintext). JWTs are signed with a secret key and expire after the session timeout. Database connections use SSL. File storage uses signed URLs for temporary access.</p>

          <h5 className="font-medium text-foreground mt-3 mb-2">3.11.4 Validation</h5>
          <p>All user inputs are validated client-side using Zod schemas (type checking, required fields, length constraints) and server-side through database constraints (NOT NULL, UNIQUE, foreign keys). Edge functions validate request bodies before processing.</p>

          {/* --- 3.12 Interface Design --- */}
          <h4 className="font-semibold text-foreground mt-6 mb-2">3.12 Interface Design</h4>
          <p>
            The user interface follows a consistent design system built on shadcn/ui components with Tailwind CSS semantic tokens. Key design decisions include:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>Sidebar navigation</strong> — Persistent left sidebar with role-specific menu items, organized by function.</li>
            <li><strong>Dashboard cards</strong> — Summary statistics displayed in card grids with icons and counts.</li>
            <li><strong>Data tables</strong> — Searchable, sortable tables for listing projects, users, groups, and allocations.</li>
            <li><strong>Modal dialogs</strong> — Confirmation dialogs for destructive actions (delete user, reject project).</li>
            <li><strong>Toast notifications</strong> — Non-blocking success/error messages using the Sonner toast library.</li>
            <li><strong>Responsive design</strong> — Mobile-first approach with collapsible sidebar and stacked layouts on small screens.</li>
            <li><strong>Theme support</strong> — Light and dark mode with semantic color tokens ensuring contrast compliance.</li>
          </ul>
        </DocSection>

        <Separator className="my-6" />

        {/* ================================================================ */}
        {/* CHAPTER 4: IMPLEMENTATION */}
        {/* ================================================================ */}
        <DocSection icon={<Code className="h-5 w-5" />} title="Chapter 4: Implementation">

          <h4 className="font-semibold text-foreground mt-2 mb-2">4.1 Code Structure</h4>
          <p>The project follows a modular React architecture:</p>
          <CodeBlock code={`ciios/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/              # shadcn/ui base components
│   │   ├── AuthForm.tsx     # Registration/login forms
│   │   ├── Dashboard.tsx    # Role-based dashboard
│   │   ├── AppSidebar.tsx   # Navigation sidebar
│   │   └── ...
│   ├── pages/               # Route-level page components
│   │   ├── Auth.tsx         # Authentication page
│   │   ├── Projects.tsx     # Project management
│   │   ├── Allocation.tsx   # Supervisor allocation
│   │   └── ...
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.tsx      # Authentication state
│   │   ├── useUserRole.tsx  # Role detection
│   │   └── ...
│   ├── integrations/        # External service clients
│   │   └── supabase/        # Database client + types
│   └── lib/                 # Utility functions
├── supabase/
│   └── functions/           # Edge functions (serverless)
│       ├── create-admin/
│       ├── check-duplicate/
│       ├── smart-allocation/
│       └── ...
└── public/                  # Static assets`} />

          <h4 className="font-semibold text-foreground mt-4 mb-2">4.2 Code Conventions</h4>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Language:</strong> TypeScript with strict mode for type safety</li>
            <li><strong>Components:</strong> Functional components with hooks (no class components)</li>
            <li><strong>State management:</strong> React Query for server state, React useState for local UI state</li>
            <li><strong>Styling:</strong> Tailwind CSS utility classes with semantic design tokens — no inline styles or raw color values</li>
            <li><strong>Forms:</strong> React Hook Form with Zod validation schemas</li>
            <li><strong>Imports:</strong> Path aliases using <code>@/</code> prefix for clean imports</li>
            <li><strong>Error handling:</strong> Try-catch blocks in async operations with user-facing toast messages</li>
          </ul>

          <h4 className="font-semibold text-foreground mt-4 mb-2">4.3 Frontend Implementation</h4>

          <h5 className="font-medium text-foreground mt-3 mb-2">Authentication Hook (useAuth.tsx)</h5>
          <p className="mb-2">The authentication hook manages session state across the application:</p>
          <CodeBlock code={`// src/hooks/useAuth.tsx — Core authentication logic
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading, signOut: () => supabase.auth.signOut() };
};`} />

          <h5 className="font-medium text-foreground mt-4 mb-2">Protected Route Component</h5>
          <p className="mb-2">Role-based route protection ensures users can only access authorized pages:</p>
          <CodeBlock code={`// src/components/ProtectedRoute.tsx
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const { userRole, roleLoading } = useUserRole();

  if (loading || roleLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/auth" />;
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
};`} />

          <h5 className="font-medium text-foreground mt-4 mb-2">Database Query Pattern (React Query)</h5>
          <p className="mb-2">All data fetching uses React Query for automatic caching and synchronization:</p>
          <CodeBlock code={`// Example: Fetching projects with React Query
const { data: projects, isLoading } = useQuery({
  queryKey: ['projects'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
});`} />

          <h4 className="font-semibold text-foreground mt-4 mb-2">4.4 Backend Implementation</h4>

          <h5 className="font-medium text-foreground mt-3 mb-2">Edge Function: Smart Allocation</h5>
          <p className="mb-2">The smart allocation edge function uses AI to match student groups with supervisors:</p>
          <CodeBlock code={`// supabase/functions/smart-allocation/index.ts
serve(async (req) => {
  // 1. Verify authentication
  const authHeader = req.headers.get('Authorization');
  const { data: { user } } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  );

  // 2. Fetch group and supervisor data
  const { data: group } = await supabase
    .from('student_groups').select('*').eq('id', groupId);
  const { data: supervisors } = await supabase
    .from('supervisor_directory').select('*');

  // 3. Send to AI for matching
  const aiResponse = await fetch(AI_ENDPOINT, {
    body: JSON.stringify({
      prompt: \`Match this group with supervisors...\`,
      groupData: group,
      supervisorData: supervisors,
    }),
  });

  // 4. Return ranked matches
  return new Response(JSON.stringify(aiResponse.matches));
});`} />

          <h5 className="font-medium text-foreground mt-4 mb-2">Row-Level Security Policy Example</h5>
          <p className="mb-2">RLS policies enforce data access at the database level:</p>
          <CodeBlock code={`-- Students can only view their own projects
CREATE POLICY "Students view own projects"
ON public.projects FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Supervisors can view all projects
CREATE POLICY "Supervisors view all projects"
ON public.projects FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'supervisor'));

-- Admins can update any project status
CREATE POLICY "Admins update projects"
ON public.projects FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));`} />

          <h4 className="font-semibold text-foreground mt-4 mb-2">4.5 System Integration</h4>
          <p>
            The frontend and backend are integrated through the Supabase JavaScript client, which provides type-safe access to the database, authentication, storage, and edge functions. React Query wraps all database calls to provide automatic caching, background refetching, optimistic updates, and error retry. The edge functions are called via the <code>supabase.functions.invoke()</code> method, which automatically includes the user's JWT token for authentication.
          </p>
          <CodeBlock code={`// Calling an edge function from the frontend
const { data, error } = await supabase.functions.invoke(
  'smart-allocation',
  { body: { group_id: selectedGroupId } }
);

// The JWT token is automatically included in the request
// The edge function verifies it server-side before executing`} />
        </DocSection>

        <Separator className="my-6" />

        {/* ================================================================ */}
        {/* CHAPTER 5: SYSTEM TESTING */}
        {/* ================================================================ */}
        <DocSection icon={<TestTube className="h-5 w-5" />} title="Chapter 5: System Testing">

          <h4 className="font-semibold text-foreground mt-2 mb-2">5.1 Testing Categories</h4>

          <h5 className="font-medium text-foreground mt-3 mb-2">White-Box Testing</h5>
          <p>White-box testing examines the internal structure and logic of the code. In CIIOS, this includes testing React hooks (useAuth, useUserRole), validation schemas (Zod), utility functions (CSV export, date formatting), and edge function logic (JWT verification, role checking, AI request formatting).</p>

          <h5 className="font-medium text-foreground mt-3 mb-2">Black-Box Testing</h5>
          <p>Black-box testing validates system behavior against requirements without examining internal code. This includes testing user workflows (registration → login → project submission → allocation), API responses (edge function inputs/outputs), and UI interactions (form submission, navigation, notifications).</p>

          <h4 className="font-semibold text-foreground mt-4 mb-2">5.2 Testing Strategy</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 font-semibold text-foreground">Level</th>
                  <th className="text-left p-2 font-semibold text-foreground">Scope</th>
                  <th className="text-left p-2 font-semibold text-foreground">Tools</th>
                  <th className="text-left p-2 font-semibold text-foreground">Focus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><td className="p-2">Unit</td><td className="p-2">Individual functions and components</td><td className="p-2">Vitest, React Testing Library</td><td className="p-2">Hooks, validators, utilities</td></tr>
                <tr><td className="p-2">Integration</td><td className="p-2">Component + database interactions</td><td className="p-2">Vitest, Supabase test client</td><td className="p-2">CRUD operations, RLS policies</td></tr>
                <tr><td className="p-2">System</td><td className="p-2">End-to-end workflows</td><td className="p-2">Browser testing</td><td className="p-2">Complete user journeys</td></tr>
                <tr><td className="p-2">Acceptance</td><td className="p-2">User requirements validation</td><td className="p-2">Manual testing</td><td className="p-2">FR-01 through FR-14</td></tr>
              </tbody>
            </table>
          </div>

          <h4 className="font-semibold text-foreground mt-4 mb-2">5.3 Functional Testing Results</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 font-semibold text-foreground">Test Case</th>
                  <th className="text-left p-2 font-semibold text-foreground">Input</th>
                  <th className="text-left p-2 font-semibold text-foreground">Expected</th>
                  <th className="text-left p-2 font-semibold text-foreground">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><td className="p-2">Student registration</td><td className="p-2">Valid email, password, school, dept</td><td className="p-2">Account created, verification email sent</td><td className="p-2 text-green-600 font-medium">Pass</td></tr>
                <tr><td className="p-2">Duplicate email registration</td><td className="p-2">Already registered email</td><td className="p-2">Error message displayed</td><td className="p-2 text-green-600 font-medium">Pass</td></tr>
                <tr><td className="p-2">Project submission</td><td className="p-2">Title, description, keywords</td><td className="p-2">Project saved with pending status</td><td className="p-2 text-green-600 font-medium">Pass</td></tr>
                <tr><td className="p-2">Empty form submission</td><td className="p-2">Empty required fields</td><td className="p-2">Validation errors shown</td><td className="p-2 text-green-600 font-medium">Pass</td></tr>
                <tr><td className="p-2">Duplicate detection</td><td className="p-2">Similar project title</td><td className="p-2">Similarity score returned</td><td className="p-2 text-green-600 font-medium">Pass</td></tr>
                <tr><td className="p-2">Smart allocation</td><td className="p-2">Group ID</td><td className="p-2">Ranked supervisor matches</td><td className="p-2 text-green-600 font-medium">Pass</td></tr>
                <tr><td className="p-2">Supervisor accept allocation</td><td className="p-2">Accept button click</td><td className="p-2">Status updated, students notified</td><td className="p-2 text-green-600 font-medium">Pass</td></tr>
                <tr><td className="p-2">Unauthorized access attempt</td><td className="p-2">Student accessing admin page</td><td className="p-2">Redirect to student dashboard</td><td className="p-2 text-green-600 font-medium">Pass</td></tr>
                <tr><td className="p-2">Admin creates admin account</td><td className="p-2">Non-super-admin user</td><td className="p-2">403 Forbidden error</td><td className="p-2 text-green-600 font-medium">Pass</td></tr>
                <tr><td className="p-2">File upload</td><td className="p-2">PDF document, 5MB</td><td className="p-2">File stored, record created</td><td className="p-2 text-green-600 font-medium">Pass</td></tr>
              </tbody>
            </table>
          </div>

          <h4 className="font-semibold text-foreground mt-4 mb-2">5.4 Non-Functional Testing Results</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 font-semibold text-foreground">Requirement</th>
                  <th className="text-left p-2 font-semibold text-foreground">Metric</th>
                  <th className="text-left p-2 font-semibold text-foreground">Target</th>
                  <th className="text-left p-2 font-semibold text-foreground">Actual</th>
                  <th className="text-left p-2 font-semibold text-foreground">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><td className="p-2">Performance</td><td className="p-2">Page load time</td><td className="p-2">&lt;3s</td><td className="p-2">~1.2s</td><td className="p-2 text-green-600 font-medium">Pass</td></tr>
                <tr><td className="p-2">Responsiveness</td><td className="p-2">Mobile layout</td><td className="p-2">Fully responsive</td><td className="p-2">All breakpoints tested</td><td className="p-2 text-green-600 font-medium">Pass</td></tr>
                <tr><td className="p-2">Security</td><td className="p-2">RLS enforcement</td><td className="p-2">100% coverage</td><td className="p-2">50+ policies active</td><td className="p-2 text-green-600 font-medium">Pass</td></tr>
                <tr><td className="p-2">Usability</td><td className="p-2">Theme support</td><td className="p-2">Light + Dark</td><td className="p-2">Both modes working</td><td className="p-2 text-green-600 font-medium">Pass</td></tr>
                <tr><td className="p-2">Availability</td><td className="p-2">Uptime</td><td className="p-2">99.9%</td><td className="p-2">Cloud-hosted SLA</td><td className="p-2 text-green-600 font-medium">Pass</td></tr>
              </tbody>
            </table>
          </div>
        </DocSection>

        <Separator className="my-6" />

        {/* ================================================================ */}
        {/* CHAPTER 6: CONCLUSION */}
        {/* ================================================================ */}
        <DocSection icon={<CheckCircle className="h-5 w-5" />} title="Chapter 6: Conclusion">

          <h4 className="font-semibold text-foreground mt-2 mb-2">6.1 Results Summary</h4>
          <p>
            CIIOS successfully addresses the problems identified in Chapter 1. The system provides a complete, web-based platform for managing capstone projects at HIT. Key achievements include:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>AI-powered duplicate detection</strong> — Projects are analyzed for similarity against the entire database, preventing redundant submissions.</li>
            <li><strong>Smart supervisor allocation</strong> — AI matching considers expertise, department, and workload, reducing allocation time from days to minutes.</li>
            <li><strong>Comprehensive role-based access</strong> — Four user roles with tailored dashboards and 50+ RLS policies ensure data security.</li>
            <li><strong>Real-time collaboration</strong> — Notifications, milestone tracking, meeting scheduling, and feedback create a connected workflow.</li>
            <li><strong>Institutional repository</strong> — A searchable archive of approved projects serves as a growing knowledge base.</li>
          </ul>

          <h4 className="font-semibold text-foreground mt-4 mb-2">6.2 Recommendations &amp; Future Work</h4>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Full-text plagiarism checking</strong> — Extend duplicate detection to analyze uploaded document content, not just titles and descriptions.</li>
            <li><strong>Integrated video conferencing</strong> — Replace external video call links with built-in WebRTC video meetings.</li>
            <li><strong>Mobile native app</strong> — Develop a React Native companion app for push notifications and offline access.</li>
            <li><strong>Grading integration</strong> — Connect with HIT's student information system for automatic grade submission.</li>
            <li><strong>Multi-language support</strong> — Add Shona and Ndebele language options for broader accessibility.</li>
            <li><strong>Advanced analytics</strong> — Machine learning models to predict project success rates and identify at-risk groups early.</li>
          </ul>

          <h4 className="font-semibold text-foreground mt-4 mb-2">6.3 System Maintenance</h4>
          <p>
            CIIOS is hosted on Lovable Cloud, which provides automatic infrastructure management, database backups, and SSL certificate renewal. The system requires minimal maintenance:
          </p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li><strong>Database</strong> — Automatic daily backups with point-in-time recovery.</li>
            <li><strong>Security</strong> — RLS policies are embedded in the database and enforced automatically. JWT tokens expire and refresh without manual intervention.</li>
            <li><strong>Updates</strong> — Frontend dependencies should be updated quarterly. Edge functions deploy automatically on code changes.</li>
            <li><strong>Monitoring</strong> — Analytics dashboard provides real-time system usage statistics. Audit logs track all administrative actions.</li>
          </ul>
        </DocSection>

        <Separator className="my-6" />

        {/* ================================================================ */}
        {/* APPENDIX */}
        {/* ================================================================ */}
        <DocSection icon={<Code className="h-5 w-5" />} title="Appendix">

          <h4 className="font-semibold text-foreground mt-2 mb-2">A. Key Code Snippets</h4>

          <h5 className="font-medium text-foreground mt-3 mb-2">A.1 Database Trigger — Auto-Create Profile on Signup</h5>
          <CodeBlock code={`-- This trigger fires when a new user registers
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, user_type, school, department)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'user_type',
    NEW.raw_user_meta_data->>'school',
    NEW.raw_user_meta_data->>'department'
  );
  
  -- Auto-assign role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, (NEW.raw_user_meta_data->>'user_type')::app_role);
  
  -- Create role-specific record
  IF NEW.raw_user_meta_data->>'user_type' = 'student' THEN
    INSERT INTO public.students (user_id, student_number, school, department)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'student_number',
            NEW.raw_user_meta_data->>'school', NEW.raw_user_meta_data->>'department');
  ELSIF NEW.raw_user_meta_data->>'user_type' = 'supervisor' THEN
    INSERT INTO public.supervisors (user_id, department, research_areas)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'department',
            ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'research_areas')));
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`} />

          <h5 className="font-medium text-foreground mt-4 mb-2">A.2 Security Definer Function — Role Checking</h5>
          <CodeBlock code={`-- Security definer function to check user roles
-- Bypasses RLS to prevent recursive policy evaluation
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;`} />

          <h5 className="font-medium text-foreground mt-4 mb-2">A.3 React Query — Project Submission</h5>
          <CodeBlock code={`// Mutation for submitting a new project
const submitProject = useMutation({
  mutationFn: async (projectData: ProjectFormData) => {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        title: projectData.title,
        description: projectData.description,
        objectives: projectData.objectives,
        keywords: projectData.keywords,
        student_id: user.id,
        status: 'pending',
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    toast.success('Project submitted successfully!');
  },
  onError: (error) => {
    toast.error('Failed to submit project: ' + error.message);
  },
});`} />

          <h4 className="font-semibold text-foreground mt-6 mb-2">B. Edge Functions</h4>
          <div className="space-y-3">
            <div className="border border-border rounded-lg p-3">
              <code className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">create-admin</code>
              <p className="text-xs mt-1">Creates admin accounts. Requires super_admin role. Creates auth user, profile, and role in a single transaction.</p>
            </div>
            <div className="border border-border rounded-lg p-3">
              <code className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">create-supervisor</code>
              <p className="text-xs mt-1">Creates supervisor accounts with research areas and department. Requires super_admin role.</p>
            </div>
            <div className="border border-border rounded-lg p-3">
              <code className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">delete-user</code>
              <p className="text-xs mt-1">Permanently removes a user and cascades through all related tables. Requires admin role.</p>
            </div>
            <div className="border border-border rounded-lg p-3">
              <code className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">reset-user-password</code>
              <p className="text-xs mt-1">Resets any user's password using service-role privileges. Requires admin role.</p>
            </div>
            <div className="border border-border rounded-lg p-3">
              <code className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">check-duplicate</code>
              <p className="text-xs mt-1">AI-powered duplicate detection. Analyzes title and description similarity against all existing projects.</p>
            </div>
            <div className="border border-border rounded-lg p-3">
              <code className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">smart-allocation</code>
              <p className="text-xs mt-1">AI-powered supervisor matching. Considers research areas, department alignment, and workload capacity.</p>
            </div>
            <div className="border border-border rounded-lg p-3">
              <code className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">deadline-reminders</code>
              <p className="text-xs mt-1">Scheduled function that checks upcoming milestone deadlines and sends reminder notifications.</p>
            </div>
          </div>
        </DocSection>

        <Separator className="my-6" />

        {/* Footer */}
        <div className="text-center py-6 text-sm text-muted-foreground print:mt-8">
          <p>CIIOS — Capstone Innovation &amp; Idea Orchestration System</p>
          <p>Harare Institute of Technology &copy; {new Date().getFullYear()}</p>
          <p className="mt-1">Document generated on {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
};

/* Reusable section wrapper */
const DocSection = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <Card className="border-none shadow-none bg-transparent print:break-inside-avoid">
    <CardHeader className="px-0 pt-4 pb-2">
      <CardTitle className="flex items-center gap-2 text-lg">
        <span className="print:hidden">{icon}</span>
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="px-0 text-sm text-muted-foreground leading-relaxed">
      {children}
    </CardContent>
  </Card>
);

/* Code block helper */
const CodeBlock = ({ code }: { code: string }) => (
  <pre className="bg-muted/50 border border-border rounded-lg p-3 text-xs font-mono overflow-x-auto whitespace-pre print:break-inside-avoid">
    <code>{code}</code>
  </pre>
);

export default SystemDocumentation;
