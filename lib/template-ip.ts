/**
 * Humanistiqs IP — Template definitions, keyword mappings, and form fields
 *
 * Each template type has:
 * - keywords: exact phrase matches (highest priority)
 * - patterns: regex patterns for natural language detection
 * - category: grouping for the templates page
 * - formFields: fields shown in the in-chat form questionnaire
 * - promptInstructions: additional instructions appended to the AI prompt for generation
 */

export interface TemplateFormField {
  key: string
  label: string
  type: 'text' | 'select' | 'date' | 'textarea' | 'number'
  placeholder?: string
  options?: string[]
  required?: boolean
}

export interface TemplateDefinition {
  id: string
  title: string
  category: string
  description: string
  keywords: string[]
  patterns: RegExp[]
  formFields: TemplateFormField[]
  promptInstructions: string
}

// ── HR Administration ──────────────────────────────────────────────

const confirmationOfEmployment: TemplateDefinition = {
  id: 'confirmation-of-employment',
  title: 'Confirmation of Employment Letter',
  category: 'Letters & Offers',
  description: 'Letter confirming current or former employment details for third parties.',
  keywords: ['confirmation of employment', 'employment confirmation', 'proof of employment'],
  patterns: [
    /\b(confirm|proof|verify|verification)\b.*\bemployment\b/i,
    /\bemployment\b.*\b(confirmation|letter|proof)\b/i,
  ],
  formFields: [
    { key: 'employeeName', label: 'Employee full name', type: 'text', required: true },
    { key: 'dateOfBirth', label: 'Date of birth', type: 'date' },
    { key: 'positionTitle', label: 'Position title', type: 'text', required: true },
    { key: 'hireDate', label: 'Hire date', type: 'date', required: true },
    { key: 'employmentStatus', label: 'Employment status', type: 'select', options: ['Currently employed', 'Formerly employed'], required: true },
    { key: 'additionalInfo', label: 'Additional categories to confirm', type: 'textarea', placeholder: 'e.g. salary, work hours, employment type' },
  ],
  promptInstructions: `Generate a Confirmation of Employment letter. Use formal business letter format. Include: date, "To Whom It May Concern" heading, employee name, DOB, position, hire date, employment status, tenure, and a contact line for verification. Sign off with the employer representative details from the business profile. Keep it concise — 1 page maximum.`,
}

const flexibleWorkApplication: TemplateDefinition = {
  id: 'flexible-work-application',
  title: 'Flexible Work Practices Application',
  category: 'Letters & Offers',
  description: 'Application form for employees requesting flexible working arrangements under NES.',
  keywords: ['flexible work', 'flexible working', 'work from home application', 'remote work application'],
  patterns: [
    /\bflexib(le|ility)\b.*\bwork/i,
    /\bwork\b.*\b(from home|remotely|hybrid)\b.*\b(application|form|request)\b/i,
    /\b(wfh|remote)\b.*\b(application|form|policy|request)\b/i,
  ],
  formFields: [
    { key: 'employeeName', label: 'Employee full name', type: 'text', required: true },
    { key: 'positionTitle', label: 'Current position', type: 'text', required: true },
    { key: 'employmentType', label: 'Employment type', type: 'select', options: ['Full-time', 'Part-time', 'Casual'], required: true },
    { key: 'flexType', label: 'Type of flexible arrangement', type: 'select', options: ['Working remotely', 'Flexible hours', 'Compressed working weeks', 'Part-time', 'Job sharing', 'Phased return to work', 'Career break', 'Other'], required: true },
    { key: 'reason', label: 'Reason for request', type: 'textarea', placeholder: 'e.g. Carer responsibilities, health condition, study commitments' },
    { key: 'startDate', label: 'Proposed start date', type: 'date' },
    { key: 'endDate', label: 'Expected end date (if temporary)', type: 'date' },
    { key: 'proposedHours', label: 'Proposed working pattern', type: 'textarea', placeholder: 'e.g. Mon-Wed office, Thu-Fri remote; or 7am-3pm daily' },
  ],
  promptInstructions: `Generate a Flexible Work Practices Application Form. Include sections for: employee details, flexible leave type checkboxes, documentation requirements, special instructions, period of arrangement, trial period option, change to working hours pattern, and signature blocks for employee, director, and witness. Reference the NES right to request flexible working arrangements under s65 Fair Work Act.`,
}

const letterOfOffer: TemplateDefinition = {
  id: 'letter-of-offer',
  title: 'Letter of Offer',
  category: 'Letters & Offers',
  description: 'Formal offer letter with position details, remuneration summary, and conditions.',
  keywords: ['letter of offer', 'offer letter', 'job offer letter'],
  patterns: [
    /\boffer\s+(letter|template)\b/i,
    /\b(write|create|generate|draft|make|prepare|send)\b.*\boffer\b/i,
  ],
  formFields: [
    { key: 'candidateName', label: 'Candidate full name', type: 'text', required: true },
    { key: 'positionTitle', label: 'Position title', type: 'text', required: true },
    { key: 'employmentType', label: 'Employment type', type: 'select', options: ['Full-time', 'Part-time', 'Casual', 'Fixed-term'], required: true },
    { key: 'startDate', label: 'Proposed start date', type: 'date', required: true },
    { key: 'salary', label: 'Salary package (gross)', type: 'text', placeholder: 'e.g. $75,000 + super', required: true },
    { key: 'reportingTo', label: 'Reporting manager', type: 'text', placeholder: 'e.g. Head of Marketing' },
    { key: 'location', label: 'Work location', type: 'text' },
    { key: 'acceptanceDeadline', label: 'Offer acceptance deadline', type: 'date' },
    { key: 'conditions', label: 'Conditions of offer', type: 'textarea', placeholder: 'e.g. Subject to reference checks, right to work verification' },
  ],
  promptInstructions: `Generate a Letter of Offer following the Humanistiqs template structure. Include: congratulatory opening, position title, employment type, attached documents list (contract, handbook, super choice form, Fair Work Information Statement), instructions to sign and return, acceptance deadline, and warm sign-off from director. Use the business profile for employer details.`,
}

const nonContactablePostOffer: TemplateDefinition = {
  id: 'non-contactable-post-offer',
  title: 'Non-Contactable Post Offer Letter',
  category: 'Letters & Offers',
  description: 'Letter to a candidate who has not responded to an employment offer.',
  keywords: ['non contactable', 'no response offer', 'offer no reply'],
  patterns: [
    /\bnon.?contact/i,
    /\b(candidate|applicant)\b.*\bnot\b.*\b(respond|reply|contact)/i,
    /\boffer\b.*\b(no response|not respond|ghost)/i,
  ],
  formFields: [
    { key: 'candidateName', label: 'Candidate full name', type: 'text', required: true },
    { key: 'positionTitle', label: 'Position offered', type: 'text', required: true },
    { key: 'offerDate', label: 'Date original offer was made', type: 'date', required: true },
    { key: 'employmentType', label: 'Employment type', type: 'select', options: ['Full-time', 'Part-time', 'Casual', 'Fixed-term'] },
    { key: 'intendedStartDate', label: 'Intended commencement date', type: 'date' },
    { key: 'responseDeadline', label: 'Final deadline to respond', type: 'date', required: true },
  ],
  promptInstructions: `Generate a Non-Contactable Post Offer Letter. Formal tone. Reference the original offer date, position, employment type, and intended start date. Note multiple communication attempts. State that if no contact is received by the deadline, the offer will be considered withdrawn. Include director signature block.`,
}

// ── Employment Contracts ──────────────────────────────────────────

const employmentContract: TemplateDefinition = {
  id: 'employment-contract',
  title: 'Employment Contract',
  category: 'Employment Contracts',
  description: 'Comprehensive employment contract with all NES and Modern Award compliance clauses.',
  keywords: ['employment contract', 'contract of employment'],
  patterns: [
    /\bcontract\b/i,
    /\bemployment\s+agreement\b/i,
  ],
  formFields: [
    { key: 'employeeName', label: 'Employee full name', type: 'text', placeholder: 'e.g. Sarah Johnson', required: true },
    { key: 'positionTitle', label: 'Position title', type: 'text', placeholder: 'e.g. Retail Sales Assistant', required: true },
    { key: 'employmentType', label: 'Employment type', type: 'select', options: ['Full-time', 'Part-time', 'Casual', 'Fixed-term'], required: true },
    { key: 'startDate', label: 'Commencement date', type: 'date', required: true },
    { key: 'salary', label: 'Base salary / hourly rate (gross)', type: 'text', placeholder: 'e.g. $65,000 per annum or $32.50/hr', required: true },
    { key: 'hoursPerWeek', label: 'Hours per week', type: 'text', placeholder: 'e.g. 38 (FT) or 25 (PT)' },
    { key: 'reportingTo', label: 'Reports to (manager/position)', type: 'text', placeholder: 'e.g. Store Manager' },
    { key: 'location', label: 'Work location', type: 'text', placeholder: 'e.g. 123 Main St, Brisbane QLD 4000' },
    { key: 'probation', label: 'Probation period', type: 'select', options: ['3 months', '6 months', 'No probation'] },
    { key: 'award', label: 'Applicable Modern Award', type: 'text', placeholder: 'e.g. General Retail Industry Award (or leave blank for default)' },
    { key: 'additionalNotes', label: 'Additional notes or special conditions', type: 'textarea', placeholder: 'e.g. Company car, specific roster days, restraint requirements' },
  ],
  promptInstructions: `Generate a COMPLETE Employment Contract using the Humanistiqs proprietary 33-clause structure. Include EVERY clause — definitions, commencement, position, probation, duties, policies, hours, remuneration (with absorption clause), all leave types, confidentiality, IP, non-disparagement, conflicts, relief from duties, termination, restraint (cascading), redundancy, assignment, governing law, variation, severability, entire agreement, Fair Work statement, execution blocks, and the Schedule with all Items filled in. The document should be 2500-4000 words.`,
}

// ── Performance & Grievance Management ────────────────────────────

const fileNote: TemplateDefinition = {
  id: 'file-note',
  title: 'Staff Member File Note',
  category: 'Performance Management',
  description: 'Document key discussion points with staff members for the employment file.',
  keywords: ['file note', 'meeting notes', 'discussion note'],
  patterns: [
    /\bfile\s+note\b/i,
    /\b(meeting|discussion)\s+note\b/i,
    /\bdocument\b.*\b(meeting|conversation|discussion)\b/i,
  ],
  formFields: [
    { key: 'employeeName', label: 'Staff member name', type: 'text', required: true },
    { key: 'discussionDate', label: 'Date of discussion', type: 'date', required: true },
    { key: 'conductedBy', label: 'Discussion conducted by', type: 'text', required: true },
    { key: 'topic', label: 'Topic of discussion', type: 'text', required: true },
    { key: 'keyPoints', label: 'Key points of discussion', type: 'textarea', placeholder: 'Detail discussion points in third person with dates, background info, employee responses, references to policies, and agreed outcomes', required: true },
    { key: 'noteType', label: 'Type of file note', type: 'select', options: ['Performance concern', 'Positive performance', 'Conduct issue', 'General discussion', 'Return from leave', 'Other'] },
  ],
  promptInstructions: `Generate a Staff Member File Note following the Humanistiqs template. Include: date, staff member name, discussion conducted by, topic, and detailed key points written in third person. Include dates, relevant background information, the team member's responses, any reference to previous discussions or relevant policies, and agreed outcome. Add note that this should be uploaded to the Employee Performance & Grievances folder and NOT kept as hard copy on the personnel file.`,
}

const warningLetter: TemplateDefinition = {
  id: 'warning-letter',
  title: 'Warning Letter',
  category: 'Performance Management',
  description: 'First or final written warning with specific conduct/performance issues and expectations.',
  keywords: ['warning letter', 'first warning', 'final warning', 'written warning', 'formal warning'],
  patterns: [
    /\bwarning\b/i,
    /\bdisciplin/i,
  ],
  formFields: [
    { key: 'employeeName', label: 'Employee full name', type: 'text', required: true },
    { key: 'positionTitle', label: 'Employee position', type: 'text', required: true },
    { key: 'warningLevel', label: 'Warning level', type: 'select', options: ['First written warning', 'Final written warning', 'First and final warning'], required: true },
    { key: 'issueDescription', label: 'Describe the conduct or performance issue', type: 'textarea', placeholder: 'Be specific — include dates, examples, and what policy or standard was breached', required: true },
    { key: 'previousDiscussions', label: 'Previous discussions or warnings (with dates)', type: 'textarea', placeholder: 'e.g. Verbal discussion on 1 March 2026 regarding...' },
    { key: 'expectedStandard', label: 'Expected standard going forward', type: 'textarea', placeholder: 'What specifically needs to change?' },
    { key: 'supportOffered', label: 'Support offered to employee', type: 'text', placeholder: 'e.g. Additional training, EAP referral, adjusted workload' },
    { key: 'reviewDate', label: 'Review meeting date', type: 'date' },
    { key: 'policiesBreached', label: 'Policies breached', type: 'textarea', placeholder: 'e.g. Code of Conduct, WHS Policy, Attendance Policy' },
  ],
  promptInstructions: `Generate a Warning Letter following the Humanistiqs template. Include: Private & Confidential header, date, employee details, reference to investigation/meeting, specific description of the conduct/performance issue with dates and examples, which policies were breached, the warning level being issued, expected conduct going forward, policy review/training requirements with deadlines, reminder that further breaches may result in further disciplinary action up to and including termination. Include employee acknowledgement signature block.`,
}

const letterOfExpectation: TemplateDefinition = {
  id: 'letter-of-expectation',
  title: 'Letter of Expectation',
  category: 'Performance Management',
  description: 'Sets expectations without formal warning — used when concerns are substantiated but a warning is not appropriate.',
  keywords: ['letter of expectation', 'expectation letter', 'outcome letter'],
  patterns: [
    /\bletter\s+of\s+expectation\b/i,
    /\bexpectation\s+letter\b/i,
    /\bset\s+expectations\b.*\bletter\b/i,
  ],
  formFields: [
    { key: 'employeeName', label: 'Employee full name', type: 'text', required: true },
    { key: 'positionTitle', label: 'Position title', type: 'text', required: true },
    { key: 'meetingDate', label: 'Date of meeting', type: 'date', required: true },
    { key: 'concerns', label: 'Concerns discussed', type: 'textarea', placeholder: 'Specific conduct, behaviour, or performance concerns with examples', required: true },
    { key: 'expectations', label: 'Expected changes going forward', type: 'textarea', placeholder: 'What specific changes are expected?', required: true },
    { key: 'support', label: 'Support and guidance to be provided', type: 'textarea', placeholder: 'e.g. Training, mentoring, policy review' },
  ],
  promptInstructions: `Generate a Letter of Expectation (outcome letter) following the Humanistiqs template. This is NOT a formal warning — it's used when concerns have been substantiated but a warning is not appropriate. Include: Private & Confidential header, reference to meeting date, specific concerns discussed, determination that concerns were substantiated but formal warning not appropriate, letter to be held on file, support to be provided, clear expectations listed, reminder that failure to meet expectations may result in disciplinary action. Include employee acknowledgement signature block.`,
}

const probationReview: TemplateDefinition = {
  id: 'probation-review',
  title: 'Probationary Period Review Form',
  category: 'Performance Management',
  description: 'Structured review form for probationary period milestones (1, 2, 3, 4-5, 6 months).',
  keywords: ['probation review', 'probationary review', 'probation period review'],
  patterns: [
    /\bprobation\b.*\breview\b/i,
    /\breview\b.*\bprobation\b/i,
    /\bprobation(ary)?\s+(period|assessment|evaluation)\b/i,
  ],
  formFields: [
    { key: 'employeeName', label: 'Staff member name', type: 'text', required: true },
    { key: 'positionTitle', label: 'Position title', type: 'text', required: true },
    { key: 'managerName', label: 'Manager name', type: 'text', required: true },
    { key: 'reviewMilestone', label: 'Review milestone', type: 'select', options: ['1 month', '2 months', '3 months', '4-5 months', '6 months (final)'], required: true },
    { key: 'reviewDate', label: 'Review date', type: 'date', required: true },
    { key: 'companyValues', label: 'Company values to assess against', type: 'textarea', placeholder: 'e.g. Integrity, Teamwork, Customer Focus, Innovation' },
  ],
  promptInstructions: `Generate a Probationary Period Review Form following the Humanistiqs template. Include: employee details, review schedule table (1, 2, 3, 4-5, 6 month reviews), employee self-assessment questions (highlights/lowlights, what interests you, what do you do well, challenges, concerns, support needed), manager rating section using Behind/Meets/Exceeds scale against company values and capabilities, role-specific skills assessment, training/policy acknowledgement checklist, comments/action items section, and final 6-month overall comments with signatures.`,
}

const staffStatement: TemplateDefinition = {
  id: 'staff-statement',
  title: 'Staff Member Statement',
  category: 'Performance Management',
  description: 'Formal signed statement from a staff member for investigation or record purposes.',
  keywords: ['staff statement', 'employee statement', 'witness statement'],
  patterns: [
    /\b(staff|employee|witness)\s+statement\b/i,
    /\bstatement\b.*\b(investigation|incident|complaint)\b/i,
  ],
  formFields: [
    { key: 'employeeName', label: 'Staff member name', type: 'text', required: true },
    { key: 'positionTitle', label: 'Staff member position', type: 'text', required: true },
    { key: 'statementDate', label: 'Date of statement', type: 'date', required: true },
    { key: 'context', label: 'Context for the statement', type: 'textarea', placeholder: 'e.g. Workplace investigation, incident report, complaint' },
  ],
  promptInstructions: `Generate a Staff Member Statement form. Include: name, date, position, employment status, contact number, space for the statement narrative, declaration that "This statement is made of my own free will. It accurately sets out the evidence that I would be prepared, if necessary, to give in court as a witness. The statement is true to the best of my knowledge and belief." Print name and signature block. Note that hard copy is to be added to Employee Performance & Grievances folder.`,
}

const pip: TemplateDefinition = {
  id: 'performance-improvement-plan',
  title: 'Performance Improvement Plan',
  category: 'Performance Management',
  description: 'Structured PIP with measurable goals, timeline, support offered, and consequences.',
  keywords: ['performance improvement plan', 'pip'],
  patterns: [
    /\bpip\b/i,
    /\bperformance\s+(improvement|management)\s+plan\b/i,
  ],
  formFields: [
    { key: 'employeeName', label: 'Employee full name', type: 'text', required: true },
    { key: 'positionTitle', label: 'Employee position', type: 'text', required: true },
    { key: 'performanceIssues', label: 'Performance issues to address', type: 'textarea', placeholder: 'Specific areas of underperformance with examples', required: true },
    { key: 'expectedStandards', label: 'Expected performance standards', type: 'textarea', placeholder: 'What does "good" look like? Be measurable', required: true },
    { key: 'supportProvided', label: 'Support and resources to be provided', type: 'textarea', placeholder: 'e.g. Weekly check-ins, training sessions, mentoring' },
    { key: 'reviewPeriod', label: 'Review period', type: 'select', options: ['2 weeks', '4 weeks', '6 weeks', '8 weeks'], required: true },
    { key: 'startDate', label: 'PIP start date', type: 'date' },
  ],
  promptInstructions: `Generate a Performance Improvement Plan (PIP) document. Include: employee details, specific performance concerns with examples and dates, measurable performance standards/KPIs, support to be provided (training, check-ins, mentoring), review period and milestone dates, consequences of non-improvement (up to and including termination), employee right to support person, and signature blocks.`,
}

const showCauseLetter: TemplateDefinition = {
  id: 'show-cause-letter',
  title: 'Show Cause Letter',
  category: 'Performance Management',
  description: 'Letter giving an employee the opportunity to respond before adverse action.',
  keywords: ['show cause', 'show cause letter'],
  patterns: [
    /\bshow\s+cause\b/i,
  ],
  formFields: [
    { key: 'employeeName', label: 'Employee full name', type: 'text', required: true },
    { key: 'positionTitle', label: 'Position title', type: 'text', required: true },
    { key: 'allegation', label: 'Allegation or issue', type: 'textarea', placeholder: 'Specific details of the conduct, performance issue, or policy breach', required: true },
    { key: 'responseDeadline', label: 'Deadline to respond', type: 'date', required: true },
    { key: 'meetingDate', label: 'Meeting date (if applicable)', type: 'date' },
    { key: 'potentialOutcome', label: 'Potential outcome', type: 'select', options: ['Termination of employment', 'Demotion', 'Final warning', 'Other disciplinary action'], required: true },
  ],
  promptInstructions: `Generate a Show Cause Letter. Include: Private & Confidential header, specific allegation with dates and details, reference to relevant policies breached, statement that the matter is serious enough to warrant the potential outcome, invitation to respond in writing by the deadline, right to bring a support person to any meeting, and that response will be genuinely considered before any decision is made.`,
}

// ── Termination & Separation ──────────────────────────────────────

const terminationInProbation: TemplateDefinition = {
  id: 'termination-in-probation',
  title: 'Termination in Probation Letter',
  category: 'Termination & Separation',
  description: 'Termination letter for employees within probationary period.',
  keywords: ['termination in probation', 'probation termination', 'end probation'],
  patterns: [
    /\bterminat\b.*\bprobation\b/i,
    /\bprobation\b.*\bterminat/i,
    /\bend\b.*\bprobation\b.*\b(early|employment)\b/i,
  ],
  formFields: [
    { key: 'employeeName', label: 'Employee full name', type: 'text', required: true },
    { key: 'positionTitle', label: 'Position title', type: 'text', required: true },
    { key: 'contractDate', label: 'Date on original contract', type: 'date', required: true },
    { key: 'reviewsDone', label: 'Number of probation reviews conducted', type: 'text', placeholder: 'e.g. 2 (30 days on 1 Feb, 60 days on 1 Mar)' },
    { key: 'lastDay', label: 'Last day of employment', type: 'date' },
  ],
  promptInstructions: `Generate a Termination in Probation Letter following the Humanistiqs template. Reference the employment contract date, the probationary period reviews conducted (with dates), advise that employment cannot be confirmed and the employee is unsuitable for the role at this time, confirm 1 week's pay in lieu of notice per the contract. Wish the employee well. Include signature block.`,
}

const terminationLetter: TemplateDefinition = {
  id: 'termination-letter',
  title: 'Termination of Employment Letter',
  category: 'Termination & Separation',
  description: 'Termination for underperformance after completing full performance management process.',
  keywords: ['termination letter', 'letter of termination', 'termination of employment'],
  patterns: [
    /\bterminat(e|ion)\b.*\b(letter|employment)\b/i,
    /\b(dismiss|fire|let go|sack)\b/i,
  ],
  formFields: [
    { key: 'employeeName', label: 'Employee full name', type: 'text', required: true },
    { key: 'positionTitle', label: 'Position title', type: 'text', required: true },
    { key: 'meetingDate', label: 'Date of final meeting', type: 'date', required: true },
    { key: 'reason', label: 'Reason for termination', type: 'select', options: ['Performance (post-PIP)', 'Conduct', 'Serious misconduct', 'Redundancy'], required: true },
    { key: 'effectiveDate', label: 'Effective date of termination', type: 'date', required: true },
    { key: 'noticePeriod', label: 'Notice period', type: 'select', options: ['1 week', '2 weeks', '4 weeks', '4 weeks + 1 week (over 45, 2+ years)', 'Paid in lieu'], required: true },
    { key: 'additionalPayment', label: 'Additional ex-gratia payment (if any)', type: 'text', placeholder: 'e.g. 2 weeks additional payment' },
  ],
  promptInstructions: `Generate a Termination of Employment Letter following the Humanistiqs template. Include: Private & Confidential header, reference to the final meeting and attendees, reason for termination, effective date, notice period (working or paid in lieu), final pay details (accrued leave, notice period, any additional payment), information about when final pay will be processed, offer of support (career conversation), warm professional close wishing the employee well. Include director signature block.`,
}

const expiredOffer: TemplateDefinition = {
  id: 'expired-offer',
  title: 'Expired Offer Letter',
  category: 'Termination & Separation',
  description: 'Confirming that an employment offer has expired due to no response.',
  keywords: ['expired offer', 'offer expired', 'withdraw offer'],
  patterns: [
    /\bexpir(ed|e|ing)\b.*\boffer\b/i,
    /\boffer\b.*\bexpir/i,
    /\bwithdraw\b.*\boffer\b/i,
  ],
  formFields: [
    { key: 'candidateName', label: 'Candidate full name', type: 'text', required: true },
    { key: 'positionTitle', label: 'Position offered', type: 'text', required: true },
    { key: 'offerDate', label: 'Date original offer was made', type: 'date', required: true },
  ],
  promptInstructions: `Generate an Expired Offer Letter. Reference the original offer date and position. Note multiple contact attempts. Confirm the offer has expired and the candidate will not commence employment. Invite contact if they have questions. Wish them well in their career. Include director signature block.`,
}

const resignationAcceptance: TemplateDefinition = {
  id: 'resignation-acceptance',
  title: 'Resignation Acceptance Letter',
  category: 'Termination & Separation',
  description: 'Confirming acceptance of an employee resignation with final pay details.',
  keywords: ['resignation acceptance', 'accept resignation', 'resignation letter'],
  patterns: [
    /\bresignation\b.*\b(accept|confirm|acknowledge)\b/i,
    /\baccept\b.*\bresignation\b/i,
  ],
  formFields: [
    { key: 'employeeName', label: 'Employee full name', type: 'text', required: true },
    { key: 'positionTitle', label: 'Position title', type: 'text', required: true },
    { key: 'resignationDate', label: 'Date resignation was received', type: 'date', required: true },
    { key: 'lastDay', label: 'Last day of employment', type: 'date', required: true },
    { key: 'noticePeriod', label: 'Notice period being served', type: 'text', placeholder: 'e.g. 4 weeks' },
  ],
  promptInstructions: `Generate a Resignation Acceptance Letter. Acknowledge receipt of the resignation on the date received. Confirm the last day of employment. Outline final pay details (accrued leave, outstanding entitlements). Mention handover requirements and return of company property. Thank the employee for their contribution. Include director signature block.`,
}

const abandonmentLetter: TemplateDefinition = {
  id: 'abandonment-letter',
  title: 'Abandonment of Employment Letter',
  category: 'Termination & Separation',
  description: 'Letter addressing unauthorised absence and potential termination for abandonment.',
  keywords: ['abandonment of employment', 'abandonment letter', 'abandoned employment'],
  patterns: [
    /\babandonment\b/i,
    /\babandoned\b.*\b(employment|role|job|position)\b/i,
    /\bno show\b.*\b(work|job)\b/i,
  ],
  formFields: [
    { key: 'employeeName', label: 'Employee full name', type: 'text', required: true },
    { key: 'positionTitle', label: 'Position title', type: 'text', required: true },
    { key: 'lastAttendance', label: 'Last date of attendance', type: 'date', required: true },
    { key: 'contactAttempts', label: 'Contact attempts made', type: 'textarea', placeholder: 'e.g. Called on 1 Apr, emailed on 2 Apr, SMS on 3 Apr', required: true },
    { key: 'responseDeadline', label: 'Deadline to respond', type: 'date', required: true },
  ],
  promptInstructions: `Generate an Abandonment of Employment Letter. Reference the last date of attendance, document all contact attempts made (dates and methods), advise that if no contact is made by the deadline the employee will be deemed to have abandoned their employment. Reference the relevant award/NES provisions. Include director signature block.`,
}

// ── Policies ──────────────────────────────────────────────────────

const codeOfConduct: TemplateDefinition = {
  id: 'code-of-conduct',
  title: 'Code of Conduct',
  category: 'Workplace Policies',
  description: 'Comprehensive code of conduct covering expected workplace behaviour and standards.',
  keywords: ['code of conduct'],
  patterns: [
    /\bcode\s+of\s+conduct\b/i,
    /\bconduct\s+policy\b/i,
  ],
  formFields: [
    { key: 'companyValues', label: 'Company values', type: 'textarea', placeholder: 'e.g. Integrity, Innovation, Customer Focus, Teamwork', required: true },
    { key: 'industrySpecific', label: 'Industry-specific requirements', type: 'textarea', placeholder: 'e.g. Working with children, handling confidential medical records, financial regulations' },
  ],
  promptInstructions: `Generate a comprehensive Code of Conduct policy. Include sections on: introduction/CEO letter, company mission and values, who the code applies to, consequences of breach, accounting practices, bribes & inducements, business records, charitable donations, community activities, company assets, competitors, compliance, confidentiality, conflict of interest, customers, employment practices, environment, gifts & benefits, harassment, investments, leaving the company, outside business activities, OHS/WHS, personal conduct, privacy, product quality, public disclosure, suppliers, website usage, working environment. Include employee acknowledgement form at the end.`,
}

const alcoholDrugsPolicy: TemplateDefinition = {
  id: 'alcohol-drugs-policy',
  title: 'Alcohol & Other Drugs Policy',
  category: 'Workplace Policies',
  description: 'Zero impairment policy covering alcohol, drugs, and substance abuse in the workplace.',
  keywords: ['alcohol policy', 'drug policy', 'alcohol and drugs', 'substance abuse policy'],
  patterns: [
    /\b(alcohol|drug|substance)\b.*\bpolicy\b/i,
    /\bpolicy\b.*\b(alcohol|drug|substance)\b/i,
  ],
  formFields: [
    { key: 'testingRequired', label: 'Does your industry require testing?', type: 'select', options: ['Yes — mandatory testing', 'No — behavioural indicators only', 'Not sure'] },
    { key: 'industryContext', label: 'Industry context', type: 'textarea', placeholder: 'e.g. Construction site safety, operating heavy machinery, driving company vehicles' },
  ],
  promptInstructions: `Generate an Alcohol & Other Drugs Policy following the Humanistiqs template. Include: purpose, scope, definitions, zero impairment policy statement, behavioural indicators table (physical, emotional, behavioural, other), direction to leave work procedures, transport assistance, return to work process, acknowledged problems and support, continuity of employment, EAP assistance, company support and rehabilitation, confidentiality, return to work post-rehabilitation, unsuccessful rehabilitation, recurrence, refusal to seek treatment, alcohol at work functions, drugs on premises, suspected breaches, related policies, and policy history.`,
}

const confidentialityPolicy: TemplateDefinition = {
  id: 'confidentiality-policy',
  title: 'Confidentiality & Conflict of Interest Policy',
  category: 'Workplace Policies',
  description: 'Policy on unauthorised disclosure of information and conflicts of interest.',
  keywords: ['confidentiality policy', 'conflict of interest policy', 'confidentiality and conflict'],
  patterns: [
    /\bconfidentiality\b.*\bpolicy\b/i,
    /\bconflict\s+of\s+interest\b.*\bpolicy\b/i,
  ],
  formFields: [],
  promptInstructions: `Generate a Confidentiality & Conflict of Interest Policy following the Humanistiqs template. Include: purpose, definitions (fiduciary, fraudulent, CEO), confidentiality of information section (what constitutes information, obligations during and after employment), conflict of interest section (definition, duty of faithful service, fiduciary duty, requirement to disclose, CEO approval process), reference to case law (McPherson's Ltd v Tate & Ors 1993), general principles, and policy history.`,
}

const grievancePolicy: TemplateDefinition = {
  id: 'grievance-policy',
  title: 'Grievance Handling Policy',
  category: 'Workplace Policies',
  description: 'Procedure for employees to have workplace grievances addressed fairly.',
  keywords: ['grievance policy', 'grievance handling', 'complaint policy', 'complaint handling'],
  patterns: [
    /\bgrievance\b.*\bpolicy\b/i,
    /\bcomplaint\b.*\b(policy|procedure|handling)\b/i,
  ],
  formFields: [],
  promptInstructions: `Generate a Grievance Handling Policy following the Humanistiqs template. Include: purpose, key elements (impartiality, confidentiality, no victimisation, timeliness), step 1: approach the person involved, step 2: go to supervisor or grievance contact officer, what happens next (investigation process), possible outcomes (substantiated vs unsubstantiated), appeals procedure, right to go to external agency, grievance contact officers list. Reference anti-discrimination and harassment policies.`,
}

const inductionPolicy: TemplateDefinition = {
  id: 'induction-policy',
  title: 'Employee Induction Policy',
  category: 'Workplace Policies',
  description: 'Ensuring all new employees receive a complete and appropriate induction.',
  keywords: ['induction policy', 'employee induction', 'onboarding policy'],
  patterns: [
    /\binduction\b.*\bpolicy\b/i,
    /\bonboarding\b.*\bpolicy\b/i,
  ],
  formFields: [],
  promptInstructions: `Generate an Employee Induction Policy following the Humanistiqs template. Include: purpose, scope, first day orientation (terms and conditions, paperwork, pay details, hours, leave, WHS, policies, workplace familiarisation), second day site/work area induction (one-on-one, introductions, workplace tour, function overview, unwritten customs, easy initial tasks, buddy system, safe operating procedures), policy history.`,
}

const medicalInfoPolicy: TemplateDefinition = {
  id: 'medical-info-policy',
  title: 'Medical Information Policy',
  category: 'Workplace Policies',
  description: 'Policy on collecting and using medical information for workplace safety.',
  keywords: ['medical information policy', 'medical policy', 'health assessment policy'],
  patterns: [
    /\bmedical\b.*\b(information|policy|assessment)\b/i,
    /\bhealth\s+assessment\b.*\bpolicy\b/i,
    /\bpre.?employment\s+medical\b/i,
  ],
  formFields: [],
  promptInstructions: `Generate a Medical Information Policy following the Humanistiqs template. Include: purpose, job analysis requirements, reasonable adjustment obligations, anti-discrimination considerations, two-stage medical information process (health declaration and pre-employment health assessment), policy history. Reference Privacy Act 1988 and anti-discrimination legislation.`,
}

const terminationPolicy: TemplateDefinition = {
  id: 'termination-policy',
  title: 'Termination Policy',
  category: 'Workplace Policies',
  description: 'Procedural guide for managers on employee termination processes.',
  keywords: ['termination policy'],
  patterns: [
    /\bterminat(ion|e)\b.*\bpolicy\b/i,
    /\bpolicy\b.*\bterminat/i,
  ],
  formFields: [],
  promptInstructions: `Generate a Termination Policy following the Humanistiqs template. Include: purpose, counselling and performance management before termination, lawful reasons for dismissal (performance, conduct, serious misconduct), authorisation requirements (HR manager approval), termination procedures, exit procedures, company property return checklist (laptop, credit card, phone, vehicle, manuals), termination paperwork, IT access disconnection, accounts receivable reconciliation, resignation procedures, and policy history.`,
}

// ── Recruitment ───────────────────────────────────────────────────

const jobAd: TemplateDefinition = {
  id: 'job-advertisement',
  title: 'Job Advertisement',
  category: 'Recruitment',
  description: 'Compelling, compliant job ad structure with anti-discrimination safeguards.',
  keywords: ['job advertisement', 'job ad', 'job advert', 'job posting', 'job listing'],
  patterns: [
    /\bjob\s+(ad|advertisement|advert|posting|listing)\b/i,
    /\b(write|create|generate|draft|make)\b.*\b(ad|advertisement|posting)\b.*\b(role|position|job)\b/i,
    /\b(advertise|post)\b.*\b(role|position|job|vacancy)\b/i,
  ],
  formFields: [
    { key: 'positionTitle', label: 'Position title', type: 'text', required: true },
    { key: 'employmentType', label: 'Employment type', type: 'select', options: ['Full-time', 'Part-time', 'Casual', 'Full-time or Part-time'], required: true },
    { key: 'location', label: 'Work location', type: 'text', required: true },
    { key: 'salaryRange', label: 'Salary range or award rate', type: 'text', required: true },
    { key: 'keyDuties', label: 'Key duties (top 5)', type: 'textarea', required: true },
    { key: 'mustHaves', label: 'Must-have requirements', type: 'textarea' },
    { key: 'niceToHaves', label: 'Nice-to-have requirements', type: 'textarea' },
    { key: 'benefits', label: 'Benefits and perks', type: 'textarea' },
    { key: 'platform', label: 'Where will this be posted?', type: 'select', options: ['SEEK', 'LinkedIn', 'Indeed', 'Multiple platforms', 'Company website'] },
  ],
  promptInstructions: `Generate a Job Advertisement following the Humanistiqs template structure: 1) About us (3-5 sentences), 2) About the role (max 5 bullet points), 3) About you — must-have (max 5) and nice-to-have (max 4), 4) About the experience/benefits, 5) Equal opportunity statement, 6) Key selling points for platform. Run compliance checks: no age references, no gender-coded language, no protected attribute criteria, salary range included.`,
}

const jobBrief: TemplateDefinition = {
  id: 'job-brief',
  title: 'Job Brief',
  category: 'Recruitment',
  description: 'Internal document articulating key success criteria for a role outside the job description.',
  keywords: ['job brief', 'role brief', 'recruitment brief'],
  patterns: [
    /\bjob\s+brief\b/i,
    /\brole\s+brief\b/i,
    /\brecruitment\s+brief\b/i,
  ],
  formFields: [
    { key: 'positionTitle', label: 'Position title', type: 'text', required: true },
    { key: 'keyDeliverables', label: 'Key deliverables and responsibilities', type: 'textarea', required: true },
    { key: 'additionalExtras', label: 'Nice-to-haves', type: 'textarea' },
    { key: 'outOfTheBox', label: 'Alternative/adjacent skills you would consider', type: 'textarea' },
    { key: 'priorExperience', label: 'Prior experience required', type: 'textarea' },
    { key: 'qualifications', label: 'Required qualifications', type: 'text' },
    { key: 'reportingTo', label: 'Role reports to', type: 'text' },
    { key: 'salaryRange', label: 'Salary range', type: 'text' },
    { key: 'workArrangement', label: 'Work arrangement', type: 'select', options: ['Office-based', 'Remote', 'Hybrid', 'Flexible'] },
  ],
  promptInstructions: `Generate a Job Brief (internal recruitment document). Include: role title, key success criteria, additional nice-to-haves, out-of-the-box alternatives, key deliverables and responsibilities, prior work experience requirements, industries/organisations of interest, qualifications, general characteristics (team player, leadership, etc), reporting line, salary range, work arrangement, and citizenship/visa requirements.`,
}

const phoneInterview: TemplateDefinition = {
  id: 'phone-interview',
  title: 'Phone Interview Template',
  category: 'Recruitment',
  description: 'Structured phone screening template for initial candidate assessment.',
  keywords: ['phone interview', 'phone screen', 'telephone interview'],
  patterns: [
    /\bphone\s+(interview|screen)/i,
    /\btelephone\s+interview\b/i,
    /\binitial\s+screen/i,
  ],
  formFields: [
    { key: 'positionTitle', label: 'Position title', type: 'text', required: true },
    { key: 'keyCompetencies', label: 'Key competencies to assess', type: 'textarea', placeholder: 'e.g. Communication, technical skills, cultural fit' },
  ],
  promptInstructions: `Generate a Phone Interview Template following the Humanistiqs template. Include fields for: candidate name, position, interviewer name, date, current company, salary expectations, important benefits, location preference, employment type preference, notice period, planned leave, citizenship/working rights, other opportunities, reason for leaving current role, current responsibilities/reporting/team size, skills alignment, interest in company, management experience (if applicable), study status, interview availability. Include section for additional comments and recruiter assessment. End with explanation of next steps.`,
}

const referenceCheck: TemplateDefinition = {
  id: 'reference-check',
  title: 'Reference Check Template',
  category: 'Recruitment',
  description: 'Structured reference check questions covering performance, conduct, and re-employment.',
  keywords: ['reference check', 'referee check', 'reference template'],
  patterns: [
    /\breference\s+(check|template|questions)\b/i,
    /\breferee\b/i,
  ],
  formFields: [
    { key: 'candidateName', label: 'Candidate name', type: 'text', required: true },
    { key: 'positionTitle', label: 'Position being considered for', type: 'text', required: true },
    { key: 'keyCompetencies', label: 'Key competencies to verify', type: 'textarea', required: true },
    { key: 'specificConcerns', label: 'Any specific areas to probe?', type: 'textarea' },
  ],
  promptInstructions: `Generate a Reference Check Template following the Humanistiqs template. Include: date, reference conducted by, candidate details, referee details (name, position, company, contact, relationship, duration), Privacy Act permission statement, sections for: Operational Performance (responsibilities, performance rating, peer comparison, reason for leaving), Personality/Work Ethic/Behaviour (strengths, areas for improvement, work ethic), rated competencies on 1-5 scale (teamwork, pressure handling, change management, resilience, feedback receptiveness, attendance), Management & Leadership (environment fit, management style responsiveness, leadership approach), and Conclusion (career fit, re-hire consideration, closing comments).`,
}

const screeningQuestions: TemplateDefinition = {
  id: 'screening-questions',
  title: 'Candidate Screening Questions',
  category: 'Recruitment',
  description: 'Structured screening questions scored against role-specific criteria.',
  keywords: ['screening questions', 'screening template'],
  patterns: [
    /\bscreening\s+(question|template)\b/i,
    /\bcandidate\s+screen/i,
  ],
  formFields: [
    { key: 'positionTitle', label: 'Position title', type: 'text', required: true },
    { key: 'keyRequirements', label: 'Key requirements for the role', type: 'textarea', required: true },
    { key: 'numberOfQuestions', label: 'Number of questions', type: 'select', options: ['5', '8', '10', '12'] },
    { key: 'focusAreas', label: 'Focus areas', type: 'textarea', placeholder: 'e.g. Technical skills, cultural fit, availability' },
  ],
  promptInstructions: `Generate Candidate Screening Questions. Create role-specific questions with a scoring rubric. Use the 4-point scale: 4=Exceeds, 3=Meets, 2=Partial, 1=Does not meet, 0=No response. Include compliance checks (no protected attribute questions). Composite score thresholds: 3.2-4.0 → Priority shortlist, 2.5-3.1 → Secondary, Below 2.5 → Not progressed.`,
}

// ── Return to Work ────────────────────────────────────────────────

const requestMedicalInfo: TemplateDefinition = {
  id: 'request-medical-info',
  title: 'Request for Medical Information Letter',
  category: 'Return to Work',
  description: 'Letter requesting further medical information to assess work capacity.',
  keywords: ['request medical information', 'medical information letter', 'work capacity'],
  patterns: [
    /\brequest\b.*\bmedical\b.*\binformation\b/i,
    /\bwork\s+capacity\b/i,
    /\bmedical\s+clearance\b/i,
  ],
  formFields: [
    { key: 'employeeName', label: 'Employee full name', type: 'text', required: true },
    { key: 'positionTitle', label: 'Position title', type: 'text', required: true },
    { key: 'condition', label: 'Nature of condition/treatment', type: 'textarea', placeholder: 'e.g. Anxiety, back injury, post-surgery recovery', required: true },
    { key: 'currentInfo', label: 'What info has already been provided?', type: 'textarea', placeholder: 'e.g. Medical certificate stating unfit for 2 weeks' },
    { key: 'infoDeadline', label: 'Deadline for providing information', type: 'date', required: true },
  ],
  promptInstructions: `Generate a Request for Medical Information Letter following the Humanistiqs template. Reference the employer's duty of care, the information already provided, why it's insufficient for reasonable adjustments, what specific information is needed from the treating practitioner (work capacity details), mention the attached work ability checklist, note that costs are the employee's responsibility for personal injury, set the deadline for providing the information. Include director signature block.`,
}

const suitableDutiesPlan: TemplateDefinition = {
  id: 'suitable-duties-plan',
  title: 'Suitable Duties Plan',
  category: 'Return to Work',
  description: 'Structured plan for return to work with modified duties following injury/illness.',
  keywords: ['suitable duties', 'return to work plan', 'modified duties', 'suitable duties plan'],
  patterns: [
    /\bsuitable\s+duties\b/i,
    /\breturn\s+to\s+work\b.*\bplan\b/i,
    /\bmodified\s+duties\b/i,
    /\blight\s+duties\b/i,
  ],
  formFields: [
    { key: 'employeeName', label: 'Employee full name', type: 'text', required: true },
    { key: 'positionTitle', label: 'Normal position', type: 'text', required: true },
    { key: 'injuryType', label: 'Type of injury/illness', type: 'select', options: ['Physical injury', 'Psychological injury', 'Illness', 'Post-surgery', 'Other'], required: true },
    { key: 'diagnosis', label: 'Diagnosis', type: 'text', required: true },
    { key: 'medicalRestrictions', label: 'Medical restrictions', type: 'textarea', required: true },
    { key: 'startDate', label: 'Plan start date', type: 'date', required: true },
    { key: 'reviewDate', label: 'Plan review date', type: 'date', required: true },
  ],
  promptInstructions: `Generate a Suitable Duties Plan following the Humanistiqs template. Include: plan objective, dates, staff member and manager details, diagnosis, current medical certificate status, hours/days, review date, medical restrictions, suitable duties progression table (week by week: days/hours, duties, additional comments), staff member responsibilities, director/manager responsibilities, agreement signature blocks, and appendix with injury risk register (green/yellow/red light categories for functional tasks).`,
}

const unableToAccommodate: TemplateDefinition = {
  id: 'unable-to-accommodate',
  title: 'Unable to Accommodate Restrictions Letter',
  category: 'Return to Work',
  description: 'Letter when current capacity restrictions cannot be safely accommodated.',
  keywords: ['unable to accommodate', 'cannot accommodate', 'capacity restrictions'],
  patterns: [
    /\bunable\s+to\s+accommodate\b/i,
    /\bcannot\s+accommodate\b/i,
    /\b(can\'t|cant)\s+accommodate\b/i,
  ],
  formFields: [
    { key: 'employeeName', label: 'Employee full name', type: 'text', required: true },
    { key: 'positionTitle', label: 'Position title', type: 'text', required: true },
    { key: 'condition', label: 'Nature of condition', type: 'text', required: true },
    { key: 'restrictions', label: 'Capacity restrictions identified', type: 'textarea', required: true },
    { key: 'workCapacityDate', label: 'Date of work capacity form', type: 'date', required: true },
    { key: 'medicalProfessional', label: 'Treating medical professional', type: 'text' },
    { key: 'nextReviewDate', label: 'Next medical review date', type: 'date', required: true },
  ],
  promptInstructions: `Generate an Unable to Accommodate Restrictions Letter following the Humanistiqs template. Reference the company's commitment to health and wellbeing, the work ability form received, the specific capacity restrictions, explain that suitable tasks fitting current capacity are not available, request an updated work ability form after the next review so the company can reassess. Include director signature block.`,
}

// ── Contract Variation ────────────────────────────────────────────

const contractVariation: TemplateDefinition = {
  id: 'contract-variation',
  title: 'Contract Variation Letter',
  category: 'Letters & Offers',
  description: 'Letter to vary existing employment terms — hours, duties, remuneration, or location.',
  keywords: ['contract variation', 'variation letter'],
  patterns: [
    /\bvari(ation|y)\b.*\b(contract|letter|terms)\b/i,
    /\b(change|update|amend|modify)\b.*\bcontract\b/i,
  ],
  formFields: [
    { key: 'employeeName', label: 'Employee full name', type: 'text', required: true },
    { key: 'positionTitle', label: 'Current position', type: 'text', required: true },
    { key: 'variationType', label: 'What is changing?', type: 'select', options: ['Hours of work', 'Remuneration', 'Position/duties', 'Work location', 'Multiple changes'], required: true },
    { key: 'currentTerms', label: 'Current terms', type: 'textarea', required: true },
    { key: 'newTerms', label: 'New terms', type: 'textarea', required: true },
    { key: 'effectiveDate', label: 'Effective date of change', type: 'date', required: true },
    { key: 'reason', label: 'Reason for variation', type: 'textarea' },
  ],
  promptInstructions: `Generate a Contract Variation Letter. Reference the original employment contract. Clearly state the current terms and the new terms. Confirm the effective date. Note that all other terms and conditions remain unchanged. Include agreement signature blocks for both parties.`,
}


// ══════════════════════════════════════════════════════════════════
// Export all templates as a single array
// ══════════════════════════════════════════════════════════════════

export const ALL_TEMPLATES: TemplateDefinition[] = [
  // Employment Contracts
  employmentContract,
  // Letters & Offers
  letterOfOffer,
  confirmationOfEmployment,
  flexibleWorkApplication,
  nonContactablePostOffer,
  contractVariation,
  // Performance Management
  fileNote,
  warningLetter,
  letterOfExpectation,
  probationReview,
  staffStatement,
  pip,
  showCauseLetter,
  // Termination & Separation
  terminationInProbation,
  terminationLetter,
  expiredOffer,
  resignationAcceptance,
  abandonmentLetter,
  // Workplace Policies
  codeOfConduct,
  alcoholDrugsPolicy,
  confidentialityPolicy,
  grievancePolicy,
  inductionPolicy,
  medicalInfoPolicy,
  terminationPolicy,
  // Recruitment
  jobAd,
  jobBrief,
  phoneInterview,
  referenceCheck,
  screeningQuestions,
  // Return to Work
  requestMedicalInfo,
  suitableDutiesPlan,
  unableToAccommodate,
]

// Build a lookup map by ID
export const TEMPLATE_BY_ID = Object.fromEntries(
  ALL_TEMPLATES.map(t => [t.id, t])
)

// Get unique categories in display order
export const TEMPLATE_CATEGORIES = [
  'Employment Contracts',
  'Letters & Offers',
  'Performance Management',
  'Termination & Separation',
  'Workplace Policies',
  'Recruitment',
  'Return to Work',
]

/**
 * Detect which template type a user message is requesting.
 * Returns the template definition or null.
 *
 * Priority:
 * 1. Exact keyword matches (highest confidence)
 * 2. Contract variation disambiguation (before generic "contract")
 * 3. Regex pattern matches
 */
export function detectTemplate(text: string): TemplateDefinition | null {
  const lower = text.toLowerCase()

  // Step 1: Exact keyword matches
  for (const tmpl of ALL_TEMPLATES) {
    if (tmpl.keywords.some(k => lower.includes(k))) return tmpl
  }

  // Step 2: Disambiguate "vary/change/amend contract" as variation
  const isVariation = /\b(vary|change|amend|modify|update)\b.*\bcontract\b/i.test(lower)
  if (isVariation) return contractVariation

  // Step 3: Regex pattern matches
  for (const tmpl of ALL_TEMPLATES) {
    if (tmpl.patterns.some(p => p.test(text))) return tmpl
  }

  return null
}
