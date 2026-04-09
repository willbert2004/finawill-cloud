import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate relevant objectives based on project title and description
function generateObjectives(title: string, description: string): string {
  const t = (title + ' ' + description).toLowerCase();

  if (t.includes('machine learning') || t.includes('ml') || t.includes('ai') || t.includes('artificial intelligence') || t.includes('deep learning')) {
    return `1. Develop and train a machine learning model to solve the identified problem with measurable accuracy metrics
2. Collect, preprocess, and analyze relevant datasets to ensure data quality and model reliability
3. Evaluate model performance using standard metrics (precision, recall, F1-score) and compare against baseline approaches
4. Deploy a functional prototype demonstrating the practical application of the trained model`;
  }
  if (t.includes('web') || t.includes('website') || t.includes('portal') || t.includes('frontend') || t.includes('backend') || t.includes('full-stack') || t.includes('fullstack')) {
    return `1. Design and develop a responsive, user-friendly web application that addresses the identified requirements
2. Implement secure user authentication, authorization, and data management functionality
3. Integrate backend APIs and database systems to support dynamic content and real-time data processing
4. Conduct usability testing and performance optimization to ensure a reliable end-user experience`;
  }
  if (t.includes('mobile') || t.includes('android') || t.includes('ios') || t.includes('app development') || t.includes('flutter') || t.includes('react native')) {
    return `1. Design and develop a cross-platform mobile application with an intuitive user interface
2. Implement core features including user authentication, data synchronization, and push notifications
3. Optimize the application for performance, battery efficiency, and offline functionality
4. Conduct user acceptance testing across multiple devices and screen sizes`;
  }
  if (t.includes('network') || t.includes('security') || t.includes('cyber') || t.includes('encryption') || t.includes('firewall') || t.includes('intrusion')) {
    return `1. Analyze existing network infrastructure and identify potential security vulnerabilities
2. Design and implement a security solution that addresses identified threats and compliance requirements
3. Develop monitoring and alerting mechanisms for real-time threat detection
4. Evaluate the effectiveness of the implemented security measures through penetration testing and audits`;
  }
  if (t.includes('iot') || t.includes('sensor') || t.includes('embedded') || t.includes('arduino') || t.includes('raspberry') || t.includes('smart')) {
    return `1. Design and prototype an IoT-based system with appropriate sensors and microcontrollers
2. Develop firmware and communication protocols for reliable data collection and transmission
3. Build a dashboard or interface for real-time monitoring and data visualization
4. Test the system under real-world conditions and evaluate its reliability and scalability`;
  }
  if (t.includes('data') || t.includes('analytics') || t.includes('visualization') || t.includes('dashboard') || t.includes('report')) {
    return `1. Collect and preprocess data from relevant sources to ensure accuracy and completeness
2. Perform exploratory data analysis to identify patterns, trends, and actionable insights
3. Develop interactive visualizations and dashboards to communicate findings effectively
4. Document methodology, findings, and recommendations for stakeholders`;
  }
  if (t.includes('e-commerce') || t.includes('ecommerce') || t.includes('online shop') || t.includes('marketplace') || t.includes('payment')) {
    return `1. Design and develop a functional e-commerce platform with product catalog and shopping cart features
2. Integrate secure payment processing and order management systems
3. Implement user account management, order tracking, and notification features
4. Optimize the platform for performance, SEO, and mobile responsiveness`;
  }
  if (t.includes('blockchain') || t.includes('crypto') || t.includes('decentralized') || t.includes('smart contract')) {
    return `1. Research and select an appropriate blockchain platform for the project requirements
2. Design and implement smart contracts with proper security and validation mechanisms
3. Develop a user-facing application that interacts with the blockchain layer
4. Test and validate the system for security, transparency, and transaction integrity`;
  }
  if (t.includes('health') || t.includes('medical') || t.includes('hospital') || t.includes('patient') || t.includes('clinic')) {
    return `1. Identify key healthcare challenges and define system requirements through stakeholder consultations
2. Design and develop a digital health solution that improves patient care or operational efficiency
3. Ensure compliance with data privacy and security standards for sensitive health information
4. Evaluate the system's effectiveness through user feedback and pilot testing`;
  }
  if (t.includes('education') || t.includes('learning') || t.includes('student') || t.includes('school') || t.includes('e-learning') || t.includes('lms')) {
    return `1. Analyze educational needs and define learning objectives for the target audience
2. Design and develop an interactive learning platform with content management capabilities
3. Implement assessment tools, progress tracking, and feedback mechanisms
4. Evaluate the platform's impact on learning outcomes through user testing and surveys`;
  }
  // Generic fallback
  return `1. Conduct a comprehensive literature review and requirements analysis for the project domain
2. Design and develop a functional system or solution addressing the identified problem statement
3. Implement and test core features to ensure reliability, usability, and performance
4. Document the development process, evaluate outcomes, and provide recommendations for future work`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all projects
    const { data: projects, error: fetchError } = await supabase
      .from('projects')
      .select('id, title, description, objectives');

    if (fetchError) throw fetchError;

    const toUpdate = (projects || []).filter(p => !p.objectives || p.objectives.trim() === '');
    console.log(`Found ${toUpdate.length} projects without objectives out of ${projects?.length} total`);

    let updated = 0;
    for (const project of toUpdate) {
      const objectives = generateObjectives(project.title, project.description || '');
      const { error } = await supabase
        .from('projects')
        .update({ objectives })
        .eq('id', project.id);

      if (error) {
        console.error(`Failed to update project ${project.id}:`, error);
      } else {
        updated++;
        console.log(`Updated: ${project.title}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Updated ${updated} out of ${toUpdate.length} projects with objectives`,
        total: projects?.length,
        needingObjectives: toUpdate.length,
        updated
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
