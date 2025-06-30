import React from 'react';
import { ResumeTemplate } from '../../types';

interface ResumeDocumentProps {
  resumeText: string;
  templateData: ResumeTemplate['template_data'];
  templateCategory: ResumeTemplate['category'];
}

interface ParsedResume {
  name: string;
  contact: {
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    website?: string;
  };
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
  skills: string[];
  sections: Array<{
    title: string;
    content: string;
  }>;
}

export const ResumeDocument: React.FC<ResumeDocumentProps> = ({
  resumeText,
  templateData,
  templateCategory
}) => {
  const parsedResume = parseResumeText(resumeText);
  const colors = templateData?.colors || { primary: '#2563eb', secondary: '#64748b' };
  const fonts = templateData?.fonts || { heading: 'Inter', body: 'Inter' };

  const getTemplateStyles = () => {
    const baseStyles = {
      fontFamily: fonts.body,
      lineHeight: '1.5',
      color: '#374151'
    };

    switch (templateCategory) {
      case 'modern':
        return {
          ...baseStyles,
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
        };
      case 'executive':
        return {
          ...baseStyles,
          background: '#ffffff',
          borderLeft: `4px solid ${colors.primary}`
        };
      case 'creative':
        return {
          ...baseStyles,
          background: `linear-gradient(45deg, ${colors.primary}10, ${colors.secondary}10)`
        };
      case 'minimal':
        return {
          ...baseStyles,
          background: '#ffffff'
        };
      default:
        return baseStyles;
    }
  };

  const getSectionHeaderStyle = () => ({
    fontFamily: fonts.heading,
    fontSize: '18px',
    fontWeight: '600',
    color: colors.primary,
    borderBottom: `2px solid ${colors.primary}`,
    paddingBottom: '4px',
    marginBottom: '12px',
    marginTop: '24px'
  });

  const getNameStyle = () => ({
    fontFamily: fonts.heading,
    fontSize: templateCategory === 'executive' ? '32px' : '28px',
    fontWeight: '700',
    color: colors.primary,
    marginBottom: '8px',
    textAlign: templateCategory === 'creative' ? 'center' : 'left' as const
  });

  return (
    <div 
      style={{
        width: '8.5in',
        minHeight: '11in',
        padding: '0.75in',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        boxShadow: '0 0 10px rgba(0,0,0,0.1)',
        ...getTemplateStyles()
      }}
      className="resume-document"
    >
      {/* Header Section */}
      <header style={{ marginBottom: '24px' }}>
        <h1 style={getNameStyle()}>
          {parsedResume.name}
        </h1>
        
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          fontSize: '14px',
          color: colors.secondary,
          justifyContent: templateCategory === 'creative' ? 'center' : 'flex-start'
        }}>
          {parsedResume.contact.email && (
            <span>{parsedResume.contact.email}</span>
          )}
          {parsedResume.contact.phone && (
            <span>{parsedResume.contact.phone}</span>
          )}
          {parsedResume.contact.location && (
            <span>{parsedResume.contact.location}</span>
          )}
          {parsedResume.contact.linkedin && (
            <span>{parsedResume.contact.linkedin}</span>
          )}
          {parsedResume.contact.website && (
            <span>{parsedResume.contact.website}</span>
          )}
        </div>
      </header>

      {/* Summary Section */}
      {parsedResume.summary && (
        <section style={{ marginBottom: '24px' }}>
          <h2 style={getSectionHeaderStyle()}>Professional Summary</h2>
          <p style={{
            fontSize: '14px',
            lineHeight: '1.6',
            color: '#374151',
            margin: '0'
          }}>
            {parsedResume.summary}
          </p>
        </section>
      )}

      {/* Experience Section */}
      {parsedResume.experience.length > 0 && (
        <section style={{ marginBottom: '24px' }}>
          <h2 style={getSectionHeaderStyle()}>Professional Experience</h2>
          {parsedResume.experience.map((exp, index) => (
            <div key={index} style={{ marginBottom: '16px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '4px'
              }}>
                <div>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#1f2937',
                    margin: '0'
                  }}>
                    {exp.title}
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: colors.primary,
                    margin: '2px 0'
                  }}>
                    {exp.company}
                  </p>
                </div>
                <span style={{
                  fontSize: '12px',
                  color: colors.secondary,
                  fontWeight: '500'
                }}>
                  {exp.duration}
                </span>
              </div>
              <div style={{
                fontSize: '13px',
                lineHeight: '1.5',
                color: '#4b5563',
                whiteSpace: 'pre-line'
              }}>
                {exp.description}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Education Section */}
      {parsedResume.education.length > 0 && (
        <section style={{ marginBottom: '24px' }}>
          <h2 style={getSectionHeaderStyle()}>Education</h2>
          {parsedResume.education.map((edu, index) => (
            <div key={index} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <div>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1f2937',
                  margin: '0'
                }}>
                  {edu.degree}
                </h3>
                <p style={{
                  fontSize: '13px',
                  color: colors.primary,
                  margin: '2px 0'
                }}>
                  {edu.institution}
                </p>
              </div>
              <span style={{
                fontSize: '12px',
                color: colors.secondary,
                fontWeight: '500'
              }}>
                {edu.year}
              </span>
            </div>
          ))}
        </section>
      )}

      {/* Skills Section */}
      {parsedResume.skills.length > 0 && (
        <section style={{ marginBottom: '24px' }}>
          <h2 style={getSectionHeaderStyle()}>Skills</h2>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            {parsedResume.skills.map((skill, index) => (
              <span
                key={index}
                style={{
                  backgroundColor: `${colors.primary}15`,
                  color: colors.primary,
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: '500',
                  border: `1px solid ${colors.primary}30`
                }}
              >
                {skill.trim()}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Additional Sections */}
      {parsedResume.sections.map((section, index) => (
        <section key={index} style={{ marginBottom: '24px' }}>
          <h2 style={getSectionHeaderStyle()}>{section.title}</h2>
          <div style={{
            fontSize: '13px',
            lineHeight: '1.5',
            color: '#4b5563',
            whiteSpace: 'pre-line'
          }}>
            {section.content}
          </div>
        </section>
      ))}

      {/* Footer */}
      <footer style={{
        marginTop: '32px',
        paddingTop: '16px',
        borderTop: `1px solid ${colors.secondary}30`,
        textAlign: 'center',
        fontSize: '10px',
        color: colors.secondary
      }}>
        Resume optimized with ResumeAI for ATS compatibility
      </footer>
    </div>
  );
};

// Helper function to parse resume text into structured data
function parseResumeText(resumeText: string): ParsedResume {
  const lines = resumeText.split('\n').map(line => line.trim()).filter(line => line);
  
  const result: ParsedResume = {
    name: '',
    contact: {},
    summary: '',
    experience: [],
    education: [],
    skills: [],
    sections: []
  };

  // Extract name (usually the first line or first non-empty line)
  result.name = lines[0] || 'Professional Resume';

  // Extract contact information
  const emailMatch = resumeText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  if (emailMatch) result.contact.email = emailMatch[0];

  const phoneMatch = resumeText.match(/(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/);
  if (phoneMatch) result.contact.phone = phoneMatch[0];

  const linkedinMatch = resumeText.match(/(?:linkedin\.com\/in\/|linkedin\.com\/pub\/)[A-Za-z0-9-]+/i);
  if (linkedinMatch) result.contact.linkedin = linkedinMatch[0];

  // Parse sections
  const sectionHeaders = [
    'summary', 'objective', 'profile',
    'experience', 'work experience', 'employment', 'professional experience',
    'education', 'academic background',
    'skills', 'technical skills', 'core competencies',
    'projects', 'certifications', 'achievements', 'awards'
  ];

  let currentSection = '';
  let currentContent: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();

    // Check if this line is a section header
    const isHeader = sectionHeaders.some(header => 
      lowerLine.includes(header) && line.length < 50
    );

    if (isHeader) {
      // Save previous section
      if (currentSection && currentContent.length > 0) {
        processSectionContent(result, currentSection, currentContent.join('\n'));
      }

      // Start new section
      currentSection = lowerLine;
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  // Process last section
  if (currentSection && currentContent.length > 0) {
    processSectionContent(result, currentSection, currentContent.join('\n'));
  }

  return result;
}

function processSectionContent(result: ParsedResume, sectionType: string, content: string) {
  if (sectionType.includes('summary') || sectionType.includes('objective') || sectionType.includes('profile')) {
    result.summary = content;
  } else if (sectionType.includes('experience') || sectionType.includes('employment')) {
    result.experience = parseExperience(content);
  } else if (sectionType.includes('education')) {
    result.education = parseEducation(content);
  } else if (sectionType.includes('skill')) {
    result.skills = parseSkills(content);
  } else {
    result.sections.push({
      title: toTitleCase(sectionType),
      content: content
    });
  }
}

function parseExperience(content: string) {
  const experiences = [];
  const blocks = content.split(/\n\s*\n/).filter(block => block.trim());

  for (const block of blocks) {
    const lines = block.split('\n').map(line => line.trim());
    if (lines.length >= 2) {
      const title = lines[0];
      const company = lines[1];
      const duration = extractDuration(block);
      const description = lines.slice(2).join('\n');

      experiences.push({
        title,
        company,
        duration,
        description
      });
    }
  }

  return experiences;
}

function parseEducation(content: string) {
  const education = [];
  const blocks = content.split(/\n\s*\n/).filter(block => block.trim());

  for (const block of blocks) {
    const lines = block.split('\n').map(line => line.trim());
    if (lines.length >= 1) {
      const degree = lines[0];
      const institution = lines[1] || '';
      const year = extractYear(block);

      education.push({
        degree,
        institution,
        year
      });
    }
  }

  return education;
}

function parseSkills(content: string): string[] {
  // Split by common delimiters and clean up
  const skills = content
    .split(/[,•\n\-\|]/)
    .map(skill => skill.trim())
    .filter(skill => skill && skill.length > 1 && skill.length < 30);

  return skills;
}

function extractDuration(text: string): string {
  const durationMatch = text.match(/\b\d{4}\s*[-–—]\s*(?:\d{4}|present|current)\b/i);
  if (durationMatch) return durationMatch[0];

  const monthYearMatch = text.match(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}\s*[-–—]\s*(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}|present|current)\b/i);
  if (monthYearMatch) return monthYearMatch[0];

  return '';
}

function extractYear(text: string): string {
  const yearMatch = text.match(/\b\d{4}\b/);
  return yearMatch ? yearMatch[0] : '';
}

function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}