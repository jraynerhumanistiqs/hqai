'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Message {
  role: 'user' | 'assistant'
  content: string
  escalate?: boolean
  docType?: string | null
  formType?: string | null
  formCompleted?: boolean
}

interface FormField {
  key: string
  label: string
  type: 'text' | 'select' | 'date' | 'textarea' | 'number'
  placeholder?: string
  options?: string[]
  required?: boolean
}

// Document form definitions — fields required for each document type
const DOC_FORMS: Record<string, { title: string; description: string; fields: FormField[] }> = {
  'Employment Contract': {
    title: 'Employment Contract',
    description: 'Complete the details below and HQ will generate a fully compliant employment contract tailored to your business.',
    fields: [
      { key: 'employeeName', label: 'Employee full name', type: 'text', placeholder: 'e.g. Sarah Johnson', required: true },
      { key: 'positionTitle', label: 'Position title', type: 'text', placeholder: 'e.g. Retail Sales Assistant', required: true },
      { key: 'employmentType', label: 'Employment type', type: 'select', options: ['Full-time', 'Part-time', 'Casual', 'Fixed-term'], required: true },
      { key: 'startDate', label: 'Commencement date', type: 'date', required: true },
      { key: 'salary', label: 'Base salary / hourly rate (gross)', type: 'text', placeholder: 'e.g. $65,000 per annum or $32.50/hr', required: true },
      { key: 'hoursPerWeek', label: 'Hours per week', type: 'text', placeholder: 'e.g. 38 (FT) or 25 (PT)' },
      { key: 'reportingTo', label: 'Reports to (manager/position)', type: 'text', placeholder: 'e.g. Store Manager' },
      { key: 'location', label: 'Work location', type: 'text', placeholder: 'e.g. 123 Main St, Brisbane QLD 4000' },
      { key: 'probation', label: 'Probation period', type: 'select', options: ['3 months', '6 months', 'No probation'] },
      { key: 'award', label: 'Applicable Modern Award', type: 'text', placeholder: 'e.g. General Retail Industry Award (or leave blank to use business default)' },
      { key: 'additionalNotes', label: 'Additional notes or special conditions', type: 'textarea', placeholder: 'e.g. Company car provided, specific roster days, restraint of trade requirements' },
    ]
  },
  'Letter of Offer': {
    title: 'Letter of Offer',
    description: 'Complete the details below and HQ will generate a professional offer letter ready to send.',
    fields: [
      { key: 'candidateName', label: 'Candidate full name', type: 'text', placeholder: 'e.g. Sarah Johnson', required: true },
      { key: 'positionTitle', label: 'Position title', type: 'text', placeholder: 'e.g. Marketing Coordinator', required: true },
      { key: 'employmentType', label: 'Employment type', type: 'select', options: ['Full-time', 'Part-time', 'Casual', 'Fixed-term'], required: true },
      { key: 'startDate', label: 'Proposed start date', type: 'date', required: true },
      { key: 'salary', label: 'Salary package (gross)', type: 'text', placeholder: 'e.g. $75,000 + super', required: true },
      { key: 'reportingTo', label: 'Reporting manager', type: 'text', placeholder: 'e.g. Head of Marketing' },
      { key: 'location', label: 'Work location', type: 'text', placeholder: 'e.g. Sydney CBD office' },
      { key: 'acceptanceDeadline', label: 'Offer acceptance deadline', type: 'date' },
      { key: 'conditions', label: 'Conditions of offer', type: 'textarea', placeholder: 'e.g. Subject to satisfactory reference checks, right to work verification' },
    ]
  },
  'Warning Letter': {
    title: 'Warning Letter',
    description: 'Provide the details below for HQ to generate a compliant warning letter.',
    fields: [
      { key: 'employeeName', label: 'Employee full name', type: 'text', required: true },
      { key: 'positionTitle', label: 'Employee position', type: 'text', required: true },
      { key: 'warningLevel', label: 'Warning level', type: 'select', options: ['First written warning', 'Final written warning'], required: true },
      { key: 'issueDescription', label: 'Describe the conduct or performance issue', type: 'textarea', placeholder: 'Be specific — include dates, examples, and what policy or standard was breached', required: true },
      { key: 'previousDiscussions', label: 'Previous discussions or warnings (with dates)', type: 'textarea', placeholder: 'e.g. Verbal discussion on 1 March 2026 regarding...' },
      { key: 'expectedStandard', label: 'Expected standard going forward', type: 'textarea', placeholder: 'What specifically needs to change?' },
      { key: 'supportOffered', label: 'Support offered to employee', type: 'text', placeholder: 'e.g. Additional training, EAP referral, adjusted workload' },
      { key: 'reviewDate', label: 'Review meeting date', type: 'date' },
    ]
  },
  'Job Advertisement': {
    title: 'Job Advertisement',
    description: 'Fill in the role details and HQ will create a compelling, compliant job ad.',
    fields: [
      { key: 'positionTitle', label: 'Position title', type: 'text', placeholder: 'e.g. Senior Barista', required: true },
      { key: 'employmentType', label: 'Employment type', type: 'select', options: ['Full-time', 'Part-time', 'Casual', 'Full-time or Part-time'], required: true },
      { key: 'location', label: 'Work location', type: 'text', placeholder: 'e.g. Surfers Paradise, Gold Coast', required: true },
      { key: 'salaryRange', label: 'Salary range or award rate', type: 'text', placeholder: 'e.g. $60,000-$70,000 or Award rate + penalties', required: true },
      { key: 'keyDuties', label: 'Key duties (top 5)', type: 'textarea', placeholder: 'What will this person actually do day to day?', required: true },
      { key: 'mustHaves', label: 'Must-have requirements', type: 'textarea', placeholder: 'e.g. 2+ years experience, food safety cert, RSA' },
      { key: 'niceToHaves', label: 'Nice-to-have requirements', type: 'textarea', placeholder: 'e.g. barista experience, second language' },
      { key: 'benefits', label: 'Benefits and perks', type: 'textarea', placeholder: 'e.g. Free parking, staff discounts, flexible roster' },
      { key: 'platform', label: 'Where will this be posted?', type: 'select', options: ['SEEK', 'LinkedIn', 'Indeed', 'Multiple platforms', 'Company website'] },
    ]
  },
  'Performance Improvement Plan': {
    title: 'Performance Improvement Plan (PIP)',
    description: 'Provide the details below for a structured PIP with measurable goals.',
    fields: [
      { key: 'employeeName', label: 'Employee full name', type: 'text', required: true },
      { key: 'positionTitle', label: 'Employee position', type: 'text', required: true },
      { key: 'performanceIssues', label: 'Performance issues to address', type: 'textarea', placeholder: 'Specific areas of underperformance with examples', required: true },
      { key: 'expectedStandards', label: 'Expected performance standards', type: 'textarea', placeholder: 'What does "good" look like? Be measurable', required: true },
      { key: 'supportProvided', label: 'Support and resources to be provided', type: 'textarea', placeholder: 'e.g. Weekly check-ins, training sessions, mentoring' },
      { key: 'reviewPeriod', label: 'Review period', type: 'select', options: ['2 weeks', '4 weeks', '6 weeks', '8 weeks'], required: true },
      { key: 'startDate', label: 'PIP start date', type: 'date' },
    ]
  },
  'Contract Variation Letter': {
    title: 'Contract Variation Letter',
    description: 'Provide the details of the contract change.',
    fields: [
      { key: 'employeeName', label: 'Employee full name', type: 'text', required: true },
      { key: 'positionTitle', label: 'Current position', type: 'text', required: true },
      { key: 'variationType', label: 'What is changing?', type: 'select', options: ['Hours of work', 'Remuneration', 'Position/duties', 'Work location', 'Multiple changes'], required: true },
      { key: 'currentTerms', label: 'Current terms', type: 'textarea', placeholder: 'What are the current arrangements?', required: true },
      { key: 'newTerms', label: 'New terms', type: 'textarea', placeholder: 'What will the new arrangements be?', required: true },
      { key: 'effectiveDate', label: 'Effective date of change', type: 'date', required: true },
      { key: 'reason', label: 'Reason for variation', type: 'textarea', placeholder: 'e.g. Business restructure, employee request, promotion' },
    ]
  },
  'Reference Check Template': {
    title: 'Reference Check Template',
    description: 'Provide details about the role to generate targeted reference check questions.',
    fields: [
      { key: 'positionTitle', label: 'Position the candidate is being considered for', type: 'text', required: true },
      { key: 'keyCompetencies', label: 'Key competencies to verify', type: 'textarea', placeholder: 'e.g. Team leadership, attention to detail, customer service', required: true },
      { key: 'specificConcerns', label: 'Any specific areas to probe?', type: 'textarea', placeholder: 'e.g. Gap in employment, short tenure at previous role' },
    ]
  },
  'Candidate Screening Questions': {
    title: 'Candidate Screening Questions',
    description: 'Provide role details to generate compliant screening questions.',
    fields: [
      { key: 'positionTitle', label: 'Position title', type: 'text', required: true },
      { key: 'keyRequirements', label: 'Key requirements for the role', type: 'textarea', placeholder: 'What are the must-haves?', required: true },
      { key: 'numberOfQuestions', label: 'Number of questions', type: 'select', options: ['5', '8', '10', '12'] },
      { key: 'focusAreas', label: 'Focus areas', type: 'textarea', placeholder: 'e.g. Technical skills, cultural fit, availability, salary expectations' },
    ]
  },
}

// Client-side document request detection — broad matching with regex
function detectDocType(text: string): string | null {
  const lower = text.toLowerCase()

  // Each entry: [regex patterns, exact phrases, docType]
  const docs: { patterns: RegExp[]; keywords: string[]; type: string }[] = [
    {
      type: 'Employment Contract',
      keywords: ['employment contract', 'contract of employment'],
      patterns: [
        /\bcontract\b/i, // any mention of "contract" (most common request)
        /\bemployment\s+agreement\b/i,
      ],
    },
    {
      type: 'Letter of Offer',
      keywords: ['letter of offer', 'offer letter'],
      patterns: [
        /\boffer\s+(letter|template)\b/i,
        /\b(write|create|generate|draft|make|prepare|send)\b.*\boffer\b/i,
      ],
    },
    {
      type: 'Job Advertisement',
      keywords: ['job advertisement', 'job ad', 'job advert', 'job posting', 'job listing'],
      patterns: [
        /\bjob\s+(ad|advertisement|advert|posting|listing)\b/i,
        /\b(write|create|generate|draft|make)\b.*\b(ad|advertisement|posting)\b.*\b(role|position|job)\b/i,
        /\b(advertise|post)\b.*\b(role|position|job|vacancy)\b/i,
      ],
    },
    {
      type: 'Warning Letter',
      keywords: ['warning letter', 'first warning', 'final warning', 'written warning', 'formal warning'],
      patterns: [
        /\bwarning\b/i,
        /\bdisciplin/i,
      ],
    },
    {
      type: 'Performance Improvement Plan',
      keywords: ['performance improvement plan', 'pip'],
      patterns: [
        /\bpip\b/i,
        /\bperformance\s+(improvement|management)\s+plan\b/i,
        /\b(create|generate|draft|write|make|prepare)\b.*\bpip\b/i,
      ],
    },
    {
      type: 'Contract Variation Letter',
      keywords: ['contract variation', 'variation letter'],
      patterns: [
        /\bvari(ation|y)\b.*\b(contract|letter|terms)\b/i,
        /\b(change|update|amend|modify)\b.*\bcontract\b/i,
      ],
    },
    {
      type: 'Reference Check Template',
      keywords: ['reference check', 'referee check'],
      patterns: [
        /\breference\s+(check|template|questions)\b/i,
        /\breferee\b/i,
      ],
    },
    {
      type: 'Candidate Screening Questions',
      keywords: ['screening questions', 'screening template'],
      patterns: [
        /\bscreening\s+(question|template)\b/i,
        /\bcandidate\s+screen/i,
      ],
    },
  ]

  // Priority: check variation BEFORE contract (since "change contract" should be variation not contract)
  // Check exact keywords first (high confidence)
  for (const doc of docs) {
    if (doc.keywords.some(k => lower.includes(k))) return doc.type
  }

  // Then check regex patterns — but for "contract" specifically, disambiguate
  // If user mentions "vary/change/amend contract", it's a variation not a new contract
  const isVariation = /\b(vary|change|amend|modify|update)\b.*\bcontract\b/i.test(lower)
  if (isVariation) return 'Contract Variation Letter'

  for (const doc of docs) {
    if (doc.patterns.some(p => p.test(lower))) return doc.type
  }

  return null
}

interface ChatInterfaceProps {
  module: 'people' | 'recruit'
  userName: string
  bizName: string
  advisorName: string
  industry: string
  state: string
  award: string
}

const QUICK_ACTIONS_PEOPLE = [
  { icon: '📄', label: 'Employment contract', desc: 'Full-time, part-time or casual', prompt: 'I need to generate an employment contract for a new employee.' },
  { icon: '⚖️', label: 'Award & pay rates', desc: 'Penalty rates, overtime, allowances', prompt: 'What penalty rates and entitlements apply to my employees?' },
  { icon: '📊', label: 'Performance management', desc: 'PIP, warnings, coaching scripts', prompt: 'I need to manage a performance issue with an employee. Where do I start?' },
  { icon: '🔄', label: 'Casual conversion', desc: 'Fair Work 2023 obligations', prompt: 'What are my casual conversion obligations and when do they apply?' },
  { icon: '📋', label: 'Leave entitlements', desc: 'Annual, personal, parental, LSL', prompt: 'Can you explain all the leave entitlements my employees are entitled to?' },
  { icon: '🔔', label: 'Redundancy process', desc: 'Consultation, pay, genuine test', prompt: 'I need to make a role redundant. What process do I need to follow?' },
]

const QUICK_ACTIONS_RECRUIT = [
  { icon: '📢', label: 'Write a job ad', desc: 'SEEK & LinkedIn ready', prompt: 'I need to write a job advertisement for a new role.' },
  { icon: '🔍', label: 'Screening questions', desc: 'Role-relevant, compliant', prompt: 'Can you generate screening questions for a role I\'m recruiting for?' },
  { icon: '📞', label: 'Phone interview guide', desc: 'Structured call template', prompt: 'I need a phone interview guide for screening candidates.' },
  { icon: '⭐', label: 'Candidate scorecard', desc: 'Standardised evaluation', prompt: 'Can you create a candidate scorecard for evaluating applicants?' },
  { icon: '📋', label: 'Reference check', desc: 'Structured referee questions', prompt: 'I need a reference check template for a candidate.' },
  { icon: '✉️', label: 'Rejection email', desc: 'Professional, compliant', prompt: 'Can you write an unsuccessful candidate email?' },
]

export default function ChatInterface({ module, userName, bizName, advisorName, industry, state, award }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [showAdvisorModal, setShowAdvisorModal] = useState(false)
  const [savedDocId, setSavedDocId] = useState<string | null>(null)
  const [showContextInput, setShowContextInput] = useState(false)
  const [extraContext, setExtraContext] = useState('')
  const [activeForm, setActiveForm] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const quickActions = module === 'recruit' ? QUICK_ACTIONS_RECRUIT : QUICK_ACTIONS_PEOPLE

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  async function ensureConversation(firstMessage: string) {
    if (conversationId) return conversationId
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: firstMessage.substring(0, 60),
        module,
      })
    })
    const data = await res.json()
    setConversationId(data.id)
    return data.id
  }

  async function saveDocument(content: string, docType: string) {
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `${docType} — ${new Date().toLocaleDateString('en-AU')}`,
        type: docType.toLowerCase().replace(/\s+/g, '-'),
        content,
        conversationId,
      })
    })
    const data = await res.json()
    setSavedDocId(data.id)
  }

  // Handle form submission — builds structured prompt and sends to AI
  const handleFormSubmit = useCallback(async (docType: string, formData: Record<string, string>) => {
    setActiveForm(null)

    // Build a detailed prompt from the form data
    const formDef = DOC_FORMS[docType]
    let prompt = `Please generate a complete ${docType} with the following details:\n\n`
    for (const field of formDef.fields) {
      const val = formData[field.key]
      if (val && val.trim()) {
        prompt += `**${field.label}:** ${val}\n`
      }
    }
    prompt += `\nPlease generate the FULL, COMPLETE ${docType} document — every clause, every section. Do not abbreviate or summarise. Use my business details from the profile.`

    // Mark form as completed in messages
    setMessages(prev => prev.map(m =>
      m.formType === docType && !m.formCompleted
        ? { ...m, formCompleted: true }
        : m
    ))

    // Send as a regular message
    await sendMessageDirect(prompt)
  }, [])

  // Direct message send (no form interception)
  const sendMessageDirect = useCallback(async (content: string) => {
    if (!content || isLoading) return

    setIsLoading(true)
    const newMessages: Message[] = [...messages, { role: 'user', content }]
    setMessages(newMessages)

    const convId = await ensureConversation(content)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          conversationId: convId,
          module,
        })
      })

      if (!res.ok || !res.body) throw new Error('Stream failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let assistantContent = ''
      let finalEscalate = false
      let finalDocType: string | null = null

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.text) {
              assistantContent += data.text
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: assistantContent }
                return updated
              })
            }
            if (data.done) {
              finalEscalate = data.escalate
              finalDocType = data.docType
            }
          } catch {}
        }
      }

      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: assistantContent,
          escalate: finalEscalate,
          docType: finalDocType,
        }
        return updated
      })

      if (finalDocType && assistantContent.length > 200) {
        await saveDocument(assistantContent, finalDocType)
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I\'m having trouble connecting right now. Please try again in a moment.',
      }])
    }

    setIsLoading(false)
  }, [messages, isLoading, conversationId, module])

  const sendMessage = useCallback(async (text?: string) => {
    const content = text || input.trim()
    if (!content || isLoading) return

    // Check if this is a document request — show form instead
    const detectedDoc = detectDocType(content)
    if (detectedDoc && DOC_FORMS[detectedDoc] && !activeForm) {
      setInput('')
      // Add user message + form message
      setMessages(prev => [
        ...prev,
        { role: 'user', content },
        { role: 'assistant', content: '', formType: detectedDoc, formCompleted: false },
      ])
      setActiveForm(detectedDoc)
      await ensureConversation(content)
      return
    }

    setInput('')
    await sendMessageDirect(content)
  }, [input, isLoading, activeForm, sendMessageDirect])

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  function handleSendContext() {
    if (extraContext.trim()) {
      sendMessage(`Additional context: ${extraContext}`)
      setExtraContext('')
      setShowContextInput(false)
    }
  }

  const moduleLabel = module === 'recruit' ? 'HQ Recruit' : 'HQ People'
  const moduleDesc = module === 'recruit' ? 'Recruitment & talent acquisition' : 'HR compliance & advisory'

  return (
    <div className="flex flex-col h-full bg-[#000000]">
      {/* Topbar */}
      <div className="flex items-center gap-4 px-6 py-3.5 border-b border-[#222222] bg-[#0a0a0a] flex-shrink-0">
        <div>
          <h1 className="font-display text-lg font-bold text-white uppercase tracking-wider">{moduleLabel}</h1>
          <p className="text-xs text-gray-500">{moduleDesc}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="bg-[#1a1a1a] border border-[#333333] rounded-full px-3 py-1 text-xs font-bold text-gray-400">{bizName}</div>
          <button
            onClick={() => setMessages([])}
            className="bg-[#1a1a1a] border border-[#333333] rounded-lg px-3 py-1.5 text-xs font-bold text-gray-400 hover:bg-[#222222] transition-colors"
          >
            + New chat
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6 space-y-5">
        {messages.length === 0 && (
          <div className="max-w-2xl mx-auto">
            {/* Welcome */}
            <div className="text-center mb-8 pt-4">
              <div className="w-12 h-12 bg-[#fd7325]/20 border border-[#fd7325]/30 rounded-2xl flex items-center justify-center mx-auto mb-4 font-serif text-[#fd7325] text-xl">HQ</div>
              <h2 className="font-display text-2xl font-bold text-white uppercase tracking-wider mb-2">
                {userName ? `Good morning, ${userName}` : 'Welcome to HQ.ai'}
              </h2>
              <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
                {module === 'recruit'
                  ? 'I\'m your AI recruitment advisor. I\'ll help you write job ads, screen candidates, run reference checks, and shortlist the right people — faster.'
                  : 'I\'m your AI HR advisor. Ask me anything about employment law, awards, contracts, leave, or managing your team — and I\'ll give you a straight answer.'
                }
              </p>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((qa, i) => (
                <button key={i} onClick={() => sendMessage(qa.prompt)}
                  className="text-left bg-[#111111] border border-[#222222] rounded-xl p-4 hover:border-[#fd7325]/40 hover:bg-[#1a1a1a] transition-all group">
                  <span className="text-xl block mb-2">{qa.icon}</span>
                  <span className="text-sm font-bold text-white block mb-1">{qa.label}</span>
                  <span className="text-xs text-gray-500">{qa.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5
              ${msg.role === 'user'
                ? 'bg-[#1a1a1a] text-gray-400 border border-[#333333]'
                : 'bg-[#fd7325]/20 text-[#fd7325] font-serif text-base border border-[#fd7325]/30'}`}>
              {msg.role === 'user' ? (userName?.[0]?.toUpperCase() || 'U') : 'HQ'}
            </div>

            <div className="flex-1">
              <p className={`text-[11px] font-bold text-gray-500 mb-1.5 ${msg.role === 'user' ? 'text-right' : ''}`}>
                {msg.role === 'user' ? (userName || 'You') : `HQ · ${moduleLabel}`}
              </p>

              {/* Form or Bubble */}
              {msg.formType && !msg.formCompleted ? (
                <DocumentFormCard
                  docType={msg.formType}
                  onSubmit={handleFormSubmit}
                  onSkip={() => {
                    setActiveForm(null)
                    setMessages(prev => prev.map(m =>
                      m.formType === msg.formType && !m.formCompleted
                        ? { ...m, formCompleted: true }
                        : m
                    ))
                    sendMessageDirect(`Please generate a ${msg.formType}. Use my business details from the profile and ask me for any details you need.`)
                  }}
                  bizName={bizName}
                />
              ) : msg.formType && msg.formCompleted ? (
                <div className="bg-[#111111] border border-[#222222] rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-400">
                  <span className="text-[#fd7325] font-bold">{msg.formType}</span> details submitted — generating your document...
                </div>
              ) : (
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed
                  ${msg.role === 'user'
                    ? 'bg-[#fd7325] text-white rounded-tr-sm'
                    : 'bg-[#111111] border border-[#222222] text-gray-300 rounded-tl-sm'}`}>
                  <MessageContent content={msg.content} isUser={msg.role === 'user'} />
                </div>
              )}

              {/* Escalation card */}
              {msg.escalate && msg.role === 'assistant' && (
                <>
                  <div className="mt-2 bg-[#1a1a1a] border border-[#fd7325]/30 rounded-xl p-3.5 flex gap-3">
                    <span className="text-lg flex-shrink-0">⚠️</span>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-[#fd7325] mb-1">Advisor recommended for this situation</p>
                      <p className="text-xs text-gray-400 leading-relaxed mb-2.5">
                        This involves real legal exposure. A HQ Partner can give you specific, protected advice before you act.
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => setShowAdvisorModal(true)}
                          className="bg-[#fd7325] text-white text-xs font-bold px-3 py-1.5 rounded-lg border-2 border-[#fd7325] hover:bg-[#e5671f] transition-colors">
                          Book a call with a HQ Partner
                        </button>
                        <button onClick={() => setShowAdvisorModal(false)}
                          className="bg-[#111111] text-gray-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-[#333333] hover:bg-[#222222] transition-colors">
                          Continue talking with {advisorName}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Add more context */}
                  <div className="mt-2">
                    <button onClick={() => setShowContextInput(!showContextInput)}
                      className="text-xs text-[#fd7325] font-bold hover:underline">
                      + Add more context
                    </button>
                    {showContextInput && (
                      <div className="mt-2 space-y-2">
                        <textarea
                          value={extraContext}
                          onChange={e => setExtraContext(e.target.value)}
                          placeholder="Add additional context about your situation..."
                          rows={3}
                          className="w-full px-3 py-2 bg-[#111111] border border-[#222222] rounded-lg text-sm text-white placeholder-gray-500 resize-none outline-none focus:border-[#fd7325] transition-colors"
                        />
                        <button onClick={handleSendContext}
                          disabled={!extraContext.trim()}
                          className="bg-[#fd7325] text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-[#e5671f] disabled:opacity-40 transition-colors">
                          Send context
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Document saved indicator with download */}
              {msg.docType && msg.role === 'assistant' && msg.content.length > 200 && (
                <div className="mt-2 bg-[#fd7325]/10 border border-[#fd7325]/20 rounded-xl px-3.5 py-2.5">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-sm">{savedDocId ? '✅' : '📄'}</span>
                    <p className="text-xs text-[#fd7325] flex-1">
                      <strong>{msg.docType}</strong>{savedDocId ? ' saved to your documents library' : ' generated'}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-6">
                    <DownloadDocxButton content={msg.content} title={msg.docType || 'Document'} docType={msg.docType || 'Document'} />
                    {savedDocId && (
                      <a href="/dashboard/documents" className="border border-[#333333] text-gray-400 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#1a1a1a] transition-colors">
                        View in library →
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex gap-3 max-w-3xl">
            <div className="w-8 h-8 rounded-xl bg-[#fd7325]/20 border border-[#fd7325]/30 flex items-center justify-center font-serif text-[#fd7325] text-base flex-shrink-0">HQ</div>
            <div className="bg-[#111111] border border-[#222222] rounded-2xl rounded-tl-sm px-4 py-3.5">
              <div className="flex gap-1.5 items-center">
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-6 pb-5 pt-3 border-t border-[#222222] bg-[#0a0a0a]">
        <div className="flex items-end gap-3 bg-[#111111] border-[1.5px] border-[#333333] rounded-2xl px-4 py-3 focus-within:border-[#fd7325] transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={autoResize}
            onKeyDown={handleKey}
            placeholder={module === 'recruit'
              ? 'Ask about job ads, screening, candidates, offers…'
              : 'Ask about awards, contracts, leave, performance, compliance…'
            }
            rows={1}
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 resize-none outline-none leading-relaxed max-h-[120px]"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className="w-8 h-8 bg-[#fd7325] rounded-xl flex items-center justify-center text-white flex-shrink-0 hover:bg-[#e5671f] disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
            </svg>
          </button>
        </div>
        <div className="flex items-center justify-center gap-3 mt-2">
          <Link href="/dashboard/booking"
            className="bg-[#fd7325] text-white rounded-lg px-3 py-1 text-xs font-bold hover:bg-[#e5671f] transition-colors">
            Talk to a HQ Partner
          </Link>
          <button
            className="border border-[#333333] text-gray-400 rounded-lg px-3 py-1 text-xs font-bold hover:bg-[#1a1a1a] transition-colors">
            Continue with {advisorName}
          </button>
        </div>
      </div>

      {/* Advisor modal */}
      {showAdvisorModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowAdvisorModal(false)}>
          <div className="bg-[#111111] border border-[#222222] rounded-2xl p-7 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-xl font-bold text-white uppercase tracking-wider mb-2">Talk to a HQ Partner</h3>
            <p className="text-sm text-gray-400 mb-4 leading-relaxed">
              HQ.ai has prepared a summary of your conversation. Your HQ Partner will have full context before your call — no repeating yourself.
            </p>
            <div className="bg-[#1a1a1a] rounded-xl p-4 mb-4 text-sm text-gray-400 leading-relaxed space-y-1">
              <p><strong className="font-bold text-white">Business:</strong> {bizName}</p>
              <p><strong className="font-bold text-white">Industry:</strong> {industry}</p>
              <p><strong className="font-bold text-white">State:</strong> {state}</p>
              <p><strong className="font-bold text-white">Award:</strong> {award || 'Not specified'}</p>
              {messages.length > 0 && (
                <p><strong className="font-bold text-white">Last topic:</strong> {messages.filter(m => m.role === 'user').slice(-1)[0]?.content?.substring(0, 80)}…</p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAdvisorModal(false)}
                className="flex-1 py-2.5 bg-[#1a1a1a] hover:bg-[#222222] text-gray-400 rounded-xl text-sm font-bold border border-[#333333] transition-colors">
                Close
              </button>
              <Link href="/dashboard/booking" onClick={() => setShowAdvisorModal(false)}
                className="flex-1 py-2.5 bg-[#fd7325] hover:bg-[#e5671f] text-white rounded-xl text-sm font-bold text-center transition-colors border-2 border-[#fd7325]">
                Book a call with a HQ Partner
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Render markdown-lite message content
function MessageContent({ content, isUser }: { content: string; isUser: boolean }) {
  if (!content) return <span className="text-gray-500 text-xs">Thinking…</span>

  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let listItems: string[] = []

  const flushList = () => {
    if (listItems.length) {
      elements.push(
        <ul key={elements.length} className="list-disc pl-4 space-y-1 my-1">
          {listItems.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: formatInline(item, isUser) }} />
          ))}
        </ul>
      )
      listItems = []
    }
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) { flushList(); continue }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listItems.push(trimmed.slice(2))
    } else if (trimmed.match(/^\d+\. /)) {
      listItems.push(trimmed.replace(/^\d+\. /, ''))
    } else {
      flushList()
      elements.push(
        <p key={elements.length} className="mb-1 last:mb-0"
          dangerouslySetInnerHTML={{ __html: formatInline(trimmed, isUser) }} />
      )
    }
  }
  flushList()

  return <div className="space-y-0.5">{elements}</div>
}

function formatInline(text: string, isUser: boolean): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, `<strong class="font-medium">$1</strong>`)
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, `<code class="bg-black/10 px-1 rounded text-xs font-mono">$1</code>`)
}

function DocumentFormCard({
  docType,
  onSubmit,
  onSkip,
  bizName,
}: {
  docType: string
  onSubmit: (docType: string, data: Record<string, string>) => void
  onSkip: () => void
  bizName: string
}) {
  const formDef = DOC_FORMS[docType]
  const [formData, setFormData] = useState<Record<string, string>>({})

  if (!formDef) return null

  const updateField = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Check required fields
    const missing = formDef.fields.filter(f => f.required && !formData[f.key]?.trim())
    if (missing.length > 0) return
    onSubmit(docType, formData)
  }

  const inputCls = "w-full px-3 py-2.5 bg-[#0a0a0a] border border-[#333333] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#fd7325] transition-colors"

  return (
    <div className="bg-[#111111] border border-[#fd7325]/30 rounded-2xl rounded-tl-sm overflow-hidden">
      {/* Header */}
      <div className="bg-[#fd7325]/10 border-b border-[#fd7325]/20 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#fd7325]/20 rounded-xl flex items-center justify-center">
            <svg className="w-4 h-4 text-[#fd7325]" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
            </svg>
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-white uppercase tracking-wider">{formDef.title}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{bizName}</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3 leading-relaxed">{formDef.description}</p>
      </div>

      {/* Form fields */}
      <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
        {formDef.fields.map(field => (
          <div key={field.key}>
            <label className="block text-xs font-bold text-gray-400 mb-1.5">
              {field.label}
              {field.required && <span className="text-[#fd7325] ml-0.5">*</span>}
            </label>
            {field.type === 'select' ? (
              <select
                className={inputCls + " appearance-none"}
                value={formData[field.key] || ''}
                onChange={e => updateField(field.key, e.target.value)}
                required={field.required}
              >
                <option value="">Select...</option>
                {field.options?.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : field.type === 'textarea' ? (
              <textarea
                className={inputCls + " resize-none"}
                rows={3}
                value={formData[field.key] || ''}
                onChange={e => updateField(field.key, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
              />
            ) : field.type === 'date' ? (
              <input
                type="date"
                className={inputCls}
                value={formData[field.key] || ''}
                onChange={e => updateField(field.key, e.target.value)}
                required={field.required}
              />
            ) : (
              <input
                type={field.type === 'number' ? 'number' : 'text'}
                className={inputCls}
                value={formData[field.key] || ''}
                onChange={e => updateField(field.key, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
              />
            )}
          </div>
        ))}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="flex-1 bg-[#fd7325] hover:bg-[#e5671f] text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
          >
            Generate {formDef.title}
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="bg-[#1a1a1a] hover:bg-[#222222] text-gray-400 font-bold py-2.5 px-4 rounded-xl text-sm border border-[#333333] transition-colors"
          >
            Skip form
          </button>
        </div>
        <p className="text-[10px] text-gray-600 text-center">
          HQ will use your business profile details for employer information, award, and state jurisdiction.
        </p>
      </form>
    </div>
  )
}

function DownloadDocxButton({ content, title, docType }: { content: string; title: string; docType: string }) {
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title: `${title} — ${new Date().toLocaleDateString('en-AU')}`, docType }),
      })

      if (!res.ok) throw new Error('Generation failed')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_')}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      alert('Could not generate document. Please try again.')
    }
    setDownloading(false)
  }

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className="bg-[#fd7325] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#e5671f] transition-colors inline-flex items-center gap-1 disabled:opacity-60"
    >
      <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
      </svg>
      {downloading ? 'Generating…' : 'Download DOCX'}
    </button>
  )
}
